import { TestBed } from '@angular/core/testing';
import { SeoService } from '../../core/services/seo.service';
import { TranslationService } from '../../core/services/translation.service';
import { CareersPage } from './careers-page';

describe('CareersPage', () => {
  it('does not advertise unconfirmed vacancies', () => {
    TestBed.configureTestingModule({
      imports: [CareersPage],
      providers: [
        { provide: TranslationService, useValue: { pick: (v: { en: string }) => v.en } },
        { provide: SeoService, useValue: { update: () => {} } },
      ],
    });
    const fixture = TestBed.createComponent(CareersPage);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Senior Architect');
    expect(text).not.toContain('Open roles');
    expect(text).toContain('job@msp.sa');
  });
});
