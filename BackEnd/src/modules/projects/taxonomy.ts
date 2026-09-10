import { Term } from './entities/project.entity';

/**
 * The three classification axes, mirroring the frontend's
 * `core/data/taxonomy.ts`. Keys must stay identical in both: the website
 * filters on the key, and a mismatch silently hides a project.
 */

const term = (key: string, en: string, ar: string): Term => ({ key, en, ar });

/** Axis 1 — the design field. The works page's top filter row. */
export const DESIGN_CATEGORIES = {
  architecture: term('architecture', 'Architecture', 'العمارة'),
  interiors: term('interiors', 'Interiors', 'التصميم الداخلي'),
  landscape: term('landscape', 'Landscape', 'تصميم المواقع'),
  planning: term('planning', 'Planning', 'التخطيط'),
  products: term('products', 'Products', 'تصميم المنتجات'),
} as const;

/** Axis 2 — the sector served. The works page's second filter row. */
export const SECTORS = {
  culture: term('culture', 'Culture', 'ثقافي'),
  education: term('education', 'Education', 'تعليمي'),
  work: term('work', 'Work', 'أعمال ومكاتب'),
  commercial: term('commercial', 'Commercial', 'تجاري'),
  hospitality: term('hospitality', 'Hospitality', 'ضيافة'),
  residential: term('residential', 'Residential', 'سكني'),
  infrastructure: term('infrastructure', 'Infrastructure', 'بنية تحتية'),
  space: term('space', 'Space', 'فضاءات'),
  sports: term('sports', 'Sports', 'رياضي'),
  health: term('health', 'Health', 'صحي'),
} as const;

/** Axis 3 — the scope MSP carried. Shown on the project page, never filtered. */
export const DISCIPLINES = {
  architectural: term('architectural-design', 'Architectural Design', 'التصميم المعماري'),
  engineering: term('engineering-design', 'Engineering Design', 'التصميم الهندسي'),
  interior: term('interior-design', 'Interior Design', 'التصميم الداخلي'),
  supervision: term('supervision', 'Supervision', 'الإشراف الهندسي'),
  projectManagement: term('project-management', 'Project Management', 'إدارة المشروع'),
} as const;
