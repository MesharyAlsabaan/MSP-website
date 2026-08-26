import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ProjectShowcase } from './project-showcase';

describe('Hero project showcase', () => {
  it('keeps a successful empty API response empty instead of restoring sample projects', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }),
    });
    await TestBed.configureTestingModule({
      imports: [ProjectShowcase],
      providers: [
        provideRouter([]),
        {
          provide: TranslationService,
          useValue: { pick: (value: { en: string }) => value.en },
        },
        { provide: PublicContentService, useValue: { projects: () => of([]) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProjectShowcase);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('No published projects yet.');
    expect(text).not.toContain('Najd Cultural Centre');
    expect(text).not.toContain('Marsa Waterfront Towers');
    expect(text).not.toContain('Qiddiya Sports Pavilion');
    expect(text).not.toContain('Diriyah Residential Quarter');
  });
});
