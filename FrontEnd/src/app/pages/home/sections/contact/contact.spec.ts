import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { Contact } from './contact';

describe('Home Contact section', () => {
  let posted: unknown[] = [];
  let fail = false;
  beforeEach(async () => {
    posted = [];
    fail = false;
    await TestBed.configureTestingModule({
      imports: [Contact],
      providers: [
        { provide: TranslationService, useValue: { pick: (value: { en: unknown }) => value.en } },
        {
          provide: ApiService,
          useValue: {
            post: (path: string, body: unknown) => {
              posted.push({ path, body });
              return fail ? throwError(() => new Error('down')) : of({});
            },
          },
        },
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

  it('shows verified office details with actionable contact links', () => {
    const fixture = TestBed.createComponent(Contact);
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

  function fillAndSubmit(fixture: ReturnType<typeof TestBed.createComponent<Contact>>) {
    const el = fixture.nativeElement as HTMLElement;
    const set = (sel: string, v: string) => {
      const i = el.querySelector(sel) as HTMLInputElement;
      i.value = v;
      i.dispatchEvent(new Event('input'));
    };
    set('#contact-name', 'Client');
    set('#contact-email', 'client@example.com');
    set('#contact-message', 'We are planning a villa in Riyadh.');
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    return el;
  }

  it('actually sends the enquiry to the contact API before thanking the visitor', () => {
    const fixture = TestBed.createComponent(Contact);
    fixture.detectChanges();
    const el = fillAndSubmit(fixture);
    expect(posted).toEqual([
      { path: 'contact', body: { name: 'Client', email: 'client@example.com', message: 'We are planning a villa in Riyadh.' } },
    ]);
    expect(el.textContent).toContain('Message received');
  });

  it('keeps the form and shows an error when sending fails', () => {
    fail = true;
    const fixture = TestBed.createComponent(Contact);
    fixture.detectChanges();
    const el = fillAndSubmit(fixture);
    expect(el.textContent).not.toContain('Message received');
    expect(el.textContent).toContain('Could not send');
    expect(el.querySelector('form')).toBeTruthy();
  });
});
