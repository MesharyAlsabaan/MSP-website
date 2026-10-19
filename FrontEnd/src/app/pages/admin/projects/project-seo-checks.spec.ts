import { projectSeoChecks, SeoCheckInput } from './project-seo-checks';

const complete: SeoCheckInput = {
  slug: 'private-villa-riyadh',
  title: { en: 'Private Villa, Riyadh', ar: 'فيلا خاصة، الرياض' },
  location: { en: 'Riyadh', ar: 'الرياض' },
  year: '2023',
  cover: 'uploads/cover.jpg',
  gallery: ['a.jpg', 'b.jpg', 'c.jpg'],
  summary: {
    en: 'A private family villa in north Riyadh, designed around a shaded courtyard and daylight.',
    ar: 'فيلا عائلية خاصة في شمال الرياض، صُممت حول فناء مظلل وإضاءة طبيعية تناسب حياة الأسرة اليومية.',
  },
  description: [
    { en: 'Brief.', ar: 'المتطلبات.' },
    { en: 'Response.', ar: 'الحل.' },
  ],
  disciplines: [{}],
  sectors: [{}],
  status: 'published',
};

const failing = (p: SeoCheckInput) => projectSeoChecks(p).filter((c) => !c.ok).map((c) => c.label);

describe('projectSeoChecks', () => {
  it('passes a complete project', () => {
    expect(failing(complete)).toEqual([]);
  });

  it('flags what a bare new project is missing', () => {
    expect(
      failing({
        ...complete,
        slug: 'Villa 1',
        title: { en: 'Villa', ar: '' },
        summary: { en: 'Short.', ar: '' },
        cover: '',
        year: '',
        sectors: [],
        disciplines: [],
        description: [{ en: 'One', ar: '' }],
        gallery: [],
        status: 'draft',
      }),
    ).toEqual([
      'Slug',
      'Title in both languages',
      'Summary in both languages',
      'Cover image',
      'Year',
      'Disciplines',
      'Sectors',
      'Description',
      'Gallery',
      'Published',
    ]);
  });

  it('flags a title too long for the results page', () => {
    expect(failing({ ...complete, title: { en: 'x'.repeat(60), ar: complete.title.ar } })).toEqual([
      'Title in both languages',
    ]);
  });
});
