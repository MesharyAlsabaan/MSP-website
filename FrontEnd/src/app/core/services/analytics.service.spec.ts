import { TestBed } from '@angular/core/testing';
import { AnalyticsService, conversionFor } from './analytics.service';

describe('AnalyticsService', () => {
  it('is off without a GA4 measurement ID: no script, no tracking', () => {
    const analytics = TestBed.inject(AnalyticsService);
    expect(analytics.enabled).toBe(false);
    analytics.init();
    analytics.track('generate_lead', { form: 'home' });
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it('classifies contact links as conversions without reading their contents into events', () => {
    expect(conversionFor('tel:+966112000087')).toBe('phone_click');
    expect(conversionFor('mailto:info@msp.sa')).toBe('email_click');
    expect(conversionFor('https://wa.me/966570327777')).toBe('whatsapp_click');
    expect(conversionFor('/contact')).toBeNull();
    expect(conversionFor('https://www.google.com/maps?cid=1')).toBeNull();
  });
});
