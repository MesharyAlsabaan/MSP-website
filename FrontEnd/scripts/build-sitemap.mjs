// Writes sitemap.xml from the prerendered pages after `ng build`.
//
// The pages are the source of truth: a URL is listed only if its HTML has a
// self-referencing canonical and no noindex, and its hreflang alternates are
// copied from the same HTML. So the sitemap can't drift from what nginx serves
// (projects and insights included, since they are prerendered from the API).
//
// Usage: node scripts/build-sitemap.mjs [browserDir]
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.argv[2] ?? 'dist/FrontEnd/browser';
const ORIGIN = 'https://www.msp.sa';

function* pages(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* pages(path);
    else if (name === 'index.html') yield path;
  }
}

const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const entries = [];
for (const file of pages(root)) {
  const html = readFileSync(file, 'utf8');
  const dir = relative(root, file).split(sep).slice(0, -1).join('/');
  const url = `${ORIGIN}/${dir}`.replace(/\/$/, dir ? '' : '/');
  const canonical = attr(html.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0] ?? '', 'href');
  const robots = attr(html.match(/<meta[^>]*name="robots"[^>]*>/)?.[0] ?? '', 'content') ?? '';
  if (canonical !== url || /noindex/i.test(robots)) continue;
  const alternates = [...html.matchAll(/<link[^>]*rel="alternate"[^>]*hreflang="[^"]*"[^>]*>/g)].map((m) => ({
    lang: attr(m[0], 'hreflang'),
    href: attr(m[0], 'href'),
  }));
  entries.push({ url, alternates });
}

entries.sort((a, b) => a.url.localeCompare(b.url));
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...entries.map(({ url, alternates }) =>
    [
      '  <url>',
      `    <loc>${escapeXml(url)}</loc>`,
      ...alternates.map(
        (a) => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${escapeXml(a.href)}"/>`,
      ),
      '  </url>',
    ].join('\n'),
  ),
  '</urlset>',
  '',
].join('\n');

writeFileSync(join(root, 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${entries.length} URLs`);
