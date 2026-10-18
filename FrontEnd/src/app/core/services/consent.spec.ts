import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsService, GA4_MEASUREMENT_ID } from './analytics.service';
import { ConsentService } from './consent.service';
import { TranslationService } from './translation.service';
import { ConsentBanner } from '../../shared/ui/consent-banner/consent-banner';

const gtagScripts = () => document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').length;

function setup(id: string) {
  TestBed.configureTestingModule({
    imports: [ConsentBanner],
    providers: [
      provideRouter([]),
      { provide: GA4_MEASUREMENT_ID, useValue: id },
      { provide: TranslationService, useValue: { pick: (v: { en: string }) => v.en, path: (p: string) => p } },
    ],
  });
  return { analytics: TestBed.inject(AnalyticsService), consent: TestBed.inject(ConsentService) };
}

describe('Analytics consent', () => {
  const clean = () => {
    localStorage.removeItem('msp-analytics-consent');
    document.querySelectorAll('script[src*="googletagmanager"]').forEach((s) => s.remove());
  };
  beforeEach(clean);
  afterEach(clean);

  it('with no GA4 ID: no banner, nothing loads, whatever was chosen', async () => {
    const { analytics, consent } = setup('');
    consent.grant();
    analytics.init();
    expect(gtagScripts()).toBe(0);
    const f = TestBed.createComponent(ConsentBanner);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('Accept');
  });

  it('with a GA4 ID but no choice yet: asks, and loads nothing', async () => {
    const { analytics } = setup('G-TEST123');
    analytics.init();
    expect(analytics.enabled).toBe(false);
    expect(gtagScripts()).toBe(0);
    const f = TestBed.createComponent(ConsentBanner);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Accept');
    expect(f.nativeElement.textContent).toContain('Decline');
  });

  it('Decline: banner goes away and analytics never loads', async () => {
    const { analytics } = setup('G-TEST123');
    const f = TestBed.createComponent(ConsentBanner);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    (f.nativeElement.querySelectorAll('button')[0] as HTMLButtonElement).click();
    f.detectChanges();
    analytics.init();
    expect(gtagScripts()).toBe(0);
    expect(f.nativeElement.textContent).not.toContain('Accept');
    expect(localStorage.getItem('msp-analytics-consent')).toBe('denied');
  });

  it('Accept: only now is GA4 loaded; withdrawing consent stops events', async () => {
    const { analytics, consent } = setup('G-TEST123');
    const f = TestBed.createComponent(ConsentBanner);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    (f.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement).click();
    expect(gtagScripts()).toBe(1);
    const w = window as unknown as { dataLayer: unknown[] };
    const before = w.dataLayer.length;
    analytics.track('generate_lead', { form: 'contact_page' });
    expect(w.dataLayer.length).toBe(before + 1);
    consent.reset();
    analytics.track('phone_click');
    expect(w.dataLayer.length).toBe(before + 1);
  });
});
