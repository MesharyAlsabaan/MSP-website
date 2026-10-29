/**
 * The execution report: stored with every run (admin → sync history) and
 * emailed after every run. "Published"/"updated" are used only after the
 * live page passed verification; until then a project is "awaiting verification".
 */

export type Outcome = 'published' | 'updated' | 'awaiting_verification' | 'skipped' | 'failed';

export interface ProjectLine {
  folder: string;
  name: string;
  category: string;
  urlEn: string;
  urlAr: string;
  images: number;
  outcome: Outcome;
  /** Where the page text came from: AI-written, a person, or the factual one-line summary. */
  text?: string;
  /** Details the source does not give; the page was published without them. */
  missing?: string[];
  /** Image changes in this update. */
  imagesAdded?: number;
  imagesReplaced?: number;
  imagesRemoved?: number;
  /** Fields left as a person edited them in the CMS. */
  keptEdits?: string[];
  warnings?: string[];
}

export interface FieldChange {
  field: string;
  from: string;
  to: string;
}

export interface LinkedLine {
  folder: string;
  name: string;
  url: string;
  /** Usable images in the folder, and how many of them are already on the page. */
  sourceImages: number;
  onSite: number;
}

export interface SyncReport {
  runId: string;
  trigger: string;
  dryRun: boolean;
  source: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: 'succeeded' | 'attention' | 'failed' | 'skipped';
  summary: {
    scanned: number;
    newDetected: number;
    published: number;
    updated: number;
    unchanged: number;
    linked: number;
    held: number;
    notPublished: number;
    attention: number;
    failed: number;
    awaitingVerification: number;
  };
  created: ProjectLine[];
  updated: (ProjectLine & { changes: FieldChange[] })[];
  /** Existing site projects connected to their folder in this run. */
  linked: LinkedLine[];
  /** Folders that cannot be published yet, and why. */
  notPublished: { folder: string; name: string; reasons: string[] }[];
  /** Folders held in the admin. */
  held: string[];
  /** Folders the sync could not handle on its own (naming, deleted projects, missing folders). */
  attention: { folder: string; reasons: string[] }[];
  failed: { folder: string; error: string }[];
  /** Run-level problems: permissions, deployment, notifications. */
  issues: string[];
  ownerActions: string[];
}

export function emptyReport(runId: string, trigger: string, dryRun: boolean, startedAt: number): SyncReport {
  return {
    runId,
    trigger,
    dryRun,
    source: '',
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: '',
    durationMs: 0,
    status: 'succeeded',
    summary: { scanned: 0, newDetected: 0, published: 0, updated: 0, unchanged: 0, linked: 0, held: 0, notPublished: 0, attention: 0, failed: 0, awaitingVerification: 0 },
    created: [],
    updated: [],
    linked: [],
    notPublished: [],
    held: [],
    attention: [],
    failed: [],
    issues: [],
    ownerActions: [],
  };
}

const riyadh = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Riyadh', ...opts });

const OUTCOME_LABEL: Record<Outcome, string> = {
  published: 'Published (verified live)',
  updated: 'Updated (verified live)',
  awaiting_verification: 'Saved — awaiting live verification',
  skipped: 'Rehearsal: would be published',
  failed: 'Failed',
};

export function formatReport(r: SyncReport, adminUrl = 'https://www.msp.sa/admin/project-sync'): string {
  const s = r.summary;
  const lines: string[] = [
    `MSP PROJECT SYNC REPORT${r.dryRun ? ' — REHEARSAL (nothing was written)' : ''}`,
    '',
    `Execution Date:     ${riyadh(r.startedAt, { dateStyle: 'full' })}`,
    `Execution Time:     ${riyadh(r.startedAt, { timeStyle: 'short' })} (Riyadh)`,
    `Execution Status:   ${r.status.toUpperCase()}`,
    `Execution Duration: ${Math.round(r.durationMs / 1000)} s`,
    `Trigger:            ${r.trigger}`,
    `Source:             ${r.source}`,
    '',
    'SUMMARY',
    `- Folders scanned:              ${s.scanned}`,
    `- New projects found:           ${s.newDetected}`,
    `- Published (verified live):    ${s.published}`,
    `- Updated (verified live):      ${s.updated}`,
    `- Awaiting live verification:   ${s.awaitingVerification}`,
    `- Existing projects linked:     ${s.linked}`,
    `- Unchanged:                    ${s.unchanged}`,
    `- Not publishable yet:          ${s.notPublished}`,
    `- On hold (admin):              ${s.held}`,
    `- Need attention:               ${s.attention}`,
    `- Errors:                       ${s.failed}`,
  ];
  const section = (title: string, items: string[]) => lines.push('', title, ...(items.length ? items : ['- None']));

  const project = (p: ProjectLine) => [
    `- ${p.name}  [${p.folder}]`,
    `  Status:    ${OUTCOME_LABEL[p.outcome]}`,
    ...(p.category ? [`  Category:  ${p.category}`] : []),
    `  English:   ${p.urlEn}`,
    `  Arabic:    ${p.urlAr}`,
    `  Images:    ${p.images}${p.imagesAdded || p.imagesReplaced || p.imagesRemoved ? ` (${[p.imagesAdded && `${p.imagesAdded} added`, p.imagesReplaced && `${p.imagesReplaced} replaced`, p.imagesRemoved && `${p.imagesRemoved} removed`].filter(Boolean).join(', ')})` : ''}`,
    ...(p.text ? [`  Text:      ${p.text}`] : []),
    ...(p.missing?.length ? [`  Missing:   ${p.missing.join('; ')}`] : []),
    ...(p.keptEdits?.length ? [`  Kept CMS edits to: ${p.keptEdits.join(', ')}`] : []),
    ...(p.warnings ?? []).map((w) => `  Note: ${w}`),
  ];
  section('NEW PROJECTS PUBLISHED', r.created.flatMap(project));
  section('UPDATED PROJECTS', r.updated.flatMap((u) => [...project(u), ...u.changes.map((c) => `  · ${c.field}: "${c.from}" → "${c.to}"`)]));
  section(
    'EXISTING PROJECTS LINKED TO THEIR FOLDER',
    r.linked.map((l) => `- ${l.name}  [${l.folder}] ${l.url} — ${l.onSite} of ${l.sourceImages} folder image(s) already on the page; from now on new and replaced images are synced`),
  );
  section(
    'MISSING DETAILS (published without them — add them in the admin or the folder name)',
    [...r.created, ...r.updated].filter((p) => p.missing?.length).map((p) => `- ${p.name}: ${p.missing!.join('; ')}`),
  );
  section('NOT PUBLISHED YET', r.notPublished.map((n) => `- ${n.name}  [${n.folder}]: ${n.reasons.join('; ')}`));
  if (r.held.length) section('ON HOLD IN THE ADMIN', r.held.map((h) => `- ${h}`));
  section('NEEDS ATTENTION', r.attention.map((v) => `- ${v.folder}: ${v.reasons.join('; ')}`));
  section('ERRORS', [...r.failed.map((f) => `- ${f.folder}: ${f.error}`), ...r.issues.map((i) => `- ${i}`)]);
  section('REQUIRED ACTIONS', r.ownerActions.map((a) => `- ${a}`));

  lines.push('', `Details, corrections and history: ${adminUrl}`);
  return lines.join('\n');
}

export function reportSubject(r: SyncReport): string {
  const s = r.summary;
  const bits = [
    s.published && `${s.published} published`,
    s.updated && `${s.updated} updated`,
    s.awaitingVerification && `${s.awaitingVerification} awaiting verification`,
    s.notPublished && `${s.notPublished} not publishable`,
    s.failed && `${s.failed} error(s)`,
  ].filter(Boolean);
  return `MSP project sync — ${r.status.toUpperCase()}${bits.length ? ` — ${bits.join(', ')}` : ' — no changes'}${r.dryRun ? ' (rehearsal)' : ''}`;
}

/** Shortens a value for the change list. */
export function brief(v: unknown, max = 120): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
