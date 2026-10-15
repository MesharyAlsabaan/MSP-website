import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PublicContentService } from '../../core/services/public-content.service';
import { SeoData, SeoService } from '../../core/services/seo.service';
import { TranslationService } from '../../core/services/translation.service';
import {
  APPROVED_SERVICE_SLUGS,
  SERVICE_DETAILS,
  SERVICE_PAGES,
  SERVICE_PAGES_REGISTRY,
} from '../../core/data/service-pages';
import { ServiceDetail } from './service-detail';

const project = (slug: string, disciplines: string[]) => ({
  slug,
  title: { en: slug, ar: slug },
  location: { en: 'Riyadh', ar: 'الرياض' },
  disciplines: disciplines.map((key) => ({ key, en: key, ar: key })),
});

function render(slug: string, approved: boolean) {
  const updates: SeoData[] = [];
  TestBed.configureTestingModule({
    imports: [ServiceDetail],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug })) } },
      { provide: SERVICE_PAGES_REGISTRY, useValue: SERVICE_PAGES.map((p) => ({ ...p, approved })) },
      {
        provide: TranslationService,
        useValue: { pick: (v: { en: string }) => v.en, path: (p: string) => p, lang: () => 'en' },
      },
      { provide: SeoService, useValue: { update: (d: SeoData) => updates.push(d) } },
      {
        provide: PublicContentService,
        useValue: {
          projects: () =>
            of([
              project('residential-villas-compound-riyadh', ['architectural-design', 'supervision']),
              project('serviced-apartments-al-sahafah-riyadh', ['interior-design']),
            ]),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(ServiceDetail);
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, updates };
}

describe('Service pages', () => {
  it('ships with no page approved — nothing is published until management signs off', () => {
    expect(APPROVED_SERVICE_SLUGS).toEqual([]);
  });

  it('has full detail content for every registered page', () => {
    for (const page of SERVICE_PAGES) {
      expect(SERVICE_DETAILS[page.cmsSlug], page.slug).toBeTruthy();
      expect(page.method.length).toBeGreaterThan(0);
    }
  });

  it('shows not-found and noindexes an unapproved page', () => {
    const { el, updates } = render('architectural-design', false);
    expect(el.querySelector('h1')?.textContent).toContain('Service not found');
    expect(updates.at(-1)?.noindex).toBe(true);
  });

  it('shows not-found for an unknown slug even when pages are approved', () => {
    const { el } = render('demolition', true);
    expect(el.querySelector('h1')?.textContent).toContain('Service not found');
  });

  it('renders an approved page with its own title, metadata and Service schema', () => {
    const { el, updates } = render('construction-supervision', true);
    expect(el.querySelector('h1')?.textContent).toContain('Construction Supervision');
    const seo = updates.at(-1)!;
    expect(seo.noindex).toBeFalsy();
    expect(seo.title).toBe('Construction Supervision Consultancy in Riyadh');
    expect(seo.schema?.[0]['@type']).toBe('Service');
  });

  it('lists only CMS projects that record the discipline as related evidence', () => {
    const { el } = render('construction-supervision', true);
    const links = [...el.querySelectorAll('a[href^="/projects/"]')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/projects/residential-villas-compound-riyadh']);
  });
});
