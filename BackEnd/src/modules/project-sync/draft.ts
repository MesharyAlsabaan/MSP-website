import { createHash } from 'crypto';
import { DESIGN_CATEGORIES, DISCIPLINES, SECTORS } from '../projects/taxonomy';
import { RegisterRow } from './register';
import { parseFolderName } from './source';

/**
 * A project draft: what the sync proposes to publish for one Drive folder,
 * prepared without anyone typing it. Two kinds of content are kept apart:
 *
 *  - FACTS (title, location, year, status, sectors, categories, scope). Each
 *    carries where it came from. Only the owner, the register or the existing
 *    site record count as verified; values read from the folder name or
 *    suggested by the AI are shown as suggestions and must be confirmed by a
 *    person at approval. Nothing unverifiable is ever published unconfirmed.
 *
 *  - TEXT (summary, description). Marketing copy written from the facts and
 *    from what is visible in the images, by the AI when it is configured. It
 *    never adds facts (see drafter.ts) and is published only after approval.
 */

export type FactSource = 'owner' | 'register' | 'site' | 'folder' | 'ai';
export const VERIFIED_SOURCES: readonly FactSource[] = ['owner', 'register', 'site'];

export interface Fact<T> {
  value: T;
  source: FactSource;
  /** Why the value is what it is, e.g. `folder name "17_private-twin-villa-riyadh"`. */
  basis?: string;
}

export interface DraftFacts {
  titleEn: Fact<string>;
  titleAr: Fact<string>;
  locationEn: Fact<string>;
  locationAr: Fact<string>;
  year: Fact<string>;
  statusEn: Fact<string>;
  statusAr: Fact<string>;
  sectors: Fact<string[]>;
  designCategories: Fact<string[]>;
  disciplines: Fact<string[]>;
}

export interface DraftContent {
  summaryEn: Fact<string>;
  summaryAr: Fact<string>;
  descriptionEn: Fact<string[]>;
  descriptionAr: Fact<string[]>;
}

export interface DraftImage {
  sourceId: string;
  path: string;
  md5: string;
  width: number;
  height: number;
  /** In the published gallery. Unusable images are never included. */
  included: boolean;
  /** Why the image cannot be used (too small, unreadable, duplicate). */
  problem?: string;
}

export interface ProjectDraft {
  facts: DraftFacts;
  content: DraftContent;
  /** What the AI saw in the images. Shown to the reviewer; never published as facts. */
  visualNotes: string[];
  images: DraftImage[];
  /** md5 of the cover image; the first included image when empty. */
  cover: string;
  /** The register's decision column as last read, so a change to it is acted on once. */
  registerDecision: string;
  ai: { model: string; at: string } | null;
  /** Drafting problems worth showing (AI unavailable, output rejected, …). */
  notes: string[];
}

export const FACT_KEYS = ['titleEn', 'titleAr', 'locationEn', 'locationAr', 'year', 'statusEn', 'statusAr', 'sectors', 'designCategories', 'disciplines'] as const;
export const CONTENT_KEYS = ['summaryEn', 'summaryAr', 'descriptionEn', 'descriptionAr'] as const;
/** Facts a project cannot be published without, verified or confirmed. */
export const CRITICAL_FACTS: readonly (keyof DraftFacts)[] = ['titleEn', 'titleAr', 'locationEn', 'locationAr', 'sectors', 'designCategories'];

export const FACT_LABEL: Record<keyof DraftFacts | keyof DraftContent, string> = {
  titleEn: 'Title (English)',
  titleAr: 'Title (Arabic)',
  locationEn: 'Location (English)',
  locationAr: 'Location (Arabic)',
  year: 'Year',
  statusEn: 'Status (English)',
  statusAr: 'Status (Arabic)',
  sectors: 'Sectors',
  designCategories: 'Design categories',
  disciplines: 'Scope (disciplines)',
  summaryEn: 'Summary (English)',
  summaryAr: 'Summary (Arabic)',
  descriptionEn: 'Description (English)',
  descriptionAr: 'Description (Arabic)',
};

export const SECTOR_KEYS = Object.values(SECTORS).map((t) => t.key);
export const CATEGORY_KEYS = Object.values(DESIGN_CATEGORIES).map((t) => t.key);
export const DISCIPLINE_KEYS = Object.values(DISCIPLINES).map((t) => t.key);

export const ARABIC = /[؀-ۿ]/;

const fact = <T>(value: T, source: FactSource, basis?: string): Fact<T> => ({ value, source, ...(basis ? { basis } : {}) });
const isEmpty = (v: string | string[]) => (Array.isArray(v) ? v.length === 0 : v.trim() === '');

export function emptyDraft(): ProjectDraft {
  const s = () => fact('', 'folder');
  const a = () => fact<string[]>([], 'folder');
  return {
    facts: { titleEn: s(), titleAr: s(), locationEn: s(), locationAr: s(), year: s(), statusEn: s(), statusAr: s(), sectors: a(), designCategories: a(), disciplines: a() },
    content: { summaryEn: fact('', 'ai'), summaryAr: fact('', 'ai'), descriptionEn: fact<string[]>([], 'ai'), descriptionAr: fact<string[]>([], 'ai') },
    visualNotes: [],
    images: [],
    cover: '',
    registerDecision: '',
    ai: null,
    notes: [],
  };
}

// ------------------------------------------------------------ folder names

/** Places the studio names in folder names, with the site's own wording. */
const CITIES: Record<string, { en: string; ar: string }> = {
  riyadh: { en: 'Riyadh', ar: 'الرياض' },
  jeddah: { en: 'Jeddah', ar: 'جدة' },
  madinah: { en: 'Madinah', ar: 'المدينة المنورة' },
  makkah: { en: 'Makkah', ar: 'مكة المكرمة' },
  dammam: { en: 'Dammam', ar: 'الدمام' },
  khobar: { en: 'Al Khobar', ar: 'الخبر' },
  cairo: { en: 'Cairo', ar: 'القاهرة' },
};
const COUNTRY: Record<string, { en: string; ar: string }> = {
  cairo: { en: 'Egypt', ar: 'مصر' },
};
const SAUDI = { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' };

/** Folder-name words → sector. First match per rule; several sectors may apply. */
const SECTOR_WORDS: [RegExp, string][] = [
  [/\b(villa|villas|residence|residential|house|housing|apartments?|compound|twin)\b/, 'residential'],
  [/\b(hotel|suites|hammam|spa|restaurant|cafe|coffee|wedding|hall|resort|serviced)\b/, 'hospitality'],
  [/\b(commercial|retail|plaza|mall|showroom|shops?)\b/, 'commercial'],
  [/\b(office|offices|corporate|headquarters|hq)\b/, 'work'],
  [/\b(school|university|academy|education)\b/, 'education'],
  [/\b(clinic|hospital|medical|health)\b/, 'health'],
  [/\b(museum|gallery|cultural|culture|library)\b/, 'culture'],
  [/\b(sports?|gym|stadium|arena)\b/, 'sports'],
];

const titleCase = (w: string) => (w.length <= 3 && !/[aeiou]/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1));

/**
 * What the folder name and its sub-folder names say. Everything returned is
 * a suggestion (source `folder`) for the reviewer to confirm.
 */
export function deriveFromFolder(folderName: string, paths: string[]): Partial<DraftFacts> {
  const parsed = parseFolderName(folderName);
  if (!parsed) return {};
  const words = parsed.slug.split('-');
  const basis = `folder name "${folderName}"`;
  const out: Partial<DraftFacts> = {};

  // A known city at the end of the name is the location; it is cut from the title.
  let titleWords = words;
  const last = words[words.length - 1];
  if (CITIES[last]) {
    const city = CITIES[last];
    const country = COUNTRY[last] ?? SAUDI;
    out.locationEn = fact(`${city.en}, ${country.en}`, 'folder', basis);
    out.locationAr = fact(`${city.ar}، ${country.ar}`, 'folder', basis);
    titleWords = words.slice(0, -1);
  }
  const title = titleWords.filter((w) => !/^\d+$/.test(w)).map(titleCase).join(' ');
  if (title) out.titleEn = fact(title, 'folder', basis);

  const text = words.join(' ');
  const sectors = [...new Set(SECTOR_WORDS.filter(([re]) => re.test(text)).map(([, key]) => key))];
  if (sectors.length) out.sectors = fact(sectors, 'folder', basis);

  // Interiors when the name says so, or alongside architecture when the folder has interior sub-folders.
  const interiorOnly = /\binteriors?\b/.test(text);
  const interiorDirs = paths.some((p) => p.split('/').slice(0, -1).some((d) => /^(int|interiors?|interior design)$/i.test(d.trim())));
  const categories = interiorOnly ? ['interiors'] : interiorDirs ? ['architecture', 'interiors'] : ['architecture'];
  out.designCategories = fact(categories, 'folder', interiorOnly ? basis : interiorDirs ? `${basis} and its interior sub-folder` : `${basis} (no interior work named)`);
  return out;
}

// ------------------------------------------------------------ register

/**
 * Register values win over everything except the owner's own edits in the
 * admin: the sheet is the studio's correction tool. Empty cells change nothing.
 */
export function applyRegister(draft: ProjectDraft, row: RegisterRow): void {
  const f = draft.facts;
  const set = <K extends keyof DraftFacts>(key: K, value: DraftFacts[K]['value']) => {
    if (isEmpty(value as string | string[]) || f[key].source === 'owner') return;
    f[key] = fact(value, 'register', 'the _REGISTER sheet') as DraftFacts[K];
  };
  set('titleEn', row.titleEn);
  set('titleAr', row.titleAr);
  set('locationEn', row.locationEn);
  set('locationAr', row.locationAr);
  set('year', row.year);
  set('statusEn', row.statusEn);
  set('statusAr', row.statusAr);
  set('sectors', row.sectors);
  set('designCategories', row.designCategories);
  set('disciplines', row.disciplines);

  const c = draft.content;
  const text = <K extends keyof DraftContent>(key: K, value: DraftContent[K]['value']) => {
    if (isEmpty(value as string | string[]) || c[key].source === 'owner') return;
    c[key] = fact(value, 'register', 'the _REGISTER sheet') as DraftContent[K];
  };
  text('summaryEn', row.summaryEn);
  text('summaryAr', row.summaryAr);
  text('descriptionEn', row.descriptionEn);
  text('descriptionAr', row.descriptionAr);
}

/** Fills facts from folder-name suggestions; verified values are never replaced. */
export function suggest(draft: ProjectDraft, values: Partial<DraftFacts>): void {
  for (const key of FACT_KEYS) {
    const v = values[key];
    if (!v || isEmpty(v.value)) continue;
    // Only empty values and earlier folder-name suggestions are replaced: an AI
    // suggestion or a verified value is not overwritten by the folder name again.
    const current = draft.facts[key];
    if (!isEmpty(current.value) && current.source !== 'folder') continue;
    (draft.facts[key] as Fact<unknown>) = v;
  }
}

// ------------------------------------------------------------ readiness

export interface Readiness {
  /** Must be fixed before the project can be approved. */
  blocking: string[];
  /** Critical facts that are only suggestions: approval must confirm them. */
  unconfirmed: string[];
  warnings: string[];
}

export function readiness(draft: ProjectDraft, minImages: number): Readiness {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const f = draft.facts;
  const c = draft.content;

  for (const key of CRITICAL_FACTS) if (isEmpty(f[key].value)) blocking.push(`${FACT_LABEL[key]} is missing`);
  if (f.titleAr.value && !ARABIC.test(f.titleAr.value)) blocking.push('The Arabic title is not in Arabic');
  if (f.locationAr.value && !ARABIC.test(f.locationAr.value)) blocking.push('The Arabic location is not in Arabic');
  if (f.year.value && !/^(19|20)\d{2}$/.test(f.year.value)) blocking.push(`Year "${f.year.value}" is not a four-digit year`);
  if (!!f.statusEn.value !== !!f.statusAr.value) blocking.push('Status must be given in both languages, or neither');
  const unknown = (keys: string[], allowed: string[], label: string) => {
    for (const k of keys) if (!allowed.includes(k)) blocking.push(`Unknown ${label} "${k}"`);
  };
  unknown(f.sectors.value, SECTOR_KEYS, 'sector');
  unknown(f.designCategories.value, CATEGORY_KEYS, 'design category');
  unknown(f.disciplines.value, DISCIPLINE_KEYS, 'discipline');

  if (!c.summaryEn.value) blocking.push('The English summary is missing');
  if (!c.summaryAr.value) blocking.push('The Arabic summary is missing');
  else if (!ARABIC.test(c.summaryAr.value)) blocking.push('The Arabic summary is not in Arabic');
  if (c.descriptionEn.value.length !== c.descriptionAr.value.length) {
    blocking.push(`The English description has ${c.descriptionEn.value.length} paragraph(s) and the Arabic ${c.descriptionAr.value.length}; they must match`);
  }

  const usable = draft.images.filter((i) => i.included && !i.problem).length;
  if (usable < minImages) blocking.push(`${usable} image(s) selected; at least ${minImages} are needed`);

  const unconfirmed = CRITICAL_FACTS.filter((k) => !isEmpty(f[k].value) && !VERIFIED_SOURCES.includes(f[k].source)).map((k) => FACT_LABEL[k]);

  for (const [lang, s] of [['English', c.summaryEn.value], ['Arabic', c.summaryAr.value]] as const) {
    if (s && (s.length < 50 || s.length > 200)) warnings.push(`The ${lang} summary is ${s.length} characters; 70–170 reads best in search results`);
  }
  if (!f.disciplines.value.length) warnings.push('No scope (disciplines) selected — the page will not say what MSP did');
  const unusable = draft.images.filter((i) => i.problem).length;
  if (unusable) warnings.push(`${unusable} image(s) cannot be used (see the gallery)`);
  return { blocking, unconfirmed, warnings };
}

/** Marks every suggested fact as confirmed by the approver. */
export function confirmFacts(draft: ProjectDraft, by: string): void {
  for (const key of FACT_KEYS) {
    const f = draft.facts[key];
    if (!VERIFIED_SOURCES.includes(f.source) && !isEmpty(f.value)) {
      (draft.facts[key] as Fact<unknown>) = fact(f.value, 'owner', `confirmed by ${by}${f.basis ? ` (suggested from ${f.basis})` : ''}`);
    }
  }
}

/** Identity of what was approved: any later change to the draft needs a new approval. */
export function draftHash(draft: ProjectDraft): string {
  const values = {
    facts: Object.fromEntries(FACT_KEYS.map((k) => [k, draft.facts[k].value])),
    content: Object.fromEntries(CONTENT_KEYS.map((k) => [k, draft.content[k].value])),
    images: draft.images.filter((i) => i.included && !i.problem).map((i) => i.md5),
    cover: draft.cover,
  };
  return createHash('sha256').update(JSON.stringify(values)).digest('hex');
}

/** Included, usable images in published order: the cover first. */
export function galleryOrder(draft: ProjectDraft): DraftImage[] {
  const usable = draft.images.filter((i) => i.included && !i.problem);
  const i = draft.cover ? usable.findIndex((x) => x.md5 === draft.cover) : -1;
  if (i > 0) usable.unshift(...usable.splice(i, 1));
  return usable;
}

// ------------------------------------------------------------ edits

export interface DraftEdit {
  facts?: Partial<Record<keyof DraftFacts, string | string[]>>;
  content?: Partial<Record<keyof DraftContent, string | string[]>>;
  /** md5 → included */
  images?: Record<string, boolean>;
  cover?: string;
}

const MAX_TEXT = 4000;

/** Applies an admin edit. Everything a person types becomes an owner-verified value. */
export function applyEdit(draft: ProjectDraft, edit: DraftEdit, by: string): void {
  const basis = `edited by ${by}`;
  const clean = (key: string, v: unknown, list: boolean): string | string[] => {
    if (list) {
      if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw new Error(`${key} must be a list of text`);
      return v.map((x: string) => x.replace(/\s+/g, ' ').trim()).filter(Boolean).map((x) => x.slice(0, MAX_TEXT));
    }
    if (typeof v !== 'string') throw new Error(`${key} must be text`);
    return v.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
  };
  for (const [key, v] of Object.entries(edit.facts ?? {})) {
    if (!(FACT_KEYS as readonly string[]).includes(key)) throw new Error(`Unknown field ${key}`);
    const k = key as keyof DraftFacts;
    const value = clean(key, v, Array.isArray(draft.facts[k].value));
    if (JSON.stringify(value) !== JSON.stringify(draft.facts[k].value)) (draft.facts[k] as Fact<unknown>) = fact(value, 'owner', basis);
  }
  for (const [key, v] of Object.entries(edit.content ?? {})) {
    if (!(CONTENT_KEYS as readonly string[]).includes(key)) throw new Error(`Unknown field ${key}`);
    const k = key as keyof DraftContent;
    const value = clean(key, v, Array.isArray(draft.content[k].value));
    if (JSON.stringify(value) !== JSON.stringify(draft.content[k].value)) (draft.content[k] as Fact<unknown>) = fact(value, 'owner', basis);
  }
  for (const [md5, included] of Object.entries(edit.images ?? {})) {
    const img = draft.images.find((i) => i.md5 === md5);
    if (img && !img.problem) img.included = !!included;
  }
  if (edit.cover !== undefined) {
    const img = draft.images.find((i) => i.md5 === edit.cover && !i.problem);
    if (!img) throw new Error('The cover must be one of the usable images');
    img.included = true;
    draft.cover = edit.cover;
  }
}
