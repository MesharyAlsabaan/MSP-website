import { TestBed } from '@angular/core/testing';
import { Title, Meta } from '@angular/platform-browser';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let seo: SeoService;
  let title: Title;
  let meta: Meta;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    seo = TestBed.inject(SeoService);
    title = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
  });

  it('suffixes the page title with the site name', () => {
    seo.update({ title: 'About' });
    expect(title.getTitle()).toBe('About | MSP');
  });

  it('uses the site name alone when no title is given', () => {
    seo.update({});
    expect(title.getTitle()).toBe('MSP');
  });

  it('sets the description and og:description tags', () => {
    seo.update({ description: 'Premium design agency' });
    expect(meta.getTag('name="description"')?.content).toBe('Premium design agency');
    expect(meta.getTag('property="og:description"')?.content).toBe(
      'Premium design agency',
    );
  });

  it('falls back to the default share image and a large Twitter card', () => {
    seo.update({});
    expect(meta.getTag('property="og:image"')?.content).toBe('https://www.msp.sa/images/og-msp.jpg');
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');
  });

  it('makes a relative page image absolute', () => {
    seo.update({ image: '/api/uploads/a.webp' });
    expect(meta.getTag('property="og:image"')?.content).toBe('https://www.msp.sa/api/uploads/a.webp');
  });

  it('writes og:url and the canonical link without query or hash', () => {
    seo.update({ url: '/projects?sector=x#top' });
    expect(meta.getTag('property="og:url"')?.content).toBe('https://www.msp.sa/projects');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://www.msp.sa/projects',
    );
  });

  it('emits one JSON-LD graph with the organization, page and breadcrumbs', () => {
    seo.update({ title: 'Madinah Hotel', url: '/projects/madinah-hotel', description: 'A hotel.' });
    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(1);
    const graph = JSON.parse(scripts[0].textContent ?? '{}')['@graph'] as Record<string, unknown>[];
    const types = graph.map((n) => n['@type']);
    expect(types).toEqual(['Organization', 'WebSite', 'WebPage', 'BreadcrumbList']);
    const crumbs = graph[3]['itemListElement'] as { name: string; item: string }[];
    expect(crumbs.map((c) => c.name)).toEqual(['Home', 'Projects', 'Madinah Hotel']);
    expect(crumbs[1].item).toBe('https://www.msp.sa/projects');
  });

  it('never claims unverified organization facts', () => {
    seo.update({ title: 'About', url: '/about' });
    const graph = JSON.parse(
      document.head.querySelector('script#ld-json')?.textContent ?? '{}',
    )['@graph'] as Record<string, unknown>[];
    const org = graph[0];
    for (const key of ['legalName', 'sameAs', 'aggregateRating', 'review', 'award', 'numberOfEmployees']) {
      expect(org[key]).toBeUndefined();
    }
  });

  it('drops structured data from noindexed pages', () => {
    seo.update({ title: 'About', url: '/about' });
    seo.update({ title: 'Page not found', noindex: true });
    expect(document.head.querySelector('script#ld-json')).toBeNull();
  });
});
