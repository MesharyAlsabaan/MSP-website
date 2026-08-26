import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { Team } from './team';

const member = (
  id: string,
  name: string,
  role: string,
  photo: string,
  sortOrder: number,
) => ({
  id,
  name,
  title: { en: role, ar: role },
  bio: { en: '', ar: '' },
  photo,
  email: '',
  phone: '',
  linkedin: '',
  sortOrder,
});

const render = async (team: ReturnType<typeof member>[]) => {
  await TestBed.configureTestingModule({
    imports: [Team],
    providers: [
      {
        provide: TranslationService,
        useValue: { pick: (value: { en: string }) => value.en },
      },
      { provide: PublicContentService, useValue: { team: () => of(team) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Team);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
};

describe('Home studio section', () => {
  it('keeps the studio order and shows a monogram where a portrait is missing', async () => {
    const element = await render([
      member('1', 'MANSOUR ALSABAAN', 'Founder & CEO', '/uploads/mansour.webp', 0),
      member('2', 'MOHAMMED ALSABAAN', 'Founder', '', 1),
      member('3', 'ABDULLAH ALHIBSHI', 'Lead Architect', '', 2),
      member('4', 'NADINE AHMED', 'Architect', '/uploads/nadine.webp', 3),
      member('5', 'RADWA MOHSEN', 'Architect', '/uploads/radwa.webp', 4),
    ]);

    const cards = element.querySelectorAll('article');
    expect(cards).toHaveLength(4);

    // Founders without a portrait are not dropped from the four-up.
    expect(element.textContent).toContain('MOHAMMED ALSABAAN');
    expect(element.textContent).toContain('ABDULLAH ALHIBSHI');
    // The fifth member is beyond the four-up.
    expect(element.textContent).not.toContain('RADWA MOHSEN');

    expect(element.querySelectorAll('img')).toHaveLength(2);
    const monograms = element.querySelectorAll('[role="img"]');
    expect(monograms).toHaveLength(2);
    expect(monograms[0].textContent?.trim()).toBe('MA');
    expect(monograms[1].textContent?.trim()).toBe('AA');
    expect(monograms[0].getAttribute('aria-label')).toContain('MOHAMMED ALSABAAN');
  });

  it('renders no bundled sample names once the API responds', async () => {
    const element = await render([
      member('1', 'MANSOUR ALSABAAN', 'Founder & CEO', '/uploads/mansour.webp', 0),
    ]);

    expect(element.querySelectorAll('article')).toHaveLength(1);
    expect(element.textContent).not.toContain('Reem Al-Sudairi');
    expect(element.textContent).not.toContain('Karim Nasser');
  });
});
