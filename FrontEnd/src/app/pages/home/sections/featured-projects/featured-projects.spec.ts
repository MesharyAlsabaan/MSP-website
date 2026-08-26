import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { FeaturedProjects } from './featured-projects';

describe('Selected works', () => {
  it('renders an honest empty state when the API has no published projects', async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturedProjects],
      providers: [
        provideRouter([]),
        {
          provide: TranslationService,
          useValue: { pick: (value: { en: string }) => value.en },
        },
        { provide: PublicContentService, useValue: { projects: () => of([]) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(FeaturedProjects);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No published projects yet.',
    );
  });
});

