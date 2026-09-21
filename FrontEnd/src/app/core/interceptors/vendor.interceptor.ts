import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { VENDOR_API_URL } from '../constants/api.constants';
import { VendorSession } from '../services/vendor-session.service';

/** Vendor-portal routes of the office service: they get the VENDOR token, never the staff one. */
export function isVendorPortalUrl(url: string): boolean {
  return url.startsWith(`${VENDOR_API_URL}/vendor/`);
}

/** Attaches the vendor session token to vendor-portal requests only. */
export const vendorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isVendorPortalUrl(req.url)) return next(req);
  const token = inject(VendorSession).token();
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};
