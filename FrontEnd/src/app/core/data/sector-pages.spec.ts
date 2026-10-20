import { Project } from './projects';
import { SECTORS, Term } from './taxonomy';
import { MIN_SECTOR_PROJECTS, SECTOR_PAGES, projectsForSector, publishedSectorPages, sectorPageFor } from './sector-pages';
import { SERVICE_PAGES } from './service-pages';

const sector = (...keys: string[]): Term[] => keys.map((k) => SECTORS.find((t) => t.key === k)!);

function project(slug: string, fields: Partial<Project> = {}): Project {
  return {
    slug,
    no: '01',
    title: { en: slug, ar: slug },
    typology: { key: '', en: '', ar: '' },
    location: { en: '', ar: '' },
    year: '',
    cover: '',
    gallery: [],
    summary: { en: '', ar: '' },
    description: [],
    specs: [],
    services: [],
    ...fields,
  };
}

const page = (slug: string) => SECTOR_PAGES.find((p) => p.slug === slug)!;

const villa = project('villa', { sectors: sector('residential') });
const compound = project('compound', { sectors: sector('residential') });
const hotel = project('hotel', { sectors: sector('hospitality') });
const office = project('office', { sectors: sector('work') });
// Typology alone never places a project in a sector.
const untagged = project('untagged', { typology: { key: 'residential', en: 'Residential', ar: 'سكني' } });

describe('sector pages', () => {
  it('takes membership only from the Sectors field', () => {
    expect(projectsForSector(page('residential'), [villa, compound, hotel, untagged]).map((p) => p.slug)).toEqual([
      'villa',
      'compound',
    ]);
  });

  it('groups work and commercial under one page', () => {
    const shop = project('shop', { sectors: sector('commercial') });
    expect(projectsForSector(page('commercial'), [office, shop, villa]).map((p) => p.slug)).toEqual(['office', 'shop']);
  });

  it(`publishes a page only with at least ${MIN_SECTOR_PROJECTS} projects`, () => {
    expect(publishedSectorPages([villa, compound, hotel, office]).map((p) => p.slug)).toEqual(['residential']);
    expect(publishedSectorPages([villa, hotel, office])).toEqual([]);
  });

  it('links a project to its sector page only when that page is published', () => {
    const all = [villa, compound, hotel, office];
    expect(sectorPageFor(villa, all)?.slug).toBe('residential');
    expect(sectorPageFor(hotel, all)).toBeNull();
    expect(sectorPageFor(untagged, all)).toBeNull();
  });

  it('has bilingual copy and links only to existing service pages', () => {
    for (const p of SECTOR_PAGES) {
      for (const field of [p.title, p.h1, p.seoTitle, p.seoDescription, p.intro]) {
        expect(field.en.trim()).not.toBe('');
        expect(field.ar.trim()).not.toBe('');
      }
      for (const slug of p.services) expect(SERVICE_PAGES.some((sp) => sp.slug === slug)).toBe(true);
    }
  });
});
