import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { STORAGE_KEYS } from '../constants/api.constants';

export interface VendorAccountInfo {
  id: string;
  email: string;
  contactName: string;
}

/**
 * The vendor's login state (office vendor service token). Kept apart from
 * the staff session: different storage keys, different token, and the
 * interceptor sends it only to vendor routes of the vendor service.
 */
@Injectable({ providedIn: 'root' })
export class VendorSession {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _account = signal<VendorAccountInfo | null>(this.read());
  readonly account = computed(() => this._account());
  readonly isLoggedIn = computed(() => this._account() !== null);

  token(): string | null {
    if (!this.browser) return null;
    try { return localStorage.getItem(STORAGE_KEYS.vendorToken); } catch { return null; }
  }

  start(token: string, account: VendorAccountInfo): void {
    try {
      localStorage.setItem(STORAGE_KEYS.vendorToken, token);
      localStorage.setItem(STORAGE_KEYS.vendorAccount, JSON.stringify(account));
    } catch { /* private mode: session lives in memory only */ }
    this._account.set(account);
  }

  end(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.vendorToken);
      localStorage.removeItem(STORAGE_KEYS.vendorAccount);
    } catch { /* ignore */ }
    this._account.set(null);
  }

  private read(): VendorAccountInfo | null {
    if (!this.browser) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.vendorAccount);
      return raw && localStorage.getItem(STORAGE_KEYS.vendorToken) ? (JSON.parse(raw) as VendorAccountInfo) : null;
    } catch { return null; }
  }
}
