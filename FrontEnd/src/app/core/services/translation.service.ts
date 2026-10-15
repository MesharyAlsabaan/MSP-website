import { Injectable, signal, computed, effect, inject, DOCUMENT } from '@angular/core';
import { CanActivateFn, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export type Lang = 'en' | 'ar';

/** URL prefix for the Arabic edition. English lives at the root. */
export const AR_PREFIX = '/ar';

/** True when a URL (path, optionally with query/hash) belongs to the Arabic edition. */
export function isArabicUrl(url: string): boolean {
  return /^\/ar(?=[/?#]|$)/.test(url);
}

/** Strips the language prefix: `/ar/about?x` → `/about?x`, `/ar` → `/`. */
export function stripLangPrefix(url: string): string {
  if (!isArabicUrl(url)) return url;
  const rest = url.slice(AR_PREFIX.length);
  return rest.startsWith('/') ? rest : `/${rest}`;
}

/** Builds the URL for `path` (an English, root-relative URL) in the given language. */
export function localizeUrl(path: string, lang: Lang): string {
  const base = stripLangPrefix(path.startsWith('/') ? path : `/${path}`);
  if (lang === 'en') return base;
  if (base === '/') return AR_PREFIX;
  // Home with a query or hash: `/?x` → `/ar?x`, not `/ar/?x`.
  if (base[1] === '?' || base[1] === '#') return AR_PREFIX + base.slice(1);
  return AR_PREFIX + base;
}

/**
 * Manages the active language. The URL is the source of truth: `/ar/...` is
 * Arabic, everything else English — so each edition has its own crawlable,
 * shareable address and prerenders in its own language. Keeps `lang`/`dir`
 * on <html> in sync (on the server too, so the prerendered HTML is correct).
 *
 * Components localize by passing a `{ en, ar }` record to `pick()`, and
 * internal links through `path()` (or the `loc` pipe).
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  readonly lang = signal<Lang>(this.initialLang());
  readonly dir = computed<'ltr' | 'rtl'>(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));
  readonly isArabic = computed(() => this.lang() === 'ar');

  /** The current router URL, as a signal so OnPush views (the switch) follow navigation. */
  // Seeded from the document (not router.url, still '/' before the first
  // navigation ends) so the prerendered switch already points the right way.
  private readonly url = signal(
    this.document.location ? this.document.location.pathname + this.document.location.search : '/',
  );

  /** The current page in the other language — what the language switch links to. */
  readonly counterpartUrl = computed(() =>
    localizeUrl(this.url(), this.isArabic() ? 'en' : 'ar'),
  );

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.url.set(e.urlAfterRedirects));

    effect(() => {
      const html = this.document.documentElement;
      html.setAttribute('lang', this.lang());
      html.setAttribute('dir', this.dir());
    });
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
  }

  /** Returns the value for the active language from a bilingual record. */
  pick<T>(record: { en: T; ar: T }): T {
    return record[this.lang()];
  }

  /** An internal (English, root-relative) path in the active language. */
  path(path: string): string {
    return localizeUrl(path, this.lang());
  }

  private initialLang(): Lang {
    // Browser: read the address bar so the first render already matches.
    // Server: the route guard (`langGuard`) sets it before any page renders.
    const path = this.document.location?.pathname ?? '/';
    return isArabicUrl(path) ? 'ar' : 'en';
  }
}

/** Route guard for each language tree: activates the edition's language. */
export function langGuard(lang: Lang): CanActivateFn {
  return () => {
    inject(TranslationService).setLang(lang);
    return true;
  };
}
