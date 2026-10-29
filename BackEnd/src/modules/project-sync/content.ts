import { Project, Term } from '../projects/entities/project.entity';
import { DESIGN_CATEGORIES, DISCIPLINES, SECTORS } from '../projects/taxonomy';
import { DraftFacts, ProjectDraft, publishable } from './draft';
import { brief, FieldChange } from './report';

/** The source-owned fields of a project record. Everything else (featured, order, client, status) stays the CMS's. */
export type SourceFields = Pick<
  Project,
  'slug' | 'no' | 'title' | 'typology' | 'designCategories' | 'sectors' | 'disciplines' | 'location' | 'year' | 'summary' | 'description' | 'specs' | 'services' | 'cover' | 'gallery'
>;

/** Fields the sync fills from the draft (cover and gallery are merged separately, slug and no never change). */
export const TEXT_FIELDS = ['title', 'typology', 'designCategories', 'sectors', 'disciplines', 'location', 'year', 'summary', 'description', 'specs', 'services'] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

const terms = (axis: Record<string, Term>, keys: string[]): Term[] => {
  const all = Object.values(axis);
  return keys.map((k) => all.find((t) => t.key === k)).filter((t): t is Term => !!t);
};

/**
 * Builds the record from a draft, with only publishable facts (a missing one
 * stays empty rather than guessed). SEO follows from it the same way as for
 * hand-entered projects: the page title is the project title, the meta
 * description is the summary, the slug is the folder's.
 */
export function buildFields(draft: ProjectDraft, slug: string, no: string, images: string[]): SourceFields {
  const f = draft.facts;
  const c = draft.content;
  const val = <K extends keyof DraftFacts>(k: K): DraftFacts[K]['value'] => (publishable(k, f[k]) ? f[k].value : ((Array.isArray(f[k].value) ? [] : '') as DraftFacts[K]['value']));
  const sectors = terms(SECTORS, val('sectors'));
  const categories = terms(DESIGN_CATEGORIES, val('designCategories'));
  const disciplines = terms(DISCIPLINES, val('disciplines'));

  const specs: SourceFields['specs'] = [];
  if (val('statusEn')) specs.push({ label: { en: 'Status', ar: 'الحالة' }, value: { en: val('statusEn'), ar: val('statusAr') } });
  if (disciplines.length) {
    specs.push({
      label: { en: 'Our role', ar: 'دورنا' },
      value: { en: disciplines.map((d) => d.en).join(', '), ar: disciplines.map((d) => d.ar).join('، ') },
    });
  }

  const [cover = '', ...rest] = images;
  return {
    slug,
    no,
    // Without an Arabic title the Arabic page shows the English one, never an empty heading.
    title: { en: val('titleEn'), ar: val('titleAr') || val('titleEn') },
    // The legacy single category: first sector, else the design field (the record requires one).
    typology: sectors[0] ?? categories[0] ?? { key: '', en: '', ar: '' },
    designCategories: categories,
    sectors,
    disciplines,
    location: { en: val('locationEn'), ar: val('locationAr') },
    year: val('year'),
    summary: { en: c.summaryEn.value, ar: c.summaryAr.value },
    description: c.descriptionEn.value.map((en, i) => ({ en, ar: c.descriptionAr.value[i] ?? '' })),
    specs,
    services: disciplines.map((d) => ({ en: d.en, ar: d.ar })),
    cover,
    gallery: rest,
  };
}

/** JSON with object keys sorted, so `{ar, en}` from the database equals `{en, ar}`. */
export const stable = (v: unknown): string =>
  JSON.stringify(v ?? null, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

/**
 * Which text fields the sync may write. A field the sync never wrote (an
 * existing CMS project) or whose live value differs from what the sync last
 * wrote (a person edited it) is left as it is.
 */
export function ownedFields(current: Partial<Project>, written: Record<string, unknown> | null | undefined): { owned: TextField[]; kept: TextField[] } {
  const owned: TextField[] = [];
  const kept: TextField[] = [];
  for (const f of TEXT_FIELDS) {
    if (!written || !(f in written)) continue;
    if (stable(current[f]) === stable(written[f])) owned.push(f);
    else kept.push(f);
  }
  return { owned, kept };
}

export interface GalleryChange {
  /** Live list [cover, ...gallery] before this update. */
  current: string[];
  /** The same list as the sync last wrote it; null when the sync has never written this project's images. */
  written: string[] | null;
  /** Live image URL → URL of its new version (the source file changed). */
  replace: Map<string, string>;
  /** Sync images no longer in the source: taken out of the gallery (the files stay, for undo). */
  drop: Set<string>;
  /** New images, appended in this order. */
  add: string[];
  /** The cover the source asks for (a sync image); applied only if nobody changed the cover in the CMS. */
  cover?: string;
}

/**
 * The live gallery after a sync update. Images a person added in the CMS
 * stay where they are; images a person removed are not brought back; a
 * changed source file replaces its old version in the same position.
 */
export function mergeGallery(g: GalleryChange): string[] {
  const out = g.current.map((u) => g.replace.get(u) ?? u).filter((u) => !g.drop.has(u));
  for (const u of g.add) if (!out.includes(u)) out.push(u);
  const coverUntouched = !g.written || g.current[0] === g.written[0];
  if (g.cover && coverUntouched && out.includes(g.cover)) out.unshift(...out.splice(out.indexOf(g.cover), 1));
  return out.filter(Boolean);
}

const keys = (terms: { key: string }[] | undefined) => (terms ?? []).map((t) => t.key).join(', ');

/** Human-readable field changes for the report. */
export function diffFields(before: Partial<Project>, after: Partial<Project>): FieldChange[] {
  const changes: FieldChange[] = [];
  const cmp = (field: string, a: unknown, b: unknown) => {
    if (stable(a) !== stable(b)) changes.push({ field, from: brief(a), to: brief(b) });
  };
  cmp('title (en)', before.title?.en, after.title?.en);
  cmp('title (ar)', before.title?.ar, after.title?.ar);
  cmp('location (en)', before.location?.en, after.location?.en);
  cmp('location (ar)', before.location?.ar, after.location?.ar);
  cmp('year', before.year, after.year);
  cmp('summary (en)', before.summary?.en, after.summary?.en);
  cmp('summary (ar)', before.summary?.ar, after.summary?.ar);
  cmp('description', before.description, after.description);
  cmp('sectors', keys(before.sectors), keys(after.sectors));
  cmp('design categories', keys(before.designCategories), keys(after.designCategories));
  cmp('disciplines', keys(before.disciplines), keys(after.disciplines));
  cmp('specs', before.specs, after.specs);
  cmp('cover', before.cover, after.cover);
  if (stable(before.gallery ?? []) !== stable(after.gallery ?? [])) {
    changes.push({ field: 'gallery', from: `${before.gallery?.length ?? 0} images`, to: `${after.gallery?.length ?? 0} images` });
  }
  return changes;
}

/** Another project already using this summary would give two pages one meta description. */
export function duplicateSummary(fields: Pick<SourceFields, 'slug' | 'summary'>, others: Pick<Project, 'slug' | 'summary'>[]): string | null {
  for (const o of others) {
    if (o.slug === fields.slug) continue;
    if (o.summary?.en && o.summary.en === fields.summary.en) return `summary_en is identical to project "${o.slug}"`;
    if (o.summary?.ar && o.summary.ar === fields.summary.ar) return `summary_ar is identical to project "${o.slug}"`;
  }
  return null;
}
