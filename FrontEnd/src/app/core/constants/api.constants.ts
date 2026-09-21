import { environment } from '../../../environments/environment';

/** Base URL for all backend API calls. */
export const API_URL = environment.apiUrl;

/** Base URL of the office vendor service (vendor portal + vendor review). */
export const VENDOR_API_URL = environment.vendorApiUrl;

/** localStorage keys used across the app. */
export const STORAGE_KEYS = {
  theme: 'msp-theme',
  lang: 'msp-lang',
  token: 'msp-token',
  refresh: 'msp-refresh',
  role: 'msp-role',
  user: 'msp-user',
  /** Vendor portal session — separate from the staff token above. */
  vendorToken: 'msp-vendor-token',
  vendorAccount: 'msp-vendor-account',
} as const;
