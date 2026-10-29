import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { unlinkSync } from 'fs';
import { createTransport } from 'nodemailer';
import { basename, join, relative, resolve } from 'path';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { buildFields, diffFields, duplicateSummary } from './content';
import {
  applyEdit,
  applyRegister,
  confirmFacts,
  deriveFromFolder,
  DraftEdit,
  DraftImage,
  draftHash,
  emptyDraft,
  galleryOrder,
  ProjectDraft,
  readiness,
  suggest,
} from './draft';
import { Drafter, MAX_IMAGES } from './drafter';
import { DriveSource, parseServiceAccount } from './drive-source';
import { ProjectSyncControl, ProjectSyncItem, ProjectSyncRun } from './entities/project-sync.entity';
import { forModel, isRenderPass, prepareImage, PreviewStore, storeImage } from './images';
import { LocalSource } from './local-source';
import { FolderPlan, ItemState, plan, SiteProject } from './planner';
import { parseRegister, RegisterRow } from './register';
import { emptyReport, formatReport, Outcome, PendingLine, ProjectLine, reportSubject, SyncReport } from './report';
import { nextSlot, parseTimes, previousSlot, slotKey } from './schedule';
import { pageUrl, rebuildConfigured, sitemapUrls, SITE_ORIGIN, triggerFrontendBuild, verifyProject } from './site';
import { SourceFile, SyncSource } from './source';

/** Arbitrary constant: the Postgres advisory-lock key for "a sync is running". */
const LOCK_KEY = 72_014_661;
const RUN_DEADLINE_MS = 45 * 60_000;
/** A run still "running" after this long was interrupted (crash, redeploy). */
const STALE_RUN_MS = 2 * 60 * 60_000;
/** Catch up a missed slot (service was down) if it is at most this old. */
const CATCH_UP_WINDOW_MS = 6 * 60 * 60_000;
/** States that wait for a person's decision. */
const AWAITING_DECISION: ItemState[] = ['pending_review'];

export interface RunOptions {
  trigger: 'schedule' | 'catch-up' | 'manual' | 'retry' | 'approval';
  slot?: string;
  dryRun?: boolean;
  requestedBy?: string;
  /** Restrict the run to one folder (retry, publish-now). */
  folderId?: string;
}

type Touched = { item: ProjectSyncItem; kind: 'created' | 'updated'; line: ProjectLine; changes?: ReturnType<typeof diffFields> };

/**
 * Google Drive → MSP website. See docs/automation/PROJECT-SYNC.md for the
 * operating guide. Runs in the backend process because uploads live on the
 * backend's disk; a Postgres advisory lock plus a unique slot key keep it to
 * one execution per slot however many replicas are running.
 *
 * Every run: detect folders → draft new/changed ones (images checked, facts
 * suggested, text written) → publish what a person approved → one frontend
 * rebuild → verify the live pages → report.
 */
@Injectable()
export class ProjectSyncService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ProjectSyncService.name);
  private readonly drafter = new Drafter();
  private readonly previews: PreviewStore;
  private timer?: NodeJS.Timeout;
  private readonly times = parseTimes(process.env.PROJECT_SYNC_TIMES || '08:00,19:00');
  private readonly minImages = Number(process.env.PROJECT_SYNC_MIN_IMAGES ?? 3);
  private readonly maxGallery = Number(process.env.PROJECT_SYNC_MAX_GALLERY ?? 24);

  constructor(
    private readonly config: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(ProjectSyncRun) private readonly runs: Repository<ProjectSyncRun>,
    @InjectRepository(ProjectSyncItem) private readonly items: Repository<ProjectSyncItem>,
    @InjectRepository(ProjectSyncControl) private readonly controls: Repository<ProjectSyncControl>,
  ) {
    // Previews of unapproved images must never be under the public uploads folder.
    const uploads = resolve(this.uploadDir());
    const dir = resolve(process.env.PROJECT_SYNC_PREVIEW_DIR || 'project-sync-previews');
    const inside = !relative(uploads, dir).startsWith('..');
    this.previews = new PreviewStore(inside ? resolve(uploads, '..', 'project-sync-previews') : dir);
    if (inside) this.logger.warn('PROJECT_SYNC_PREVIEW_DIR is inside the public uploads folder; using a private folder beside it instead.');
  }

  private uploadDir(): string {
    return join(process.cwd(), this.config.get<string>('upload.dir', 'uploads'));
  }

  // ---------------------------------------------------------------- schedule

  get scheduleActive(): boolean {
    return process.env.PROJECT_SYNC_SCHEDULE !== 'off' && this.sourceConfigured();
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.scheduleActive) {
      this.logger.log('Project sync schedule is off (no Drive source configured, or PROJECT_SYNC_SCHEDULE=off).');
      return;
    }
    // A run left "running" by a crash or redeploy is closed as interrupted;
    // the work it did not finish is picked up by the next run.
    await this.runs.update(
      { status: 'running', createdAt: LessThan(new Date(Date.now() - STALE_RUN_MS)) },
      { status: 'failed', error: 'Interrupted (service restarted during the run)', finishedAt: new Date() },
    );
    this.armTimer();
    const missed = previousSlot(new Date(), this.times);
    if (Date.now() - missed.getTime() < CATCH_UP_WINDOW_MS) {
      // Give the deploy a couple of minutes to settle before catching up.
      setTimeout(() => void this.fireSlot(missed, 'catch-up'), Number(process.env.PROJECT_SYNC_CATCH_UP_DELAY_MS ?? 2 * 60_000)).unref();
    }
  }

  onApplicationShutdown(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private armTimer(): void {
    const at = nextSlot(new Date(), this.times);
    this.logger.log(`Next project sync: ${at.toISOString()} (${at.toLocaleString('en-GB', { timeZone: 'Asia/Riyadh' })} Riyadh)`);
    this.timer = setTimeout(() => {
      void this.fireSlot(at, 'schedule').finally(() => this.armTimer());
    }, Math.max(1000, at.getTime() - Date.now()));
    this.timer.unref();
  }

  private async fireSlot(at: Date, trigger: 'schedule' | 'catch-up'): Promise<void> {
    try {
      const control = await this.control();
      const slot = slotKey(at);
      if (!control.enabled) {
        await this.runs.insert({ slot, trigger, status: 'skipped', error: 'Automatic sync is paused in the admin', finishedAt: new Date() }).catch(() => undefined);
        return;
      }
      if (trigger === 'catch-up' && (await this.runs.findOne({ where: { slot } }))) return;
      await this.run({ trigger, slot });
    } catch (err) {
      this.logger.error(`Scheduled sync failed to start: ${(err as Error).message}`);
    }
  }

  // ---------------------------------------------------------------- admin

  async control(): Promise<ProjectSyncControl> {
    let c = await this.controls.findOne({ where: { id: 'control' } });
    if (!c) c = await this.controls.save(this.controls.create({ id: 'control', enabled: true }));
    return c;
  }

  async setEnabled(enabled: boolean, by: string): Promise<ProjectSyncControl> {
    const c = await this.control();
    c.enabled = enabled;
    c.updatedBy = by;
    return this.controls.save(c);
  }

  async status() {
    const control = await this.control();
    const counts = await this.items
      .createQueryBuilder('i')
      .select('i.state', 'state')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('i.state')
      .getRawMany<{ state: ItemState; count: number }>();
    return {
      enabled: control.enabled,
      scheduleActive: this.scheduleActive,
      times: process.env.PROJECT_SYNC_TIMES || '08:00,19:00',
      timezone: 'Asia/Riyadh',
      nextRun: this.scheduleActive ? nextSlot(new Date(), this.times).toISOString() : null,
      source: this.sourceConfigured() ? 'configured' : 'missing',
      ai: this.drafter.enabled ? this.drafter.model : 'off',
      frontendRebuild: rebuildConfigured() ?? 'missing',
      notifications: this.mailReady() ? 'configured' : 'missing',
      minImages: this.minImages,
      counts: Object.fromEntries(counts.map((c) => [c.state, c.count])),
      running: !!(await this.runs.findOne({ where: { status: 'running' }, select: ['id'] })),
      lastRun: await this.runs.findOne({ where: {}, order: { createdAt: 'DESC' }, select: ['id', 'slot', 'status', 'createdAt', 'finishedAt'] }),
    };
  }

  listRuns(limit = 30) {
    return this.runs.find({ order: { createdAt: 'DESC' }, take: Math.min(limit, 200), select: ['id', 'slot', 'trigger', 'dryRun', 'status', 'createdAt', 'finishedAt', 'requestedBy', 'error'] });
  }

  async getRun(id: string) {
    const run = await this.runs.findOne({ where: { id } });
    if (!run) throw new NotFoundException('Run not found');
    return run;
  }

  /** The admin list: one row per folder with what it needs, without the full draft. */
  async listItems() {
    const items = await this.items.find({ order: { folderName: 'ASC' } });
    return items.map((i) => this.summarize(i));
  }

  private summarize(i: ProjectSyncItem) {
    const r = i.draft ? readiness(i.draft, this.minImages) : null;
    const { draft, previousSnapshot, ...rest } = i;
    return {
      ...rest,
      title: draft?.facts.titleEn.value || i.slug || i.folderName,
      titleAr: draft?.facts.titleAr.value ?? '',
      cover: draft ? (galleryOrder(draft)[0]?.md5 ?? '') : '',
      imageCount: draft ? galleryOrder(draft).length : i.images.length,
      blocking: r?.blocking ?? [],
      unconfirmed: r?.unconfirmed ?? [],
      aiText: draft ? (['summaryEn', 'summaryAr', 'descriptionEn', 'descriptionAr'] as const).some((k) => draft.content[k].source === 'ai' && draft.content[k].value.length) : false,
      canUndo: !!previousSnapshot,
      urlEn: i.slug && i.projectId ? pageUrl(i.slug, 'en') : '',
      urlAr: i.slug && i.projectId ? pageUrl(i.slug, 'ar') : '',
    };
  }

  async getItem(id: string) {
    const item = await this.findItem(id);
    return { ...this.summarize(item), draft: item.draft, readiness: item.draft ? readiness(item.draft, this.minImages) : null, minImages: this.minImages };
  }

  private async findItem(id: string): Promise<ProjectSyncItem> {
    const item = await this.items.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Folder not found');
    return item;
  }

  /** A private preview image for the admin, remade from the source if the preview folder was lost. */
  async preview(id: string, md5: string): Promise<Buffer> {
    const item = await this.findItem(id);
    const img = item.draft?.images.find((i) => i.md5 === md5);
    if (!img) throw new NotFoundException('Image not found');
    const cached = this.previews.read(item.sourceFolderId, md5);
    if (cached) return cached;
    const prepared = await this.previews.add(item.sourceFolderId, this.fileOf(img), await this.source().download(this.fileOf(img)));
    if ('problem' in prepared) throw new NotFoundException(`Image cannot be shown: ${prepared.problem}`);
    return prepared.data;
  }

  async editDraft(id: string, edit: DraftEdit, by: string) {
    const item = await this.findItem(id);
    if (!item.draft || item.mode === 'linked') throw new BadRequestException('This folder has no draft to edit');
    try {
      applyEdit(item.draft, edit, by);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    // An approved draft that changes needs approving again; a live page's draft becomes a pending update.
    if (item.state === 'approved' || item.state === 'published' || item.state === 'failed') {
      if (draftHash(item.draft) !== item.approvedHash) {
        item.state = 'pending_review';
        item.issues = ['Edited after approval — approve again to publish the changes'];
      }
    }
    await this.items.save(item);
    return this.getItem(id);
  }

  async decide(
    id: string,
    decision: 'approve' | 'postpone' | 'reject' | 'reopen',
    by: string,
    opts: { confirmFacts?: boolean; note?: string; publishNow?: boolean } = {},
  ) {
    const item = await this.findItem(id);
    if (item.mode === 'linked') throw new BadRequestException('This project is managed in the CMS, not by the sync');
    if (!item.draft) throw new BadRequestException('The draft is not ready yet — run the sync first');
    const note = (opts.note ?? '').slice(0, 500);

    if (decision === 'approve') {
      if (!['pending_review', 'postponed', 'rejected', 'failed'].includes(item.state)) {
        throw new ConflictException(`Cannot approve a project that is ${item.state.replace(/_/g, ' ')}`);
      }
      const r = readiness(item.draft, this.minImages);
      if (r.blocking.length) throw new BadRequestException(`Not ready: ${r.blocking.join('; ')}`);
      if (r.unconfirmed.length && !opts.confirmFacts) throw new BadRequestException(`Confirm these facts first: ${r.unconfirmed.join(', ')}`);
      confirmFacts(item.draft, by);
      item.approvedHash = draftHash(item.draft);
      item.state = 'approved';
      item.attempts = 0;
      item.issues = [];
    } else if (decision === 'postpone') {
      item.state = item.projectId ? 'published' : 'postponed';
      if (item.projectId) item.issues = [`Update postponed by ${by}`];
    } else if (decision === 'reject') {
      // Rejecting an update to a live page keeps the live page as it is.
      item.state = item.projectId ? 'published' : 'rejected';
      if (item.projectId) item.issues = [`Update discarded by ${by}; the live page is unchanged`];
    } else {
      if (!['postponed', 'rejected'].includes(item.state)) throw new ConflictException('Only postponed or rejected projects can be reopened');
      item.state = 'pending_review';
    }
    Object.assign(item, { decidedBy: by, decidedAt: new Date(), decisionNote: note });
    await this.items.save(item);

    if (decision === 'approve' && opts.publishNow) {
      this.run({ trigger: 'approval', folderId: item.sourceFolderId, requestedBy: by }).catch((err) =>
        this.logger.error(`Publish-now of ${item.folderName} failed: ${(err as Error).message}`),
      );
    }
    return this.getItem(id);
  }

  /** Writes the draft text again with the AI (human-written text is kept). */
  async redraft(id: string, by: string) {
    if (!this.drafter.enabled) throw new BadRequestException('AI drafting is off: set ANTHROPIC_API_KEY on the backend');
    const item = await this.findItem(id);
    if (!item.draft || item.mode === 'linked') throw new BadRequestException('This folder has no draft');
    item.draft.notes = [];
    await this.aiDraft(item, item.draft);
    if (item.state === 'approved') item.state = 'pending_review';
    item.issues = [`Redrafted by ${by}`];
    await this.items.save(item);
    return this.getItem(id);
  }

  async retry(id: string, by: string) {
    const item = await this.findItem(id);
    item.attempts = 0;
    await this.items.save(item);
    const run = await this.run({ trigger: 'retry', folderId: item.sourceFolderId, requestedBy: by });
    if (!run) throw new ConflictException('A sync is already running');
    return run;
  }

  /** Puts a project the sync changed back to the record it replaced. */
  async revert(itemId: string, by: string): Promise<Project> {
    const item = await this.findItem(itemId);
    if (!item.projectId || !item.previousSnapshot) throw new NotFoundException('Nothing to undo for this project');
    const project = await this.projects.findOneOrFail({ where: { id: item.projectId } });
    Object.assign(project, item.previousSnapshot);
    const saved = await this.projects.save(project);
    item.previousSnapshot = null;
    item.lastPublishedAt = saved.updatedAt;
    item.issues = [`Last update undone by ${by} on ${new Date().toISOString()}; the site shows it after the next rebuild`];
    await this.items.save(item);
    return saved;
  }

  // ---------------------------------------------------------------- source

  private sourceConfigured(): boolean {
    return !!((process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.PROJECT_SYNC_DRIVE_FOLDER_ID) || process.env.PROJECT_SYNC_LOCAL_DIR);
  }

  private source(): SyncSource {
    if (process.env.PROJECT_SYNC_LOCAL_DIR) return new LocalSource(process.env.PROJECT_SYNC_LOCAL_DIR);
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const folder = process.env.PROJECT_SYNC_DRIVE_FOLDER_ID;
    if (!raw || !folder) throw new Error('Google Drive is not configured (GOOGLE_SERVICE_ACCOUNT_JSON, PROJECT_SYNC_DRIVE_FOLDER_ID)');
    return new DriveSource(parseServiceAccount(raw), folder);
  }

  private fileOf(img: Pick<DraftImage, 'sourceId' | 'path' | 'md5'>): SourceFile {
    return { id: img.sourceId, path: img.path, md5: img.md5, mimeType: '', size: 0, modifiedTime: '' };
  }

  // ---------------------------------------------------------------- run

  /**
   * One execution. Returns the run, or null when this slot already ran or
   * another execution holds the lock (then nothing is done twice).
   */
  async run(opts: RunOptions): Promise<ProjectSyncRun | null> {
    const slot = opts.slot ?? `${opts.dryRun ? 'dry' : opts.trigger}:${new Date().toISOString()}`;
    let run: ProjectSyncRun;
    try {
      run = await this.runs.save(this.runs.create({ slot, trigger: opts.trigger, dryRun: !!opts.dryRun, requestedBy: opts.requestedBy ?? '' }));
    } catch {
      return null; // unique slot: another replica, or a catch-up racing the timer
    }

    const lock = this.dataSource.createQueryRunner();
    await lock.connect();
    try {
      const [{ locked }] = await lock.query('SELECT pg_try_advisory_lock($1) AS locked', [LOCK_KEY]);
      if (!locked) {
        await this.runs.update(run.id, { status: 'skipped', error: 'Another sync was already running', finishedAt: new Date() });
        return this.runs.findOneBy({ id: run.id });
      }
      try {
        return await this.execute(run, opts);
      } finally {
        await lock.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
      }
    } finally {
      await lock.release();
    }
  }

  private async execute(run: ProjectSyncRun, opts: RunOptions): Promise<ProjectSyncRun> {
    const started = Date.now();
    const dry = !!opts.dryRun;
    const report = emptyReport(run.id, opts.trigger, dry, started);
    const touched: Touched[] = [];

    try {
      const source = this.source();
      report.source = source.label;
      const [csv, folders] = await Promise.all([source.readRegister(), source.listFolders()]);
      const scoped = opts.folderId ? folders.filter((f) => f.id === opts.folderId) : folders;
      if (opts.folderId && !scoped.length) throw new Error('That folder is no longer in the source');
      report.summary.scanned = scoped.length;

      const { rows, duplicates } = parseRegister(csv ?? '');
      for (const d of duplicates) report.issues.push(`The register has more than one row for folder "${d}" — only the first is used.`);

      const allProjects = await this.projects.find({ select: ['id', 'slug', 'no', 'updatedAt', 'summary'] });
      const known = await this.items.find();
      const p = plan({ folders: scoped, rows, items: known, projects: allProjects as SiteProject[] });

      const itemFor = (fp: FolderPlan) =>
        known.find((k) => k.sourceFolderId === fp.folder.id) ??
        this.items.create({ sourceFolderId: fp.folder.id, folderName: fp.folder.name, slug: fp.slug, mode: 'owned', state: 'draft' });

      for (const fp of p.folders) {
        if (Date.now() - started > RUN_DEADLINE_MS) {
          report.issues.push(`Time limit reached; ${fp.folder.name} and later folders are processed in the next run.`);
          break;
        }
        const a = fp.action;
        const item = itemFor(fp);
        item.folderName = fp.folder.name;
        item.lastRunId = run.id;
        let publishing = a.kind === 'publish';

        try {
          switch (a.kind) {
            case 'unchanged':
              report.summary.unchanged++;
              break;
            case 'verify':
              break; // the verification pass below covers it
            case 'link':
              report.summary.linked++;
              if (!dry) {
                Object.assign(item, { mode: 'linked', state: 'linked', projectId: a.project.id, slug: a.project.slug, sourceHash: fp.hash, issues: [] });
                await this.items.save(item);
              }
              break;
            case 'review':
              report.summary.attention++;
              report.attention.push({ folder: fp.folder.name, reasons: a.reasons });
              if (!dry) {
                item.issues = a.reasons;
                await this.items.save(item);
              }
              break;
            case 'prepare': {
              await this.prepare(fp, item, a.reason, dry, report);
              // Approved straight away (the register said YES): publish in this run, not the next.
              if (!dry && item.state === 'approved') {
                publishing = true;
                const t = await this.publish(fp, item, a.project?.id, allProjects, dry);
                if (t) touched.push(t);
              }
              break;
            }
            case 'publish': {
              const t = await this.publish(fp, item, a.project?.id, allProjects, dry);
              if (t) touched.push(t);
              break;
            }
          }
        } catch (err) {
          const message = (err as Error).message;
          report.summary.failed++;
          report.failed.push({ folder: fp.folder.name, error: message });
          this.logger.error(`Sync of ${fp.folder.name} failed: ${message}`);
          if (!dry) {
            if (publishing) {
              item.state = 'failed';
              item.attempts += 1;
            } else if (!item.draft) {
              item.state = 'draft';
            }
            item.issues = [message];
            await this.items.save(item);
          }
        }
      }

      for (const m of p.missing) {
        if (opts.folderId) continue;
        report.summary.attention++;
        report.attention.push({ folder: m.slug || m.sourceFolderId, reasons: ['Folder no longer in Drive — the project was NOT removed from the site; delete it in the admin if intended'] });
        if (!dry) await this.items.update({ sourceFolderId: m.sourceFolderId }, { state: 'missing_from_source', issues: ['Folder missing from Drive'] });
      }

      if (dry) {
        for (const t of touched) report.created.push(t.line);
      } else {
        await this.deployAndVerify(report, touched);
      }
      if (!dry) await this.pendingList(report);
    } catch (err) {
      const message = (err as Error).message;
      report.status = 'failed';
      report.issues.push(`Run stopped: ${message}`);
      if (/Drive|Google/.test(message)) {
        report.ownerActions.push('Check that the projects folder is shared (Viewer) with the sync service account and that GOOGLE_SERVICE_ACCOUNT_JSON holds a valid key.');
      }
      this.logger.error(`Project sync run ${run.id} failed: ${message}`);
    }

    const adminUrl = `${SITE_ORIGIN}/admin/project-sync`;
    if (report.pending.length) report.ownerActions.unshift(`Review and approve ${report.pending.length} project(s) waiting for you: ${adminUrl}`);
    if (!this.drafter.enabled && (report.detected.length || report.pending.some((p) => p.blocking.some((b) => b.includes('summary'))))) {
      report.ownerActions.push('Drafts have no text because AI drafting is off: write the summaries in the admin, or set ANTHROPIC_API_KEY so the sync writes them.');
    }

    report.finishedAt = new Date().toISOString();
    report.durationMs = Date.now() - started;
    if (report.status !== 'failed') {
      const s = report.summary;
      report.status = s.failed || s.attention || s.awaitingVerification || report.issues.length ? 'attention' : 'succeeded';
    }
    const text = formatReport(report, adminUrl);
    await this.runs.update(run.id, { status: report.status, finishedAt: new Date(), report, reportText: text, error: report.status === 'failed' ? report.issues.at(-1) ?? '' : '' });
    if (!dry) await this.notify(report, text);
    this.logger.log(`Project sync ${run.slot}: ${report.status}`);
    return this.runs.findOneByOrFail({ id: run.id });
  }

  // ---------------------------------------------------------------- drafting

  /**
   * Builds or refreshes a folder's draft. Owner edits and verified facts are
   * kept; images are re-checked only when new; the AI writes only for new
   * drafts (or when its text is missing). Then the register's decision, if any.
   */
  private async prepare(fp: FolderPlan, item: ProjectSyncItem, reason: 'new' | 'source-changed' | 'retry-draft', dry: boolean, report: SyncReport): Promise<void> {
    const draft: ProjectDraft = item.draft ? structuredClone(item.draft) : emptyDraft();
    draft.notes = [];
    suggest(draft, deriveFromFolder(fp.folder.name, fp.folder.files.map((f) => f.path)));
    if (fp.row) applyRegister(draft, fp.row);

    await this.collectImages(fp, item, draft, dry);

    const wantsText = !(['summaryEn', 'summaryAr'] as const).every((k) => draft.content[k].value);
    if (!dry && this.drafter.enabled && (reason === 'new' || !draft.ai || wantsText)) await this.aiDraft(item, draft, fp.folder.files.map((f) => f.path));
    if (!this.drafter.enabled && wantsText) draft.notes.push('AI drafting is off, so the text must be written in the editor.');

    const r = readiness(draft, this.minImages);
    const isNew = reason === 'new';
    if (isNew) report.summary.newDetected++;
    if (isNew || reason === 'retry-draft') {
      report.detected.push({ folder: fp.folder.name, name: draft.facts.titleEn.value || fp.slug, images: galleryOrder(draft).length, blocking: r.blocking, notes: draft.notes });
    }
    if (dry) return;

    const wasApproved = item.state === 'approved';
    item.draft = draft;
    item.slug = fp.slug;
    item.sourceHash = fp.hash;
    item.issues = reason === 'source-changed' ? [item.projectId ? 'New or changed source files: review the update to the live page' : 'Source files changed — review again'] : [];
    if (!['postponed', 'rejected'].includes(item.state) || reason === 'source-changed') item.state = 'pending_review';
    if (wasApproved && draftHash(draft) === item.approvedHash) item.state = 'approved';
    this.applyRegisterDecision(item, fp.row, reason);
    await this.items.save(item);
  }

  /** Applies the register's approved_for_web column when it changed, or as a standing YES on new source. */
  private applyRegisterDecision(item: ProjectSyncItem, row: RegisterRow | undefined, reason: string): void {
    const draft = item.draft!;
    const decision = row?.decision ?? '';
    const changed = decision !== draft.registerDecision;
    draft.registerDecision = decision;
    if (!decision || (!changed && !(decision === 'approve' && reason !== 'retry-draft'))) return;

    const by = 'the _REGISTER sheet';
    if (decision === 'later') item.state = item.projectId ? item.state : 'postponed';
    else if (decision === 'reject') item.state = item.projectId ? item.state : 'rejected';
    else if (item.state === 'pending_review') {
      const r = readiness(draft, this.minImages);
      if (r.blocking.length || r.unconfirmed.length) {
        item.issues = [`Approved in the register, but first: ${[...r.blocking, ...r.unconfirmed.map((u) => `confirm ${u}`)].join('; ')}`];
        return;
      }
      item.approvedHash = draftHash(draft);
      item.state = 'approved';
    } else return;
    Object.assign(item, { decidedBy: by, decidedAt: new Date(), decisionNote: '' });
  }

  /** Checks every new source image once (by content) and keeps a private preview of it. */
  private async collectImages(fp: FolderPlan, item: ProjectSyncItem, draft: ProjectDraft, dry: boolean): Promise<void> {
    const source = this.source();
    const before = new Map(draft.images.map((i) => [i.md5, i]));
    const out: DraftImage[] = [];
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    let passes = 0;
    let included = draft.images.filter((i) => i.included && !i.problem).length;

    for (const file of fp.images) {
      let md5 = file.md5;
      let raw: Buffer | undefined;
      if (!md5) {
        raw = await source.download(file);
        md5 = createHash('md5').update(raw).digest('hex');
      }
      if (seen.has(md5)) {
        duplicates.push(file.path.split('/').pop()!);
        continue;
      }
      seen.set(md5, file.path);

      const old = before.get(md5);
      if (old && (old.problem || dry || this.previews.has(item.sourceFolderId, md5))) {
        out.push({ ...old, sourceId: file.id, path: file.path });
        continue;
      }
      raw ??= await source.download(file);
      const r = dry ? await prepareImage(file, raw, { maxEdge: 64, quality: 50 }) : await this.previews.add(item.sourceFolderId, file, raw);
      if ('problem' in r) {
        out.push({ sourceId: file.id, path: file.path, md5, width: 0, height: 0, included: false, problem: r.problem });
        continue;
      }
      // New images join the gallery up to the cap; the rest, and render passes, wait unticked in the admin.
      const pass = isRenderPass(file.path);
      if (pass && !old) passes++;
      const include = old ? old.included : !pass && included < this.maxGallery;
      if (include && !old) included++;
      out.push({ sourceId: file.id, path: file.path, md5, width: r.width, height: r.height, included: include });
    }
    draft.images = out;
    if (passes) draft.notes.push(`${passes} render-pass file(s) (lighting, texture or mask layers) are listed in the gallery but not selected.`);
    if (duplicates.length) draft.notes.push(`${duplicates.length} identical copy(ies) skipped, e.g. ${duplicates.slice(0, 3).join(', ')}`);

    const coverName = fp.row?.cover?.toLowerCase();
    const named = coverName ? draft.images.find((i) => !i.problem && (i.path.toLowerCase() === coverName || i.path.split('/').pop()!.toLowerCase() === coverName)) : undefined;
    if (named) {
      named.included = true;
      draft.cover = named.md5;
    } else if (!draft.images.some((i) => i.md5 === draft.cover && i.included && !i.problem)) {
      draft.cover = draft.images.find((i) => i.included && !i.problem)?.md5 ?? '';
    }
  }

  /** Runs the AI on a few images spread across the gallery. Failures become notes, never block the draft. */
  private async aiDraft(item: ProjectSyncItem, draft: ProjectDraft, paths?: string[]): Promise<void> {
    if (!this.drafter.enabled) return;
    try {
      const usable = galleryOrder(draft);
      const step = Math.max(1, Math.floor(usable.length / MAX_IMAGES));
      const picks = usable.filter((_, i) => i % step === 0).slice(0, MAX_IMAGES);
      const images: Buffer[] = [];
      for (const img of picks) {
        const preview = this.previews.read(item.sourceFolderId, img.md5);
        if (preview) images.push(await forModel(preview));
      }
      await this.drafter.draft(item.folderName, paths ?? draft.images.map((i) => i.path), draft, images);
    } catch (err) {
      draft.notes.push(`AI drafting failed: ${(err as Error).message}. Write the text in the editor, or press Redraft later.`);
    }
  }

  private async pendingList(report: SyncReport): Promise<void> {
    const waiting = await this.items.find({ where: { state: In(AWAITING_DECISION) }, order: { folderName: 'ASC' } });
    report.pending = waiting.map((i): PendingLine => {
      const r = i.draft ? readiness(i.draft, this.minImages) : { blocking: ['draft not ready'], unconfirmed: [] };
      return { folder: i.folderName, name: i.draft?.facts.titleEn.value || i.slug, blocking: r.blocking, update: !!i.projectId };
    });
    report.summary.pendingApproval = report.pending.length;
  }

  // ---------------------------------------------------------------- publishing

  /**
   * Publishes an approved draft. Nothing is written to the project table
   * until every image is stored; if anything fails before that, the images
   * written in this attempt are removed and the live record is as it was.
   */
  private async publish(fp: FolderPlan, item: ProjectSyncItem, projectId: string | undefined, others: Pick<Project, 'slug' | 'summary'>[], dry: boolean): Promise<Touched | null> {
    const draft = item.draft;
    if (!draft || draftHash(draft) !== item.approvedHash) {
      // Belt and braces: the planner only sends approved items, and edits reset approval.
      if (!dry) {
        item.state = 'pending_review';
        item.issues = ['The draft changed after approval — approve again'];
        await this.items.save(item);
      }
      return null;
    }
    const gallery = galleryOrder(draft);
    if (dry) {
      return { item, kind: projectId ? 'updated' : 'created', line: this.line(fp.folder.name, fp.slug, draft, gallery.length, 'skipped') };
    }

    const source = this.source();
    const uploadDir = this.uploadDir();
    const prefix = this.config.get<string>('apiPrefix', 'api');
    const previous = new Map(item.images.map((i) => [`${i.sourceId}:${i.md5}`, i.url]));
    const published: ProjectSyncItem['images'] = [];
    const writtenNow: string[] = [];

    try {
      for (const img of gallery) {
        const reuse = previous.get(`${img.sourceId}:${img.md5}`);
        if (reuse) {
          published.push({ sourceId: img.sourceId, md5: img.md5, url: reuse });
          continue;
        }
        const file = this.fileOf(img);
        const prepared = await prepareImage(file, await source.download(file));
        if ('problem' in prepared) throw new Error(`${prepared.file}: ${prepared.problem}`);
        const url = await storeImage(uploadDir, prefix, fp.slug, published.length, prepared);
        writtenNow.push(url);
        published.push({ sourceId: img.sourceId, md5: img.md5, url });
      }

      const fields = buildFields(draft, fp.slug, fp.no, published.map((i) => i.url));
      const dup = duplicateSummary(fields, others);
      if (dup) throw new Error(`${dup} — change it in the editor`);

      let saved: Project;
      let changes: ReturnType<typeof diffFields> | undefined;
      if (projectId) {
        const current = await this.projects.findOneByOrFail({ id: projectId });
        changes = diffFields(current, fields);
        item.previousSnapshot = JSON.parse(JSON.stringify(current));
        Object.assign(current, fields);
        saved = await this.projects.save(current);
      } else {
        // Re-check the slug at the last moment: never create a second record for it.
        if (await this.projects.findOneBy({ slug: fields.slug })) throw new Error(`Slug "${fields.slug}" was taken on the site meanwhile`);
        saved = await this.projects.save(this.projects.create({ ...fields, status: ProjectStatus.Published, featured: false }));
        item.previousSnapshot = null;
      }

      Object.assign(item, {
        mode: 'owned',
        state: 'awaiting_verification',
        projectId: saved.id,
        slug: saved.slug,
        sourceHash: fp.hash,
        images: published,
        issues: [],
        attempts: 0,
        lastPublishedAt: saved.updatedAt,
      });
      await this.items.save(item);
      const r = readiness(draft, this.minImages);
      return { item, kind: projectId ? 'updated' : 'created', line: this.line(fp.folder.name, saved.slug, draft, published.length, 'awaiting_verification', r.warnings), changes };
    } catch (err) {
      this.discard(writtenNow, uploadDir);
      throw err;
    }
  }

  private line(folder: string, slug: string, draft: ProjectDraft, images: number, outcome: Outcome, warnings: string[] = []): ProjectLine {
    const aiDrafted = (['summaryEn', 'summaryAr', 'descriptionEn', 'descriptionAr'] as const).filter((k) => draft.content[k].source === 'ai' && draft.content[k].value.length);
    return {
      folder,
      name: draft.facts.titleEn.value || slug,
      category: draft.facts.sectors.value.join(', '),
      urlEn: pageUrl(slug, 'en'),
      urlAr: pageUrl(slug, 'ar'),
      images,
      outcome,
      aiDrafted,
      warnings,
    };
  }

  /** Removes images stored by an attempt that did not complete (and their web copies). */
  private discard(urls: string[], uploadDir: string): void {
    for (const url of urls) {
      const name = basename(url);
      const stem = name.replace(/\.webp$/, '');
      for (const path of [join(uploadDir, name), ...[640, 1024, 1600, 2400].map((w) => join(uploadDir, '_w', `${stem}.${w}.webp`))]) {
        try {
          unlinkSync(path);
        } catch {
          /* not there */
        }
      }
    }
  }

  /**
   * One frontend rebuild for the whole batch, then waits for the pages. A
   * project counts as published/updated only once its live pages pass.
   */
  private async deployAndVerify(report: SyncReport, touched: Touched[]): Promise<void> {
    const control = await this.control();
    let rebuilt = false;
    if (touched.length) {
      if (rebuildConfigured()) {
        try {
          await triggerFrontendBuild();
          control.deployRequestedAt = new Date();
          await this.controls.save(control);
          rebuilt = true;
        } catch (err) {
          report.issues.push(`The website rebuild could not be started: ${(err as Error).message}`);
        }
      } else {
        report.issues.push('Website rebuild is not configured, so new pages are not prerendered or in the sitemap until the next deploy.');
        report.ownerActions.push('Set RAILWAY_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT_ID and RAILWAY_FRONTEND_SERVICE_ID on the backend service.');
      }
    }

    // Everything waiting for verification: this run's saves and earlier ones.
    const pending = await this.items.find({ where: { state: 'awaiting_verification' } });
    if (!pending.length) return;
    const lines = new Map(touched.map((t) => [t.item.sourceFolderId, t]));

    const deadline = Date.now() + (rebuilt ? Number(process.env.PROJECT_SYNC_VERIFY_MINUTES ?? 25) * 60_000 : 0);
    const pollMs = Number(process.env.PROJECT_SYNC_VERIFY_POLL_MS ?? 60_000);
    let remaining = pending;
    const results = new Map<string, string[]>();
    for (;;) {
      const sitemap = await sitemapUrls();
      const next: ProjectSyncItem[] = [];
      for (const item of remaining) {
        const project = item.projectId ? await this.projects.findOneBy({ id: item.projectId }) : null;
        if (!project) continue;
        const check = await verifyProject(project.slug, project.cover, sitemap);
        if (check.ok) {
          item.state = 'published';
          item.lastVerifiedAt = new Date();
          await this.items.save(item);
          results.set(item.sourceFolderId, []);
        } else {
          results.set(item.sourceFolderId, check.problems);
          next.push(item);
        }
      }
      remaining = next;
      if (!remaining.length || Date.now() > deadline) break;
      await new Promise((r) => setTimeout(r, pollMs));
    }

    for (const item of pending) {
      const problems = results.get(item.sourceFolderId) ?? ['project record missing'];
      const ok = problems.length === 0;
      const t = lines.get(item.sourceFolderId);
      const wasUpdate = t ? t.kind === 'updated' : !!item.previousSnapshot;
      const line: ProjectLine = t?.line ?? (item.draft ? this.line(item.folderName, item.slug, item.draft, item.images.length, 'awaiting_verification') : {
        folder: item.folderName,
        name: item.slug,
        category: '',
        urlEn: pageUrl(item.slug, 'en'),
        urlAr: pageUrl(item.slug, 'ar'),
        images: item.images.length,
        outcome: 'awaiting_verification',
      });
      line.outcome = ok ? (wasUpdate ? 'updated' : 'published') : 'awaiting_verification';
      if (!ok) line.warnings = [...(line.warnings ?? []), `Live check: ${problems.join('; ')}`];
      if (wasUpdate) report.updated.push({ ...line, changes: t?.changes ?? [] });
      else report.created.push(line);
      if (ok) {
        if (wasUpdate) report.summary.updated++;
        else report.summary.published++;
      } else report.summary.awaitingVerification++;
    }

    if (remaining.length) {
      const waited = control.deployRequestedAt ? Date.now() - control.deployRequestedAt.getTime() : Infinity;
      if (!rebuilt && waited > 2 * 60 * 60_000) {
        report.issues.push(`${remaining.length} project(s) saved but still not live more than 2 hours after the last rebuild request — check the frontend deployment.`);
        report.ownerActions.push('Open Railway → frontend service → Deployments and check the latest build log.');
      }
    }
  }

  // ---------------------------------------------------------------- notify

  private mailRecipients(): string[] {
    const own = (process.env.PROJECT_SYNC_NOTIFY_TO ?? '').split(',').map((a) => a.trim()).filter(Boolean);
    return own.length ? own : this.config.get<string[]>('mail.inquiryTo') ?? [];
  }

  private mailReady(): boolean {
    const m = this.config.get<{ host: string; from: string }>('mail');
    return !!(m?.host && m.from && this.mailRecipients().length);
  }

  private async notify(report: SyncReport, text: string): Promise<void> {
    const m = this.config.get<{ host: string; port: number; secure: boolean; user: string; pass: string; from: string }>('mail');
    const to = this.mailRecipients();
    if (!this.mailReady() || !m) {
      this.logger.warn('Sync report not emailed: SMTP settings or PROJECT_SYNC_NOTIFY_TO are missing. It is stored in the run history.');
      return;
    }
    try {
      await createTransport({ host: m.host, port: m.port, secure: m.secure, ...(m.user ? { auth: { user: m.user, pass: m.pass } } : {}) }).sendMail({
        from: m.from,
        to,
        subject: reportSubject(report),
        text,
      });
    } catch (err) {
      this.logger.error(`Sync report email failed: ${(err as Error).message}`);
    }
  }
}
