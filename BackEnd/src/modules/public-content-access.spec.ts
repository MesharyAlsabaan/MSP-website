/**
 * Public website endpoints must only ever return published / active content
 * to anonymous visitors — `includeDrafts`, `includeInactive` and direct
 * slug/id lookups included — while signed-in content staff keep their admin
 * preview. Runs the real global guards and JWT strategy over HTTP (built-in
 * fetch against a listening server) with an in-memory repository, so it needs
 * no database and no extra test dependencies.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { BlogController } from './blog/blog.controller';
import { BlogService } from './blog/blog.service';
import { BlogPost } from './blog/entities/blog-post.entity';
import { Project } from './projects/entities/project.entity';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { PartnersService } from './partners/partners.service';
import { ServicesService } from './services/services.service';
import { TeamService } from './team/team.service';
import { TestimonialsService } from './testimonials/testimonials.service';

const SECRET = 'test-secret';
type Row = Record<string, unknown>;

const VISIBILITY = { status: 'published', published: true, active: true } as const;
const isVisible = (row: Row) =>
  Object.entries(VISIBILITY).every(([k, v]) => !(k in row) || row[k] === v);

/**
 * Minimal TypeORM repository stand-in: `findOne({ where })` matches every
 * key; the list query builder applies the visibility filter exactly when the
 * service adds a status/published/active condition.
 */
function fakeRepo(rows: Row[]) {
  return {
    findOne: jest.fn(async ({ where }: { where: Row }) =>
      rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
    ),
    createQueryBuilder: jest.fn(() => {
      let filtered = false;
      const qb = {
        andWhere: (clause: string) => {
          if (/status|published|active/.test(clause)) filtered = true;
          return qb;
        },
        orderBy: () => qb,
        addOrderBy: () => qb,
        skip: () => qb,
        take: () => qb,
        getManyAndCount: async () => {
          const data = filtered ? rows.filter(isVisible) : rows;
          return [data, data.length];
        },
      };
      return qb;
    }),
  };
}

const PUB_ID = '11111111-1111-4111-8111-111111111111';
const DRAFT_ID = '22222222-2222-4222-8222-222222222222';

describe('Public content access (HTTP, real guards)', () => {
  let app: INestApplication;
  let base: string;
  let tokens: Record<'editor' | 'contentManager' | 'superAdmin' | 'otherRole' | 'expired', string>;

  const get = async (path: string, token?: string) => {
    const res = await fetch(`${base}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const body = (await res.json()) as { data?: Row[] };
    return { status: res.status, slugs: (body.data ?? []).map((r) => r.slug) };
  };

  const projects: Row[] = [
    { id: PUB_ID, slug: 'madinah-hotel', status: 'published' },
    { id: DRAFT_ID, slug: 'unannounced-tower', status: 'draft' },
  ];
  const posts: Row[] = [
    { id: PUB_ID, slug: 'madinah-hotel-hospitality', status: 'published' },
    { id: DRAFT_ID, slug: 'draft-article', status: 'draft' },
  ];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [ProjectsController, BlogController],
      providers: [
        ProjectsService,
        BlogService,
        JwtStrategy,
        { provide: ConfigService, useValue: { get: (key: string) => (key === 'jwt.secret' ? SECRET : undefined) } },
        { provide: getRepositoryToken(Project), useValue: fakeRepo(projects) },
        { provide: getRepositoryToken(BlogPost), useValue: fakeRepo(posts) },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');

    // Same signing as AuthService: HS256 with jwt.secret.
    const jwt = new JwtService({ secret: SECRET });
    const sign = (role: string, expiresIn = '15m') =>
      jwt.signAsync({ sub: 'u1', email: 'staff@msp.sa', role }, { expiresIn });
    tokens = {
      editor: await sign(Role.Editor),
      contentManager: await sign(Role.ContentManager),
      superAdmin: await sign(Role.SuperAdmin),
      otherRole: await sign('VIEWER'),
      expired: await sign(Role.Editor, '-1s'),
    };
  });

  afterAll(() => app.close());

  describe.each([
    ['projects', 'madinah-hotel', 'unannounced-tower'],
    ['blog', 'madinah-hotel-hospitality', 'draft-article'],
  ])('/%s', (path, publishedSlug, draftSlug) => {
    it('lists only published items to anonymous visitors', async () => {
      expect(await get(`/${path}`)).toEqual({ status: 200, slugs: [publishedSlug] });
    });

    it('ignores includeDrafts=true from anonymous visitors', async () => {
      expect(await get(`/${path}?includeDrafts=true`)).toEqual({ status: 200, slugs: [publishedSlug] });
    });

    it('never shows drafts to an invalid or expired token: 401 when drafts were asked for, so the admin refreshes', async () => {
      expect((await get(`/${path}?includeDrafts=true`, 'not-a-jwt')).status).toBe(401);
      expect((await get(`/${path}?includeDrafts=true`, tokens.expired)).status).toBe(401);
    });

    it('serves published content normally to a stale token that asks for nothing extra', async () => {
      expect(await get(`/${path}`, tokens.expired)).toEqual({ status: 200, slugs: [publishedSlug] });
      expect((await get(`/${path}/slug/${draftSlug}`, tokens.expired)).status).toBe(404);
    });

    it('ignores includeDrafts=true for a signed-in user without a content role', async () => {
      expect(await get(`/${path}?includeDrafts=true`, tokens.otherRole)).toEqual({ status: 200, slugs: [publishedSlug] });
    });

    it('serves a published item by slug and by id', async () => {
      expect((await get(`/${path}/slug/${publishedSlug}`)).status).toBe(200);
      expect((await get(`/${path}/${PUB_ID}`)).status).toBe(200);
    });

    it('returns 404 for a draft by slug or id to anonymous visitors', async () => {
      expect((await get(`/${path}/slug/${draftSlug}`)).status).toBe(404);
      expect((await get(`/${path}/${DRAFT_ID}`)).status).toBe(404);
    });

    it.each(['editor', 'contentManager', 'superAdmin'] as const)(
      'lets a signed-in %s list and open drafts (admin preview)',
      async (who) => {
        const list = await get(`/${path}?includeDrafts=true`, tokens[who]);
        expect(list.status).toBe(200);
        expect([...list.slugs].sort()).toEqual([draftSlug, publishedSlug].sort());
        expect((await get(`/${path}/slug/${draftSlug}`, tokens[who])).status).toBe(200);
        expect((await get(`/${path}/${DRAFT_ID}`, tokens[who])).status).toBe(200);
      },
    );

    it('still shows staff only published items unless they ask for drafts', async () => {
      expect(await get(`/${path}`, tokens.editor)).toEqual({ status: 200, slugs: [publishedSlug] });
    });
  });

  it('keeps protected routes protected (a write without a token is 401)', async () => {
    const res = await fetch(`${base}/projects`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
    expect(res.status).toBe(401);
  });
});

describe('Other public content services', () => {
  const cases = [
    ['services', ServicesService, 'includeDrafts', { published: true }, { published: false }],
    ['testimonials', TestimonialsService, 'includeDrafts', { published: true }, { published: false }],
    ['team', TeamService, 'includeInactive', { active: true }, { active: false }],
    ['partners', PartnersService, 'includeInactive', { active: true }, { active: false }],
  ] as const;

  describe.each(cases)('%s', (_name, Svc, flag, visible, hidden) => {
    const rows: Row[] = [
      { id: PUB_ID, slug: 'shown', ...visible },
      { id: DRAFT_ID, slug: 'hidden', ...hidden },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = new (Svc as any)(fakeRepo(rows));
    const query = { page: 1, pageSize: 10, [flag]: 'true' };

    it(`ignores ${flag} without preview rights`, async () => {
      const res = await svc.findAll(query, false);
      expect(res.data.map((r: Row) => r.slug)).toEqual(['shown']);
    });

    it(`honours ${flag} for content staff`, async () => {
      const res = await svc.findAll(query, true);
      expect(res.data).toHaveLength(2);
    });

    it('hides unpublished items from direct id lookups unless previewing', async () => {
      await expect(svc.findOne(DRAFT_ID)).rejects.toThrow();
      await expect(svc.findOne(DRAFT_ID, true)).resolves.toMatchObject({ slug: 'hidden' });
      await expect(svc.findOne(PUB_ID)).resolves.toMatchObject({ slug: 'shown' });
    });
  });
});
