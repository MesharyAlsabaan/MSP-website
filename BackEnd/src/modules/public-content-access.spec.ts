/**
 * Public website endpoints must only ever return published / active content
 * to anonymous visitors — `includeDrafts`, `includeInactive` and direct
 * slug/id lookups included — while signed-in content staff keep their admin
 * preview. Runs the real global guards and JWT strategy over HTTP against an
 * in-memory repository (no database needed).
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { StaffTokenService } from './auth/staff-token.service';
import { BlogController } from './blog/blog.controller';
import { BlogService } from './blog/blog.service';
import { BlogPost } from './blog/entities/blog-post.entity';
import { Project } from './projects/entities/project.entity';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { Partner } from './partners/entities/partner.entity';
import { PartnersService } from './partners/partners.service';
import { Service } from './services/entities/service.entity';
import { ServicesService } from './services/services.service';
import { TeamMember } from './team/entities/team-member.entity';
import { TeamService } from './team/team.service';
import { Testimonial } from './testimonials/entities/testimonial.entity';
import { TestimonialsService } from './testimonials/testimonials.service';

const SECRET = 'test-secret';
type Row = Record<string, unknown>;

/** Visibility columns the services filter on. */
const VISIBILITY = { status: 'published', published: true, active: true } as const;
const isVisible = (row: Row) =>
  Object.entries(VISIBILITY).every(([k, v]) => !(k in row) || row[k] === v);

/**
 * Minimal TypeORM repository stand-in: `findOne({ where })` matches every
 * key, and the list query builder applies the visibility filter exactly when
 * the service adds a status/published/active condition.
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
  let tokens: Record<'editor' | 'contentManager' | 'superAdmin' | 'vendorReviewer' | 'expired', string>;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  const projects: Row[] = [
    { id: PUB_ID, slug: 'madinah-hotel', status: 'published' },
    { id: DRAFT_ID, slug: 'unannounced-tower', status: 'draft' },
  ];
  const posts: Row[] = [
    { id: PUB_ID, slug: 'madinah-hotel-hospitality', status: 'published' },
    { id: DRAFT_ID, slug: 'draft-article', status: 'draft' },
  ];

  beforeAll(async () => {
    for (const k of ['JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY', 'JWT_ISSUER', 'JWT_AUDIENCE']) delete process.env[k];

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
    await app.init();

    const signer = new StaffTokenService(new JwtService({}), {
      hsSecret: SECRET,
      issuer: 'msp-website',
      audience: ['msp-admin', 'vendor-service'],
      expiresIn: '15m',
    });
    const sign = (role: string) => signer.signAccess({ sub: 'u1', email: 'staff@msp.sa', role });
    tokens = {
      editor: await sign(Role.Editor),
      contentManager: await sign(Role.ContentManager),
      superAdmin: await sign(Role.SuperAdmin),
      vendorReviewer: await sign(Role.VendorReviewer),
      expired: await new StaffTokenService(new JwtService({}), {
        hsSecret: SECRET,
        issuer: 'msp-website',
        audience: ['msp-admin', 'vendor-service'],
        expiresIn: '-1s',
      }).signAccess({ sub: 'u1', email: 'staff@msp.sa', role: Role.Editor }),
    };
  });

  afterAll(() => app.close());

  describe.each([
    ['projects', 'madinah-hotel', 'unannounced-tower'],
    ['blog', 'madinah-hotel-hospitality', 'draft-article'],
  ])('/%s', (path, publishedSlug, draftSlug) => {
    const slugs = (res: request.Response) => (res.body.data as Row[]).map((r) => r.slug);

    it('lists only published items to anonymous visitors', async () => {
      const res = await http().get(`/${path}`).expect(200);
      expect(slugs(res)).toEqual([publishedSlug]);
    });

    it('ignores includeDrafts=true from anonymous visitors', async () => {
      const res = await http().get(`/${path}?includeDrafts=true`).expect(200);
      expect(slugs(res)).toEqual([publishedSlug]);
    });

    it('never shows drafts to an invalid or expired token: 401 when drafts were asked for, so the admin refreshes', async () => {
      await http().get(`/${path}?includeDrafts=true`).set(bearer('not-a-jwt')).expect(401);
      await http().get(`/${path}?includeDrafts=true`).set(bearer(tokens.expired)).expect(401);
    });

    it('serves published content normally to a stale token that asks for nothing extra', async () => {
      const res = await http().get(`/${path}`).set(bearer(tokens.expired)).expect(200);
      expect(slugs(res)).toEqual([publishedSlug]);
      await http().get(`/${path}/slug/${draftSlug}`).set(bearer(tokens.expired)).expect(404);
    });

    it('ignores includeDrafts=true for staff without a content role', async () => {
      const res = await http().get(`/${path}?includeDrafts=true`).set(bearer(tokens.vendorReviewer)).expect(200);
      expect(slugs(res)).toEqual([publishedSlug]);
    });

    it('serves a published item by slug and by id', async () => {
      await http().get(`/${path}/slug/${publishedSlug}`).expect(200);
      await http().get(`/${path}/${PUB_ID}`).expect(200);
    });

    it('returns 404 for a draft by slug or id to anonymous visitors', async () => {
      await http().get(`/${path}/slug/${draftSlug}`).expect(404);
      await http().get(`/${path}/${DRAFT_ID}`).expect(404);
    });

    it.each(['editor', 'contentManager', 'superAdmin'] as const)(
      'lets a signed-in %s list and open drafts (admin preview)',
      async (who) => {
        const res = await http().get(`/${path}?includeDrafts=true`).set(bearer(tokens[who])).expect(200);
        expect(slugs(res).sort()).toEqual([draftSlug, publishedSlug].sort());
        await http().get(`/${path}/slug/${draftSlug}`).set(bearer(tokens[who])).expect(200);
        await http().get(`/${path}/${DRAFT_ID}`).set(bearer(tokens[who])).expect(200);
      },
    );

    it('still shows staff only published items unless they ask for drafts', async () => {
      const res = await http().get(`/${path}`).set(bearer(tokens.editor)).expect(200);
      expect(slugs(res)).toEqual([publishedSlug]);
    });
  });

  it('keeps protected routes protected (a write without a token is 401)', async () => {
    await http().post('/projects').send({}).expect(401);
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
