import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { STORAGE_KEYS } from '../constants/api.constants';

/**
 * Allows navigation only when an auth token is present; otherwise redirects
 * to the login page. On the server it allows render and lets the client
 * re-check (token lives in localStorage). Backed by a real session store
 * once the auth feature is built.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  let token: string | null = null;
  try {
    token = localStorage.getItem(STORAGE_KEYS.token);
  } catch {
    // ignore
  }

  return token ? true : router.createUrlTree(['/auth/login']);
};
