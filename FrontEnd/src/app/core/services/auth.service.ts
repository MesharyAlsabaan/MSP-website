import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { STORAGE_KEYS } from '../constants/api.constants';
import { Role } from '../enums/role.enum';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Admin authentication: logs in against the backend, persists tokens + user
 * in localStorage (read by authGuard/roleGuard/authInterceptor), and exposes
 * the current user as a signal.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _user = signal<AuthUser | null>(this.restore());
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  /** In-flight refresh, shared so concurrent 401s trigger only one refresh call. */
  private refresh$: Observable<string> | null = null;

  login(email: string, password: string): Observable<AuthUser> {
    return this.api
      .post<ApiResponse<LoginResult>>('auth/login', { email, password })
      .pipe(
        map((res) => res.data),
        tap((result) => this.persist(result)),
        map((result) => result.user),
      );
  }

  /** Current access token from storage (browser only). */
  get accessToken(): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(STORAGE_KEYS.token);
    } catch {
      return null;
    }
  }

  /**
   * Exchanges the stored refresh token for a fresh access token, persisting the
   * new tokens. Deduped: concurrent callers share one in-flight request. Emits
   * the new access token, or errors if no/invalid refresh token.
   */
  refreshTokens(): Observable<string> {
    if (this.refresh$) return this.refresh$;

    const refreshToken = this.isBrowser
      ? localStorage.getItem(STORAGE_KEYS.refresh)
      : null;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    this.refresh$ = this.api
      .post<ApiResponse<LoginResult>>('auth/refresh', { refreshToken })
      .pipe(
        map((res) => res.data),
        tap((result) => this.persist(result)),
        map((result) => result.accessToken),
        finalize(() => {
          this.refresh$ = null;
        }),
        shareReplay(1),
      );
    return this.refresh$;
  }

  logout(): void {
    if (this.isBrowser) {
      for (const key of [
        STORAGE_KEYS.token,
        STORAGE_KEYS.refresh,
        STORAGE_KEYS.role,
        STORAGE_KEYS.user,
      ]) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
    }
    this._user.set(null);
    void this.router.navigate(['/auth/login']);
  }

  private persist(result: LoginResult): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEYS.token, result.accessToken);
        localStorage.setItem(STORAGE_KEYS.refresh, result.refreshToken);
        localStorage.setItem(STORAGE_KEYS.role, result.user.role);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(result.user));
      } catch {
        /* ignore */
      }
    }
    this._user.set(result.user);
  }

  private restore(): AuthUser | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.user);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}
