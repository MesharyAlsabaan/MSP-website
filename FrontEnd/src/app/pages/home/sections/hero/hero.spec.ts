import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { Hero } from './hero';

describe('Home hero calls to action', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }),
    });
    await TestBed.configureTestingModule({
      imports: [Hero],
      providers: [
        provideRouter([]),
        {
          provide: TranslationService,
          useValue: { pick: (value: { en: string }) => value.en, path: (p: string) => p },
        },
        {
          provide: PublicContentService,
          useValue: { projects: () => of([]) },
        },
      ],
    }).compileComponents();
  });

  it('uses Angular links for the contact and projects calls to action', () => {
    const fixture = TestBed.createComponent(Hero);
    fixture.detectChanges();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a'),
    );

    expect(links.find((a) => a.textContent?.includes('Start a project'))?.getAttribute('href'))
      .toBe('/contact');
    expect(links.find((a) => a.textContent?.includes('Selected works'))?.getAttribute('href'))
      .toBe('/projects');
  });

  it('keeps the headline and intro painted from the first frame (no fade or clip, for LCP)', () => {
    const fixture = TestBed.createComponent(Hero);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const primary = [...el.querySelectorAll('h1 > span'), el.querySelector('h1 + p')];
    expect(primary).toHaveLength(4);
    for (const node of primary) {
      expect(node?.classList).toContain('reveal-load--visible');
    }
  });
});
