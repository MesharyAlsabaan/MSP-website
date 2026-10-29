/**
 * The project register: an OPTIONAL Google Sheet named `_REGISTER` inside the
 * projects folder. The sync drafts every project without it; the sheet is
 * where the studio corrects a fact or approves in bulk, not a second CMS.
 * Only `folder` is required; every other cell may stay empty, and an empty
 * cell changes nothing.
 *
 * Columns (header row, any order, case-insensitive; unknown columns ignored):
 *
 *   folder            Folder name, e.g. 16_rihana-plaza-commercial-building
 *   approved_for_web  YES = approve (text and images cleared for the public site)
 *                     LATER = postpone, REJECT = never publish; empty = decide in the admin
 *   title_en / title_ar, location_en / location_ar, year, status_en / status_ar
 *   sectors / design_categories / disciplines   taxonomy keys, comma-separated
 *   summary_en / summary_ar, description_en / description_ar (paragraphs: blank line)
 *   cover             image file name to lead with
 *   exclude           image file names to leave out, separated by ;
 *   site_slug         link this folder to a project already on the site
 */

export type RegisterDecision = 'approve' | 'later' | 'reject' | '';

export interface RegisterRow {
  folder: string;
  decision: RegisterDecision;
  titleEn: string;
  titleAr: string;
  sectors: string[];
  designCategories: string[];
  disciplines: string[];
  locationEn: string;
  locationAr: string;
  year: string;
  statusEn: string;
  statusAr: string;
  summaryEn: string;
  summaryAr: string;
  descriptionEn: string[];
  descriptionAr: string[];
  cover: string;
  exclude: string[];
  siteSlug: string;
}

/** Minimal RFC 4180 CSV reader (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const list = (v: string, sep: RegExp = /[,،]/) =>
  v.split(sep).map((s) => s.trim()).filter(Boolean);

const paragraphs = (v: string) =>
  v.split(/\r?\n\s*\r?\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);

function decisionOf(v: string): RegisterDecision {
  if (/^(yes|y|true|approved?|نعم)$/i.test(v)) return 'approve';
  if (/^(later|postpone[d]?|hold|لاحقا|لاحقاً)$/i.test(v)) return 'later';
  if (/^(reject(ed)?|never|no-publish|رفض|مرفوض)$/i.test(v)) return 'reject';
  return '';
}

/** Rows keyed by folder name. Duplicated folders are reported, not merged. */
export function parseRegister(csv: string): { rows: Map<string, RegisterRow>; duplicates: string[] } {
  const [header, ...body] = parseCsv(csv);
  const rows = new Map<string, RegisterRow>();
  const duplicates: string[] = [];
  if (!header) return { rows, duplicates };

  const idx = new Map(header.map((h, i) => [h.trim().toLowerCase(), i]));
  const get = (r: string[], key: string) => (idx.has(key) ? (r[idx.get(key)!] ?? '').trim() : '');

  for (const r of body) {
    const folder = get(r, 'folder');
    if (!folder) continue;
    if (rows.has(folder)) {
      duplicates.push(folder);
      continue;
    }
    rows.set(folder, {
      folder,
      decision: decisionOf(get(r, 'approved_for_web')),
      titleEn: get(r, 'title_en'),
      titleAr: get(r, 'title_ar'),
      sectors: list(get(r, 'sectors').toLowerCase()),
      designCategories: list(get(r, 'design_categories').toLowerCase()),
      disciplines: list(get(r, 'disciplines').toLowerCase()),
      locationEn: get(r, 'location_en'),
      locationAr: get(r, 'location_ar'),
      year: get(r, 'year'),
      statusEn: get(r, 'status_en'),
      statusAr: get(r, 'status_ar'),
      summaryEn: get(r, 'summary_en').replace(/\s+/g, ' '),
      summaryAr: get(r, 'summary_ar').replace(/\s+/g, ' '),
      descriptionEn: paragraphs(get(r, 'description_en')),
      descriptionAr: paragraphs(get(r, 'description_ar')),
      cover: get(r, 'cover'),
      exclude: list(get(r, 'exclude'), /;/),
      siteSlug: get(r, 'site_slug'),
    });
  }
  return { rows, duplicates };
}
