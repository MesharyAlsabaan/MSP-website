import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { SeoService } from '../../core/services/seo.service';
import { TranslationService } from '../../core/services/translation.service';
import { ContactPage } from './contact-page';

describe('ContactPage', () => {
  let posted: unknown[] = [];
  let query: Record<string, string> = {};
  beforeEach(async () => {
    posted = [];
    query = {};
    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [
        {
          provide: TranslationService,
          useValue: { pick: (value: { en: string }) => value.en },
        },
        { provide: SeoService, useValue: { update: () => undefined } },
        { provide: ApiService, useValue: { post: (_p: string, body: unknown) => (posted.push(body), of({})) } },
        { provide: ActivatedRoute, useValue: { snapshot: { get queryParamMap() { return convertToParamMap(query); } } } },
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

  it('sends the optional phone and the chosen service as the enquiry subject', () => {
    const fixture = TestBed.createComponent(ContactPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const set = (sel: string, value: string) => {
      const input = el.querySelector(sel) as HTMLInputElement | HTMLSelectElement;
      input.value = value;
      input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input'));
    };
    set('#c-name', 'Client');
    set('#c-email', 'client@example.com');
    set('#c-phone', '+966 50 000 0000');
    set('#c-service', 'construction-supervision');
    set('#c-msg', 'A villa in Riyadh needs supervision.');
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(posted).toEqual([
      {
        name: 'Client',
        email: 'client@example.com',
        phone: '+966 50 000 0000',
        message: 'A villa in Riyadh needs supervision.',
        subject: 'Enquiry: Construction Supervision',
      },
    ]);
  });

  it('pre-selects the service when arriving from a service page', () => {
    query = { service: 'interior-design' };
    const fixture = TestBed.createComponent(ContactPage);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#c-service') as HTMLSelectElement).value).toBe('interior-design');
  });

  it('ignores an unknown service in the link', () => {
    query = { service: 'demolition' };
    const fixture = TestBed.createComponent(ContactPage);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#c-service') as HTMLSelectElement).value).toBe('');
  });
});
