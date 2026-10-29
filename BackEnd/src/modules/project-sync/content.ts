import { Project, Term } from '../projects/entities/project.entity';
import { DESIGN_CATEGORIES, DISCIPLINES, SECTORS } from '../projects/taxonomy';
import { ProjectDraft } from './draft';
import { brief, FieldChange } from './report';

/** The source-owned fields of a project record. Everything else (featured, order, client) stays the CMS's. */
export type SourceFields = Pick<
  Project,
  'slug' | 'no' | 'title' | 'typology' | 'designCategories' | 'sectors' | 'disciplines' | 'location' | 'year' | 'summary' | 'description' | 'specs' | 'services' | 'cover' | 'gallery'
>;

const terms = (axis: Record<string, Term>, keys: string[]): Term[] => {
  const all = Object.values(axis);
  return keys.map((k) => all.find((t) => t.key === k)).filter((t): t is Term => !!t);
};

/**
 * Builds the record from an approved draft. SEO follows from it the same way
 * as for hand-entered projects: the page title is the project title, the
 * meta description is the summary, the slug is the folder's.
 */
export function buildFields(draft: ProjectDraft, slug: string, no: string, images: string[]): SourceFields {
  const f = draft.facts;
  const c = draft.content;
  const sectors = terms(SECTORS, f.sectors.value);
  const disciplines = terms(DISCIPLINES, f.disciplines.value);

  const specs: SourceFields['specs'] = [];
  if (f.statusEn.value) specs.push({ label: { en: 'Status', ar: 'الحالة' }, value: { en: f.statusEn.value, ar: f.statusAr.value } });
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
    title: { en: f.titleEn.value, ar: f.titleAr.value },
    typology: sectors[0],
    designCategories: terms(DESIGN_CATEGORIES, f.designCategories.value),
    sectors,
    disciplines,
    location: { en: f.locationEn.value, ar: f.locationAr.value },
    year: f.year.value,
    summary: { en: c.summaryEn.value, ar: c.summaryAr.value },
    description: c.descriptionEn.value.map((en, i) => ({ en, ar: c.descriptionAr.value[i] ?? '' })),
    specs,
    services: disciplines.map((d) => ({ en: d.en, ar: d.ar })),
    cover,
    gallery: rest,
  };
}

const keys = (terms: { key: string }[] | undefined) => (terms ?? []).map((t) => t.key).join(', ');

/** JSON with object keys sorted, so `{ar, en}` from the database equals `{en, ar}`. */
const stable = (v: unknown): string =>
  JSON.stringify(v ?? null, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

/** Human-readable field changes for the report. */
export function diffFields(before: Partial<Project>, after: SourceFields): FieldChange[] {
  const changes: FieldChange[] = [];
  const cmp = (field: string, a: unknown, b: unknown) => {
    if (stable(a) !== stable(b)) changes.push({ field, from: brief(a), to: brief(b) });
  };
  cmp('title (en)', before.title?.en, after.title.en);
  cmp('title (ar)', before.title?.ar, after.title.ar);
  cmp('location (en)', before.location?.en, after.location.en);
  cmp('location (ar)', before.location?.ar, after.location.ar);
  cmp('year', before.year, after.year);
  cmp('summary (en)', before.summary?.en, after.summary.en);
  cmp('summary (ar)', before.summary?.ar, after.summary.ar);
  cmp('description', before.description, after.description);
  cmp('sectors', keys(before.sectors), keys(after.sectors));
  cmp('design categories', keys(before.designCategories), keys(after.designCategories));
  cmp('disciplines', keys(before.disciplines), keys(after.disciplines));
  cmp('specs', before.specs, after.specs);
  cmp('cover', before.cover, after.cover);
  if (stable(before.gallery ?? []) !== stable(after.gallery)) {
    changes.push({ field: 'gallery', from: `${before.gallery?.length ?? 0} images`, to: `${after.gallery.length} images` });
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
