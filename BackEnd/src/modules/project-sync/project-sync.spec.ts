import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { buildFields, diffFields, duplicateSummary } from './content';
import {
  applyEdit,
  applyRegister,
  confirmFacts,
  deriveFromFolder,
  DraftImage,
  draftHash,
  emptyDraft,
  galleryOrder,
  ProjectDraft,
  readiness,
  suggest,
} from './draft';
import { checkText, DrafterOutput, mergeOutput } from './drafter';
import { isRenderPass, orderImages, prepareImage, PreviewStore, storeImage } from './images';
import { LocalSource } from './local-source';
import { editedInCms, KnownItem, MAX_ATTEMPTS, plan, SiteProject, sourceHash } from './planner';
import { parseCsv, parseRegister } from './register';
import { emptyReport, formatReport } from './report';
import { nextSlot, parseTimes, previousSlot, slotKey } from './schedule';
import { parseFolderName, SourceFile, SourceFolder } from './source';

const HEADER =
  'folder,approved_for_web,title_en,title_ar,sectors,design_categories,disciplines,location_en,location_ar,year,status_en,status_ar,summary_en,summary_ar,description_en,description_ar,cover,exclude,site_slug';

function csvRow(over: Record<string, string> = {}): string {
  const v: Record<string, string> = {
    folder: '16_rihana-plaza-commercial-building',
    approved_for_web: 'YES',
    title_en: 'Rihana Plaza',
    title_ar: 'ريحانة بلازا',
    sectors: 'commercial',
    design_categories: 'architecture',
    disciplines: 'architectural-design',
    location_en: 'Cairo, Egypt',
    location_ar: 'القاهرة، مصر',
    year: '2025',
    status_en: '',
    status_ar: '',
    summary_en: 'A commercial building in Maadi with a layered street facade that steps back at its upper floors.',
    summary_ar: 'مبنى تجاري في المعادي بواجهة متدرجة على الشارع تتراجع في أدوارها العليا.',
    description_en: '',
    description_ar: '',
    cover: '',
    exclude: '',
    site_slug: '',
    ...over,
  };
  return HEADER.split(',').map((k) => `"${(v[k] ?? '').replace(/"/g, '""')}"`).join(',');
}

const register = (...rows: string[]) => parseRegister([HEADER, ...rows].join('\r\n')).rows;

const img = (path: string, md5 = path): SourceFile => ({ id: `id-${path}`, path, mimeType: 'image/jpeg', size: 1, md5, modifiedTime: '2026-10-01T00:00:00Z' });
const folder = (name: string, files = [img('1.jpg'), img('2.jpg'), img('3.jpg')], id = `F-${name}`): SourceFolder => ({ id, name, files });

describe('register', () => {
  it('reads quoted CSV with commas, quotes and line breaks', () => {
    expect(parseCsv('a,b\r\n"x, y","he said ""hi""\nnext"\r\n')).toEqual([['a', 'b'], ['x, y', 'he said "hi"\nnext']]);
  });

  it('parses a row, splits description paragraphs and reads the decision column', () => {
    const rows = register(csvRow({ description_en: 'One.\n\nTwo.' }), csvRow({ folder: '17_x', approved_for_web: 'later' }), csvRow({ folder: '18_y', approved_for_web: 'Reject' }), csvRow({ folder: '19_z', approved_for_web: '' }));
    const r = rows.get('16_rihana-plaza-commercial-building')!;
    expect(r.decision).toBe('approve');
    expect(r.descriptionEn).toEqual(['One.', 'Two.']);
    expect([...rows.values()].map((x) => x.decision)).toEqual(['approve', 'later', 'reject', '']);
  });

  it('accepts a sheet with only the folder column', () => {
    const { rows } = parseRegister('folder\r\n20_radisson-blu-hotel-suites\r\n');
    expect(rows.get('20_radisson-blu-hotel-suites')).toMatchObject({ decision: '', titleEn: '', sectors: [] });
  });

  it('reads folder names', () => {
    expect(parseFolderName('16_rihana-plaza-commercial-building')).toEqual({ no: '16', slug: 'rihana-plaza-commercial-building' });
    expect(parseFolderName('7_madinah-hotel')).toEqual({ no: '07', slug: 'madinah-hotel' });
    expect(parseFolderName('دياري عرقه')).toBeNull();
  });
});

describe('planner', () => {
  const madinah: SiteProject = { id: 'p-madinah', slug: 'madinah-hotel', no: '07', updatedAt: new Date('2026-10-01') };
  const sbc: SiteProject = { id: 'p-sbc', slug: 'SBC', no: '08', updatedAt: new Date('2026-10-01') };
  const f16 = folder('16_rihana-plaza-commercial-building');
  const hash16 = sourceHash(undefined, orderImages(f16.files, '', []));
  const known = (over: Partial<KnownItem>): KnownItem => ({
    sourceFolderId: f16.id, slug: 'rihana-plaza-commercial-building', mode: 'owned', state: 'pending_review', sourceHash: hash16, projectId: null, attempts: 0, lastPublishedAt: null, ...over,
  });
  const live: SiteProject = { id: 'p1', slug: 'rihana-plaza-commercial-building', no: '16', updatedAt: new Date('2026-10-02T00:00:00Z') };
  const act = (items: KnownItem[], projects: SiteProject[] = [], rows = new Map()) => plan({ folders: [f16], rows, items, projects }).folders[0].action;

  it('drafts a new folder without needing a register row', () => {
    expect(act([])).toEqual({ kind: 'prepare', reason: 'new' });
  });

  it('links folders matching an existing site project by slug or number instead of duplicating it', () => {
    const p = plan({ folders: [folder('07_madinah-hotel'), folder('08_sbc-commercial-office')], rows: new Map(), items: [], projects: [madinah, sbc] });
    expect(p.folders.map((f) => f.action)).toEqual([
      { kind: 'link', project: madinah, how: 'slug' },
      { kind: 'link', project: sbc, how: 'number 08' },
    ]);
  });

  it('publishes only approved items', () => {
    expect(act([known({ state: 'pending_review' })]).kind).toBe('unchanged');
    expect(act([known({ state: 'postponed' })]).kind).toBe('unchanged');
    expect(act([known({ state: 'rejected' })]).kind).toBe('unchanged');
    expect(act([known({ state: 'approved' })])).toEqual({ kind: 'publish', project: undefined });
  });

  it('is a no-op for a published project when nothing changed', () => {
    expect(act([known({ state: 'published', projectId: 'p1', lastPublishedAt: live.updatedAt })], [live]).kind).toBe('unchanged');
  });

  it('re-drafts when the source changes, for review before anything goes live', () => {
    expect(act([known({ state: 'published', projectId: 'p1', sourceHash: 'old', lastPublishedAt: live.updatedAt })], [live])).toEqual({ kind: 'prepare', reason: 'source-changed', project: live });
    expect(act([known({ state: 'approved', sourceHash: 'old' })]).kind).toBe('prepare');
  });

  it('does not apply an approved update over edits made in the CMS since', () => {
    const edited = { ...live, updatedAt: new Date('2026-10-05T00:00:00Z') };
    const item = known({ state: 'approved', projectId: 'p1', lastPublishedAt: live.updatedAt });
    expect(editedInCms(edited, item)).toBe(true);
    expect(act([item], [edited])).toMatchObject({ kind: 'review', reasons: [expect.stringMatching(/Edited in the CMS/)] });
    // Our own save a few seconds after lastPublishedAt is not a person's edit.
    expect(editedInCms({ ...live, updatedAt: new Date(live.updatedAt.getTime() + 3000) }, item)).toBe(false);
  });

  it('never modifies linked (CMS-owned) projects, only flags source changes', () => {
    const f = folder('07_madinah-hotel');
    const item: KnownItem = { sourceFolderId: f.id, slug: 'madinah-hotel', mode: 'linked', state: 'linked', sourceHash: 'old', projectId: madinah.id, attempts: 0, lastPublishedAt: null };
    const action = plan({ folders: [f], rows: new Map(), items: [item], projects: [madinah] }).folders[0].action;
    expect(action.kind).toBe('review');
  });

  it('does not recreate a project deleted from the site', () => {
    expect(act([known({ state: 'published', projectId: 'deleted' })], [])).toMatchObject({ kind: 'review' });
  });

  it('flags folders that disappeared instead of deleting their projects', () => {
    const item: KnownItem = { sourceFolderId: 'gone', slug: 'x', mode: 'owned', state: 'published', sourceHash: 'h', projectId: 'p', attempts: 0, lastPublishedAt: null };
    expect(plan({ folders: [], rows: new Map(), items: [item], projects: [] }).missing).toEqual([item]);
  });

  it('retries failed publishing, then stops after repeated failures', () => {
    expect(act([known({ state: 'failed', attempts: 1 })]).kind).toBe('publish');
    expect(act([known({ state: 'failed', attempts: MAX_ATTEMPTS })]).kind).toBe('review');
  });

  it('retries a draft that could not be prepared', () => {
    expect(act([known({ state: 'draft' })])).toEqual({ kind: 'prepare', reason: 'retry-draft' });
  });

  it('refuses two folders claiming one slug, and bad folder names', () => {
    const p = plan({ folders: [folder('16_rihana', undefined, 'A'), folder('17_rihana', undefined, 'B'), folder('دياري عرقه')], rows: new Map(), items: [], projects: [] });
    expect(p.folders[1].action).toMatchObject({ kind: 'review', reasons: [expect.stringMatching(/also used/)] });
    expect(p.folders[2].action).toMatchObject({ kind: 'review', reasons: [expect.stringMatching(/NN_slug/)] });
  });
});

const usable = (n: number): DraftImage[] =>
  Array.from({ length: n }, (_, i) => ({ sourceId: `s${i}`, path: `${i}.jpg`, md5: `m${i}`, width: 2000, height: 1500, included: true }));

/** A draft as the sync would build it from folder 16, plus AI-style text. */
function draft16(): ProjectDraft {
  const d = emptyDraft();
  suggest(d, deriveFromFolder('16_rihana-plaza-commercial-building', ['a.jpg']));
  d.facts.titleAr = { value: 'ريحانة بلازا', source: 'ai', basis: 'AI suggestion' };
  d.facts.locationEn = { value: 'Cairo, Egypt', source: 'ai' };
  d.facts.locationAr = { value: 'القاهرة، مصر', source: 'ai' };
  d.content.summaryEn = { value: 'A commercial building with a layered street facade that steps back at its upper floors.', source: 'ai' };
  d.content.summaryAr = { value: 'مبنى تجاري بواجهة متدرجة على الشارع تتراجع في أدواره العليا.', source: 'ai' };
  d.images = usable(4);
  return d;
}

describe('draft', () => {
  it('reads suggestions from folder names, never as verified facts', () => {
    const f = deriveFromFolder('17_private-twin-villa-riyadh', ['RENDER/2-First Floor/a.jpg']);
    expect(f.titleEn).toMatchObject({ value: 'Private Twin Villa', source: 'folder' });
    expect(f.locationEn).toMatchObject({ value: 'Riyadh, Saudi Arabia', source: 'folder' });
    expect(f.locationAr?.value).toBe('الرياض، المملكة العربية السعودية');
    expect(f.sectors?.value).toEqual(['residential']);
    expect(f.designCategories?.value).toEqual(['architecture']);

    expect(deriveFromFolder('29_bic-corporate-office-interior', []).designCategories?.value).toEqual(['interiors']);
    // "bic" cannot be told from a word; the AI suggestion and the reviewer fix such titles.
    expect(deriveFromFolder('29_bic-corporate-office-interior', []).titleEn?.value).toBe('Bic Corporate Office Interior');
    expect(deriveFromFolder('08_sbc-commercial-office', []).titleEn?.value).toBe('SBC Commercial Office');
    expect(deriveFromFolder('42_private-residential-villa-stacked-volumes', ['INT/3.jpg']).designCategories?.value).toEqual(['architecture', 'interiors']);
    expect(deriveFromFolder('20_radisson-blu-hotel-suites', []).sectors?.value).toEqual(['hospitality']);
    // No place in the name: no location is guessed.
    expect(deriveFromFolder('19_al-ateeq-commercial-residential-al-qirawan', []).locationEn).toBeUndefined();
  });

  it('lets the register correct facts, but never overrides the owner', () => {
    const d = draft16();
    d.facts.year = { value: '2024', source: 'owner' };
    const row = register(csvRow({ year: '2025', title_en: 'Rihana Plaza' })).get('16_rihana-plaza-commercial-building')!;
    applyRegister(d, row);
    expect(d.facts.year).toMatchObject({ value: '2024', source: 'owner' });
    expect(d.facts.titleEn).toMatchObject({ value: 'Rihana Plaza', source: 'register' });
  });

  it('separates what blocks publication from what only needs confirming', () => {
    const d = draft16();
    const r = readiness(d, 3);
    expect(r.blocking).toEqual([]);
    expect(r.unconfirmed).toEqual(['Title (English)', 'Title (Arabic)', 'Location (English)', 'Location (Arabic)', 'Sectors', 'Design categories']);

    confirmFacts(d, 'owner@msp.sa');
    expect(readiness(d, 3).unconfirmed).toEqual([]);
    expect(d.facts.titleEn).toMatchObject({ source: 'owner', basis: expect.stringMatching(/confirmed by owner@msp.sa/) });
  });

  it('blocks missing facts, wrong script, mismatched paragraphs and too few images', () => {
    const d = draft16();
    d.facts.locationEn.value = '';
    d.facts.titleAr.value = 'Rihana';
    d.content.descriptionEn.value = ['One.'];
    d.images = usable(2);
    const b = readiness(d, 3).blocking.join('\n');
    expect(b).toMatch(/Location \(English\) is missing/);
    expect(b).toMatch(/Arabic title is not in Arabic/);
    expect(b).toMatch(/1 paragraph\(s\) and the Arabic 0/);
    expect(b).toMatch(/2 image\(s\) selected; at least 3/);
  });

  it('records edits as owner facts and changes the approval hash', () => {
    const d = draft16();
    const approved = draftHash(d);
    applyEdit(d, { facts: { titleEn: '  Rihana   Plaza ', sectors: ['commercial', 'work'] }, images: { m3: false }, cover: 'm2' }, 'owner@msp.sa');
    expect(d.facts.titleEn).toMatchObject({ value: 'Rihana Plaza', source: 'owner' });
    expect(d.facts.sectors.value).toEqual(['commercial', 'work']);
    expect(galleryOrder(d).map((i) => i.md5)).toEqual(['m2', 'm0', 'm1']);
    expect(draftHash(d)).not.toBe(approved);
    expect(() => applyEdit(d, { facts: { clientName: 'x' } as never }, 'x')).toThrow(/Unknown field/);
    expect(() => applyEdit(d, { cover: 'nope' }, 'x')).toThrow(/cover/);
  });
});

describe('AI drafter output', () => {
  const out = (over: Partial<DrafterOutput> = {}): DrafterOutput => ({
    title_en: 'Rihana Plaza',
    title_ar: 'ريحانة بلازا',
    location_en: '',
    location_ar: '',
    sectors: ['commercial'],
    design_categories: ['architecture'],
    basis: { title: 'folder name', location: 'not stated', classification: 'folder name' },
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

  it('merges suggestions without touching verified facts or human text, and drops failing text', () => {
    const d = draft16();
    d.facts.titleEn = { value: 'Rihana Plaza Mall', source: 'owner' };
    d.content.summaryEn = { value: 'Owner text, kept as written by the studio.', source: 'owner' };
    mergeOutput(d, out(), 'claude-opus-5-5', []);
    expect(d.facts.titleEn.value).toBe('Rihana Plaza Mall');
    expect(d.facts.titleAr).toMatchObject({ value: 'ريحانة بلازا', source: 'ai' });
    expect(d.content.summaryEn.value).toBe('Owner text, kept as written by the studio.');
    expect(d.content.summaryAr.source).toBe('ai');
    expect(d.visualNotes).toHaveLength(2);

    const e = emptyDraft();
    mergeOutput(e, out(), 'm', ['numbers not in the facts: 12']);
    expect(e.content.summaryEn.value).toBe('');
    expect(e.notes.join()).toMatch(/AI text discarded/);
  });
});

describe('images', () => {
  it('orders naturally, leads with the cover and drops exclusions and non-images', () => {
    const files = [img('10.jpg'), img('2.jpg'), img('INT/1.png'), img('Thumbs.db'), img('cover.jpg')];
    expect(orderImages(files, 'cover.jpg', ['2.jpg']).map((f) => f.path)).toEqual(['cover.jpg', '10.jpg', 'INT/1.png']);
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
  const approved = () => {
    const d = draft16();
    d.facts.statusEn = { value: 'Under construction', source: 'owner' };
    d.facts.statusAr = { value: 'قيد الإنشاء', source: 'owner' };
    d.facts.disciplines = { value: ['architectural-design'], source: 'owner' };
    d.facts.sectors = { value: ['commercial'], source: 'owner' };
    d.content.descriptionEn = { value: ['A.', 'B.'], source: 'ai' };
    d.content.descriptionAr = { value: ['أ.', 'ب.'], source: 'ai' };
    return d;
  };

  it('builds the record from the approved draft only', () => {
    const f = buildFields(approved(), 'rihana-plaza-commercial-building', '16', ['/api/uploads/a.webp', '/api/uploads/b.webp']);
    expect(f).toMatchObject({
      slug: 'rihana-plaza-commercial-building',
      no: '16',
      typology: { key: 'commercial' },
      location: { en: 'Cairo, Egypt', ar: 'القاهرة، مصر' },
      cover: '/api/uploads/a.webp',
      gallery: ['/api/uploads/b.webp'],
      description: [{ en: 'A.', ar: 'أ.' }, { en: 'B.', ar: 'ب.' }],
    });
    expect(f.specs.map((s) => s.label.en)).toEqual(['Status', 'Our role']);
    expect(f).not.toHaveProperty('clientName');
  });

  it('lists changed fields and catches duplicate meta descriptions', () => {
    const f = buildFields(approved(), 's', '16', ['/c.webp']);
    const changes = diffFields({ ...f, year: '2024', gallery: ['/x.webp'] }, f);
    expect(changes.map((c) => c.field)).toEqual(['year', 'gallery']);
    // The same text with keys in another order (as stored in jsonb) is not a change.
    const reordered = f.description.map((d) => ({ ar: d.ar, en: d.en }));
    expect(diffFields({ ...f, description: reordered }, f)).toEqual([]);
    expect(duplicateSummary(f, [{ slug: 'other', summary: f.summary }])).toMatch(/identical to project "other"/);
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
  it('names every required section and only calls verified projects published', () => {
    const r = emptyReport('r', 'schedule', false, Date.parse('2026-10-29T05:00:00Z'));
    r.summary = { ...r.summary, scanned: 3, newDetected: 1, published: 1, awaitingVerification: 1, pendingApproval: 1 };
    r.detected = [{ folder: '20_radisson-blu-hotel-suites', name: 'Radisson Blu Hotel Suites', images: 12, blocking: [], notes: [] }];
    r.created = [
      { folder: 'a', name: 'A', category: 'commercial', urlEn: 'u', urlAr: 'ua', images: 5, outcome: 'published', aiDrafted: ['summaryAr'] },
      { folder: 'b', name: 'B', category: 'commercial', urlEn: 'v', urlAr: 'va', images: 4, outcome: 'awaiting_verification' },
    ];
    r.pending = [{ folder: '20_radisson-blu-hotel-suites', name: 'Radisson Blu Hotel Suites', blocking: [], update: false }];
    r.failed = [{ folder: 'c', error: 'Drive 500' }];
    r.ownerActions = ['Review and approve 1 project(s)'];
    const text = formatReport(r);
    for (const heading of ['NEW PROJECTS DETECTED', 'PUBLISHED PROJECTS', 'UPDATED PROJECTS', 'PENDING APPROVAL', 'ERRORS', 'REQUIRED ACTIONS']) expect(text).toContain(heading);
    expect(text).toContain('Execution Time:     08:00 (Riyadh)');
    expect(text).toContain('Successfully published (verified live)');
    expect(text).toContain('Saved — awaiting live verification');
    expect(text).toContain('ready: review and approve');
    expect(text).toContain('- c: Drive 500');
  });
});
