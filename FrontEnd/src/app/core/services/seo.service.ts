import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { isArabicUrl, localizeUrl, TranslationService } from './translation.service';

export interface SeoData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  /** Keep the page out of search results (404s, utility pages). */
  noindex?: boolean;
}

/** Public origin used for canonical and Open Graph URLs (prerendered at build time). */
const ORIGIN = 'https://msp.sa';
/** 1200×630 share card — a real MSP project, not stock. */
const DEFAULT_IMAGE = `${ORIGIN}/images/og-msp.jpg`;

/** Centralizes page title, meta, Open Graph / Twitter cards and the canonical link. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);
  private readonly siteName = { en: 'MSP — Architecture + Engineering', ar: 'MSP — عمارة وهندسة' };

  constructor() {
    // Canonical + og:url follow the route, so pages never have to pass them.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.setUrl(this.absolute(e.urlAfterRedirects)));
  }

  update(data: SeoData): void {
    const siteName = this.i18n.pick(this.siteName);
    const title = data.title ? `${data.title} — ${siteName}` : siteName;
    this.titleService.setTitle(title);
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({
      property: 'og:site_name',
      content: this.i18n.pick({ en: 'MSP Consultants', ar: 'MSP للاستشارات' }),
    });

    if (data.description) {
      this.meta.updateTag({ name: 'description', content: data.description });
      this.meta.updateTag({ property: 'og:description', content: data.description });
      this.meta.updateTag({ name: 'twitter:description', content: data.description });
    }

    const image = data.image ? this.absolute(data.image) : DEFAULT_IMAGE;
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ name: 'twitter:image', content: image });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    if (data.noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
    } else {
      this.meta.removeTag('name="robots"');
    }

    // Pages call update() while their route activates — before NavigationEnd,
    // which prerendering may never wait for — so set the URL here too.
    this.setUrl(this.absolute(data.url ?? this.router.url));
  }

  /**
   * Self-referencing canonical per edition, plus hreflang alternates pairing
   * each English page with its Arabic twin (x-default → English).
   */
  private setUrl(url: string): void {
    const path = url.startsWith(ORIGIN) ? url.slice(ORIGIN.length) || '/' : url;
    const arabic = isArabicUrl(path);
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:locale', content: arabic ? 'ar_SA' : 'en_US' });
    this.meta.updateTag({ property: 'og:locale:alternate', content: arabic ? 'en_US' : 'ar_SA' });

    this.link('link[rel="canonical"]', { rel: 'canonical' }).setAttribute('href', url);
    const en = this.absolute(localizeUrl(path, 'en'));
    const ar = this.absolute(localizeUrl(path, 'ar'));
    for (const [lang, href] of [['en', en], ['ar', ar], ['x-default', en]] as const) {
      this.link(`link[rel="alternate"][hreflang="${lang}"]`, { rel: 'alternate', hreflang: lang }).setAttribute('href', href);
    }
  }

  /** Finds a <link> in <head> by selector, creating it with `attrs` if missing. */
  private link(selector: string, attrs: Record<string, string>): HTMLLinkElement {
    let el = this.document.head.querySelector<HTMLLinkElement>(selector);
    if (!el) {
      el = this.document.createElement('link');
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      this.document.head.appendChild(el);
    }
    return el;
  }

  /** Resolve a path or URL against the public origin, dropping query and hash. */
  private absolute(pathOrUrl: string): string {
    if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
    const path = pathOrUrl.split(/[?#]/)[0] || '/';
    return `${ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
  }
}
