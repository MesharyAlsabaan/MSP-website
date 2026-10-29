import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { existsSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from 'fs';
import * as images from '../../src/modules/project-sync/images';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import sharp from 'sharp';
import { DataSource, Repository } from 'typeorm';
import configuration from '../../src/config/configuration';
import { dataSourceOptions } from '../../src/database/data-source';
import { Project, ProjectStatus } from '../../src/modules/projects/entities/project.entity';
import { ProjectDraft } from '../../src/modules/project-sync/draft';
import { mergeOutput } from '../../src/modules/project-sync/drafter';
import { ProjectSyncItem, ProjectSyncRun } from '../../src/modules/project-sync/entities/project-sync.entity';
import { ProjectSyncModule } from '../../src/modules/project-sync/project-sync.module';
import { ProjectSyncService } from '../../src/modules/project-sync/project-sync.service';
import { SyncReport } from '../../src/modules/project-sync/report';
import { SITE_PORT, SMTP_PORT, TEST_DB } from './env';
import { createDatabase, db, dropDatabase, FakeSite, MailSink, photo, picture } from './harness';

/**
 * The whole sync against a real PostgreSQL, a real folder of images, a fake
 * website that only shows a page after a rebuild, and a mail sink:
 * migrations (up, down, up), automatic publishing from the folder, live
 * verification, image sync for existing projects, duplicate detection,
 * updates that keep CMS edits, undo, hold/resume, failures with rollback,
 * missing details, missing folders, locking and pausing.
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
let runs: Repository<ProjectSyncRun>;

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
const project = (slug: string) => projects.findOneByOrFail({ slug });
const report = (run: ProjectSyncRun | null) => run!.report as SyncReport;
const syncRun = async () => report(await sync.run({ trigger: 'manual', requestedBy: 'test' }));
const madinahCover = '/api/uploads/madinah-hotel-01.webp';
const madinahManual = '/api/uploads/madinah-hotel-manual.webp';

beforeAll(async () => {
  await createDatabase(TEST_DB);
  await Promise.all([site.start(), mail.start()]);

  // The source folder, laid out like the studio's Drive.
  await photo(join(source, '07_madinah-hotel', '1.jpg'), '#102030');
  await photo(join(source, '07_madinah-hotel', '2.jpg'), '#203040');
  await photo(join(source, '07_madinah-hotel', '3.jpg'), '#304050');
  await photo(join(source, '16_rihana-plaza-commercial-building', 'facade.jpg'), '#a05030');
  await photo(join(source, '16_rihana-plaza-commercial-building', 'facade-web.jpg'), '#a05030', 1400, 1050); // same picture, smaller
  await photo(join(source, '16_rihana-plaza-commercial-building', 'street.jpg'), '#a06030');
  await photo(join(source, '16_rihana-plaza-commercial-building', 'INT', 'lobby.jpg'), '#a07030');
  await photo(join(source, '16_rihana-plaza-commercial-building', 'INT', 'lobby-copy.jpg'), '#a07030'); // identical bytes
  await photo(join(source, '16_rihana-plaza-commercial-building', 'thumb.jpg'), '#a08030', 800, 600); // too small
  await photo(join(source, '17_private-twin-villa-riyadh', 'RENDER', '1-Ground Floor', '01- Majlis', 'a.jpg'), '#305020');
  await photo(join(source, '17_private-twin-villa-riyadh', 'RENDER', '1-Ground Floor', '01- Majlis', 'b.jpg'), '#306020');
  await photo(join(source, '17_private-twin-villa-riyadh', 'RENDER', '2-First Floor', 'c.jpg'), '#307020');
  await photo(join(source, '17_private-twin-villa-riyadh', 'RENDER', '2-First Floor', '001_CoronaLight1886.jpg'), '#308020'); // render pass
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
      `INSERT INTO projects (slug, no, title, typology, location, summary, status, client_name, cover, gallery) VALUES
       ('madinah-hotel', '07', '{"en":"Madinah Hotel","ar":"فندق المدينة"}', '{"key":"hospitality","en":"Hospitality","ar":"ضيافة"}', '{"en":"Madinah, Saudi Arabia","ar":"المدينة المنورة"}', '{"en":"A hotel written in the CMS.","ar":"فندق."}', 'published', 'Client kept', '${madinahCover}', '["${madinahManual}"]')`,
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
    runs = app.get(getRepositoryToken(ProjectSyncRun));

    expect(await existingData(check)).toBe(before);
    await check.destroy();

    // The existing project's images on disk, as the CMS uploaded them: its cover is
    // folder image 1.jpg converted to webp (other bytes, same picture); the other was uploaded by hand.
    writeFileSync(join(uploads, 'madinah-hotel-01.webp'), await sharp(await picture('#102030')).resize(1600).webp({ quality: 80 }).toBuffer());
    writeFileSync(join(uploads, 'madinah-hotel-manual.webp'), await sharp(await picture('#999999')).webp().toBuffer());
  });
});

describe('automatic publishing', () => {
  it('first run: publishes every new folder, links the existing project without touching it, rebuilds once', async () => {
    const r = await syncRun();
    expect(r.summary).toMatchObject({ scanned: 4, linked: 1, newDetected: 2, published: 2, notPublished: 0, attention: 1, failed: 0 });
    expect(r.created.map((c) => [c.name, c.outcome])).toEqual([
      ['Rihana Plaza Commercial Building', 'published'],
      ['Private Twin Villa', 'published'],
    ]);
    expect(r.linked).toEqual([expect.objectContaining({ folder: '07_madinah-hotel', name: 'Madinah Hotel', sourceImages: 3, onSite: 1 })]);
    expect(r.attention[0]).toMatchObject({ folder: 'Diyari Irqah (old)', reasons: [expect.stringMatching(/NN_project-name/)] });
    expect(site.rebuilds).toBe(1);
    expect(site.lastSecret).toBe('test-secret');

    const p16 = await project('rihana-plaza-commercial-building');
    expect(p16).toMatchObject({
      no: '16',
      status: ProjectStatus.Published,
      featured: false,
      clientName: '',
      title: { en: 'Rihana Plaza Commercial Building', ar: 'Rihana Plaza Commercial Building' },
      location: { en: '', ar: '' }, // not in the folder name: not guessed
      summary: { en: 'Rihana Plaza Commercial Building — an architecture and interior design project by MSP.' },
      cover: '/api/uploads/rihana-plaza-commercial-building-01.webp',
    });
    expect(p16.sectors.map((s) => s.key)).toEqual(['commercial']);
    expect(p16.gallery).toHaveLength(2); // facade, lobby, street: one copy and one smaller twin left out
    expect(existsSync(join(uploads, '_w', 'rihana-plaza-commercial-building-01.1024.webp'))).toBe(true);

    const p17 = await project('private-twin-villa-riyadh');
    expect(p17.location).toEqual({ en: 'Riyadh, Saudi Arabia', ar: 'الرياض، المملكة العربية السعودية' });
    expect(p17.gallery).toHaveLength(2); // a, b, c — the render pass is not used

    // The existing project is exactly as the CMS left it, and none of its images were uploaded again.
    expect(await project('madinah-hotel')).toMatchObject({ cover: madinahCover, gallery: [madinahManual], clientName: 'Client kept', summary: { en: 'A hotel written in the CMS.' } });
    expect(readdirSync(uploads).filter((f) => f.startsWith('madinah-hotel'))).toEqual(['madinah-hotel-01.webp', 'madinah-hotel-manual.webp']);
    expect(await item('07_madinah-hotel')).toMatchObject({ mode: 'linked', state: 'linked' });
  });

  it('reports what was published, what is missing and what was left out, by email', async () => {
    const text = mail.lastText();
    expect(mail.messages.at(-1)!.to.join()).toMatch(/owner@example.test/);
    for (const h of ['NEW PROJECTS PUBLISHED', 'UPDATED PROJECTS', 'EXISTING PROJECTS LINKED', 'MISSING DETAILS', 'NOT PUBLISHED YET', 'NEEDS ATTENTION', 'ERRORS', 'REQUIRED ACTIONS']) expect(text).toContain(h);
    expect(text).not.toMatch(/approv/i);
    expect(text).toMatch(/Rihana Plaza Commercial Building: location; Arabic title/);
    expect(text).toMatch(/1 of 3 folder image\(s\) already on the page/);
    expect(text).toMatch(/set ANTHROPIC_API_KEY/);
  });

  it("keeps the draft with each fact's source, the checked images and private previews", async () => {
    const i = await item('16_rihana-plaza-commercial-building');
    expect(i.state).toBe('published');
    const d = i.draft!;
    expect(d.facts.titleEn).toMatchObject({ value: 'Rihana Plaza Commercial Building', source: 'folder' });
    expect(d.facts.designCategories.value).toEqual(['architecture', 'interiors']); // INT sub-folder
    const byPath = Object.fromEntries(d.images.map((x) => [x.path, x]));
    expect(byPath['facade.jpg']).toMatchObject({ included: true });
    expect(byPath['facade-web.jpg']).toMatchObject({ included: false, problem: 'same picture as facade.jpg' });
    expect(byPath['INT/lobby-copy.jpg']).toMatchObject({ included: true });
    expect(byPath['INT/lobby.jpg']).toBeUndefined(); // identical bytes: listed once
    expect(byPath['thumb.jpg'].problem).toMatch(/too small/);
    expect(d.notes.join()).toMatch(/1 identical copy\(ies\) skipped, e\.g\. lobby\.jpg/);
    expect(d.notes.join()).toMatch(/1 smaller copy\(ies\) of the same picture skipped/);
    expect((await item('17_private-twin-villa-riyadh')).draft!.notes.join()).toMatch(/1 render-pass file/);

    const preview = await sync.preview(i.id, d.images[0].md5);
    expect(preview.subarray(8, 12).toString()).toBe('WEBP');
    expect(resolve(process.env.PROJECT_SYNC_PREVIEW_DIR!).startsWith(uploads)).toBe(false);
    await expect(sync.preview(i.id, 'f'.repeat(32))).rejects.toThrow(/not found/i);
  });

  it('does nothing on a run with no changes', async () => {
    const files = readdirSync(uploads).length;
    const r = await syncRun();
    expect(r.summary).toMatchObject({ unchanged: 3, published: 0, updated: 0, failed: 0 });
    expect(site.rebuilds).toBe(1);
    expect(readdirSync(uploads)).toHaveLength(files);
    expect(await projects.count()).toBe(3);
  });
});

describe('existing projects', () => {
  it('syncs new and replaced folder images to an existing project, never its text, and can undo it', async () => {
    await photo(join(source, '07_madinah-hotel', '4.jpg'), '#405060'); // new
    await photo(join(source, '07_madinah-hotel', '1.jpg'), '#109930'); // replaced: the cover's source file changed
    const r = await syncRun();
    expect(r.summary).toMatchObject({ updated: 1, published: 0 });
    expect(r.updated[0]).toMatchObject({ folder: '07_madinah-hotel', imagesAdded: 1, imagesReplaced: 1, outcome: 'updated', text: expect.stringMatching(/text kept as in the CMS/) });
    expect(r.updated[0].changes.map((c) => c.field)).toEqual(['cover', 'gallery']);

    const p = await project('madinah-hotel');
    expect(p.cover).not.toBe(madinahCover); // replaced in place
    expect(p.gallery).toEqual([madinahManual, expect.stringMatching(/^\/api\/uploads\/madinah-hotel-\d+\.webp$/)]);
    expect(p).toMatchObject({ clientName: 'Client kept', title: { en: 'Madinah Hotel' }, summary: { en: 'A hotel written in the CMS.' } });
    expect(existsSync(join(uploads, 'madinah-hotel-01.webp'))).toBe(true); // kept for undo
    expect(site.rebuilds).toBe(2);

    await sync.revert((await item('07_madinah-hotel')).id, 'owner@msp.sa');
    expect(await project('madinah-hotel')).toMatchObject({ cover: madinahCover, gallery: [madinahManual] });
    // The undo stands until the folder changes again.
    expect((await syncRun()).summary.updated).toBe(0);
  });
});

describe('updates', () => {
  it('applies folder changes to a sync page, keeping every edit made in the CMS', async () => {
    const slug = 'rihana-plaza-commercial-building';
    const before = await project(slug);
    const removed = before.gallery[1];
    // In the CMS: the title is reworded, one image removed and one of the studio's own added.
    await projects.update({ slug }, { title: { en: 'Rihana Plaza (CMS)', ar: 'ريحانة بلازا' }, gallery: [before.gallery[0], '/api/uploads/mine.webp'] });
    await photo(join(source, '16_rihana-plaza-commercial-building', 'night.jpg'), '#a09030');

    const r = await syncRun();
    expect(r.updated).toHaveLength(1);
    expect(r.updated[0]).toMatchObject({ imagesAdded: 1, keptEdits: ['title'] });
    const after = await project(slug);
    expect(after.title.en).toBe('Rihana Plaza (CMS)');
    expect(after.slug).toBe(slug);
    expect(after.gallery).toEqual([before.gallery[0], '/api/uploads/mine.webp', expect.stringMatching(/rihana-plaza-commercial-building-\d+\.webp/)]);
    expect(after.gallery).not.toContain(removed); // removed by a person: not brought back

    await sync.revert((await item('16_rihana-plaza-commercial-building')).id, 'owner@msp.sa');
    expect((await project(slug)).gallery).toEqual([before.gallery[0], '/api/uploads/mine.webp']);
    await expect(sync.revert((await item('16_rihana-plaza-commercial-building')).id, 'owner@msp.sa')).rejects.toThrow(/Nothing to undo/);
  });

  it('publishes a correction made in the admin, at once with Publish now', async () => {
    const i = await item('17_private-twin-villa-riyadh');
    const edited = await sync.editDraft(i.id, { facts: { titleAr: 'فيلا توين خاصة' } }, 'owner@msp.sa');
    expect(edited.state).toBe('approved');
    expect(edited.missing).not.toContain('Arabic title (the English title is shown on the Arabic page)');

    await sync.decide(i.id, 'publish', 'owner@msp.sa');
    for (let n = 0; n < 100 && !(await runs.findOneBy({ trigger: 'publish-now' }))?.finishedAt; n++) await new Promise((r) => setTimeout(r, 100));
    const run = await runs.findOneByOrFail({ trigger: 'publish-now' });
    expect(report(run).updated[0].changes.map((c) => c.field)).toEqual(['title (ar)', 'summary (ar)']);
    expect((await project('private-twin-villa-riyadh')).title).toEqual({ en: 'Private Twin Villa', ar: 'فيلا توين خاصة' });
    expect((await project('private-twin-villa-riyadh')).summary.ar).toBe('فيلا توين خاصة — مشروع معماري من MSP في الرياض، المملكة العربية السعودية.');
  });

  it('holds a folder (no updates) and resumes it', async () => {
    const i = await item('17_private-twin-villa-riyadh');
    expect((await sync.decide(i.id, 'hold', 'owner@msp.sa')).state).toBe('postponed');
    await photo(join(source, '17_private-twin-villa-riyadh', 'RENDER', '2-First Floor', 'd.jpg'), '#30a020');
    const held = await syncRun();
    expect(held.summary).toMatchObject({ held: 1, updated: 0 });
    expect((await project('private-twin-villa-riyadh')).gallery).toHaveLength(2);

    await sync.decide(i.id, 'resume', 'owner@msp.sa');
    expect((await syncRun()).summary.updated).toBe(1);
    expect((await project('private-twin-villa-riyadh')).gallery).toHaveLength(3);
  });
});

describe('failures and gaps', () => {
  it('rolls back a failed publish (no record, no stray files) and retries it on the next run', async () => {
    const dir = join(source, '18_garden-pavilion');
    await photo(join(dir, '01.jpg'), '#405061');
    await photo(join(dir, '02.jpg'), '#506071');
    await photo(join(dir, '03.jpg'), '#607081');
    const filesBefore = readdirSync(uploads).sort();

    // The third image fails mid-publish, after two have been written.
    const real = images.prepareImage;
    let calls = 0;
    const spy = jest.spyOn(images, 'prepareImage').mockImplementation(async (...args) => {
      if (++calls === 3) throw new Error('Drive download interrupted');
      return real(...args);
    });
    const r = await syncRun();
    spy.mockRestore();

    expect(r.failed).toEqual([{ folder: '18_garden-pavilion', error: 'Drive download interrupted' }]);
    expect(await projects.findOneBy({ slug: 'garden-pavilion' })).toBeNull();
    expect(readdirSync(uploads).sort()).toEqual(filesBefore); // the two written images were removed
    expect(readdirSync(join(uploads, '_w')).filter((f) => f.startsWith('garden-pavilion'))).toEqual([]);
    expect(await item('18_garden-pavilion')).toMatchObject({ state: 'failed', attempts: 1 });

    // The next run retries on its own and succeeds.
    const again = await syncRun();
    expect(again.created.map((c) => [c.folder, c.outcome])).toEqual([['18_garden-pavilion', 'published']]);
    expect(await item('18_garden-pavilion')).toMatchObject({ state: 'published', attempts: 0 });
  });

  it('does not publish a folder without a usable image, and says why', async () => {
    await photo(join(source, '19_empty-pavilion', 'tiny.jpg'), '#123456', 600, 400);
    const r = await syncRun();
    expect(r.notPublished).toEqual([{ folder: '19_empty-pavilion', name: 'Empty Pavilion', reasons: ['No usable image in the folder'] }]);
    expect(await projects.findOneBy({ slug: 'empty-pavilion' })).toBeNull();
    expect(await item('19_empty-pavilion')).toMatchObject({ state: 'draft' });
    expect(mail.lastText()).toMatch(/NOT PUBLISHED YET\n- Empty Pavilion {2}\[19_empty-pavilion\]: No usable image in the folder/);
    rmSync(join(source, '19_empty-pavilion'), { recursive: true });
  });

  it('gives sync pages full text once the AI is available, keeping CMS and admin edits', async () => {
    const holder = sync as unknown as { drafter: unknown };
    const real = holder.drafter;
    holder.drafter = {
      enabled: true,
      model: 'test-model',
      draft: async (_folder: string, _paths: string[], d: ProjectDraft) =>
        mergeOutput(
          d,
          {
            title_ar: `${d.facts.titleEn.value} بالعربية`,
            location_ar: '',
            visual_notes: ['Layered volumes'],
            summary_en: `${d.facts.titleEn.value}: layered volumes around a shaded court.`,
            summary_ar: `${d.facts.titleEn.value}: كتل متدرجة حول فناء مظلل.`,
            description_en: ['The volumes step back.'],
            description_ar: ['تتراجع الكتل تدريجياً.'],
          },
          'test-model',
          [],
        ),
    };
    try {
      const r = await syncRun();
      // Every sync page still carrying the factual summary is upgraded; the existing CMS project is not.
      expect(r.updated.map((u) => u.folder).sort()).toEqual(['16_rihana-plaza-commercial-building', '17_private-twin-villa-riyadh', '18_garden-pavilion']);
      const p16 = await project('rihana-plaza-commercial-building');
      expect(p16.summary.en).toBe('Rihana Plaza Commercial Building: layered volumes around a shaded court.');
      expect(p16.description).toEqual([{ en: 'The volumes step back.', ar: 'تتراجع الكتل تدريجياً.' }]);
      expect(p16.title.en).toBe('Rihana Plaza (CMS)'); // still the CMS edit
      expect((await project('private-twin-villa-riyadh')).title.ar).toBe('فيلا توين خاصة'); // the admin edit
      expect(r.updated.find((u) => u.folder === '18_garden-pavilion')!.text).toMatch(/Written by the AI/);
      expect((await project('madinah-hotel')).summary.en).toBe('A hotel written in the CMS.');
    } finally {
      holder.drafter = real;
    }
  });

  it('flags a folder that disappears and keeps its project', async () => {
    renameSync(join(source, '16_rihana-plaza-commercial-building'), join(source, '_16_archived'));
    const r = await syncRun();
    expect(r.attention.map((a) => a.reasons.join())).toEqual(expect.arrayContaining([expect.stringMatching(/NOT removed from the site/)]));
    expect((await item('16_rihana-plaza-commercial-building')).state).toBe('missing_from_source');
    expect(await projects.findOneBy({ slug: 'rihana-plaza-commercial-building' })).not.toBeNull();
    renameSync(join(source, '_16_archived'), join(source, '16_rihana-plaza-commercial-building'));
  });

  it('never creates a duplicate project over many runs', async () => {
    await syncRun();
    const slugs = (await projects.find()).map((p) => p.slug).sort();
    expect(slugs).toEqual(['garden-pavilion', 'madinah-hotel', 'private-twin-villa-riyadh', 'rihana-plaza-commercial-building']);
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
    expect(await runs.findOneByOrFail({ slot: 'stale' })).toMatchObject({ status: 'failed', error: expect.stringMatching(/Interrupted/) });
  });
});
