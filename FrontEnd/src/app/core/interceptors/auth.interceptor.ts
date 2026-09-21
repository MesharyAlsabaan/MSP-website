import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { STORAGE_KEYS } from '../constants/api.constants';
import { isVendorPortalUrl } from './vendor.interceptor';

/** Attaches the bearer token (if present) to outgoing requests. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Vendor-portal routes of the office service carry the VENDOR token (vendorInterceptor), never the staff one.
  if (!isPlatformBrowser(inject(PLATFORM_ID)) || isVendorPortalUrl(req.url)) {
    return next(req);
  }

  let token: string | null = null;
  try {
    token = localStorage.getItem(STORAGE_KEYS.token);
  } catch {
    // ignore
  }

  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
