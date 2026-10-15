import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

type Gtag = (...args: unknown[]) => void;

/** Conversion events MSP measures. Names follow GA4's recommended events. */
export type ConversionEvent = 'generate_lead' | 'phone_click' | 'email_click' | 'whatsapp_click';

/**
 * Privacy-first GA4 wrapper. With no measurement ID configured it does
 * nothing at all — no script, no cookies, no requests. When enabled it loads
 * gtag with Google signals and ad personalisation off, and sends only event
 * names plus non-personal context (page path, form, service). Never names,
 * emails, phone numbers or message text.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly id = environment.ga4MeasurementId;
  private gtag?: Gtag;

  get enabled(): boolean {
    return this.browser && /^G-[A-Z0-9]+$/.test(this.id);
  }

  /** Loads gtag once and starts listening for contact-link clicks. */
  init(): void {
    if (!this.enabled || this.gtag) return;
    const w = this.document.defaultView as unknown as { dataLayer: unknown[]; gtag: Gtag };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer.push(arguments);
    };
    this.gtag = w.gtag;
    this.gtag('js', new Date());
    this.gtag('config', this.id, { allow_google_signals: false, allow_ad_personalization_signals: false });
    const script = this.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.id}`;
    this.document.head.appendChild(script);
    this.document.addEventListener('click', (e) => this.onClick(e), { capture: true });
  }

  track(event: ConversionEvent, params: Record<string, string> = {}): void {
    this.gtag?.('event', event, { page_path: this.document.location?.pathname ?? '', ...params });
  }

  /** Phone, email and WhatsApp links anywhere on the site count as conversions. */
  private onClick(event: Event): void {
    const link = (event.target as Element | null)?.closest?.('a[href]');
    const conversion = conversionFor(link?.getAttribute('href') ?? '');
    if (conversion) this.track(conversion);
  }
}

/** Classifies a link the way the click listener does (exported for tests). */
export function conversionFor(href: string): ConversionEvent | null {
  if (href.startsWith('tel:')) return 'phone_click';
  if (href.startsWith('mailto:')) return 'email_click';
  if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) return 'whatsapp_click';
  return null;
}
