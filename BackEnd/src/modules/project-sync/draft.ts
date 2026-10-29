import { createHash } from 'crypto';
import { DESIGN_CATEGORIES, DISCIPLINES, SECTORS } from '../projects/taxonomy';
import { parseFolderName } from './source';

/**
 * A project draft: what the sync publishes for one Drive folder, prepared
 * without anyone typing it. Everything in the projects folder is approved
 * for publication by the owner, so a draft is published automatically.
 * Two kinds of content are kept apart:
 *
 *  - FACTS (title, location, year, status, sectors, categories, scope). Each
 *    carries where it came from: the folder name (the owner's own naming),
 *    the owner's edit in the admin, or the existing site record. The AI only
 *    translates the title and location into Arabic; it never adds a fact.
 *    A fact nobody supplied stays empty and is reported as missing.
 *
 *  - TEXT (summary, description). Written by the AI from the facts and from
 *    what is visible in the images, then checked mechanically (drafter.ts);
 *    without the AI, a one-line factual summary is built from the facts.
 */

export type FactSource = 'owner' | 'site' | 'folder' | 'ai' | 'template';
/** Sources whose facts are published as they are. */
export const VERIFIED_SOURCES: readonly FactSource[] = ['owner', 'site', 'folder'];
/** Facts the AI may supply: Arabic renderings of verified English ones. */
export const TRANSLATED_FACTS: readonly string[] = ['titleAr', 'locationAr'];

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
  /** Perceptual fingerprint (images.ts), to recognise the same picture in another file. */
  fingerprint?: string;
  /** In the published gallery. Unusable images are never included. */
  included: boolean;
  /** Why the image cannot be used (too small, unreadable, a copy of another). */
  problem?: string;
}

export interface ProjectDraft {
  facts: DraftFacts;
  content: DraftContent;
  /** What the AI saw in the images. Shown in the admin; never published as facts. */
  visualNotes: string[];
  images: DraftImage[];
  /** md5 of the cover image; the first included image when empty. */
  cover: string;
  ai: { model: string; at: string } | null;
  /** Drafting problems worth showing (AI unavailable, output rejected, …). */
  notes: string[];
  /**
   * The project fields as the sync last wrote them. A field whose live value
   * differs was edited by a person in the CMS, and the sync leaves it alone.
   */
  written?: Record<string, unknown> | null;
}

export const FACT_KEYS = ['titleEn', 'titleAr', 'locationEn', 'locationAr', 'year', 'statusEn', 'statusAr', 'sectors', 'designCategories', 'disciplines'] as const;
export const CONTENT_KEYS = ['summaryEn', 'summaryAr', 'descriptionEn', 'descriptionAr'] as const;
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
    content: { summaryEn: fact('', 'template'), summaryAr: fact('', 'template'), descriptionEn: fact<string[]>([], 'template'), descriptionAr: fact<string[]>([], 'template') },
    visualNotes: [],
    images: [],
    cover: '',
    ai: null,
    notes: [],
    written: null,
  };
}

/** True when a fact may go on the site: a verified source, or an Arabic rendering by the AI. */
export function publishable(key: keyof DraftFacts, f: Fact<unknown>): boolean {
  return VERIFIED_SOURCES.includes(f.source) || (f.source === 'ai' && TRANSLATED_FACTS.includes(key));
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
 * What the folder name and its sub-folder names say (source `folder`). The
 * owner names the folders, so these are published; the admin can correct them.
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

/**
 * Applies what the folder name says now. Owner edits and site values are
 * never replaced. A renamed folder updates (or clears) what its old name
 * said, and a folder value replaces an AI translation of the same field.
 */
export function suggest(draft: ProjectDraft, values: Partial<DraftFacts>): void {
  for (const key of FACT_KEYS) {
    const v = values[key];
    const current = draft.facts[key];
    if (current.source === 'owner' || current.source === 'site') continue;
    if (v && !isEmpty(v.value)) (draft.facts[key] as Fact<unknown>) = v;
    else if (current.source === 'folder') (draft.facts[key] as Fact<unknown>) = fact(Array.isArray(current.value) ? [] : '', 'folder');
  }
}

// ------------------------------------------------------------ fallback text

const KIND: Record<string, { en: string; ar: string }> = {
  architecture: { en: 'architecture', ar: 'معماري' },
  interiors: { en: 'interior design', ar: 'تصميم داخلي' },
};

/**
 * Without the AI, a one-line summary made only of the verified facts:
 * "Rihana Plaza — an architecture project by MSP in Riyadh, Saudi Arabia."
 * Replaced by the AI's text as soon as the AI is available; never replaces
 * text a person or the AI wrote.
 */
export function fallbackText(draft: ProjectDraft): void {
  const f = draft.facts;
  const c = draft.content;
  const kinds = f.designCategories.value.map((k) => KIND[k]).filter(Boolean);
  const en = kinds.map((k) => k.en).join(' and ') || 'design';
  const ar = kinds.map((k) => k.ar).join(' و') || 'تصميم';
  const article = /^[aeiou]/.test(en) ? 'an' : 'a';
  const loc = publishable('locationEn', f.locationEn) ? f.locationEn.value : '';
  const locAr = publishable('locationAr', f.locationAr) ? f.locationAr.value : '';
  const titleAr = f.titleAr.value || f.titleEn.value;
  if (c.summaryEn.source === 'template' && f.titleEn.value) {
    c.summaryEn = fact(`${f.titleEn.value} — ${article} ${en} project by MSP${loc ? ` in ${loc}` : ''}.`, 'template', 'built from the facts');
  }
  if (c.summaryAr.source === 'template' && titleAr) {
    c.summaryAr = fact(`${titleAr} — مشروع ${ar} من MSP${locAr ? ` في ${locAr}` : ''}.`, 'template', 'built from the facts');
  }
}

// ------------------------------------------------------------ readiness

export interface Readiness {
  /** Without these the project cannot be published at all. */
  blocking: string[];
  /** Details the source does not give: the page is published without them and they are reported. */
  missing: string[];
  warnings: string[];
}

export function readiness(draft: ProjectDraft, minImages: number): Readiness {
  const blocking: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];
  const f = draft.facts;
  const c = draft.content;

  if (isEmpty(f.titleEn.value)) blocking.push('No title: name the folder "NN_project-name"');
  const usable = draft.images.filter((i) => i.included && !i.problem).length;
  if (!usable) blocking.push('No usable image in the folder');
  if (f.titleAr.value && !ARABIC.test(f.titleAr.value)) blocking.push('The Arabic title is not in Arabic');
  if (f.locationAr.value && !ARABIC.test(f.locationAr.value)) blocking.push('The Arabic location is not in Arabic');
  if (c.summaryAr.value && c.summaryAr.source !== 'template' && !ARABIC.test(c.summaryAr.value)) blocking.push('The Arabic summary is not in Arabic');
  if (f.year.value && !/^(19|20)\d{2}$/.test(f.year.value)) blocking.push(`Year "${f.year.value}" is not a four-digit year`);
  if (!!f.statusEn.value !== !!f.statusAr.value) blocking.push('Status must be given in both languages, or neither');
  const unknown = (keys: string[], allowed: string[], label: string) => {
    for (const k of keys) if (!allowed.includes(k)) blocking.push(`Unknown ${label} "${k}"`);
  };
  unknown(f.sectors.value, SECTOR_KEYS, 'sector');
  unknown(f.designCategories.value, CATEGORY_KEYS, 'design category');
  unknown(f.disciplines.value, DISCIPLINE_KEYS, 'discipline');
  if (c.descriptionEn.value.length !== c.descriptionAr.value.length) {
    blocking.push(`The English description has ${c.descriptionEn.value.length} paragraph(s) and the Arabic ${c.descriptionAr.value.length}; they must match`);
  }

  if (isEmpty(f.locationEn.value)) missing.push('location');
  if (!f.sectors.value.length) missing.push('sector');
  if (isEmpty(f.titleAr.value)) missing.push('Arabic title (the English title is shown on the Arabic page)');
  if (c.summaryEn.source === 'template' || !c.descriptionEn.value.length) missing.push('written description (only a one-line factual summary is published)');

  if (usable && usable < minImages) warnings.push(`Only ${usable} usable image(s)`);
  for (const [lang, t] of [['English', c.summaryEn], ['Arabic', c.summaryAr]] as const) {
    if (t.source !== 'template' && t.value && (t.value.length < 50 || t.value.length > 200)) warnings.push(`The ${lang} summary is ${t.value.length} characters; 70–170 reads best in search results`);
  }
  const unusable = draft.images.filter((i) => i.problem).length;
  if (unusable) warnings.push(`${unusable} image(s) not used (see the gallery)`);
  return { blocking, missing, warnings };
}

/** Identity of the draft's published content: a change means the page needs updating. */
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
