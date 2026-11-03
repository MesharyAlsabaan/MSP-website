import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';

export type QueryParams = Record<string, string | number | boolean>;

/**
 * Generic CRUD client for the admin CMS. Each method targets a resource path
 * (e.g. 'projects') and unwraps the backend `{ data }` envelope. List calls
 * return the full paginated envelope.
 */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly api = inject(ApiService);

  list<T>(path: string, params?: QueryParams): Observable<PaginatedResponse<T>> {
    return this.api.get<PaginatedResponse<T>>(path, params);
  }

  /** For non-paginated GETs that still return a `{ data }` envelope. */
  getRaw<T>(path: string, params?: QueryParams): Observable<T> {
    return this.api.get<ApiResponse<T>>(path, params).pipe(map((r) => r.data));
  }

  get<T>(path: string, id: string): Observable<T> {
    return this.api
      .get<ApiResponse<T>>(`${path}/${id}`)
      .pipe(map((r) => r.data));
  }

  create<T>(path: string, body: unknown): Observable<T> {
    return this.api.post<ApiResponse<T>>(path, body).pipe(map((r) => r.data));
  }

  update<T>(path: string, id: string, body: unknown): Observable<T> {
    return this.api
      .put<ApiResponse<T>>(`${path}/${id}`, body)
      .pipe(map((r) => r.data));
  }

  patch<T>(path: string, sub: string, body: unknown = {}): Observable<T> {
    return this.api.patch<ApiResponse<T>>(`${path}/${sub}`, body).pipe(map((r) => r.data));
  }

  remove(path: string, id: string): Observable<unknown> {
    return this.api.delete(`${path}/${id}`);
  }
}
