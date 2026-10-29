import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { buildFields, diffFields, duplicateSummary, mergeGallery, ownedFields } from './content';
import { applyEdit, deriveFromFolder, DraftImage, draftHash, emptyDraft, fallbackText, galleryOrder, ProjectDraft, publishable, readiness, suggest } from './draft';
import { checkText, DrafterOutput, mergeOutput } from './drafter';
import { distance, fingerprint, isRenderPass, orderImages, prepareImage, PreviewStore, SAME_PICTURE, samePicture, storeImage } from './images';
import { LocalSource } from './local-source';
import { KnownItem, MAX_ATTEMPTS, plan, SiteProject, sourceHash } from './planner';
import { emptyReport, formatReport, reportSubject } from './report';
import { nextSlot, parseTimes, previousSlot, slotKey } from './schedule';
import { parseFolderName, SourceFile, SourceFolder } from './source';

const img = (path: string, md5 = path): SourceFile => ({ id: `id-${path}`, path, mimeType: 'image/jpeg', size: 1, md5, modifiedTime: '2026-10-01T00:00:00Z' });
const folder = (name: string, files = [img('1.jpg'), img('2.jpg'), img('3.jpg')], id = `F-${name}`): SourceFolder => ({ id, name, files });

describe('folder names', () => {
  it('reads "NN_slug" names', () => {
    expect(parseFolderName('16_rihana-plaza-commercial-building')).toEqual({ no: '16', slug: 'rihana-plaza-commercial-building' });
    expect(parseFolderName('7_madinah-hotel')).toEqual({ no: '07', slug: 'madinah-hotel' });
    expect(parseFolderName('دياري عرقه')).toBeNull();
  });
});

describe('planner', () => {
  const madinah: SiteProject = { id: 'p-madinah', slug: 'madinah-hotel', no: '07', updatedAt: new Date('2026-10-01') };
  const sbc: SiteProject = { id: 'p-sbc', slug: 'SBC', no: '08', updatedAt: new Date('2026-10-01') };
  const f16 = folder('16_rihana-plaza-commercial-building');
  const hash16 = sourceHash(f16.name, orderImages(f16.files));
  const known = (over: Partial<KnownItem>): KnownItem => ({
    sourceFolderId: f16.id, slug: 'rihana-plaza-commercial-building', mode: 'owned', state: 'published', sourceHash: hash16, projectId: 'p1', attempts: 0, ...over,
  });
  const live: SiteProject = { id: 'p1', slug: 'rihana-plaza-commercial-building', no: '16', updatedAt: new Date('2026-10-02T00:00:00Z') };
  const act = (items: KnownItem[], projects: SiteProject[] = [live], f = f16) => plan({ folders: [f], items, projects }).folders[0].action;

  it('prepares a new folder for publishing, with no register and no approval step', () => {
    expect(act([], [])).toEqual({ kind: 'prepare', reason: 'new' });
  });

  it('links folders matching an existing site project by slug or number instead of duplicating it', () => {
    const p = plan({ folders: [folder('07_madinah-hotel'), folder('08_sbc-commercial-office')], items: [], projects: [madinah, sbc] });
    expect(p.folders.map((f) => f.action)).toEqual([
      { kind: 'link', project: madinah, how: 'slug' },
      { kind: 'link', project: sbc, how: 'number 08' },
    ]);
  });

  it('never links a second folder to a project already kept in step with one', () => {
    const linked: KnownItem = { sourceFolderId: 'other', slug: 'madinah-hotel', mode: 'linked', state: 'linked', sourceHash: 'h', projectId: madinah.id, attempts: 0 };
    expect(plan({ folders: [folder('07_madinah-hotel-copy')], items: [linked], projects: [madinah] }).folders[0].action).toMatchObject({ kind: 'review' });
  });

  it('is a no-op when nothing changed, and updates when the folder changes', () => {
    expect(act([known({})]).kind).toBe('unchanged');
    expect(act([known({ sourceHash: 'old' })])).toEqual({ kind: 'prepare', reason: 'source-changed', project: live });
  });

  it('keeps existing projects in step with their folder (images), like sync pages', () => {
    const f = folder('07_madinah-hotel');
    const item: KnownItem = { sourceFolderId: f.id, slug: 'madinah-hotel', mode: 'linked', state: 'linked', sourceHash: 'old', projectId: madinah.id, attempts: 0 };
    expect(act([item], [madinah], f)).toEqual({ kind: 'prepare', reason: 'source-changed', project: madinah });
  });

  it('publishes admin edits and retries failures, then stops after repeated failures', () => {
    expect(act([known({ state: 'approved' })])).toEqual({ kind: 'publish', project: live });
    expect(act([known({ state: 'failed', attempts: 1 })]).kind).toBe('publish');
    expect(act([known({ state: 'failed', attempts: MAX_ATTEMPTS })]).kind).toBe('review');
  });

  it('leaves a folder on hold alone, even when it changes', () => {
    expect(act([known({ state: 'postponed', sourceHash: 'old' })])).toEqual({ kind: 'unchanged', held: true });
  });

  it('retries a folder that could not be published', () => {
    expect(act([known({ state: 'draft', projectId: null })], [])).toEqual({ kind: 'prepare', reason: 'retry-draft', project: undefined });
  });

  it('keeps the page URL when a published folder is renamed', () => {
    const renamed = { ...f16, name: '16_rihana-plaza-mall' };
    const p = plan({ folders: [renamed], items: [known({})], projects: [live] }).folders[0];
    expect(p.slug).toBe('rihana-plaza-commercial-building');
    expect(p.action.kind).toBe('prepare');
  });

  it('does not recreate a project deleted from the site', () => {
    expect(act([known({ projectId: 'deleted' })], [])).toMatchObject({ kind: 'review' });
  });

  it('flags folders that disappeared instead of deleting their projects', () => {
    const item: KnownItem = { sourceFolderId: 'gone', slug: 'x', mode: 'owned', state: 'published', sourceHash: 'h', projectId: 'p', attempts: 0 };
    expect(plan({ folders: [], items: [item], projects: [] }).missing).toEqual([item]);
  });

  it('refuses two folders claiming one slug, a slug taken on the site, and bad folder names', () => {
    const p = plan({ folders: [folder('16_rihana', undefined, 'A'), folder('17_rihana', undefined, 'B'), folder('دياري عرقه')], items: [], projects: [] });
    expect(p.folders[1].action).toMatchObject({ kind: 'review', reasons: [expect.stringMatching(/already publishes "rihana"/)] });
    expect(p.folders[2].action).toMatchObject({ kind: 'review', reasons: [expect.stringMatching(/NN_project-name/)] });
  });
});

const usable = (n: number): DraftImage[] =>
  Array.from({ length: n }, (_, i) => ({ sourceId: `s${i}`, path: `${i}.jpg`, md5: `m${i}`, width: 2000, height: 1500, included: true }));

/** A draft as the sync builds it from folder 16's name, before any text. */
function draft16(): ProjectDraft {
  const d = emptyDraft();
  suggest(d, deriveFromFolder('16_rihana-plaza-commercial-building-cairo', ['a.jpg']));
  d.images = usable(4);
  return d;
}

describe('draft', () => {
  it('takes facts from the folder name as published facts, and guesses nothing else', () => {
    const f = deriveFromFolder('17_private-twin-villa-riyadh', ['RENDER/2-First Floor/a.jpg']);
    expect(f.titleEn).toMatchObject({ value: 'Private Twin Villa', source: 'folder' });
    expect(f.locationEn).toMatchObject({ value: 'Riyadh, Saudi Arabia', source: 'folder' });
    expect(f.locationAr?.value).toBe('الرياض، المملكة العربية السعودية');
    expect(f.sectors?.value).toEqual(['residential']);
    expect(f.designCategories?.value).toEqual(['architecture']);
    expect(publishable('locationEn', f.locationEn!)).toBe(true);

    expect(deriveFromFolder('29_bic-corporate-office-interior', []).designCategories?.value).toEqual(['interiors']);
    expect(deriveFromFolder('08_sbc-commercial-office', []).titleEn?.value).toBe('SBC Commercial Office');
    expect(deriveFromFolder('42_private-residential-villa-stacked-volumes', ['INT/3.jpg']).designCategories?.value).toEqual(['architecture', 'interiors']);
    expect(deriveFromFolder('20_radisson-blu-hotel-suites', []).sectors?.value).toEqual(['hospitality']);
    // No place in the name: no location is guessed.
    expect(deriveFromFolder('19_al-ateeq-commercial-residential-al-qirawan', []).locationEn).toBeUndefined();
  });

  it('follows a renamed folder, but never overrides what the owner typed in the admin', () => {
    const d = draft16();
    d.facts.year = { value: '2024', source: 'owner' };
    d.facts.titleEn = { value: 'Rihana Plaza', source: 'owner' };
    suggest(d, deriveFromFolder('16_rihana-plaza-commercial-building', []));
    expect(d.facts.titleEn.value).toBe('Rihana Plaza');
    expect(d.facts.year.value).toBe('2024');
    // The city was removed from the folder name: the location it gave is removed too.
    expect(d.facts.locationEn.value).toBe('');
  });

  it('publishes with what is known and reports what is missing; blocks only a page that cannot exist', () => {
    const d = draft16();
    fallbackText(d);
    const r = readiness(d, 3);
    expect(r.blocking).toEqual([]);
    expect(r.missing).toEqual(['Arabic title (the English title is shown on the Arabic page)', 'written description (only a one-line factual summary is published)']);

    const bare = emptyDraft();
    suggest(bare, deriveFromFolder('31_private-house', []));
    expect(readiness(bare, 3).blocking).toEqual(['No usable image in the folder']);
    expect(readiness(bare, 3).missing).toContain('location');
  });

  it('still blocks wrong script and mismatched paragraphs', () => {
    const d = draft16();
    d.facts.titleAr = { value: 'Rihana', source: 'owner' };
    d.content.descriptionEn = { value: ['One.'], source: 'owner' };
    const b = readiness(d, 3).blocking.join('\n');
    expect(b).toMatch(/Arabic title is not in Arabic/);
    expect(b).toMatch(/1 paragraph\(s\) and the Arabic 0/);
  });

  it('builds a factual one-line summary when there is no AI text, and never over written text', () => {
    const d = draft16();
    fallbackText(d);
    expect(d.content.summaryEn.value).toBe('Rihana Plaza Commercial Building — an architecture project by MSP in Cairo, Egypt.');
    expect(d.content.summaryAr.value).toBe('Rihana Plaza Commercial Building — مشروع معماري من MSP في القاهرة، مصر.');
    expect(d.content.summaryEn.source).toBe('template');
    d.content.summaryEn = { value: 'Written by the studio.', source: 'owner' };
    fallbackText(d);
    expect(d.content.summaryEn.value).toBe('Written by the studio.');
  });

  it('records edits as owner facts and changes the draft hash', () => {
    const d = draft16();
    const before = draftHash(d);
    applyEdit(d, { facts: { titleEn: '  Rihana   Plaza ', sectors: ['commercial', 'work'] }, images: { m3: false }, cover: 'm2' }, 'owner@msp.sa');
    expect(d.facts.titleEn).toMatchObject({ value: 'Rihana Plaza', source: 'owner' });
    expect(d.facts.sectors.value).toEqual(['commercial', 'work']);
    expect(galleryOrder(d).map((i) => i.md5)).toEqual(['m2', 'm0', 'm1']);
    expect(draftHash(d)).not.toBe(before);
    expect(() => applyEdit(d, { facts: { clientName: 'x' } as never }, 'x')).toThrow(/Unknown field/);
    expect(() => applyEdit(d, { cover: 'nope' }, 'x')).toThrow(/cover/);
  });
});

describe('AI drafter output', () => {
  const out = (over: Partial<DrafterOutput> = {}): DrafterOutput => ({
    title_ar: 'مبنى ريحانة بلازا التجاري',
    location_ar: 'القاهرة، مصر',
    visual_notes: ['Stepped glass facade', 'Ground-floor shopfronts'],
    summary_en: 'A commercial building whose glazed facade steps back at the upper floors above street-level shopfronts.',
    summary_ar: 'مبنى تجاري تتراجع واجهته الزجاجية في الأدوار العليا فوق محلات على مستوى الشارع.',
    description_en: ['The facade steps back.'],
    description_ar: ['تتراجع الواجهة تدريجياً.'],
    ...over,
  });

  it('accepts text that only describes what is visible', () => {
    expect(checkText(out(), '16_rihana-plaza-commercial-building')).toEqual([]);
  });

  it('rejects invented numbers and unsupported claims, in both languages', () => {
    expect(checkText(out({ summary_en: 'A 12-storey tower of 40,000 m² completed in 2019.' }), '16_x').join()).toMatch(/numbers not in the facts: 12, 40, 000, 2019/);
    expect(checkText(out({ description_en: ['It won an award.'] }), '').join()).toMatch(/award/);
    expect(checkText(out({ description_ar: ['حصل المشروع على جائزة.'] }), '').join()).toMatch(/جائزة/);
    expect(checkText(out({ summary_ar: 'برج من ١٢ طابقاً' }), '').join()).toMatch(/numbers not in the facts: 12/);
    expect(checkText(out({ summary_ar: 'English only' }), '').join()).toMatch(/Arabic text missing/);
    expect(checkText(out({ description_ar: [] }), '').join()).toMatch(/paragraph counts/);
  });

  it('only renders the title and location in Arabic: no fact of its own, no change to verified ones', () => {
    const d = draft16();
    mergeOutput(d, out(), 'claude-opus-5-5', []);
    expect(d.facts.titleAr).toMatchObject({ value: 'مبنى ريحانة بلازا التجاري', source: 'ai' });
    expect(publishable('titleAr', d.facts.titleAr)).toBe(true);
    // The location came from the folder name: the folder's Arabic wording stays.
    expect(d.facts.locationAr.source).toBe('folder');

    // No English location: an Arabic one is not accepted.
    const e = emptyDraft();
    suggest(e, deriveFromFolder('31_private-house', []));
    mergeOutput(e, out(), 'm', []);
    expect(e.facts.locationAr.value).toBe('');
    // An AI value for any other fact would never be published.
    expect(publishable('sectors', { value: ['residential'], source: 'ai' })).toBe(false);
  });

  it('keeps human text and drops failing text', () => {
    const d = draft16();
    d.content.summaryEn = { value: 'Owner text, kept as written by the studio.', source: 'owner' };
    mergeOutput(d, out(), 'claude-opus-5-5', []);
    expect(d.content.summaryEn.value).toBe('Owner text, kept as written by the studio.');
    expect(d.content.summaryAr.source).toBe('ai');
    expect(d.visualNotes).toHaveLength(2);

    const e = emptyDraft();
    mergeOutput(e, out(), 'm', ['numbers not in the facts: 12']);
    expect(e.content.summaryEn).toMatchObject({ value: '', source: 'template' });
    expect(e.notes.join()).toMatch(/AI text discarded/);
  });
});

describe('images', () => {
  it('keeps the folder order (natural) and drops non-images', () => {
    const files = [img('10.jpg'), img('2.jpg'), img('INT/1.png'), img('Thumbs.db'), img('cover.jpg')];
    expect(orderImages(files).map((f) => f.path)).toEqual(['10.jpg', '2.jpg', 'INT/1.png', 'cover.jpg'].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })));
  });

  it('downscales proportionally without cropping and rejects small or corrupt files', async () => {
    const big = await sharp({ create: { width: 4000, height: 2000, channels: 3, background: '#887766' } }).jpeg().toBuffer();
    const ok = await prepareImage(img('a.jpg'), big);
    // Reports the source size; the web copy is the same picture at a 2560px long edge.
    expect(ok).toMatchObject({ width: 4000, height: 2000 });
    const meta = await sharp((ok as { data: Buffer }).data).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([2560, 1280, 'webp']);

    const small = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#000' } }).png().toBuffer();
    expect(await prepareImage(img('s.png'), small)).toMatchObject({ problem: expect.stringMatching(/too small/) });
    expect(await prepareImage(img('c.jpg'), Buffer.from('not an image'))).toMatchObject({ problem: expect.stringMatching(/not a readable image/) });
  });

  it('recognises the same picture across formats and sizes, and keeps other views and other light apart', async () => {
    const scene = (flip: boolean) =>
      sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#d8d2c4' } })
        .composite([
          { input: { create: { width: 900, height: 1400, channels: 3, background: '#2f3b45' } }, left: flip ? 1900 : 200, top: 400 },
          { input: { create: { width: 700, height: 500, channels: 3, background: '#8a6f4d' } }, left: flip ? 300 : 1600, top: 1300 },
        ])
        .jpeg()
        .toBuffer();
    const a = await scene(false);
    const sameAsWebpSmall = await sharp(a).resize(1200).webp({ quality: 70 }).toBuffer();
    const samePng = await sharp(a).png().toBuffer();
    const other = await scene(true);
    // The same view in another light: same composition, different tones.
    const dusk = await sharp(a).modulate({ brightness: 0.55 }).jpeg().toBuffer();
    const [fa, fw, fp, fo, fd] = await Promise.all([a, sameAsWebpSmall, samePng, other, dusk].map(fingerprint));
    expect(samePicture(fa, fw)).toBe(true);
    expect(samePicture(fa, fp)).toBe(true);
    expect(distance(fa, fo)).toBeGreaterThan(SAME_PICTURE);
    expect(samePicture(fa, fo)).toBe(false);
    expect(distance(fa, fd)).toBeLessThanOrEqual(SAME_PICTURE);
    expect(samePicture(fa, fd)).toBe(false);
  });

  it('stores under an SEO name without overwriting and makes web copies', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sync-'));
    const data = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#fff' } }).webp().toBuffer();
    const prepared = { sourceId: 'x', sourcePath: 'x', md5: 'm', data, width: 2000, height: 1500 };
    expect(await storeImage(dir, 'api', 'rihana-plaza', 0, prepared)).toBe('/api/uploads/rihana-plaza-01.webp');
    expect(await storeImage(dir, 'api', 'rihana-plaza', 0, prepared)).toBe('/api/uploads/rihana-plaza-01-2.webp');
    expect(readdirSync(join(dir, '_w'))).toContain('rihana-plaza-01.1024.webp');
  });

  it('recognises render passes by file name, not finished renders', () => {
    for (const f of ['RENDER/4-3D Plan/1st Floor/001/001_CoronaLight1886.jpg', '02_VRayLight.jpg', '01_ChenZc--CRE_VRayLight.jpg', '05_VRayLigh .jpg', '00_Corona Sun.jpg', '00_CTexmap.jpg', '00_CMasking_WireColor.jpg']) {
      expect([f, isRenderPass(f)]).toEqual([f, true]);
    }
    for (const f of ['RENDER/1-Ground Floor/01- Majlis/01.jpg', 'lighting-design.jpg', 'Corona-street-view.jpg', 'INT/lobby.jpg']) expect([f, isRenderPass(f)]).toEqual([f, false]);
  });

  it('keeps previews in a private store, keyed by content', async () => {
    const store = new PreviewStore(mkdtempSync(join(tmpdir(), 'prev-')));
    const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#556677' } }).jpeg().toBuffer();
    const md5 = 'a'.repeat(32);
    const r = await store.add('folder-id', { ...img('a.jpg'), md5 }, big);
    expect(r).toMatchObject({ width: 3000, height: 2000 });
    expect(store.has('folder-id', md5)).toBe(true);
    const meta = await sharp(store.read('folder-id', md5)!).metadata();
    expect([meta.width, meta.height]).toEqual([1600, 1067]);
    expect(() => store.read('folder-id', '../../etc/passwd')).toThrow(/Invalid image id/);
  });
});

describe('content', () => {
  const full = () => {
    const d = draft16();
    d.facts.titleAr = { value: 'ريحانة بلازا', source: 'ai' };
    d.facts.statusEn = { value: 'Under construction', source: 'owner' };
    d.facts.statusAr = { value: 'قيد الإنشاء', source: 'owner' };
    d.facts.disciplines = { value: ['architectural-design'], source: 'owner' };
    d.facts.sectors = { value: ['commercial'], source: 'folder' };
    d.content.summaryEn = { value: 'A commercial building with a layered street facade.', source: 'ai' };
    d.content.summaryAr = { value: 'مبنى تجاري بواجهة متدرجة.', source: 'ai' };
    d.content.descriptionEn = { value: ['A.', 'B.'], source: 'ai' };
    d.content.descriptionAr = { value: ['أ.', 'ب.'], source: 'ai' };
    return d;
  };

  it('builds the record from publishable facts only', () => {
    const f = buildFields(full(), 'rihana-plaza-commercial-building', '16', ['/api/uploads/a.webp', '/api/uploads/b.webp']);
    expect(f).toMatchObject({
      slug: 'rihana-plaza-commercial-building',
      no: '16',
      title: { en: 'Rihana Plaza Commercial Building', ar: 'ريحانة بلازا' },
      typology: { key: 'commercial' },
      location: { en: 'Cairo, Egypt', ar: 'القاهرة، مصر' },
      cover: '/api/uploads/a.webp',
      gallery: ['/api/uploads/b.webp'],
      description: [{ en: 'A.', ar: 'أ.' }, { en: 'B.', ar: 'ب.' }],
    });
    expect(f.specs.map((s) => s.label.en)).toEqual(['Status', 'Our role']);
    expect(f).not.toHaveProperty('clientName');
  });

  it('leaves a missing fact empty: English title on the Arabic page, design field as the card label', () => {
    const d = emptyDraft();
    suggest(d, deriveFromFolder('31_private-house', []));
    d.facts.sectors = { value: ['residential'], source: 'ai' }; // never published
    const f = buildFields(d, 'private-house', '31', ['/a.webp']);
    expect(f.title).toEqual({ en: 'Private House', ar: 'Private House' });
    expect(f.sectors).toEqual([]);
    expect(f.typology).toMatchObject({ key: 'architecture' });
    expect(f.location).toEqual({ en: '', ar: '' });
  });

  it('lists changed fields and catches duplicate meta descriptions', () => {
    const f = buildFields(full(), 's', '16', ['/c.webp']);
    const changes = diffFields({ ...f, year: '2024', gallery: ['/x.webp'] }, f);
    expect(changes.map((c) => c.field)).toEqual(['year', 'gallery']);
    // The same text with keys in another order (as stored in jsonb) is not a change.
    const reordered = f.description.map((d) => ({ ar: d.ar, en: d.en }));
    expect(diffFields({ ...f, description: reordered }, f)).toEqual([]);
    expect(duplicateSummary(f, [{ slug: 'other', summary: f.summary }])).toMatch(/identical to project "other"/);
  });

  it('writes only fields nobody edited in the CMS; never the text of an existing CMS project', () => {
    const f = buildFields(full(), 's', '16', []);
    const written = { title: f.title, summary: f.summary, year: f.year };
    const current = { ...f, summary: { en: 'Edited in the CMS', ar: f.summary.ar } };
    expect(ownedFields(current, written)).toEqual({ owned: ['title', 'year'], kept: ['summary'] });
    expect(ownedFields(current, null)).toEqual({ owned: [], kept: [] });
  });

  it('merges gallery changes: replaced in place, new appended, CMS additions and removals respected', () => {
    const written = ['/c.webp', '/a.webp', '/b.webp'];
    // A person added /mine.webp and removed /b.webp in the CMS.
    const current = ['/c.webp', '/a.webp', '/mine.webp'];
    const out = mergeGallery({ current, written, replace: new Map([['/a.webp', '/a2.webp']]), drop: new Set(), add: ['/n.webp'], cover: '/c.webp' });
    expect(out).toEqual(['/c.webp', '/a2.webp', '/mine.webp', '/n.webp']);
    // Images gone from the folder leave a sync page; the cover follows the folder unless changed in the CMS.
    expect(mergeGallery({ current: written, written, replace: new Map(), drop: new Set(['/b.webp']), add: [], cover: '/a.webp' })).toEqual(['/a.webp', '/c.webp']);
    expect(mergeGallery({ current: ['/a.webp', '/c.webp'], written, replace: new Map(), drop: new Set(), add: [], cover: '/c.webp' })).toEqual(['/a.webp', '/c.webp']);
  });
});

describe('sources', () => {
  it('reads nested sub-folders and skips system files', async () => {
    const root = mkdtempSync(join(tmpdir(), 'src-'));
    mkdirSync(join(root, '17_private-twin-villa-riyadh', 'RENDER', '2-First Floor', '05- Bedroom 4'), { recursive: true });
    writeFileSync(join(root, '17_private-twin-villa-riyadh', 'RENDER', '2-First Floor', '05- Bedroom 4', 'a.jpg'), 'x');
    writeFileSync(join(root, '17_private-twin-villa-riyadh', 'RENDER', '2-First Floor', '05- Bedroom 4', 'Thumbs.db'), 'x');
    writeFileSync(join(root, '17_private-twin-villa-riyadh', 'front.png'), 'y');
    mkdirSync(join(root, '_archive'));
    const [f, ...rest] = await new LocalSource(root).listFolders();
    expect(rest).toEqual([]);
    expect(f.files.map((x) => x.path)).toEqual(['RENDER/2-First Floor/05- Bedroom 4/a.jpg', 'front.png']);
  });
});

describe('schedule', () => {
  const times = parseTimes('08:00,19:00');

  it('maps Riyadh times to UTC', () => {
    expect(times).toEqual([5 * 60, 16 * 60]);
  });

  it('finds the next and previous slots', () => {
    const now = new Date('2026-10-29T10:00:00Z'); // 13:00 Riyadh
    expect(slotKey(nextSlot(now, times))).toBe('2026-10-29T16:00Z');
    expect(slotKey(previousSlot(now, times))).toBe('2026-10-29T05:00Z');
    const late = new Date('2026-10-29T17:00:00Z');
    expect(slotKey(nextSlot(late, times))).toBe('2026-10-30T05:00Z');
    const early = new Date('2026-10-29T02:00:00Z');
    expect(slotKey(previousSlot(early, times))).toBe('2026-10-28T16:00Z');
  });

  it('rejects malformed times', () => {
    expect(() => parseTimes('8am')).toThrow();
  });
});

describe('report', () => {
  it('names every section and only calls verified projects published', () => {
    const r = emptyReport('r', 'schedule', false, Date.parse('2026-10-29T05:00:00Z'));
    r.summary = { ...r.summary, scanned: 3, newDetected: 2, published: 1, awaitingVerification: 1, notPublished: 1 };
    r.created = [
      { folder: 'a', name: 'A', category: 'commercial', urlEn: 'u', urlAr: 'ua', images: 5, outcome: 'published', text: 'One-line factual summary', missing: ['location'] },
      { folder: 'b', name: 'B', category: 'commercial', urlEn: 'v', urlAr: 'va', images: 4, outcome: 'awaiting_verification' },
    ];
    r.updated = [{ folder: 'c', name: 'C', category: '', urlEn: 'w', urlAr: 'wa', images: 6, outcome: 'updated', imagesAdded: 1, imagesReplaced: 2, keptEdits: ['summary'], changes: [] }];
    r.linked = [{ folder: '07_madinah-hotel', name: 'Madinah Hotel', url: 'm', sourceImages: 12, onSite: 7 }];
    r.notPublished = [{ folder: '31_x', name: 'X', reasons: ['No usable image in the folder'] }];
    r.failed = [{ folder: 'd', error: 'Drive 500' }];
    const text = formatReport(r);
    for (const heading of ['NEW PROJECTS PUBLISHED', 'UPDATED PROJECTS', 'EXISTING PROJECTS LINKED', 'MISSING DETAILS', 'NOT PUBLISHED YET', 'ERRORS', 'REQUIRED ACTIONS']) expect(text).toContain(heading);
    expect(text).not.toMatch(/approv/i);
    expect(text).toContain('Execution Time:     08:00 (Riyadh)');
    expect(text).toContain('Published (verified live)');
    expect(text).toContain('Saved — awaiting live verification');
    expect(text).toContain('Images:    6 (1 added, 2 replaced)');
    expect(text).toContain('Kept CMS edits to: summary');
    expect(text).toContain('- A: location');
    expect(text).toContain('7 of 12 folder image(s) already on the page');
    expect(text).toContain('- d: Drive 500');
    expect(reportSubject({ ...r, status: 'attention' })).toBe('MSP project sync — ATTENTION — 1 published, 1 awaiting verification, 1 not publishable');
  });
});
