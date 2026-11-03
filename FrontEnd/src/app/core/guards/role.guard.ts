import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Role } from '../enums/role.enum';
import { STORAGE_KEYS } from '../constants/api.constants';

/**
 * Guard factory: allows navigation only when the current user's role is one
 * of `allowed`. Reads the role from storage for now; swap for a real session
 * store when the auth feature is built.
 *
 * Usage: `canActivate: [roleGuard(Role.SuperAdmin, Role.ContentManager)]`
 */
export function roleGuard(...allowed: Role[]): CanActivateFn {
  return () => {
    const router = inject(Router);
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return true;
    }

    let role: string | null = null;
    try {
      role = localStorage.getItem(STORAGE_KEYS.role);
    } catch {
      // ignore
    }

    return role && allowed.includes(role as Role)
      ? true
      : router.createUrlTree(['/']);
  };
}
