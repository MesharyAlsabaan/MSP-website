import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../constants/api.constants';

type QueryParams = Record<string, string | number | boolean>;

/**
 * Where the server reaches the API while prerendering. The browser uses the
 * same-origin `/api`, but at build time there is no page origin, so a relative
 * URL must be made absolute. Override with PRERENDER_API_ORIGIN.
 */
function serverApiOrigin(): string {
  const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env;
  return (env?.['PRERENDER_API_ORIGIN'] ?? 'https://www.msp.sa').replace(/\/+$/, '');
}

/** Thin typed wrapper over HttpClient rooted at the configured API URL. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base =
    isPlatformServer(inject(PLATFORM_ID)) && API_URL.startsWith('/')
      ? `${serverApiOrigin()}${API_URL}`
      : API_URL;

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.toParams(params) });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  private url(path: string): string {
    return `${this.base}/${path.replace(/^\/+/, '')}`;
  }

  private toParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }
}
