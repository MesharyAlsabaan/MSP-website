import { ApplicationRef, Injectable, PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { EMPTY, Observable, concat, of, throwError } from 'rxjs';
import { catchError, map, tap, timeout } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';
import { Project } from '../data/projects';
import { EXCLUDED_POST_SLUGS } from '../data/excluded-content';
import {
  BlogPostItem,
  CompanyInfo,
  Partner,
  ServiceItem,
  TeamMember,
  Testimonial,
} from '../models/content.model';

type Params = Record<string, string | number | boolean>;

/**
 * List views (grid, featured, showcase, "next project") only read a project's
 * identity, summary, cover and taxonomy. Dropping the long fields keeps the
 * state embedded in every prerendered page small; detail pages fetch the full
 * record by slug.
 */
function listView(project: Project): Project {
  return { ...project, description: [], gallery: [], specs: [], services: [] };
}

/**
 * Read-only client for the public website. Wraps `ApiService`, hits the public
 * (unauthenticated) GET endpoints, and unwraps the backend `{ data }` /
 * `{ data, total, … }` envelopes. Returns the same view-model shapes the public
 * components render, so templates change minimally when switching off the old
 * static `core/data` arrays.
 *
 * Every read is prerendered: at build time the response goes into the HTML
 * (so crawlers see real projects, services and team) and into TransferState.
 * While the browser hydrates, the same call first replays that snapshot — so
 * the first render matches the prerendered DOM — then refreshes from the API,
 * so CMS edits made after the last deploy still show.
 */
@Injectable({ providedIn: 'root' })
export class PublicContentService {
  private readonly api = inject(ApiService);
  private readonly state = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));
  /** Snapshots are only valid for the first (hydrating) render. */
  private hydrating = !this.isServer;

  constructor() {
    if (this.hydrating) {
      void inject(ApplicationRef).whenStable().then(() => (this.hydrating = false));
    }
  }

  private prerendered<T>(key: string, source: Observable<T>): Observable<T> {
    const stateKey = makeStateKey<T>(`content:${key}`);
    if (this.isServer) {
      // A slow or failing API must not hang the build: the page then renders
      // its empty state and the browser fetches, exactly as before.
      return source.pipe(
        timeout(8000),
        tap((value) => this.state.set(stateKey, value)),
      );
    }
    if (this.hydrating && this.state.hasKey(stateKey)) {
      const snapshot = this.state.get(stateKey, null) as T;
      return concat(of(snapshot), source.pipe(catchError(() => EMPTY)));
    }
    return source;
  }

  /** Unwraps a list envelope (works for paginated and plain `{ data: [] }`). */
  private list<T>(path: string, params?: Params, view: (item: T) => T = (item) => item): Observable<T[]> {
    const key = `${path}?${new URLSearchParams(params as Record<string, string>)}`;
    return this.prerendered(
      key,
      this.api.get<PaginatedResponse<T>>(path, params).pipe(map((r) => (r.data ?? []).map(view))),
    );
  }

  /** Unwraps a single-resource `{ data }` envelope. */
  private one<T>(path: string): Observable<T> {
    return this.prerendered(path, this.api.get<ApiResponse<T>>(path).pipe(map((r) => r.data)));
  }

  projects(): Observable<Project[]> {
    return this.list<Project>('projects', { pageSize: 100 }, listView);
  }

  featuredProjects(): Observable<Project[]> {
    return this.list<Project>('projects', { featured: 'true', pageSize: 8 }, listView);
  }

  projectBySlug(slug: string): Observable<Project> {
    return this.one<Project>(`projects/slug/${encodeURIComponent(slug)}`);
  }

  services(): Observable<ServiceItem[]> {
    return this.list<ServiceItem>('services', { pageSize: 100 });
  }

  team(): Observable<TeamMember[]> {
    return this.list<TeamMember>('team', { pageSize: 100 });
  }

  testimonials(): Observable<Testimonial[]> {
    return this.list<Testimonial>('testimonials', { pageSize: 100 });
  }

  partners(): Observable<Partner[]> {
    return this.list<Partner>('partners', { pageSize: 100 });
  }

  posts(): Observable<BlogPostItem[]> {
    return this.list<BlogPostItem>('blog', { pageSize: 100 }).pipe(
      map((list) => list.filter((p) => !EXCLUDED_POST_SLUGS.includes(p.slug))),
    );
  }

  postBySlug(slug: string): Observable<BlogPostItem> {
    if (EXCLUDED_POST_SLUGS.includes(slug)) return throwError(() => new Error('Not found'));
    return this.one<BlogPostItem>(`blog/slug/${encodeURIComponent(slug)}`);
  }

  /** All settings as one object (companyName, tagline, phone, email, social, …). */
  settings(): Observable<CompanyInfo> {
    return this.one<CompanyInfo | null>('settings').pipe(map((v) => v ?? {}));
  }
}
