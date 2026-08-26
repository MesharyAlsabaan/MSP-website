import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PublicContentService } from '../../core/services/public-content.service';
import { SeoService } from '../../core/services/seo.service';
import { TranslationService } from '../../core/services/translation.service';
import { TeamPage } from './team-page';

describe('Public team page', () => {
  it('renders real API members with their localized role and photo', async () => {
    await TestBed.configureTestingModule({
      imports: [TeamPage],
      providers: [
        {
          provide: TranslationService,
          useValue: { pick: (value: { en: string }) => value.en },
        },
        { provide: SeoService, useValue: { update: () => {} } },
        {
          provide: PublicContentService,
          useValue: {
            team: () =>
              of([
                {
                  id: 'team-1',
                  name: 'MANSOUR ALSABAAN',
                  title: { en: 'Founder & CEO', ar: 'المؤسس والرئيس التنفيذي' },
                  bio: { en: '', ar: '' },
                  photo: '/uploads/mansour.webp',
                  email: '',
                  phone: '',
                  linkedin: '',
                  sortOrder: 1,
                },
                {
                  id: 'team-2',
                  name: 'NADINE AHMED',
                  title: { en: 'Architect', ar: 'معماري' },
                  bio: { en: '', ar: '' },
                  photo: '/uploads/nadine.webp',
                  email: '',
                  phone: '',
                  linkedin: '',
                  sortOrder: 2,
                },
              ]),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TeamPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('MANSOUR ALSABAAN');
    expect(element.textContent).toContain('Founder & CEO');
    expect(element.textContent).toContain('NADINE AHMED');
    expect(element.textContent).toContain('Architect');
    expect(element.querySelectorAll('img')).toHaveLength(2);
  });
});
