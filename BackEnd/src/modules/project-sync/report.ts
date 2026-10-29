/**
 * The execution report: stored with every run (admin → sync history) and
 * emailed to the owner. "Published"/"updated" are used only after the live
 * page passed verification; until then a project is "awaiting verification".
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
  /** Text fields written by the AI (approved by a person before publishing). */
  aiDrafted?: string[];
  warnings?: string[];
}

export interface FieldChange {
  field: string;
  from: string;
  to: string;
}

export interface DetectedLine {
  folder: string;
  name: string;
  images: number;
  /** Ready to approve, or what still blocks it. */
  blocking: string[];
  notes: string[];
}

export interface PendingLine {
  folder: string;
  name: string;
  /** Empty = ready to approve in the admin. */
  blocking: string[];
  update: boolean;
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
    pendingApproval: number;
    published: number;
    updated: number;
    unchanged: number;
    attention: number;
    failed: number;
    awaitingVerification: number;
    linked: number;
  };
  detected: DetectedLine[];
  created: ProjectLine[];
  updated: (ProjectLine & { changes: FieldChange[] })[];
  /** Every project waiting for a decision, not only this run's. */
  pending: PendingLine[];
  /** Folders the sync could not handle on its own (naming, CMS conflicts, missing folders). */
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
    summary: { scanned: 0, newDetected: 0, pendingApproval: 0, published: 0, updated: 0, unchanged: 0, attention: 0, failed: 0, awaitingVerification: 0, linked: 0 },
    detected: [],
    created: [],
    updated: [],
    pending: [],
    attention: [],
    failed: [],
    issues: [],
    ownerActions: [],
  };
}

const riyadh = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Riyadh', ...opts });

const OUTCOME_LABEL: Record<Outcome, string> = {
  published: 'Successfully published (verified live)',
  updated: 'Successfully updated (verified live)',
  awaiting_verification: 'Saved — awaiting live verification',
  skipped: 'Skipped',
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
    `- New projects detected:        ${s.newDetected}`,
    `- Waiting for your approval:    ${s.pendingApproval}`,
    `- Published (verified live):    ${s.published}`,
    `- Updated (verified live):      ${s.updated}`,
    `- Awaiting live verification:   ${s.awaitingVerification}`,
    `- Unchanged:                    ${s.unchanged}`,
    `- Existing CMS projects:        ${s.linked}`,
    `- Need attention:               ${s.attention}`,
    `- Errors:                       ${s.failed}`,
  ];
  const section = (title: string, items: string[]) => lines.push('', title, ...(items.length ? items : ['- None']));

  section(
    'NEW PROJECTS DETECTED',
    r.detected.flatMap((d) => [
      `- ${d.name}  [${d.folder}] — ${d.images} image(s)`,
      `  ${d.blocking.length ? `Draft prepared; before approval: ${d.blocking.join('; ')}` : 'Draft prepared and ready for your approval'}`,
      ...d.notes.map((n) => `  Note: ${n}`),
    ]),
  );

  const project = (p: ProjectLine) => [
    `- ${p.name}  [${p.folder}]`,
    `  Category:  ${p.category}`,
    `  English:   ${p.urlEn}`,
    `  Arabic:    ${p.urlAr}`,
    `  Images:    ${p.images}`,
    `  Status:    ${OUTCOME_LABEL[p.outcome]}`,
    ...(p.aiDrafted?.length ? [`  AI-written text (approved before publishing): ${p.aiDrafted.join(', ')}`] : []),
    ...(p.warnings ?? []).map((w) => `  Note: ${w}`),
  ];
  section('PUBLISHED PROJECTS', r.created.flatMap(project));
  section('UPDATED PROJECTS', r.updated.flatMap((u) => [...project(u), ...u.changes.map((c) => `  · ${c.field}: "${c.from}" → "${c.to}"`)]));
  section(
    'PENDING APPROVAL',
    r.pending.map((p) => `- ${p.name}  [${p.folder}]${p.update ? ' (update to a live page)' : ''} — ${p.blocking.length ? `to complete: ${p.blocking.join('; ')}` : 'ready: review and approve'}`),
  );
  section('NEEDS ATTENTION', r.attention.map((v) => `- ${v.folder}: ${v.reasons.join('; ')}`));
  section('ERRORS', [...r.failed.map((f) => `- ${f.folder}: ${f.error}`), ...r.issues.map((i) => `- ${i}`)]);
  section('REQUIRED ACTIONS', r.ownerActions.map((a) => `- ${a}`));

  lines.push('', `Review, approve and history: ${adminUrl}`);
  return lines.join('\n');
}

export function reportSubject(r: SyncReport): string {
  const s = r.summary;
  const bits = [
    s.newDetected && `${s.newDetected} new`,
    s.published && `${s.published} published`,
    s.updated && `${s.updated} updated`,
    s.pendingApproval && `${s.pendingApproval} awaiting approval`,
    s.failed && `${s.failed} error(s)`,
  ].filter(Boolean);
  return `MSP project sync — ${r.status.toUpperCase()}${bits.length ? ` — ${bits.join(', ')}` : ' — no changes'}${r.dryRun ? ' (rehearsal)' : ''}`;
}

/** Shortens a value for the change list. */
export function brief(v: unknown, max = 120): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
