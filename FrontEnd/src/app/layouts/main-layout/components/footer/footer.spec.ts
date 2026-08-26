import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { Footer } from './footer';

describe('Footer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [
        provideRouter([]),
        { provide: TranslationService, useValue: { pick: (value: { en: string }) => value.en } },
        {
          provide: PublicContentService,
          useValue: {
            settings: () =>
              of({
                phone: '+966112000087',
                whatsapp: '+966570327777',
                cairoPhone: '+201068017313',
                cairoMapUrl: 'https://www.google.com/maps/place/MSP+DESIGNS/',
              }),
          },
        },
      ],
    }).compileComponents();
  });

  it('uses actionable links for email, both offices, WhatsApp, and the Cairo map', async () => {
    const fixture = TestBed.createComponent(Footer);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('+966112000087');
    expect(element.textContent).toContain('+966570327777');
    expect(element.textContent).toContain('+201068017313');
    expect(element.textContent).toContain('Established 2010');
    expect(element.querySelector('a[href="mailto:info@msp.sa"]')).toBeTruthy();
    expect(element.querySelector('a[href="tel:+966112000087"]')).toBeTruthy();
    expect(element.querySelector('a[href="https://wa.me/966570327777"]')).toBeTruthy();
    expect(element.querySelector('a[href="tel:+201068017313"]')).toBeTruthy();
    expect(element.querySelector<HTMLAnchorElement>('a[href*="google.com/maps/place/MSP+DESIGNS"]')).toBeTruthy();
  });
});
