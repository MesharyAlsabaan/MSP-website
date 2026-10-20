// MSP monthly organic report — real data only.
//
// Inputs (no API keys, nothing estimated):
//   --gsc <dir>    Unzipped Search Console export (Performance → Export → CSV):
//                  Queries.csv and Pages.csv, English or Arabic UI.
//   --leads <csv>  The lead log (docs/analytics/MSP-LEAD-LOG-TEMPLATE.csv format).
//   --month <YYYY-MM>  Month to count leads for (defaults to the latest month in the log).
//   --prev <dir>   Optional: last month's Search Console export, for the change column.
//
// Usage: node tools/seo/monthly-report.mjs --gsc ./gsc-2026-11 --leads ./leads.csv > report.md
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const here = dirname(fileURLToPath(import.meta.url));
const targets = JSON.parse(readFileSync(join(here, '../../docs/seo/msp-target-keywords.json'), 'utf8'));

/** Minimal RFC 4180 CSV parser (quoted fields, commas, newlines). */
export function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') q = false; else field += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

const num = (s) => Number(String(s ?? '').replace(/[%,٬\s]/g, '').replace('٫', '.')) || 0;
/** Search Console exports: key, clicks, impressions, CTR, position — same order in every UI language. */
function readGsc(dir, file) {
  const path = join(dir, file);
  if (!existsSync(path)) return null;
  return parseCsv(readFileSync(path, 'utf8')).slice(1).map((r) => ({ key: r[0], clicks: num(r[1]), impressions: num(r[2]), position: num(r[4]) }));
}

/** Arabic/English normalisation so "إشراف", "اشراف" and "الإشراف" match. */
export function norm(s) {
  return s.toLowerCase().normalize('NFKC')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ').trim();
}
const matches = (query, terms) => terms.every((t) => new RegExp(norm(t)).test(norm(query)));
const isArabic = (q) => /[\u0600-\u06FF]/.test(q);
/** The one target a query counts toward: the most specific match; generic targets only as a fallback. */
function targetFor(query) {
  if (INFO.test(norm(query)) || isBrand(query)) return null;
  const hits = targets.targets.filter((t) => (t.lang === 'ar') === isArabic(query) && matches(query, t.match));
  return hits.find((t) => !t.generic) ?? hits[0] ?? null;
}
const INFO = /(^| )(ما هو|ما هي|كيف|لماذا|تعريف|انواع|بحث عن|what is|how to|how do|definition|types of|pdf)( |$)/;
const COMMERCIAL = /(مكتب|شركه|شركات|استشار|مهندس|تصميم|اشراف|firm|office|company|consult|design|architect|engineer|supervision)/;
const isBrand = (q) => targets.brand.some((b) => norm(q).includes(norm(b)));

const weighted = (rows) => {
  const imp = rows.reduce((a, r) => a + r.impressions, 0);
  return { clicks: rows.reduce((a, r) => a + r.clicks, 0), impressions: imp, position: imp ? rows.reduce((a, r) => a + r.position * r.impressions, 0) / imp : null };
};
const fmtPos = (p) => (p == null ? '—' : p.toFixed(1));
const delta = (now, before) => (before == null || now == null ? '' : ` (${now - before >= 0 ? '+' : ''}${(now - before).toFixed(1)})`);

const out = [];
const queries = args.gsc ? readGsc(args.gsc, 'Queries.csv') : null;
const pages = args.gsc ? readGsc(args.gsc, 'Pages.csv') : null;
const prevQueries = args.prev ? readGsc(args.prev, 'Queries.csv') : null;

out.push('# MSP organic report', '');
if (!queries) {
  out.push('**No Search Console export supplied** — visibility, ranking and click sections are empty. Nothing below is estimated.', '');
} else {
  const all = weighted(queries);
  const brand = weighted(queries.filter((q) => isBrand(q.key)));
  out.push('## 1. Visibility (Google Search Console)', '',
    '| | Clicks | Impressions | Avg. position |', '|---|---|---|---|',
    `| All queries in export | ${all.clicks} | ${all.impressions} | ${fmtPos(all.position)} |`,
    `| Brand queries | ${brand.clicks} | ${brand.impressions} | ${fmtPos(brand.position)} |`,
    `| Non-brand | ${all.clicks - brand.clicks} | ${all.impressions - brand.impressions} | — |`, '',
    '_Search Console hides rare queries for privacy, so query rows add up to less than the site total._', '');

  out.push('## 2. The 20 commercial targets', '', '| # | Keyword | Target page | Matching queries | Clicks | Impressions | Avg. position |', '|---|---|---|---|---|---|---|');
  for (const t of targets.targets) {
    const rows = queries.filter((q) => targetFor(q.key) === t);
    const w = weighted(rows);
    const before = prevQueries ? weighted(prevQueries.filter((q) => targetFor(q.key) === t)).position : null;
    out.push(`| ${t.id} | ${t.keyword} | \`${t.page}\` | ${rows.length} | ${w.clicks} | ${w.impressions} | ${fmtPos(w.position)}${delta(w.position, before)} |`);
  }
  out.push('', '_Lower position is better. The change in brackets is against last month (negative = improved)._', '');

  const opp = queries
    .filter((q) => q.position >= 4 && q.position <= 20 && !isBrand(q.key) && COMMERCIAL.test(norm(q.key)) && !INFO.test(norm(q.key)))
    .sort((a, b) => b.impressions - a.impressions).slice(0, 25);
  out.push('## 3. Opportunities: commercial queries in positions 4–20', '',
    'Ranked by impressions. Act on the top rows first: improve the matching page\'s title, H1, first paragraph and internal links for the exact wording.', '',
    '| Query | Impressions | Clicks | Position | Likely page |', '|---|---|---|---|---|');
  for (const q of opp) {
    const t = targetFor(q.key);
    out.push(`| ${q.key} | ${q.impressions} | ${q.clicks} | ${q.position.toFixed(1)} | ${t ? '`' + t.page + '`' : '— (no target page: review)'} |`);
  }
  if (!opp.length) out.push('| (none in this export) | | | | |');
  out.push('');

  if (pages) {
    const top = [...pages].sort((a, b) => b.impressions - a.impressions).slice(0, 15);
    const ar = weighted(pages.filter((p) => /\/ar(\/|$)/.test(p.key)));
    const en = weighted(pages.filter((p) => !/\/ar(\/|$)/.test(p.key)));
    out.push('## 4. Pages', '', `Arabic pages: ${ar.clicks} clicks / ${ar.impressions} impressions · English pages: ${en.clicks} clicks / ${en.impressions} impressions`, '',
      '| Page | Clicks | Impressions | Avg. position |', '|---|---|---|---|',
      ...top.map((p) => `| ${p.key.replace('https://www.msp.sa', '') || '/'} | ${p.clicks} | ${p.impressions} | ${fmtPos(p.position)} |`), '');
  }
}

if (args.leads && existsSync(args.leads)) {
  const rows = parseCsv(readFileSync(args.leads, 'utf8'));
  const head = rows[0]; const col = (r, name) => r[head.indexOf(name)] ?? '';
  const leads = rows.slice(1).filter((r) => !/EXAMPLE/i.test(col(r, 'notes')));
  const month = args.month ?? leads.map((r) => col(r, 'received_date').slice(0, 7)).sort().at(-1);
  const inMonth = leads.filter((r) => col(r, 'received_date').startsWith(month ?? ''));
  const yes = (v) => /^(yes|y|نعم)$/i.test(v.trim());
  const byChannel = {};
  for (const r of inMonth) {
    const c = col(r, 'channel') || 'unknown';
    byChannel[c] ??= { inquiries: 0, qualified: 0, won: 0 };
    if (yes(col(r, 'genuine'))) byChannel[c].inquiries++;
    if (yes(col(r, 'qualified'))) byChannel[c].qualified++;
    if (col(r, 'contract_signed_date')) byChannel[c].won++;
  }
  out.push(`## 5. Leads (lead log, ${month ?? 'no month'})`, '', '| Channel | Inquiries | Qualified Leads | Won Projects |', '|---|---|---|---|',
    ...Object.entries(byChannel).map(([c, v]) => `| ${c} | ${v.inquiries} | ${v.qualified} | ${v.won} |`));
  if (!Object.keys(byChannel).length) out.push('| (no leads logged this month) | | | |');
  const landing = {};
  for (const r of inMonth.filter((r) => yes(col(r, 'qualified')) && col(r, 'landing_page'))) landing[col(r, 'landing_page')] = (landing[col(r, 'landing_page')] ?? 0) + 1;
  if (Object.keys(landing).length) out.push('', 'Qualified Leads by landing page:', '', ...Object.entries(landing).sort((a, b) => b[1] - a[1]).map(([p, n]) => `- \`${p}\`: ${n}`));
  out.push('', '_Definitions: Inquiry = genuine contact request; Qualified Lead = genuine, reachable, relevant A&E need in scope and market with a realistic follow-up; Won Project = signed contract._', '');
} else {
  out.push('## 5. Leads', '', 'No lead log supplied.', '');
}
process.stdout.write(out.join('\n'));
