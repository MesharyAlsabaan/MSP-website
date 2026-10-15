import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { isArabicUrl, localizeUrl, stripLangPrefix, TranslationService } from './translation.service';
import {
  Crumb,
  JsonLd,
  ORIGIN,
  PageType,
  organization,
  serializeGraph,
  webPage,
  website,
} from '../seo/structured-data';

export interface SeoData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  /** Keep the page out of search results (404s, utility pages). */
  noindex?: boolean;
  /** schema.org page type for the JSON-LD graph (default WebPage). */
  type?: PageType;
  /** Extra properties for the page node itself (e.g. an FAQPage's questions). */
  pageProps?: JsonLd;
  /** Extra JSON-LD nodes for this page (a project, an article, services…). */
  schema?: JsonLd[];
  /** Open Graph type; articles use `article`. */
  ogType?: 'website' | 'article';
}

/** Breadcrumb labels for the first path segment of each section. */
const SECTION_NAMES: Record<string, { en: string; ar: string }> = {
  about: { en: 'About', ar: 'عن المكتب' },
  services: { en: 'Services', ar: 'الخدمات' },
  projects: { en: 'Projects', ar: 'المشاريع' },
  blog: { en: 'Insights', ar: 'الرؤى' },
  team: { en: 'Team', ar: 'الفريق' },
  careers: { en: 'Careers', ar: 'الوظائف' },
  faq: { en: 'FAQ', ar: 'الأسئلة الشائعة' },
  contact: { en: 'Contact', ar: 'تواصل معنا' },
  privacy: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
  terms: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' },
};
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
  private readonly siteName = 'MSP';

  constructor() {
    // Canonical + og:url follow the route, so pages never have to pass them.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.setUrl(this.absolute(e.urlAfterRedirects)));
  }

  update(data: SeoData): void {
    const title = data.title ? `${data.title} | ${this.siteName}` : this.siteName;
    this.titleService.setTitle(title);
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ property: 'og:type', content: data.ogType ?? 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: this.siteName });

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
    const url = this.absolute(data.url ?? this.router.url);
    this.setUrl(url);
    this.setJsonLd(url, data.title ?? this.siteName, data);
  }

  /**
   * One JSON-LD graph per page: the organization and website, the page itself
   * with its breadcrumb trail, and any page-specific nodes. Noindexed pages
   * carry none.
   */
  private setJsonLd(url: string, name: string, data: SeoData): void {
    const existing = this.document.head.querySelector('script#ld-json');
    if (data.noindex) {
      existing?.remove();
      return;
    }
    const lang = this.i18n.lang();
    const [page, ...trail] = webPage(data.type ?? 'WebPage', url, name, data.description, lang, this.crumbs(url, name));
    const nodes = [organization(), website(), { ...page, ...data.pageProps }, ...trail, ...(data.schema ?? [])];
    const el = existing ?? this.document.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.setAttribute('id', 'ld-json');
    el.textContent = serializeGraph(nodes);
    if (!existing) this.document.head.appendChild(el);
  }

  /** Home › Section › Page, in the page's language. */
  private crumbs(url: string, name: string): Crumb[] {
    const lang = this.i18n.lang();
    const path = stripLangPrefix(url.slice(ORIGIN.length) || '/');
    const segments = path.split('/').filter(Boolean);
    const home: Crumb = {
      name: lang === 'ar' ? 'الرئيسية' : 'Home',
      url: this.absolute(localizeUrl('/', lang)),
    };
    if (segments.length === 0) return [home];
    const section = SECTION_NAMES[segments[0]];
    const sectionCrumb: Crumb = {
      name: section ? section[lang] : name,
      url: this.absolute(localizeUrl(`/${segments[0]}`, lang)),
    };
    if (segments.length === 1) return [home, { ...sectionCrumb, name }];
    return [home, sectionCrumb, { name, url }];
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
