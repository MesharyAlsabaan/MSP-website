/**
 * The three independent axes a project is classified on.
 *
 * The first two drive the two-level filter on the works page: a design field
 * across the top row, a project sector across the second. A project carries
 * SEVERAL of each — Al-Munisiyah is Architecture + Interiors + Planning, and
 * Residential — and shows under every filter it belongs to from ONE record,
 * never a duplicate. Selecting one from each row intersects them.
 *
 * The third axis is not a filter at all: it is the scope MSP actually carried,
 * printed on the project page. Keep it out of the filter rows.
 */

export interface Term {
  readonly key: string;
  readonly en: string;
  readonly ar: string;
}

/** Axis 1 — the design field. Top filter row, in display order. */
export const DESIGN_CATEGORIES: readonly Term[] = [
  { key: 'architecture', en: 'Architecture', ar: 'العمارة' },
  { key: 'interiors', en: 'Interiors', ar: 'التصميم الداخلي' },
  { key: 'landscape', en: 'Landscape', ar: 'تصميم المواقع' },
  { key: 'planning', en: 'Planning', ar: 'التخطيط' },
  { key: 'products', en: 'Products', ar: 'تصميم المنتجات' },
];

/** Axis 2 — the sector served. Second filter row, in display order. */
export const SECTORS: readonly Term[] = [
  { key: 'culture', en: 'Culture', ar: 'ثقافي' },
  { key: 'education', en: 'Education', ar: 'تعليمي' },
  { key: 'work', en: 'Work', ar: 'أعمال ومكاتب' },
  { key: 'commercial', en: 'Commercial', ar: 'تجاري' },
  { key: 'hospitality', en: 'Hospitality', ar: 'ضيافة' },
  { key: 'residential', en: 'Residential', ar: 'سكني' },
  { key: 'infrastructure', en: 'Infrastructure', ar: 'بنية تحتية' },
  { key: 'space', en: 'Space', ar: 'فضاءات' },
  { key: 'sports', en: 'Sports', ar: 'رياضي' },
  { key: 'health', en: 'Health', ar: 'صحي' },
];

/** Axis 3 — the scope MSP carried. Shown on the project page, never filtered. */
export const DISCIPLINES: readonly Term[] = [
  { key: 'architectural-design', en: 'Architectural Design', ar: 'التصميم المعماري' },
  { key: 'engineering-design', en: 'Engineering Design', ar: 'التصميم الهندسي' },
  { key: 'interior-design', en: 'Interior Design', ar: 'التصميم الداخلي' },
  { key: 'supervision', en: 'Supervision', ar: 'الإشراف الهندسي' },
  { key: 'project-management', en: 'Project Management', ar: 'إدارة المشروع' },
];

/**
 * Re-labels a stored term from the taxonomy, so one key always reads the same
 * way no matter what wording the record happens to carry. Falls back to the
 * record's own labels when the key is not (or no longer) in the list.
 */
export function label(list: readonly Term[], term: Term): Term {
  return list.find((t) => t.key === term.key) ?? term;
}
