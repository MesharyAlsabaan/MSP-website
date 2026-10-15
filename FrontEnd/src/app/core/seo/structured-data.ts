import { Lang } from '../services/translation.service';

/**
 * schema.org JSON-LD for the public site. Only facts MSP has confirmed go
 * here: no ratings, reviews, awards, legal name or social profiles until they
 * are verified (see docs/audits/MSP-WEBSITE-FINAL-REPORT.md).
 */

/** Canonical public origin. */
export const ORIGIN = 'https://www.msp.sa';

export const ORG_ID = `${ORIGIN}/#organization`;
export const SITE_ID = `${ORIGIN}/#website`;

export type JsonLd = Record<string, unknown>;

/** Page-level schema.org types the site uses. */
export type PageType = 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'FAQPage';

export interface Crumb {
  name: string;
  url: string;
}

export function organization(): JsonLd {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'MSP',
    url: `${ORIGIN}/`,
    logo: { '@type': 'ImageObject', url: `${ORIGIN}/images/msp-logo-144.png`, width: 144, height: 144 },
    image: `${ORIGIN}/images/og-msp.jpg`,
    description:
      'MSP is a multidisciplinary architecture and engineering consultancy based in Riyadh, Saudi Arabia.',
    foundingDate: '2010',
    email: 'info@msp.sa',
    telephone: '+966112000087',
    address: [
      { '@type': 'PostalAddress', addressLocality: 'Riyadh', addressCountry: 'SA' },
      { '@type': 'PostalAddress', addressLocality: 'Cairo', addressCountry: 'EG' },
    ],
    areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
    knowsAbout: [
      'Architectural design',
      'Interior design',
      'Structural engineering',
      'MEP engineering',
      'Urban planning',
      'Project management',
      'Construction supervision',
    ],
  };
}

export function website(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: `${ORIGIN}/`,
    name: 'MSP',
    publisher: { '@id': ORG_ID },
    inLanguage: ['en', 'ar'],
  };
}

export function webPage(
  type: PageType,
  url: string,
  name: string,
  description: string | undefined,
  lang: Lang,
  crumbs: readonly Crumb[],
): JsonLd[] {
  const page: JsonLd = {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
    inLanguage: lang,
  };
  if (description) page['description'] = description;
  if (crumbs.length < 2) return [page];
  page['breadcrumb'] = { '@id': `${url}#breadcrumb` };
  return [
    page,
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    },
  ];
}

/** Makes a root-relative path absolute on the canonical origin. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${ORIGIN}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/** Serializes a graph so it is safe inside a <script> element. */
export function serializeGraph(nodes: readonly JsonLd[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
