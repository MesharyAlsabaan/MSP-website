import { readdir, readFile, rename, rm } from 'fs/promises';
import { basename, join, resolve } from 'path';
import { ApiError, Lease, Manifest, PendingJob } from './api-client';
import { FileLockedError, RegisterRow } from './excel/register';
import { VendorFileInput, writeVendorFile } from './excel/vendor-file';
import { ensureDir, exists, moveDir, placeFile, writeAtomic } from './files';
import { safeFileName, safeFolderName, vendorFolderName } from './naming';
import { writeFolderShortcut } from './shortcuts';
import { AgentState, JobStep, STEP_ORDER } from './state';

export interface ArchiverConfig {
  archiveRoot: string;
  leaseTtlSec: number;
  registerFileName: string;
  vendorFileName: string;
  previousVersionsFolder: string;
  decisionFolder: string;
  shortcutFileName: string;
}

export interface ArchiveApiLike {
  pending(): Promise<PendingJob[]>;
  lease(jobId: string, ttlSec: number): Promise<Lease>;
  renew(jobId: string, leaseToken: string, ttlSec: number): Promise<unknown>;
  step(jobId: string, leaseToken: string, step: string): Promise<unknown>;
  complete(jobId: string, leaseToken: string, archivePath: string): Promise<unknown>;
  fail(jobId: string, leaseToken: string, error: string): Promise<unknown>;
}

export interface ArchiverDeps {
  api: ArchiveApiLike;
  /** Downloads one document to `<targetBase>.ok` (verified) and returns that path. */
  download: (jobId: string, leaseToken: string, doc: Manifest['documents'][number], targetBase: string) => Promise<string>;
  upsertRegister: (file: string, row: RegisterRow) => Promise<unknown>;
  log: { info(m: string): Promise<void>; warn(m: string): Promise<void>; error(m: string): Promise<void> };
  now?: () => Date;
  /** Test hook: throw just before this step runs. */
  failAt?: JobStep;
}

export interface RunResult {
  completed: number;
  retryLater: number;
  failed: number;
  skipped: number;
}

/** Written into each vendor folder after a successful archive; the source of truth for "what is here". */
interface Marker {
  vendorNumber: string;
  revisionNo: number;
  jobId: string;
  requestNumber: string;
  completedAt: string;
  archivedBy: string;
}

const MARKER = '.msp-archive.json';
const INCOMING = '_incoming';

/**
 * Processes archive jobs as an ordered, resumable step machine. Every step is
 * idempotent and progress is persisted after each one, so a crash at any
 * point is recovered by re-running: finished steps are skipped, partially
 * finished ones redo their own work safely.
 *
 * Outcomes per job:
 *   completed   – archived and acknowledged to the server
 *   retry-later – a file is locked (Excel open) or a transient error; the lease
 *                 is kept and the job resumes next poll
 *   failed      – the job cannot be done (corrupt download, bad manifest);
 *                 reported to the server (which re-queues up to 10 attempts)
 *   skipped     – the server refused the lease (another agent, ordering)
 */
export class Archiver {
  private readonly now: () => Date;

  constructor(private readonly cfg: ArchiverConfig, private readonly state: AgentState, private readonly deps: ArchiverDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  async runOnce(): Promise<RunResult> {
    const result: RunResult = { completed: 0, retryLater: 0, failed: 0, skipped: 0 };
    const jobs = await this.deps.api.pending();
    for (const job of jobs) {
      const outcome = await this.processJob(job);
      if (outcome === 'completed') result.completed++;
      else if (outcome === 'retry-later') result.retryLater++;
      else if (outcome === 'failed') result.failed++;
      else result.skipped++;
    }
    return result;
  }

  async processJob(job: PendingJob): Promise<'completed' | 'retry-later' | 'failed' | 'skipped'> {
    const { api, log } = this.deps;
    let lease: Lease;
    try {
      lease = await api.lease(job.id, this.cfg.leaseTtlSec);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        await log.info(`job ${job.id} (${job.vendorNumber}) skipped: ${err.message}`);
        return 'skipped';
      }
      await log.warn(`job ${job.id} lease failed, will retry: ${(err as Error).message}`);
      return 'retry-later';
    }
    const { manifest, leaseToken } = lease;
    await this.state.touch(job.id, { leaseToken }); // keeps lastStep if we are resuming

    try {
      const outcome = await this.runSteps(job, manifest, leaseToken);
      return outcome;
    } catch (err) {
      if (err instanceof FileLockedError) {
        await log.warn(`job ${job.id} (${manifest.vendor.vendorNumber}) waiting: ${err.message}`);
        await api.renew(job.id, leaseToken, this.cfg.leaseTtlSec).catch(() => undefined);
        await this.state.recordError(job.id, err.message);
        return 'retry-later';
      }
      if (err instanceof ApiError) {
        await log.warn(`job ${job.id} API error, will retry: ${err.message}`);
        await this.state.recordError(job.id, err.message);
        return 'retry-later';
      }
      if (err instanceof InjectedCrash) return 'retry-later'; // simulated process death: state stays as last persisted
      const message = (err as Error).message ?? String(err);
      await log.error(`job ${job.id} (${manifest.vendor.vendorNumber}) failed: ${message}`);
      await this.state.recordError(job.id, message);
      await api.fail(job.id, leaseToken, message).catch(() => undefined);
      await this.state.forget(job.id);
      return 'failed';
    }
  }

  // ---------------------------------------------------------------- steps

  private async runSteps(job: PendingJob, m: Manifest, leaseToken: string): Promise<'completed'> {
    const { api, log } = this.deps;
    const done = (step: JobStep): boolean => {
      const last = this.state.job(job.id)?.lastStep;
      return !!last && STEP_ORDER.indexOf(last) >= STEP_ORDER.indexOf(step);
    };
    const mark = async (step: JobStep, extra: Record<string, unknown> = {}) => {
      await this.state.setStep(job.id, step, extra);
      await api.step(job.id, leaseToken, step).catch(() => undefined);
    };
    const guard = (step: JobStep) => {
      if (this.deps.failAt === step) throw new InjectedCrash(step);
    };

    const categoryDir = join(this.cfg.archiveRoot, safeFolderName(m.vendor.primaryCategory.nameAr));
    const vendorDir = await this.resolveVendorDir(categoryDir, m);
    const incoming = join(this.cfg.archiveRoot, INCOMING, job.id);
    const marker = await this.readMarker(vendorDir);

    // Already archived (this or a later revision)? Then only the acknowledgement was lost.
    if (marker && marker.revisionNo >= m.revision.revisionNo) {
      await log.info(`job ${job.id}: ${m.vendor.vendorNumber} v${m.revision.revisionNo} already archived (marker v${marker.revisionNo}); acknowledging`);
      await api.complete(job.id, leaseToken, vendorDir);
      await this.state.recordSuccess(job.id);
      return 'completed';
    }

    // 1. Download everything to _incoming and verify.
    guard(JobStep.Downloaded);
    await ensureDir(incoming);
    const okPaths = new Map<string, string>();
    for (const d of m.documents) {
      const base = join(incoming, `${d.id}-${safeFileName(d.originalFilename)}`);
      okPaths.set(d.id, done(JobStep.Downloaded) && (await exists(`${base}.ok`)) ? `${base}.ok` : await this.deps.download(job.id, leaseToken, d, base));
    }
    if (!done(JobStep.Downloaded)) await mark(JobStep.Downloaded, { vendorFolder: vendorDir });

    // 2. Move the previous approved version aside (keeping the decision log).
    guard(JobStep.PreviousVersionArchived);
    if (!done(JobStep.PreviousVersionArchived)) {
      if (marker && marker.revisionNo < m.revision.revisionNo) await this.archivePreviousVersion(vendorDir, marker);
      await mark(JobStep.PreviousVersionArchived);
    }

    // 3. Place the verified files in their type folders.
    guard(JobStep.FilesPlaced);
    const placed: { doc: Manifest['documents'][number]; relative: string }[] = [];
    const used = new Set<string>();
    for (const d of m.documents) {
      const folder = safeFolderName(d.archiveFolder || 'مستندات أخرى');
      let name = safeFileName(d.originalFilename);
      const key = `${folder}\\${name}`.toLowerCase();
      if (used.has(key)) {
        const dot = name.lastIndexOf('.');
        name = dot > 0 ? `${name.slice(0, dot)} (${d.id.slice(0, 8)})${name.slice(dot)}` : `${name} (${d.id.slice(0, 8)})`;
      }
      used.add(key);
      await placeFile(okPaths.get(d.id)!, join(vendorDir, folder, name), { sizeBytes: d.sizeBytes, sha256: d.sha256 });
      placed.push({ doc: d, relative: `${folder}\\${name}` });
    }
    if (!done(JobStep.FilesPlaced)) await mark(JobStep.FilesPlaced);

    // 4. Vendor workbook.
    guard(JobStep.VendorExcel);
    const approvedAt = m.decision.decidedAt ? m.decision.decidedAt.slice(0, 10) : '';
    const decisions = await this.collectDecisions(vendorDir, m);
    await writeVendorFile(join(vendorDir, this.cfg.vendorFileName), {
      vendorNumber: m.vendor.vendorNumber,
      requestNumber: m.application.requestNumber,
      revisionNo: m.revision.revisionNo,
      approvedAt,
      approvedBy: m.decision.decidedByName,
      decisionNote: m.decision.note,
      submittedAt: m.revision.submittedAt.slice(0, 10),
      categoryName: m.vendor.primaryCategory.nameAr,
      secondaryCategories: m.vendor.secondaryCategories.map((c) => c.nameAr),
      profile: m.revision.data,
      documents: placed.map(({ doc, relative }) => ({ typeName: doc.docTypeNameAr, relativePath: relative, originalFilename: doc.originalFilename, sizeBytes: doc.sizeBytes, sha256: doc.sha256, expiresAt: doc.expiresAt })),
      decisions,
    } satisfies VendorFileInput);
    if (!done(JobStep.VendorExcel)) await mark(JobStep.VendorExcel);

    // 5. Decision record (json for machines, txt for people).
    guard(JobStep.DecisionSaved);
    const decisionDir = join(vendorDir, safeFolderName(this.cfg.decisionFolder));
    const decisionBase = join(decisionDir, `قرار v${m.revision.revisionNo}`);
    await writeAtomic(`${decisionBase}.json`, JSON.stringify({ vendorNumber: m.vendor.vendorNumber, requestNumber: m.application.requestNumber, revisionNo: m.revision.revisionNo, decision: 'approved', decidedAt: m.decision.decidedAt, decidedBy: m.decision.decidedByName, note: m.decision.note, submittedAt: m.revision.submittedAt, documents: m.documents.map((d) => ({ type: d.docTypeKey, file: d.originalFilename, sha256: d.sha256, expiresAt: d.expiresAt })) }, null, 2));
    await writeAtomic(`${decisionBase}.txt`, [
      `قرار اعتماد تأهيل المورد`,
      `رقم المورد: ${m.vendor.vendorNumber}`,
      `رقم الطلب: ${m.application.requestNumber} — الإصدار v${m.revision.revisionNo}`,
      `الشركة: ${m.vendor.companyName}`,
      `التصنيف: ${m.vendor.primaryCategory.nameAr}`,
      `تاريخ الاعتماد: ${approvedAt}`,
      `المعتمِد: ${m.decision.decidedByName}`,
      m.decision.note ? `الملاحظة: ${m.decision.note}` : '',
      '',
      'المستندات المعتمدة:',
      ...m.documents.map((d) => `- ${d.docTypeNameAr}: ${d.originalFilename}${d.expiresAt ? ` (ينتهي ${d.expiresAt})` : ''}`),
    ].join('\r\n'));
    if (!done(JobStep.DecisionSaved)) await mark(JobStep.DecisionSaved);

    // 6. Shortcuts in secondary categories — one original, no copies.
    guard(JobStep.Shortcuts);
    const folderName = vendorDir.slice(vendorDir.lastIndexOf('\\') + 1).slice(vendorDir.slice(vendorDir.lastIndexOf('\\') + 1).lastIndexOf('/') + 1);
    for (const c of m.vendor.secondaryCategories) {
      const secDir = join(this.cfg.archiveRoot, safeFolderName(c.nameAr), folderName);
      await ensureDir(secDir);
      await writeFolderShortcut(secDir, this.cfg.shortcutFileName, resolve(vendorDir));
    }
    if (!done(JobStep.Shortcuts)) await mark(JobStep.Shortcuts);

    // 7. Central register (may be open in Excel → FileLockedError → retry later, nothing above repeats).
    guard(JobStep.Register);
    const earliest = m.documents.map((d) => d.expiresAt).filter((x): x is string => !!x).sort()[0] ?? '';
    const p = m.revision.data;
    const str = (v: unknown) => (Array.isArray(v) ? v.join('، ') : v == null ? '' : String(v));
    await this.deps.upsertRegister(join(this.cfg.archiveRoot, this.cfg.registerFileName), {
      vendorNumber: m.vendor.vendorNumber,
      requestNumber: m.application.requestNumber,
      revisionNo: m.revision.revisionNo,
      companyName: m.vendor.companyName,
      categoryName: m.vendor.primaryCategory.nameAr,
      secondaryCategories: m.vendor.secondaryCategories.map((c) => c.nameAr).join('، '),
      specialty: str(p.specialty),
      contactName: str(p.contactName),
      phone: str(p.phone),
      mobile: str(p.mobile),
      email: str(p.email),
      city: str(p.city),
      address: str(p.address),
      commercialRegistrationNo: str(p.commercialRegistrationNo),
      vatNo: str(p.vatNo),
      approvedAt,
      approvedBy: m.decision.decidedByName,
      earliestExpiry: earliest,
      folderPath: resolve(vendorDir),
      updatedAt: this.now().toISOString(),
    });
    if (!done(JobStep.Register)) await mark(JobStep.Register);

    // 8. Marker, acknowledgement, cleanup.
    const newMarker: Marker = { vendorNumber: m.vendor.vendorNumber, revisionNo: m.revision.revisionNo, jobId: job.id, requestNumber: m.application.requestNumber, completedAt: this.now().toISOString(), archivedBy: 'msp-archive-agent' };
    await writeAtomic(join(vendorDir, MARKER), JSON.stringify(newMarker, null, 2));
    await api.complete(job.id, leaseToken, resolve(vendorDir));
    await rm(incoming, { recursive: true, force: true }).catch(() => undefined);
    await this.state.recordSuccess(job.id);
    await log.info(`job ${job.id}: ${m.vendor.vendorNumber} v${m.revision.revisionNo} archived to ${vendorDir}`);
    return 'completed';
  }

  // ---------------------------------------------------------------- helpers

  /** `<category>/<SUP-… - name>`; an existing folder with the same number is reused even if the name changed. */
  private async resolveVendorDir(categoryDir: string, m: Manifest): Promise<string> {
    const remembered = this.state.job(m.jobId)?.vendorFolder;
    if (typeof remembered === 'string' && (await exists(remembered))) return remembered;
    await ensureDir(categoryDir);
    const prefix = `${m.vendor.vendorNumber} - `;
    const existing = (await readdir(categoryDir, { withFileTypes: true })).find((e) => e.isDirectory() && e.name.startsWith(prefix));
    const dir = join(categoryDir, existing ? existing.name : vendorFolderName(m.vendor.vendorNumber, m.vendor.companyName));
    await ensureDir(dir);
    return dir;
  }

  private async readMarker(vendorDir: string): Promise<Marker | null> {
    try {
      return JSON.parse(await readFile(join(vendorDir, MARKER), 'utf8')) as Marker;
    } catch {
      return null;
    }
  }

  /** Moves everything except the decision log and the previous-versions folder into `_إصدارات سابقة/v<n> - <date>/`. */
  private async archivePreviousVersion(vendorDir: string, previous: Marker): Promise<void> {
    const keep = new Set([safeFolderName(this.cfg.previousVersionsFolder), safeFolderName(this.cfg.decisionFolder), MARKER]);
    const dest = join(vendorDir, safeFolderName(this.cfg.previousVersionsFolder), `v${previous.revisionNo} - ${previous.completedAt.slice(0, 10)}`);
    await ensureDir(dest);
    for (const entry of await readdir(vendorDir, { withFileTypes: true })) {
      if (keep.has(entry.name)) continue;
      const from = join(vendorDir, entry.name);
      const to = join(dest, entry.name);
      if (entry.isDirectory()) await moveDir(from, to);
      else await rename(from, to);
    }
  }

  private async collectDecisions(vendorDir: string, m: Manifest): Promise<VendorFileInput['decisions']> {
    const out: VendorFileInput['decisions'] = [];
    const dir = join(vendorDir, safeFolderName(this.cfg.decisionFolder));
    try {
      for (const f of (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()) {
        try {
          const d = JSON.parse(await readFile(join(dir, f), 'utf8')) as { revisionNo: number; decidedAt: string; decidedBy: string; note: string };
          if (d.revisionNo !== m.revision.revisionNo) out.push({ revisionNo: d.revisionNo, decidedAt: (d.decidedAt ?? '').slice(0, 10), decidedBy: d.decidedBy, note: d.note ?? '' });
        } catch { /* ignore unreadable */ }
      }
    } catch { /* no decision folder yet */ }
    out.push({ revisionNo: m.revision.revisionNo, decidedAt: (m.decision.decidedAt ?? '').slice(0, 10), decidedBy: m.decision.decidedByName, note: m.decision.note });
    return out.sort((a, b) => a.revisionNo - b.revisionNo);
  }
}

/** Only thrown by the `failAt` test hook to simulate a process crash mid-job. */
export class InjectedCrash extends Error {
  constructor(step: JobStep) {
    super(`injected crash before ${step}`);
  }
}
