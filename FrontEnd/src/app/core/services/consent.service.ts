import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AnalyticsConsent = 'granted' | 'denied';

const KEY = 'msp-analytics-consent';

/**
 * The visitor's choice about non-essential analytics. Nothing is assumed:
 * until the visitor accepts, the state is null and analytics stays off. The
 * choice is remembered in this browser only (no server, no cookie) and can be
 * changed at any time from the footer.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly state = signal<AnalyticsConsent | null>(this.read());

  grant(): void {
    this.write('granted');
  }

  deny(): void {
    this.write('denied');
  }

  /** Forget the choice so the visitor is asked again. */
  reset(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Storage unavailable: the choice simply isn't remembered.
    }
    this.state.set(null);
  }

  private read(): AnalyticsConsent | null {
    if (!this.browser) return null;
    try {
      const v = localStorage.getItem(KEY);
      return v === 'granted' || v === 'denied' ? v : null;
    } catch {
      return null;
    }
  }

  private write(value: AnalyticsConsent): void {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      // Storage unavailable: honour the choice for this visit only.
    }
    this.state.set(value);
  }
}
