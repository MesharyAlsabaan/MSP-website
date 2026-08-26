import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { SeoService } from '../../core/services/seo.service';
import { TranslationService } from '../../core/services/translation.service';
import { ContactPage } from './contact-page';

describe('ContactPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [
        {
          provide: TranslationService,
          useValue: { pick: (value: { en: string }) => value.en },
        },
        { provide: SeoService, useValue: { update: () => undefined } },
        { provide: ApiService, useValue: { post: () => of({}) } },
        {
          provide: PublicContentService,
          useValue: {
            settings: () =>
              of({
                phone: '+966112000087',
                whatsapp: '+966570327777',
                cairoPhone: '+201068017313',
                cairoAddressEn: 'Cairo branch',
                cairoAddressAr: 'فرع القاهرة',
                cairoMapUrl: 'https://www.google.com/maps/place/MSP+DESIGNS/',
              }),
          },
        },
      ],
    }).compileComponents();
  });

  it('shows verified office details with actionable contact links', async () => {
    const fixture = TestBed.createComponent(ContactPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('+966112000087');
    expect(element.textContent).toContain('+966570327777');
    expect(element.textContent).toContain('+201068017313');
    expect(element.textContent).toContain('Established');
    expect(element.textContent).toContain('2010');
    expect(element.querySelector('a[href="mailto:info@msp.sa"]')).toBeTruthy();
    expect(element.querySelector('a[href="tel:+966112000087"]')).toBeTruthy();
    expect(element.querySelector('a[href="https://wa.me/966570327777"]')).toBeTruthy();
    expect(element.querySelector('a[href="tel:+201068017313"]')).toBeTruthy();
    expect(element.querySelector<HTMLAnchorElement>('a[href*="google.com/maps/place/MSP+DESIGNS"]')).toBeTruthy();
  });
});
