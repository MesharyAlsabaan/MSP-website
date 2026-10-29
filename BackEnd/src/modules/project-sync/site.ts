/**
 * The public side of publishing. A project saved in the database is reachable
 * at once through the client-rendered fallback, but its prerendered page
 * (title, meta description, canonical, hreflang, JSON-LD) and its sitemap
 * entry only exist after the frontend is rebuilt — the build prerenders every
 * published project from the API. So a run that changed anything asks Railway
 * for ONE frontend build, then checks the live pages.
 *
 * The rebuild is requested from Railway, configured by (all four):
 *   RAILWAY_TOKEN                a project token scoped to the environment
 *   RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT_ID, RAILWAY_FRONTEND_SERVICE_ID
 * or, for staging and other hosts, from a deploy-hook URL:
 *   PROJECT_SYNC_REBUILD_WEBHOOK (+ optional PROJECT_SYNC_REBUILD_WEBHOOK_SECRET,
 *   sent as the X-Rebuild-Secret header)
 * Without either, rebuilds are off and every report says so.
 */

/** Where the live site is fetched from (a staging URL when testing). */
export const SITE_ORIGIN = (process.env.PROJECT_SYNC_SITE_ORIGIN || 'https://www.msp.sa').replace(/\/+$/, '');
/** The origin the pages name in canonical/hreflang/sitemap — production's, even on staging. */
export const CANONICAL_ORIGIN = (process.env.PROJECT_SYNC_CANONICAL_ORIGIN || SITE_ORIGIN).replace(/\/+$/, '');

const path = (slug: string, lang: 'en' | 'ar') => `${lang === 'ar' ? '/ar' : ''}/projects/${slug}`;
export const pageUrl = (slug: string, lang: 'en' | 'ar') => `${SITE_ORIGIN}${path(slug, lang)}`;
const canonicalUrl = (slug: string, lang: 'en' | 'ar') => `${CANONICAL_ORIGIN}${path(slug, lang)}`;

export function railwayConfigured(): boolean {
  return !!(process.env.RAILWAY_TOKEN && process.env.RAILWAY_PROJECT_ID && process.env.RAILWAY_ENVIRONMENT_ID && process.env.RAILWAY_FRONTEND_SERVICE_ID);
}

export function rebuildConfigured(): 'railway' | 'webhook' | null {
  if (railwayConfigured()) return 'railway';
  if (process.env.PROJECT_SYNC_REBUILD_WEBHOOK) return 'webhook';
  return null;
}

/** Starts a fresh build + deploy of the frontend from its current source. */
export async function triggerFrontendBuild(): Promise<void> {
  const via = rebuildConfigured();
  if (via === 'webhook') {
    const res = await fetch(process.env.PROJECT_SYNC_REBUILD_WEBHOOK!, {
      method: 'POST',
      headers: { 'X-Rebuild-Secret': process.env.PROJECT_SYNC_REBUILD_WEBHOOK_SECRET ?? '' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Rebuild hook answered ${res.status}`);
    return;
  }
  if (!via) throw new Error('Frontend rebuild is not configured');
  const res = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Project-Access-Token': process.env.RAILWAY_TOKEN! },
    body: JSON.stringify({
      query: 'mutation deploy($input: EnvironmentTriggersDeployInput!) { environmentTriggersDeploy(input: $input) }',
      variables: {
        input: {
          projectId: process.env.RAILWAY_PROJECT_ID,
          environmentId: process.env.RAILWAY_ENVIRONMENT_ID,
          serviceId: process.env.RAILWAY_FRONTEND_SERVICE_ID,
        },
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json().catch(() => ({}))) as { errors?: { message: string }[] };
  if (!res.ok || body.errors?.length) {
    throw new Error(`Railway rebuild request failed (${res.status}): ${body.errors?.map((e) => e.message).join('; ') ?? 'no detail'}`);
  }
}

export interface PageCheck {
  ok: boolean;
  problems: string[];
}

const get = (url: string) =>
  fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'MSP-ProjectSync/1.0' } });

/**
 * The project is live only when the API serves it AND both prerendered pages
 * carry its own canonical, both hreflang alternates and its record — the
 * client-rendered fallback answers 200 too, so a status code proves nothing.
 */
export async function verifyProject(slug: string, cover: string, inSitemap: Set<string> | null): Promise<PageCheck> {
  const problems: string[] = [];
  const en = canonicalUrl(slug, 'en');
  const ar = canonicalUrl(slug, 'ar');
  try {
    const api = await get(`${SITE_ORIGIN}/api/projects/slug/${encodeURIComponent(slug)}`);
    if (api.status !== 200) problems.push(`API answered ${api.status}`);

    for (const [lang, url] of [['en', en], ['ar', ar]] as const) {
      const res = await get(pageUrl(slug, lang));
      if (res.status !== 200) {
        problems.push(`${lang} page answered ${res.status}`);
        continue;
      }
      const html = await res.text();
      if (!html.includes(`<link rel="canonical" href="${url}"`)) problems.push(`${lang} page is not prerendered yet (no self canonical)`);
      if (!html.includes(`hreflang="en" href="${en}"`) || !html.includes(`hreflang="ar" href="${ar}"`)) problems.push(`${lang} page lacks hreflang alternates`);
      if (/<meta name="robots" content="[^"]*noindex/.test(html)) problems.push(`${lang} page is noindex`);
    }

    if (cover) {
      const img = await get(cover.startsWith('http') ? cover : `${SITE_ORIGIN}${cover}`);
      if (img.status !== 200 || !(img.headers.get('content-type') ?? '').startsWith('image/')) problems.push(`cover image answered ${img.status}`);
    }
    if (inSitemap && !(inSitemap.has(en) && inSitemap.has(ar))) problems.push('not in sitemap.xml yet');
  } catch (err) {
    problems.push(`check failed: ${(err as Error).message}`);
  }
  return { ok: problems.length === 0, problems };
}

export async function sitemapUrls(): Promise<Set<string> | null> {
  try {
    const res = await get(`${SITE_ORIGIN}/sitemap.xml`);
    if (!res.ok) return null;
    return new Set([...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  } catch {
    return null;
  }
}
