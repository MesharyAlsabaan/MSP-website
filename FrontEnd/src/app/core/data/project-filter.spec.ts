import { countsFor, filterProjects, matches, sectorsOf } from './project-filter';
import { Project } from './projects';
import { DESIGN_CATEGORIES, SECTORS, Term } from './taxonomy';

const term = (list: readonly Term[], key: string): Term => {
  const found = list.find((t) => t.key === key);
  if (!found) throw new Error(`no such term: ${key}`);
  return found;
};

const design = (...keys: string[]) => keys.map((k) => term(DESIGN_CATEGORIES, k));
const sector = (...keys: string[]) => keys.map((k) => term(SECTORS, k));

/** Only the fields the filter reads; the rest of a Project is irrelevant here. */
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

// Al-Munisiyah, the office's worked example: three design fields, one sector.
const munisiyah = project('al-munisiyah', {
  designCategories: design('architecture', 'interiors', 'planning'),
  sectors: sector('residential'),
});

const hotel = project('hotel', {
  designCategories: design('interiors'),
  sectors: sector('hospitality'),
});

const museum = project('museum', {
  designCategories: design('architecture'),
  sectors: sector('culture'),
});

const all = [munisiyah, hotel, museum];

describe('project-filter', () => {
  it('shows every project exactly once when no filter is chosen', () => {
    const result = filterProjects(all, null, null);

    expect(result.map((p) => p.slug)).toEqual(['al-munisiyah', 'hotel', 'museum']);
  });

  it('shows a project under each of its design categories, from one record', () => {
    const appearances = ['architecture', 'interiors', 'planning'].map(
      (key) => filterProjects(all, key, null).filter((p) => p === munisiyah).length,
    );

    expect(appearances).toEqual([1, 1, 1]);
    expect(filterProjects(all, 'landscape', null)).not.toContain(munisiyah);
  });

  it('intersects the two rows rather than merging them', () => {
    // Interiors + Hospitality is the hotel alone — Al-Munisiyah is Interiors
    // but Residential, so it must drop out.
    expect(filterProjects(all, 'interiors', 'hospitality')).toEqual([hotel]);
    expect(filterProjects(all, 'interiors', 'residential')).toEqual([munisiyah]);
    expect(filterProjects(all, 'planning', 'hospitality')).toEqual([]);
  });

  it('treats an empty design list as matching nothing, not everything', () => {
    const unclassified = project('unclassified', { sectors: sector('health') });

    expect(matches(unclassified, 'architecture', null)).toBe(false);
    expect(matches(unclassified, null, 'health')).toBe(true);
    expect(matches(unclassified, null, null)).toBe(true);
  });

  it('never files a project under its legacy typology', () => {
    // A compound saved as mixed-use is Residential and nothing else once the
    // office says so; the stale key must not put it under a second sector.
    const legacy = project('legacy', {
      typology: { key: 'mixed-use', en: 'Commercial Residential', ar: 'تجاري سكني' },
      sectors: sector('residential'),
    });

    expect(sectorsOf(legacy).map((t) => t.key)).toEqual(['residential']);
    expect(filterProjects([legacy], null, 'residential')).toEqual([legacy]);
    expect(filterProjects([legacy], null, 'work')).toEqual([]);
  });

  it('shows a two-sector project under either sector, from one record', () => {
    // Al Ateeq is commercial AND residential: one record, both chips.
    const alAteeq = project('al-ateeq', { sectors: sector('work', 'residential') });

    expect(filterProjects([alAteeq], null, 'work')).toEqual([alAteeq]);
    expect(filterProjects([alAteeq], null, 'residential')).toEqual([alAteeq]);
    expect(filterProjects([alAteeq], null, null)).toEqual([alAteeq]);
  });

  it('counts each row against the selection in the other row', () => {
    const bySector = countsFor(all, 'sector', SECTORS, 'interiors');

    // With Interiors active, only Al-Munisiyah and the hotel remain.
    expect(bySector.get('residential')).toBe(1);
    expect(bySector.get('hospitality')).toBe(1);
    expect(bySector.get('culture')).toBe(0);

    const byCategory = countsFor(all, 'category', DESIGN_CATEGORIES, null);

    expect(byCategory.get('architecture')).toBe(2);
    expect(byCategory.get('products')).toBe(0);
  });
});
