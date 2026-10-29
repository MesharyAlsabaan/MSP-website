import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { existsSync, mkdtempSync, readdirSync, renameSync, rmSync } from 'fs';
import * as images from '../../src/modules/project-sync/images';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { DataSource, Repository } from 'typeorm';
import configuration from '../../src/config/configuration';
import { dataSourceOptions } from '../../src/database/data-source';
import { Project, ProjectStatus } from '../../src/modules/projects/entities/project.entity';
import { ProjectSyncItem, ProjectSyncRun } from '../../src/modules/project-sync/entities/project-sync.entity';
import { ProjectSyncModule } from '../../src/modules/project-sync/project-sync.module';
import { ProjectSyncService } from '../../src/modules/project-sync/project-sync.service';
import { SyncReport } from '../../src/modules/project-sync/report';
import { SITE_PORT, SMTP_PORT, TEST_DB } from './env';
import { createDatabase, db, dropDatabase, FakeSite, MailSink, photo } from './harness';

/**
 * The whole sync against a real PostgreSQL, a real folder of images, a fake
 * website that only shows a page after a rebuild, and a mail sink:
 * migrations (up, down, up), drafting, approval, publishing, live
 * verification, updates, undo, CMS-edit protection, postpone/reject,
 * failures with rollback, missing folders, locking and pausing.
 */

const SYNC_TABLES = ['project_sync_control', 'project_sync_items', 'project_sync_runs'];
const uploads = resolve(process.env.UPLOAD_DIR!);
const source = mkdtempSync(join(tmpdir(), 'msp-drive-'));
const site = new FakeSite(SITE_PORT, uploads);
const mail = new MailSink(SMTP_PORT);

let app: INestApplication;
let sync: ProjectSyncService;
let projects: Repository<Project>;
let items: Repository<ProjectSyncItem>;

const tables = async (ds: DataSource) =>
  (await ds.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`)).map((r: { table_name: string }) => r.table_name);

/** A checksum of every existing (non-sync) row, to prove the migration leaves data alone. */
async function existingData(ds: DataSource): Promise<string> {
  const out: string[] = [];
  for (const t of await tables(ds)) {
    if (SYNC_TABLES.includes(t) || t === 'migrations') continue;
    const [{ sum }] = await ds.query(`SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) AS sum FROM "${t}" x`);
    out.push(`${t}:${sum}`);
  }
  return out.join(',');
}

const item = async (folder: string) => items.findOneByOrFail({ folderName: folder });
const report = (run: ProjectSyncRun | null) => run!.report as SyncReport;

beforeAll(async () => {
  await createDatabase(TEST_DB);
  await Promise.all([site.start(), mail.start()]);

  // The source folder, laid out like the studio's Drive.
  await photo(join(source, '07_madinah-hotel', '1.jpg'), '#102030');
  await photo(join(source, '07_madinah-hotel', '2.jpg'), '#203040');
  await photo(join(source, '07_madinah-hotel', '3.jpg'), '#304050');
  await photo(join(source, '16_rihana-plaza-commercial-building', 'facade.jpg'), '#a05030');
  await photo(join(source, '16_rihana-plaza-commercial-building', 'street.jpg'), '#a06030');
  await photo(join(source, '16_rihana-plaza-commercial-building', 'INT', 'lobby.jpg'), '#a07030');
  await photo(join(source, '16_rihana-plaza-commercial-building', 'INT', 'lobby-copy.jpg'), '#a07030'); // identical
  await photo(join(source, '16_rihana-plaza-commercial-building', 'thumb.jpg'), '#a08030', 800, 600); // too small
  await photo(join(source, '17_private-twin-villa-riyadh', 'RENDER', '1-Ground Floor', '01- Majlis', 'a.jpg'), '#305020');
  await photo(join(source, '17_private-twin-villa-riyadh', 'RENDER', '1-Ground Floor', '01- Majlis', 'b.jpg'), '#306020');
  await photo(join(source, '17_private-twin-villa-riyadh', 'RENDER', '2-First Floor', 'c.jpg'), '#307020');
  await photo(join(source, 'Diyari Irqah (old)', 'x.jpg'), '#000000');
  process.env.PROJECT_SYNC_LOCAL_DIR = source;
});

afterAll(async () => {
  await app?.close();
  await Promise.all([site.stop(), mail.stop()]);
  await dropDatabase(TEST_DB);
  rmSync(uploads, { recursive: true, force: true });
  rmSync(source, { recursive: true, force: true });
});

describe('migration', () => {
  it('creates only the three sync tables, leaves existing data untouched, reverts cleanly and re-applies', async () => {
    // The production schema before this release (every entity except the sync ones), with data.
    const base = new DataSource({
      ...dataSourceOptions,
      entities: [join(__dirname, '../../src/modules/!(project-sync)/**/*.entity.ts')],
      migrations: [],
      migrationsRun: false,
      synchronize: true,
    } as never);
    await base.initialize();
    await base.query(
      `INSERT INTO projects (slug, no, title, typology, location, summary, status) VALUES
       ('madinah-hotel', '07', '{"en":"Madinah Hotel","ar":"فندق المدينة"}', '{"key":"hospitality","en":"Hospitality","ar":"ضيافة"}', '{"en":"Madinah, Saudi Arabia","ar":"المدينة المنورة"}', '{"en":"A hotel.","ar":"فندق."}', 'published')`,
    );
    const before = await existingData(base);
    await base.destroy();

    const ds = new DataSource({ ...dataSourceOptions, migrationsRun: false, synchronize: false } as never);
    await ds.initialize();
    expect(await ds.runMigrations({ transaction: 'each' })).toHaveLength(1);
    expect(await tables(ds)).toEqual(expect.arrayContaining(SYNC_TABLES));
    expect(await existingData(ds)).toBe(before);

    // synchronize (production's current default) finds nothing to change in the new tables.
    const pending = await ds.driver.createSchemaBuilder().log();
    expect(pending.upQueries.map((q) => q.query).filter((q) => /project_sync/.test(q))).toEqual([]);

    await ds.undoLastMigration({ transaction: 'each' });
    expect((await tables(ds)).filter((t) => SYNC_TABLES.includes(t))).toEqual([]);
    expect(await existingData(ds)).toBe(before);

    expect(await ds.runMigrations({ transaction: 'each' })).toHaveLength(1);
    expect(await existingData(ds)).toBe(before);
    await ds.destroy();
  });

  it('boots the application on the migrated database without altering existing rows', async () => {
    const check = new DataSource({ ...dataSourceOptions, migrationsRun: false, synchronize: false } as never);
    await check.initialize();
    const before = await existingData(check);

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] }), TypeOrmModule.forRootAsync({ useFactory: () => dataSourceOptions }), ProjectSyncModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    sync = app.get(ProjectSyncService);
    projects = app.get(getRepositoryToken(Project));
    items = app.get(getRepositoryToken(ProjectSyncItem));

    expect(await existingData(check)).toBe(before);
    await check.destroy();
  });
});

describe('sync lifecycle', () => {
  it('first run: links the existing project, drafts the new folders, publishes nothing', async () => {
    const run = await sync.run({ trigger: 'manual', requestedBy: 'test' });
    const r = report(run);
    expect(r.summary).toMatchObject({ scanned: 4, linked: 1, newDetected: 2, published: 0, attention: 1 });
    expect(r.detected.map((d) => d.folder)).toEqual(['16_rihana-plaza-commercial-building', '17_private-twin-villa-riyadh']);
    expect(r.attention[0]).toMatchObject({ folder: 'Diyari Irqah (old)', reasons: [expect.stringMatching(/NN_slug/)] });
    expect(r.pending).toHaveLength(2);

    expect(await projects.count()).toBe(1);
    expect(readdirSync(uploads)).toEqual([]); // nothing public before approval
    expect(site.rebuilds).toBe(0);
    expect((await item('07_madinah-hotel')).state).toBe('linked');
  });

  it('builds a draft with sourced facts, checked images and private previews', async () => {
    const i = await item('16_rihana-plaza-commercial-building');
    expect(i.state).toBe('pending_review');
    const d = i.draft!;
    expect(d.facts.titleEn).toMatchObject({ value: 'Rihana Plaza Commercial Building', source: 'folder' });
    expect(d.facts.sectors.value).toEqual(['commercial']);
    expect(d.facts.designCategories.value).toEqual(['architecture', 'interiors']); // INT sub-folder
    expect(d.facts.locationEn.value).toBe(''); // not in the name: not guessed
    expect(d.images.map((x) => [x.path, x.included, !!x.problem])).toEqual([
      ['facade.jpg', true, false],
      ['INT/lobby-copy.jpg', true, false], // identical files: the first in name order is kept
      ['street.jpg', true, false],
      ['thumb.jpg', false, true],
    ]);
    expect(d.notes.join()).toMatch(/1 identical copy\(ies\) skipped, e.g. lobby.jpg/);
    expect(d.notes.join()).toMatch(/AI drafting is off/);

    const twin = (await item('17_private-twin-villa-riyadh')).draft!;
    expect(twin.facts.locationEn.value).toBe('Riyadh, Saudi Arabia');
    expect(twin.images.map((x) => x.path)).toEqual(['RENDER/1-Ground Floor/01- Majlis/a.jpg', 'RENDER/1-Ground Floor/01- Majlis/b.jpg', 'RENDER/2-First Floor/c.jpg']);

    const preview = await sync.preview(i.id, d.images[0].md5);
    expect(preview.subarray(8, 12).toString()).toBe('WEBP');
    // Previews live outside the public uploads folder.
    expect(resolve(process.env.PROJECT_SYNC_PREVIEW_DIR!).startsWith(uploads)).toBe(false);
    await expect(sync.preview(i.id, 'f'.repeat(32))).rejects.toThrow(/not found/i);
  });

  it('emails a report naming every required section', async () => {
    const text = mail.lastText();
    expect(mail.messages.at(-1)!.to.join()).toMatch(/owner@example.test/);
    for (const h of ['NEW PROJECTS DETECTED', 'PUBLISHED PROJECTS', 'UPDATED PROJECTS', 'PENDING APPROVAL', 'ERRORS', 'REQUIRED ACTIONS']) expect(text).toContain(h);
    expect(text).toMatch(/Review and approve 2 project\(s\)/);
  });

  it('will not approve an incomplete draft, nor unconfirmed facts', async () => {
    const i = await item('16_rihana-plaza-commercial-building');
    await expect(sync.decide(i.id, 'approve', 'owner@msp.sa', { confirmFacts: true })).rejects.toThrow(/Not ready: .*Title \(Arabic\) is missing/);

    await sync.editDraft(
      i.id,
      {
        facts: { titleEn: 'Rihana Plaza', titleAr: 'ريحانة بلازا', locationEn: 'Maadi, Cairo, Egypt', locationAr: 'المعادي، القاهرة، مصر' },
        content: {
          summaryEn: 'A commercial building in Maadi whose layered street facade steps back at the upper floors.',
          summaryAr: 'مبنى تجاري في المعادي بواجهة متدرجة على الشارع تتراجع في أدواره العليا.',
        },
      },
      'owner@msp.sa',
    );
    const ready = await sync.getItem(i.id);
    expect(ready.readiness).toMatchObject({ blocking: [], unconfirmed: ['Sectors', 'Design categories'] });
    await expect(sync.decide(i.id, 'approve', 'owner@msp.sa')).rejects.toThrow(/Confirm these facts first: Sectors, Design categories/);

    const approved = await sync.decide(i.id, 'approve', 'owner@msp.sa', { confirmFacts: true });
    expect(approved.state).toBe('approved');
    expect(approved.draft!.facts.sectors).toMatchObject({ source: 'owner', basis: expect.stringMatching(/confirmed by owner@msp.sa/) });
  });

  it('publishes only the approved project, rebuilds once and reports it published only when live', async () => {
    const run = await sync.run({ trigger: 'manual' });
    const r = report(run);
    expect(r.created).toHaveLength(1);
    expect(r.created[0]).toMatchObject({ name: 'Rihana Plaza', outcome: 'published', images: 3, urlEn: `http://127.0.0.1:${SITE_PORT}/projects/rihana-plaza-commercial-building` });
    expect(r.summary).toMatchObject({ published: 1, pendingApproval: 1 });
    expect(site.rebuilds).toBe(1);
    expect(site.lastSecret).toBe('test-secret');

    const p = await projects.findOneByOrFail({ slug: 'rihana-plaza-commercial-building' });
    expect(p).toMatchObject({
      no: '16',
      status: ProjectStatus.Published,
      featured: false,
      clientName: '',
      title: { en: 'Rihana Plaza', ar: 'ريحانة بلازا' },
      location: { en: 'Maadi, Cairo, Egypt', ar: 'المعادي، القاهرة، مصر' },
      cover: '/api/uploads/rihana-plaza-commercial-building-01.webp',
    });
    expect(p.gallery).toHaveLength(2);
    expect(existsSync(join(uploads, '_w', 'rihana-plaza-commercial-building-01.1024.webp'))).toBe(true);
    expect((await item('16_rihana-plaza-commercial-building')).state).toBe('published');
    // The unapproved folder is still only a draft.
    expect(await projects.findOneBy({ slug: 'private-twin-villa-riyadh' })).toBeNull();
  });

  it('does nothing on a run with no changes', async () => {
    const files = readdirSync(uploads).length;
    const r = report(await sync.run({ trigger: 'manual' }));
    // The linked project, the published one and the draft still waiting for a decision.
    expect(r.summary).toMatchObject({ unchanged: 3, published: 0, updated: 0, failed: 0 });
    expect(site.rebuilds).toBe(1);
    expect(readdirSync(uploads)).toHaveLength(files);
  });

  it('turns a source change into an update that waits for approval, then applies it and can undo it', async () => {
    await photo(join(source, '16_rihana-plaza-commercial-building', 'night.jpg'), '#a09030');
    await sync.run({ trigger: 'manual' });
    let i = await item('16_rihana-plaza-commercial-building');
    expect(i.state).toBe('pending_review');
    expect(i.issues.join()).toMatch(/review the update to the live page/);
    expect((await projects.findOneByOrFail({ slug: i.slug })).gallery).toHaveLength(2); // live page untouched

    await sync.decide(i.id, 'approve', 'owner@msp.sa');
    const r = report(await sync.run({ trigger: 'manual' }));
    expect(r.updated).toHaveLength(1);
    expect(r.updated[0].changes.map((c) => c.field)).toEqual(['gallery']);
    expect(r.summary.updated).toBe(1);
    expect((await projects.findOneByOrFail({ slug: i.slug })).gallery).toHaveLength(3);

    i = await item('16_rihana-plaza-commercial-building');
    await sync.revert(i.id, 'owner@msp.sa');
    expect((await projects.findOneByOrFail({ slug: i.slug })).gallery).toHaveLength(2);
    await expect(sync.revert(i.id, 'owner@msp.sa')).rejects.toThrow(/Nothing to undo/);
  });

  it('never overwrites a project edited in the CMS since the sync published it', async () => {
    const i = await item('16_rihana-plaza-commercial-building');
    await new Promise((r) => setTimeout(r, 1100));
    await projects.update({ slug: i.slug }, { title: { en: 'Rihana Plaza (edited in the CMS)', ar: 'ريحانة بلازا' }, updatedAt: new Date(Date.now() + 60_000) });
    await photo(join(source, '16_rihana-plaza-commercial-building', 'dusk.jpg'), '#a0a030');
    await sync.run({ trigger: 'manual' });
    await sync.decide(i.id, 'approve', 'owner@msp.sa');
    const r = report(await sync.run({ trigger: 'manual' }));
    expect(r.attention.find((a) => a.folder === i.folderName)?.reasons.join()).toMatch(/Edited in the CMS/);
    expect((await projects.findOneByOrFail({ slug: i.slug })).title.en).toBe('Rihana Plaza (edited in the CMS)');
  });

  it('postpones, reopens and rejects', async () => {
    const i = await item('17_private-twin-villa-riyadh');
    expect((await sync.decide(i.id, 'postpone', 'owner@msp.sa', { note: 'after handover' })).state).toBe('postponed');
    await sync.run({ trigger: 'manual' });
    expect((await item('17_private-twin-villa-riyadh')).state).toBe('postponed');
    expect((await sync.decide(i.id, 'reopen', 'owner@msp.sa')).state).toBe('pending_review');
    expect((await sync.decide(i.id, 'reject', 'owner@msp.sa')).state).toBe('rejected');
    expect(await projects.findOneBy({ slug: 'private-twin-villa-riyadh' })).toBeNull();
  });

  it('rolls back a failed publish (no record, no stray files) and retries it on the next run', async () => {
    const i = await item('17_private-twin-villa-riyadh');
    await sync.decide(i.id, 'reopen', 'owner@msp.sa');
    await sync.editDraft(
      i.id,
      {
        facts: { titleAr: 'فيلا توين خاصة' },
        content: { summaryEn: 'A private twin villa in Riyadh organised around a shared majlis on the ground floor.', summaryAr: 'فيلا توين خاصة في الرياض تنتظم حول مجلس مشترك في الدور الأرضي.' },
      },
      'owner@msp.sa',
    );
    await sync.decide(i.id, 'approve', 'owner@msp.sa', { confirmFacts: true });
    const filesBefore = readdirSync(uploads).sort();

    // The third image fails mid-publish, after two have been written.
    const real = images.prepareImage;
    let calls = 0;
    const spy = jest.spyOn(images, 'prepareImage').mockImplementation(async (...args) => {
      if (++calls === 3) throw new Error('Drive download interrupted');
      return real(...args);
    });
    const r = report(await sync.run({ trigger: 'manual' }));
    spy.mockRestore();

    expect(r.failed).toEqual([{ folder: '17_private-twin-villa-riyadh', error: 'Drive download interrupted' }]);
    expect(await projects.findOneBy({ slug: 'private-twin-villa-riyadh' })).toBeNull();
    expect(readdirSync(uploads).sort()).toEqual(filesBefore); // the two written images were removed
    expect(readdirSync(join(uploads, '_w')).filter((f) => f.startsWith('private-twin'))).toEqual([]);
    expect(await item('17_private-twin-villa-riyadh')).toMatchObject({ state: 'failed', attempts: 1 });

    // The next run retries on its own and succeeds.
    const again = report(await sync.run({ trigger: 'manual' }));
    expect(again.created.map((c) => [c.folder, c.outcome])).toEqual([['17_private-twin-villa-riyadh', 'published']]);
    expect(await item('17_private-twin-villa-riyadh')).toMatchObject({ state: 'published', attempts: 0 });
  });

  it('flags a folder that disappears and keeps its project', async () => {
    renameSync(join(source, '16_rihana-plaza-commercial-building'), join(source, '_16_archived'));
    const r = report(await sync.run({ trigger: 'manual' }));
    expect(r.attention.map((a) => a.reasons.join())).toEqual(expect.arrayContaining([expect.stringMatching(/NOT removed from the site/)]));
    expect((await item('16_rihana-plaza-commercial-building')).state).toBe('missing_from_source');
    expect(await projects.findOneBy({ slug: 'rihana-plaza-commercial-building' })).not.toBeNull();
    renameSync(join(source, '_16_archived'), join(source, '16_rihana-plaza-commercial-building'));
  });
});

describe('register', () => {
  it('approves from the sheet only when every critical fact is verified, and publishes in the same run', async () => {
    const dir = join(source, '20_radisson-blu-hotel-suites');
    await photo(join(dir, '01.jpg'), '#405060');
    await photo(join(dir, '02.jpg'), '#506070');
    await photo(join(dir, '03.jpg'), '#607080');
    const header = 'folder,approved_for_web,title_en,title_ar,location_en,location_ar,sectors,design_categories,summary_en,summary_ar';
    const row = (extra: string) =>
      `20_radisson-blu-hotel-suites,YES,Radisson Blu Hotel Suites,راديسون بلو للأجنحة الفندقية,${extra},"Hotel suites whose interiors pair warm timber with stone in the public areas.","أجنحة فندقية تجمع تصاميمها الداخلية بين الخشب الدافئ والحجر في المناطق العامة."`;
    const write = (body: string) => require('fs').writeFileSync(join(source, '_register.csv'), `${header}\n${body}\n`);

    // YES, but the location is missing: the draft waits and says why.
    write(row('"",""' + ',hospitality,interiors'));
    await sync.run({ trigger: 'manual' });
    expect(await item('20_radisson-blu-hotel-suites')).toMatchObject({ state: 'pending_review', issues: [expect.stringMatching(/Approved in the register, but first: Location \(English\) is missing/)] });

    // Completed in the sheet: approved by the register and published in the same run.
    write(row('"Riyadh, Saudi Arabia","الرياض، المملكة العربية السعودية",hospitality,interiors'));
    const r = report(await sync.run({ trigger: 'manual' }));
    expect(r.created.map((c) => [c.name, c.outcome])).toEqual([['Radisson Blu Hotel Suites', 'published']]);
    expect(await item('20_radisson-blu-hotel-suites')).toMatchObject({ state: 'published', decidedBy: 'the _REGISTER sheet' });
    require('fs').unlinkSync(join(source, '_register.csv'));
  });
});

describe('scheduling safety', () => {
  it('runs a slot at most once and never two runs at a time', async () => {
    expect(await sync.run({ trigger: 'schedule', slot: '2026-10-30T05:00Z' })).not.toBeNull();
    expect(await sync.run({ trigger: 'schedule', slot: '2026-10-30T05:00Z' })).toBeNull();

    const [a, b] = await Promise.all([sync.run({ trigger: 'manual', slot: 'parallel-a' }), sync.run({ trigger: 'manual', slot: 'parallel-b' })]);
    expect([a!.status, b!.status]).toContain('skipped');
  });

  it('records a skipped run when paused, and runs again when resumed', async () => {
    await sync.setEnabled(false, 'owner@msp.sa');
    await (sync as unknown as { fireSlot(at: Date, t: string): Promise<void> }).fireSlot(new Date('2026-10-30T16:00:00Z'), 'schedule');
    const runs = app.get<Repository<ProjectSyncRun>>(getRepositoryToken(ProjectSyncRun));
    expect(await runs.findOneByOrFail({ slot: '2026-10-30T16:00Z' })).toMatchObject({ status: 'skipped', error: expect.stringMatching(/paused/) });
    await sync.setEnabled(true, 'owner@msp.sa');
    expect((await sync.status()).enabled).toBe(true);
  });

  it('closes runs interrupted by a restart', async () => {
    const c = db();
    await c.connect();
    await c.query(`INSERT INTO project_sync_runs (slot, trigger, status, created_at) VALUES ('stale', 'schedule', 'running', now() - interval '3 hours')`);
    await c.end();
    process.env.PROJECT_SYNC_SCHEDULE = 'on';
    process.env.PROJECT_SYNC_CATCH_UP_DELAY_MS = '3600000';
    await sync.onApplicationBootstrap();
    sync.onApplicationShutdown();
    process.env.PROJECT_SYNC_SCHEDULE = 'off';
    const runs = app.get<Repository<ProjectSyncRun>>(getRepositoryToken(ProjectSyncRun));
    expect(await runs.findOneByOrFail({ slot: 'stale' })).toMatchObject({ status: 'failed', error: expect.stringMatching(/Interrupted/) });
  });
});
