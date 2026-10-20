import { sectorsOf } from './project-filter';
import { Project } from './projects';
import { L } from './service-pages';

/**
 * Sector landing pages (/projects/sector/<slug>): crawlable collections of
 * the projects the CMS files under a sector, for searches like "villa design
 * Riyadh" or "hotel design". Membership comes only from each project's
 * Sectors field (the legacy typology is ignored, as on the works page).
 *
 * A page is published only while at least MIN_SECTOR_PROJECTS published
 * projects carry the sector, so a sector never becomes a thin one-project
 * page; it appears by itself once editors tag enough projects.
 */
export const MIN_SECTOR_PROJECTS = 2;

export interface SectorPage {
  slug: string;
  /** CMS sector keys that belong to this page. */
  sectorKeys: readonly string[];
  title: L;
  /** Page heading in the words clients search with. */
  h1: L;
  seoTitle: L;
  seoDescription: L;
  intro: L;
  /** Service pages most relevant to this kind of project. */
  services: readonly string[];
}

export const SECTOR_PAGES: readonly SectorPage[] = [
  {
    slug: 'residential',
    sectorKeys: ['residential'],
    title: { en: 'Residential projects', ar: 'المشاريع السكنية' },
    h1: { en: 'Villa and residential compound projects in Riyadh', ar: 'مشاريع الفلل والمجمعات السكنية في الرياض' },
    seoTitle: { en: 'Residential Architecture Projects in Riyadh', ar: 'مشاريع سكنية: تصميم فلل ومجمعات في الرياض' },
    seoDescription: {
      en: 'Private villas, residential compounds and residential communities designed by MSP in Riyadh, with architecture, engineering and interiors.',
      ar: 'فلل خاصة ومجمعات ومجتمعات سكنية صممتها MSP في الرياض، بالتصميم المعماري والهندسي والداخلي.',
    },
    intro: {
      en: 'Private villas, residential villa compounds and integrated residential communities designed by MSP in Riyadh — homes shaped around privacy, daylight, comfort and the way families live.',
      ar: 'فلل خاصة ومجمعات فلل سكنية ومجتمعات سكنية متكاملة صممتها MSP في الرياض، مساكن تتشكل حول الخصوصية والإضاءة الطبيعية والراحة وطريقة عيش الأسرة.',
    },
    services: ['architectural-design', 'interior-design', 'structural-engineering', 'mep-engineering', 'construction-supervision'],
  },
  {
    slug: 'hospitality',
    sectorKeys: ['hospitality'],
    title: { en: 'Hospitality projects', ar: 'مشاريع الضيافة' },
    h1: { en: 'Hotel and serviced-apartment projects', ar: 'مشاريع الفنادق والشقق المخدومة' },
    seoTitle: { en: 'Hospitality Design Projects: Hotels and Serviced Apartments', ar: 'مشاريع الضيافة: تصميم فنادق وشقق مخدومة' },
    seoDescription: {
      en: 'Hospitality projects by MSP: a hotel in Madinah and serviced apartments in Riyadh, with architecture and interior design.',
      ar: 'مشاريع ضيافة من MSP: فندق في المدينة المنورة وشقق مخدومة في الرياض، بالتصميم المعماري والداخلي.',
    },
    intro: {
      en: 'Hospitality projects by MSP — a hotel in Madinah and serviced apartments in Riyadh — designed around arrival, calm, privacy and the guest experience.',
      ar: 'مشاريع ضيافة من MSP، فندق في المدينة المنورة وشقق مخدومة في الرياض، صُممت حول تجربة الوصول والهدوء والخصوصية وتجربة النزيل.',
    },
    services: ['interior-design', 'architectural-design'],
  },
  {
    slug: 'commercial',
    sectorKeys: ['work', 'commercial'],
    title: { en: 'Commercial and office projects', ar: 'المشاريع التجارية والمكتبية' },
    h1: { en: 'Commercial and office building projects in Riyadh', ar: 'مشاريع المباني التجارية والمكتبية في الرياض' },
    seoTitle: { en: 'Commercial and Office Building Design Projects', ar: 'مشاريع تصميم المباني التجارية والمكتبية' },
    seoDescription: {
      en: 'Office, commercial and commercial-residential buildings designed by MSP in Riyadh.',
      ar: 'مبانٍ مكتبية وتجارية وتجارية سكنية صممتها MSP في الرياض.',
    },
    intro: {
      en: 'Office, commercial and commercial-residential buildings designed by MSP in Riyadh — with a clear street presence and efficient, adaptable space.',
      ar: 'مبانٍ مكتبية وتجارية وتجارية سكنية صممتها MSP في الرياض، بحضور واضح على الشارع وفراغات كفؤة ومرنة.',
    },
    services: ['architectural-design', 'structural-engineering', 'mep-engineering'],
  },
];

/** The published projects that belong to a sector page. */
export function projectsForSector(page: SectorPage, projects: readonly Project[]): Project[] {
  return projects.filter((p) => sectorsOf(p).some((t) => page.sectorKeys.includes(t.key)));
}

/** Sector pages that currently have enough projects to publish. */
export function publishedSectorPages(projects: readonly Project[]): SectorPage[] {
  return SECTOR_PAGES.filter((page) => projectsForSector(page, projects).length >= MIN_SECTOR_PROJECTS);
}

/** The sector page a project belongs to, if that page is published. */
export function sectorPageFor(project: Project, projects: readonly Project[]): SectorPage | null {
  return publishedSectorPages(projects).find((page) => projectsForSector(page, [project]).length > 0) ?? null;
}
