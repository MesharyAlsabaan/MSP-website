/**
 * Build-time list of published slugs for a public collection, used to
 * prerender detail pages. Reads the same API origin as the prerender
 * (PRERENDER_API_ORIGIN, default https://www.msp.sa). Never throws: an
 * unreachable API yields no pages, and those routes stay client-rendered.
 */
export async function publishedSlugs(resource: 'projects' | 'blog'): Promise<string[]> {
  const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env;
  const origin = (env?.['PRERENDER_API_ORIGIN'] ?? 'https://www.msp.sa').replace(/\/+$/, '');
  try {
    const res = await fetch(`${origin}/api/${resource}?pageSize=100`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: { slug?: string }[] };
    return (body.data ?? []).map((item) => item.slug ?? '').filter(Boolean);
  } catch {
    return [];
  }
}
