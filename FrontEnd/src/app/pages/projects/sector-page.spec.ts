import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { SectorPage } from './sector-page';
import { PublicContentService } from '../../core/services/public-content.service';
import { Project } from '../../core/data/projects';
import { SECTORS } from '../../core/data/taxonomy';

function project(slug: string, sectorKey: string): Project {
  return {
    slug,
    no: '01',
    title: { en: `Project ${slug}`, ar: slug },
    typology: { key: '', en: '', ar: '' },
    location: { en: 'Riyadh', ar: 'الرياض' },
    year: '',
    cover: '',
    gallery: [],
    summary: { en: '', ar: '' },
    description: [],
    specs: [],
    services: [],
    sectors: SECTORS.filter((t) => t.key === sectorKey),
  };
}

const projects = [project('a', 'residential'), project('b', 'residential'), project('c', 'hospitality')];

async function render(sector: string) {
  TestBed.configureTestingModule({
    imports: [SectorPage],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ sector })) } },
      { provide: PublicContentService, useValue: { projects: () => of(projects) } },
    ],
  });
  const fixture = TestBed.createComponent(SectorPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, doc: TestBed.inject(DOCUMENT) };
}

describe('SectorPage', () => {
  it('lists the sector projects with a CollectionPage and ItemList', async () => {
    const { el, doc } = await render('residential');
    expect(el.querySelector('h1')?.textContent).toContain('Villa and residential compound projects in Riyadh');
    expect([...el.querySelectorAll('li h2')].map((h) => h.textContent?.trim())).toEqual(['Project a', 'Project b']);
    const ld = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent).join('');
    expect(ld).toContain('"CollectionPage"');
    expect(ld).toContain('"ItemList"');
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '').not.toContain('noindex');
  });

  it('is a noindexed not-found page when the sector has too few projects', async () => {
    const { el, doc } = await render('hospitality');
    expect(el.textContent).toContain('No projects in this sector yet');
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  });

  it('is not found for an unknown sector', async () => {
    const { el } = await render('spaceships');
    expect(el.textContent).toContain('No projects in this sector yet');
  });
});
