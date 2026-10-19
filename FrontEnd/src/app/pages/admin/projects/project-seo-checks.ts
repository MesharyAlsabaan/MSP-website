/**
 * The search checklist shown while editing a project in the CMS. Read-only
 * advice: it never blocks saving. Each check mirrors something the public
 * project page actually uses (title tag, meta description, share image,
 * service links, sector pages, related projects).
 */
interface L { en: string; ar: string; }

export interface SeoCheckInput {
  slug: string;
  title: L;
  location: L;
  year: string;
  cover: string;
  gallery: readonly string[];
  summary: L;
  description: readonly L[];
  disciplines: readonly unknown[];
  sectors: readonly unknown[];
  status: 'draft' | 'published';
}

export interface SeoCheck {
  label: string;
  ok: boolean;
  hint: string;
}

/** Google shows roughly this much of a title and a description. */
const TITLE_MAX = 60;
const SUMMARY_MIN = 70;
const SUMMARY_MAX = 160;

const filled = (l: L) => !!l.en.trim() && !!l.ar.trim();
const len = (s: string) => s.trim().length;

export function projectSeoChecks(p: SeoCheckInput): SeoCheck[] {
  const suffix = ' | MSP'.length;
  const paragraphs = p.description.filter(filled).length;
  return [
    {
      label: 'Slug',
      ok: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug),
      hint: 'Lowercase English words joined by hyphens, e.g. private-villa-riyadh. Changing a published slug breaks its link.',
    },
    {
      label: 'Title in both languages',
      ok: filled(p.title) && len(p.title.en) + suffix <= TITLE_MAX && len(p.title.ar) + suffix <= TITLE_MAX,
      hint: `Used as the page title; keep each under ${TITLE_MAX - suffix} characters and name the building type and place.`,
    },
    {
      label: 'Summary in both languages',
      ok: [p.summary.en, p.summary.ar].every((s) => len(s) >= SUMMARY_MIN && len(s) <= SUMMARY_MAX),
      hint: `Used as the search description: ${SUMMARY_MIN}–${SUMMARY_MAX} characters, factual, no unverified claims.`,
    },
    { label: 'Cover image', ok: !!p.cover, hint: 'Shown in search and social previews and on the works page.' },
    { label: 'Location in both languages', ok: filled(p.location), hint: 'City (and district if public), e.g. Riyadh · الرياض.' },
    { label: 'Year', ok: /^\d{4}$/.test(p.year.trim()), hint: 'Completion or design year, four digits.' },
    {
      label: 'Disciplines',
      ok: p.disciplines.length > 0,
      hint: 'Links the project to its service pages and back.',
    },
    {
      label: 'Sectors',
      ok: p.sectors.length > 0,
      hint: 'Places the project on its sector page and in related projects.',
    },
    {
      label: 'Description',
      ok: paragraphs >= 2,
      hint: 'At least two paragraphs in both languages: the brief, the design response, what MSP delivered.',
    },
    { label: 'Gallery', ok: p.gallery.length >= 3, hint: 'Three or more images; real project photos or approved renders.' },
    { label: 'Published', ok: p.status === 'published', hint: 'Drafts are hidden from the site and from search.' },
  ];
}
