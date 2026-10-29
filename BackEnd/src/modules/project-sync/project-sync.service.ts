import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { createTransport } from 'nodemailer';
import { basename, join, relative, resolve } from 'path';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { buildFields, diffFields, duplicateSummary, mergeGallery, ownedFields, SourceFields, TEXT_FIELDS } from './content';
import { applyEdit, deriveFromFolder, DraftEdit, DraftImage, draftHash, emptyDraft, fallbackText, galleryOrder, ProjectDraft, readiness, suggest } from './draft';
import { Drafter, MAX_IMAGES } from './drafter';
import { DriveSource, parseServiceAccount } from './drive-source';
import { ProjectSyncControl, ProjectSyncItem, ProjectSyncRun, SyncedImage } from './entities/project-sync.entity';
import { fingerprint, forModel, isRenderPass, prepareImage, PreviewStore, samePicture, storeImage } from './images';
import { LocalSource } from './local-source';
import { FolderPlan, plan, SiteProject } from './planner';
import { emptyReport, formatReport, Outcome, ProjectLine, reportSubject, SyncReport } from './report';
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

export interface RunOptions {
  trigger: 'schedule' | 'catch-up' | 'manual' | 'retry' | 'publish-now';
  slot?: string;
  dryRun?: boolean;
  requestedBy?: string;
  /** Restrict the run to one folder (retry, publish-now). */
  folderId?: string;
}

type Touched = { item: ProjectSyncItem; kind: 'created' | 'updated'; line: ProjectLine; changes?: ReturnType<typeof diffFields> };
/** A live image a source file is already on the page as (matched by its picture, not its bytes). */
type SiteImage = { url: string; fingerprint: string };

/**
 * Google Drive → MSP website. See docs/automation/PROJECT-SYNC.md for the
 * operating guide. Runs in the backend process because uploads live on the
 * backend's disk; a Postgres advisory lock plus a unique slot key keep it to
 * one execution per slot however many replicas are running.
 *
 * Every run: detect folders → prepare new and changed ones (facts from the
 * folder name, images checked, text written) → publish them (the folder is
 * the owner's approval) → one frontend rebuild → verify the live pages → report.
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
    // Previews (including images not used on the page) must never be under the public uploads folder.
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
      .getRawMany<{ state: string; count: number }>();
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

  /** The admin list: one row per folder with its state and what it lacks, without the full draft. */
  async listItems() {
    const items = await this.items.find({ order: { folderName: 'ASC' } });
    return items.map((i) => this.summarize(i));
  }

  private summarize(i: ProjectSyncItem) {
    const r = i.draft && i.mode === 'owned' ? readiness(i.draft, this.minImages) : null;
    const { draft, previousSnapshot, ...rest } = i;
    const shown = draft ? (i.mode === 'linked' ? draft.images.filter((x) => x.included && !x.problem) : galleryOrder(draft)) : [];
    return {
      ...rest,
      title: (i.mode === 'owned' && draft?.facts.titleEn.value) || i.slug || i.folderName,
      titleAr: draft?.facts.titleAr.value ?? '',
      cover: shown[0]?.md5 ?? '',
      imageCount: draft ? shown.length : i.images.length,
      blocking: r?.blocking ?? [],
      missing: r?.missing ?? [],
      aiText: draft ? (['summaryEn', 'summaryAr', 'descriptionEn', 'descriptionAr'] as const).some((k) => draft.content[k].source === 'ai' && draft.content[k].value.length) : false,
      canUndo: !!previousSnapshot,
      urlEn: i.slug && i.projectId ? pageUrl(i.slug, 'en') : '',
      urlAr: i.slug && i.projectId ? pageUrl(i.slug, 'ar') : '',
    };
  }

  async getItem(id: string) {
    const item = await this.findItem(id);
    return {
      ...this.summarize(item),
      draft: item.draft,
      readiness: item.draft && item.mode === 'owned' ? readiness(item.draft, this.minImages) : null,
      minImages: this.minImages,
    };
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

  /** A correction in the admin. It becomes the owner's value and is published in the next run (or at once with Publish now). */
  async editDraft(id: string, edit: DraftEdit, by: string) {
    const item = await this.findItem(id);
    if (!item.draft || item.mode === 'linked') throw new BadRequestException('Existing projects are edited in the Projects admin; the sync only keeps their images in step');
    const before = draftHash(item.draft);
    try {
      applyEdit(item.draft, edit, by);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    fallbackText(item.draft);
    if (draftHash(item.draft) !== before && item.state !== 'postponed') {
      const r = readiness(item.draft, this.minImages);
      item.state = r.blocking.length ? 'draft' : 'approved';
      item.attempts = 0;
      item.issues = r.blocking.length ? r.blocking : [`Edited by ${by}; published in the next run, or press Publish now`];
    }
    await this.items.save(item);
    return this.getItem(id);
  }

  /**
   * publish: publish this folder now instead of at the next scheduled run.
   * hold:    keep it off the site (or stop updating its live page).
   * resume:  undo a hold; the folder is read again and published.
   */
  async decide(id: string, decision: 'publish' | 'hold' | 'resume', by: string, opts: { note?: string } = {}) {
    const item = await this.findItem(id);
    const note = (opts.note ?? '').slice(0, 500);

    if (decision === 'publish') {
      if (item.state === 'postponed') throw new ConflictException('This folder is on hold — resume it first');
      if (!item.draft) throw new BadRequestException('The folder has not been read yet — run the sync first');
      if (item.mode === 'owned') {
        const r = readiness(item.draft, this.minImages);
        if (r.blocking.length) throw new BadRequestException(`Cannot publish: ${r.blocking.join('; ')}`);
        item.state = 'approved';
      } else {
        item.sourceHash = ''; // read the folder again and apply its images
      }
      item.attempts = 0;
      item.issues = [];
    } else if (decision === 'hold') {
      item.state = 'postponed';
      item.issues = [item.projectId ? `On hold (${by}): the live page is not updated from the folder` : `On hold (${by}): not published`];
    } else {
      if (item.state !== 'postponed') throw new ConflictException('Only a folder on hold can be resumed');
      item.state = item.mode === 'linked' ? 'linked' : item.projectId ? 'published' : 'draft';
      item.sourceHash = ''; // read the folder again in the next run
      item.issues = [];
    }
    Object.assign(item, { decidedBy: by, decidedAt: new Date(), decisionNote: note });
    await this.items.save(item);

    if (decision === 'publish') {
      this.run({ trigger: 'publish-now', folderId: item.sourceFolderId, requestedBy: by }).catch((err) =>
        this.logger.error(`Publish-now of ${item.folderName} failed: ${(err as Error).message}`),
      );
    }
    return this.getItem(id);
  }

  /** Writes the text again with the AI (text a person wrote is kept); published in the next run. */
  async redraft(id: string, by: string) {
    if (!this.drafter.enabled) throw new BadRequestException('AI drafting is off: set ANTHROPIC_API_KEY on the backend');
    const item = await this.findItem(id);
    if (!item.draft || item.mode === 'linked') throw new BadRequestException('This folder has no page text');
    item.draft.notes = [];
    await this.aiDraft(item, item.draft);
    fallbackText(item.draft);
    if (item.state !== 'postponed') item.state = readiness(item.draft, this.minImages).blocking.length ? 'draft' : 'approved';
    item.issues = [`Redrafted by ${by}; published in the next run`];
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

  /**
   * Puts a project the sync changed back to the record it replaced. It stays
   * that way until the folder changes again.
   */
  async revert(itemId: string, by: string): Promise<Project> {
    const item = await this.findItem(itemId);
    const snap = item.previousSnapshot as { fields: Record<string, unknown>; images: SyncedImage[]; written: Record<string, unknown> | null } | null;
    if (!item.projectId || !snap?.fields) throw new NotFoundException('Nothing to undo for this project');
    const project = await this.projects.findOneOrFail({ where: { id: item.projectId } });
    Object.assign(project, snap.fields);
    const saved = await this.projects.save(project);
    item.images = snap.images;
    if (item.draft) item.draft.written = snap.written;
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
    const keep = (t: Touched | null) => {
      if (t) touched.push(t);
    };

    try {
      const source = this.source();
      report.source = source.label;
      const folders = await source.listFolders();
      const scoped = opts.folderId ? folders.filter((f) => f.id === opts.folderId) : folders;
      if (opts.folderId && !scoped.length) throw new Error('That folder is no longer in the source');
      report.summary.scanned = scoped.length;

      const allProjects = await this.projects.find({ select: ['id', 'slug', 'no', 'updatedAt', 'summary', 'title'] });
      const known = await this.items.find();
      const p = plan({ folders: scoped, items: known, projects: allProjects as SiteProject[] });

      const itemFor = (fp: FolderPlan) =>
        known.find((k) => k.sourceFolderId === fp.folder.id) ??
        this.items.create({ sourceFolderId: fp.folder.id, folderName: fp.folder.name, slug: fp.slug, mode: 'owned', state: 'draft', images: [], issues: [] });

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
              if (a.held) {
                report.summary.held++;
                report.held.push(fp.folder.name);
              } else if (this.wantsAiText(item)) {
                // The AI became available: pages published with the factual summary get full text.
                publishing = await this.prepare(fp, item, 'retry-draft', dry, report);
                if (publishing) keep(await this.publish(fp, item, allProjects, dry));
              } else report.summary.unchanged++;
              break;
            case 'verify':
              break; // the verification pass below covers it
            case 'link':
              await this.link(fp, item, allProjects.find((x) => x.id === a.project.id)!, dry, report);
              break;
            case 'review':
              report.summary.attention++;
              report.attention.push({ folder: fp.folder.name, reasons: a.reasons });
              if (!dry) {
                item.issues = a.reasons;
                await this.items.save(item);
              }
              break;
            case 'prepare':
              publishing = await this.prepare(fp, item, a.reason, dry, report);
              if (publishing) keep(await this.publish(fp, item, allProjects, dry));
              break;
            case 'publish':
              keep(await this.publish(fp, item, allProjects, dry));
              break;
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
        for (const t of touched) {
          if (t.kind === 'created') report.created.push(t.line);
          else report.updated.push({ ...t.line, changes: t.changes ?? [] });
        }
      } else {
        await this.deployAndVerify(report, touched);
      }
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
    const plainText = [...report.created, ...report.updated].some((l) => l.missing?.some((m) => m.startsWith('written description')));
    if (!this.drafter.enabled && plainText) {
      report.ownerActions.push(
        'Pages were published with a one-line factual summary only: set ANTHROPIC_API_KEY on the backend so the sync writes full English and Arabic descriptions (about US$0.05–0.10 per project); existing sync pages are upgraded automatically.',
      );
    }

    report.finishedAt = new Date().toISOString();
    report.durationMs = Date.now() - started;
    if (report.status !== 'failed') {
      const s = report.summary;
      report.status = s.failed || s.attention || s.awaitingVerification || s.notPublished || report.issues.length ? 'attention' : 'succeeded';
    }
    const text = formatReport(report, adminUrl);
    await this.runs.update(run.id, { status: report.status, finishedAt: new Date(), report, reportText: text, error: report.status === 'failed' ? report.issues.at(-1) ?? '' : '' });
    if (!dry) await this.notify(report, text);
    this.logger.log(`Project sync ${run.slot}: ${report.status}`);
    return this.runs.findOneByOrFail({ id: run.id });
  }

  /** A live sync page still carrying the factual summary, now that the AI can write its text. */
  private wantsAiText(item: ProjectSyncItem): boolean {
    return this.drafter.enabled && item.mode === 'owned' && item.state === 'published' && item.draft?.content.summaryEn.source === 'template';
  }

  // ---------------------------------------------------------------- reading folders

  /**
   * First sight of a folder for a project already on the site: records which
   * folder images are already on its page (by picture, so the site's webp of
   * a source JPEG counts) and changes nothing. From then on, images added to
   * or replaced in the folder are synced to the page; its text stays the CMS's.
   */
  private async link(fp: FolderPlan, item: ProjectSyncItem, project: Pick<Project, 'id' | 'slug' | 'title'>, dry: boolean, report: SyncReport): Promise<void> {
    report.summary.linked++;
    const draft = emptyDraft();
    const site = await this.siteImages(project.id);
    const matched = await this.collectImages(fp, item, draft, dry, site, true);
    report.linked.push({
      folder: fp.folder.name,
      name: project.title?.en || project.slug,
      url: pageUrl(project.slug, 'en'),
      sourceImages: draft.images.filter((i) => !i.problem && !isRenderPass(i.path)).length,
      onSite: matched.length,
    });
    if (dry) return;
    Object.assign(item, { mode: 'linked', state: 'linked', projectId: project.id, slug: project.slug, sourceHash: fp.hash, images: matched, draft, issues: [] });
    await this.items.save(item);
  }

  /**
   * Reads a new or changed folder into its draft: facts from the folder name,
   * images checked, text written. Returns whether it can be published; a
   * folder that cannot (no title or no usable image) is reported and retried.
   */
  private async prepare(fp: FolderPlan, item: ProjectSyncItem, reason: 'new' | 'source-changed' | 'retry-draft', dry: boolean, report: SyncReport): Promise<boolean> {
    const draft: ProjectDraft = item.draft ? structuredClone(item.draft) : emptyDraft();
    draft.notes = [];
    const site = item.projectId ? await this.siteImages(item.projectId) : [];

    if (item.mode === 'linked') {
      const matched = await this.collectImages(fp, item, draft, dry, site, false);
      if (!dry) {
        Object.assign(item, { draft, sourceHash: fp.hash, images: this.withMatches(item.images, matched), issues: [] });
        await this.items.save(item);
      }
      return true;
    }

    const f = draft.facts;
    const was = { title: f.titleEn.value, location: f.locationEn.value };
    suggest(draft, deriveFromFolder(fp.folder.name, fp.folder.files.map((x) => x.path)));
    const renamed = !!item.draft && (was.title !== f.titleEn.value || was.location !== f.locationEn.value);
    if (renamed) {
      // Text and translations written for the old name no longer fit.
      if (f.titleAr.source === 'ai') f.titleAr = { value: '', source: 'folder' };
      if (f.locationAr.source === 'ai') f.locationAr = { value: '', source: 'folder' };
      const c = draft.content;
      for (const k of ['summaryEn', 'summaryAr'] as const) if (c[k].source === 'ai') c[k] = { value: '', source: 'template' };
      for (const k of ['descriptionEn', 'descriptionAr'] as const) if (c[k].source === 'ai') c[k] = { value: [], source: 'template' };
    }

    const matched = await this.collectImages(fp, item, draft, dry, site, false);

    const c = draft.content;
    const wantsText = reason === 'new' || renamed || (['summaryEn', 'summaryAr'] as const).some((k) => c[k].source === 'template' || !c[k].value);
    if (!dry && this.drafter.enabled && wantsText) await this.aiDraft(item, draft, fp.folder.files.map((x) => x.path));
    fallbackText(draft);

    const r = readiness(draft, this.minImages);
    if (reason === 'new') report.summary.newDetected++;
    if (r.blocking.length) {
      report.summary.notPublished++;
      report.notPublished.push({ folder: fp.folder.name, name: f.titleEn.value || fp.slug, reasons: r.blocking });
    }
    if (dry) return !r.blocking.length;

    Object.assign(item, {
      draft,
      slug: fp.slug,
      sourceHash: fp.hash,
      images: this.withMatches(item.images, matched),
      state: r.blocking.length ? 'draft' : 'approved',
      issues: r.blocking,
    });
    await this.items.save(item);
    return !r.blocking.length;
  }

  private withMatches(images: SyncedImage[], matched: SyncedImage[]): SyncedImage[] {
    return [...images, ...matched.filter((m) => !images.some((i) => i.md5 === m.md5))];
  }

  /** The page's current images with their fingerprints, read from the uploads folder. */
  private async siteImages(projectId: string): Promise<SiteImage[]> {
    const project = await this.projects.findOne({ where: { id: projectId }, select: ['id', 'cover', 'gallery'] });
    const out: SiteImage[] = [];
    for (const url of [project?.cover, ...(project?.gallery ?? [])].filter((u): u is string => !!u)) {
      const path = join(this.uploadDir(), basename(url.split('?')[0]));
      if (!url.includes('/uploads/') || !existsSync(path)) continue;
      try {
        out.push({ url, fingerprint: await fingerprint(readFileSync(path)) });
      } catch {
        /* unreadable: treated as not matching */
      }
    }
    return out;
  }

  /**
   * Checks every new source image once (by content), keeps a private preview
   * and a fingerprint of it, and decides what goes on the page:
   *  - exact copies (same bytes) and the same picture in another file (a
   *    smaller export, a PNG beside the JPEG) are used once — the largest;
   *  - a file that replaces an earlier version keeps that version's place;
   *  - render passes and images that are too small are listed, not used;
   *  - new images join up to the gallery cap.
   * Returns the source images already on the page (matched by picture), so
   * they are never uploaded a second time. `baseline`: first sight of an
   * existing project — only the images already on its page count as included.
   */
  private async collectImages(fp: FolderPlan, item: ProjectSyncItem, draft: ProjectDraft, dry: boolean, site: SiteImage[], baseline: boolean): Promise<SyncedImage[]> {
    const source = this.source();
    const before = new Map(draft.images.map((i) => [i.md5, i]));
    const bySource = new Map(draft.images.map((i) => [i.sourceId, i]));
    const byPath = new Map(draft.images.map((i) => [i.path, i]));
    const out: DraftImage[] = [];
    const fresh = new Set<DraftImage>();
    const matched: SyncedImage[] = [];
    const seen = new Set<string>();
    const copies: string[] = [];
    const twins: string[] = [];
    let passes = 0;

    for (const file of fp.images) {
      let md5 = file.md5;
      let raw: Buffer | undefined;
      if (!md5) {
        raw = await source.download(file);
        md5 = createHash('md5').update(raw).digest('hex');
      }
      if (seen.has(md5)) {
        copies.push(file.path.split('/').pop()!);
        continue;
      }
      seen.add(md5);

      const old = before.get(md5);
      let img: DraftImage;
      if (old && (old.problem || (old.fingerprint && (dry || this.previews.has(item.sourceFolderId, md5))))) {
        img = { ...old, sourceId: file.id, path: file.path };
      } else {
        raw ??= await source.download(file);
        const r = dry ? await prepareImage(file, raw, { maxEdge: 64, quality: 50 }) : await this.previews.add(item.sourceFolderId, file, raw);
        if ('problem' in r) {
          out.push({ sourceId: file.id, path: file.path, md5, width: 0, height: 0, included: false, problem: r.problem });
          continue;
        }
        const pass = isRenderPass(file.path);
        // An earlier version of this file (same Drive file or same path) keeps its place.
        const prior = old ?? bySource.get(file.id) ?? byPath.get(file.path);
        img = { sourceId: file.id, path: file.path, md5, width: r.width, height: r.height, fingerprint: await fingerprint(r.data), included: prior ? prior.included : !pass && !baseline };
        if (!prior) {
          fresh.add(img);
          if (pass) passes++;
        }
      }

      if (!img.problem && img.fingerprint && !isRenderPass(img.path)) {
        // Already on the page (uploaded by hand, or the existing project's own images): never uploaded again.
        if (fresh.has(img) || baseline) {
          const onSite = site.find((s) => samePicture(s.fingerprint, img.fingerprint!));
          if (onSite) {
            matched.push({ sourceId: img.sourceId, md5: img.md5, url: onSite.url, path: img.path, fingerprint: img.fingerprint });
            img.included = true;
          }
        }
        // The same picture in another file of this folder: the larger one is used.
        const twin = out.find((o) => !o.problem && o.fingerprint && !isRenderPass(o.path) && samePicture(o.fingerprint, img.fingerprint!));
        if (twin) {
          const [kept, dropped] = img.width * img.height > twin.width * twin.height ? [img, twin] : [twin, img];
          kept.included = kept.included || dropped.included;
          dropped.included = false;
          dropped.problem = `same picture as ${kept.path}`;
          twins.push(dropped.path.split('/').pop()!);
        }
      }
      out.push(img);
    }

    // New images join the gallery up to the cap, in folder order.
    let count = out.filter((i) => i.included && !i.problem && !fresh.has(i)).length;
    let over = 0;
    for (const img of out) {
      if (!fresh.has(img) || !img.included || img.problem) continue;
      if (count < this.maxGallery || matched.some((m) => m.md5 === img.md5)) count++;
      else {
        img.included = false;
        over++;
      }
    }

    draft.images = out;
    if (passes) draft.notes.push(`${passes} render-pass file(s) (lighting, texture or mask layers) are not used.`);
    if (copies.length) draft.notes.push(`${copies.length} identical copy(ies) skipped, e.g. ${copies.slice(0, 3).join(', ')}`);
    if (twins.length) draft.notes.push(`${twins.length} smaller copy(ies) of the same picture skipped, e.g. ${twins.slice(0, 3).join(', ')}`);
    if (over) draft.notes.push(`${over} image(s) beyond the ${this.maxGallery}-image gallery limit are not used; choose others in the admin if wanted.`);
    if (!out.some((i) => i.md5 === draft.cover && i.included && !i.problem)) draft.cover = out.find((i) => i.included && !i.problem)?.md5 ?? '';
    return matched;
  }

  /** Runs the AI on a few images spread across the gallery. Failures become notes; the factual summary is used. */
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
      draft.notes.push(`AI drafting failed: ${(err as Error).message}. The factual summary is used until the next change.`);
    }
  }

  // ---------------------------------------------------------------- publishing

  /**
   * Writes a folder's draft to its project. Nothing is written to the project
   * table until every new image is stored; if anything fails before that,
   * the images written in this attempt are removed and the record is as it was.
   *
   * New folder: a new published project. Existing page: only what changed,
   * field by field — a field a person edited in the CMS is kept, images a
   * person added stay, images a person removed are not brought back, and a
   * changed source file replaces its old version in place. A linked (existing
   * CMS) project gets image changes only.
   */
  private async publish(fp: FolderPlan, item: ProjectSyncItem, others: Pick<Project, 'slug' | 'summary'>[], dry: boolean): Promise<Touched | null> {
    const draft = item.draft;
    if (!draft) return null;
    const linked = item.mode === 'linked';
    const r = linked ? null : readiness(draft, this.minImages);
    if (r?.blocking.length) return null;
    const desired = linked ? draft.images.filter((i) => i.included && !i.problem) : galleryOrder(draft);
    const projectId = item.projectId ?? undefined;
    const extra: Partial<ProjectLine> = r ? { missing: r.missing } : {};
    if (dry) return { item, kind: projectId ? 'updated' : 'created', line: this.line(item, fp.slug, desired.length, 'skipped', extra) };

    const source = this.source();
    const uploadDir = this.uploadDir();
    const prefix = this.config.get<string>('apiPrefix', 'api');
    const current = projectId ? await this.projects.findOneByOrFail({ id: projectId }) : null;
    const currentList = current ? [current.cover, ...(current.gallery ?? [])].filter(Boolean) : [];
    const written = draft.written ?? null;
    const writtenList = written && 'gallery' in written ? [written.cover as string, ...((written.gallery as string[]) ?? [])].filter(Boolean) : null;
    // Sync images a person took off the page: never put back, nor their new versions.
    const removedByPerson = new Set((writtenList ?? []).filter((u) => !currentList.includes(u)));
    const prev = item.images ?? [];
    const published: SyncedImage[] = [];
    const writtenNow: string[] = [];
    const replace = new Map<string, string>();
    const add: string[] = [];

    try {
      for (const img of desired) {
        const exact = prev.find((p) => p.md5 === img.md5 && p.url);
        if (exact) {
          if (!removedByPerson.has(exact.url)) published.push({ ...exact, sourceId: img.sourceId, path: img.path });
          continue;
        }
        const older = prev.find((p) => p.url && (p.sourceId === img.sourceId || (!!p.path && p.path === img.path)));
        if (older && removedByPerson.has(older.url)) continue;
        const file = this.fileOf(img);
        const prepared = await prepareImage(file, await source.download(file));
        if ('problem' in prepared) throw new Error(`${prepared.file}: ${prepared.problem}`);
        const url = await storeImage(uploadDir, prefix, fp.slug, currentList.length + published.length, prepared);
        writtenNow.push(url);
        published.push({ sourceId: img.sourceId, md5: img.md5, url, path: img.path, fingerprint: img.fingerprint });
        if (older) replace.set(older.url, url);
        else add.push(url);
      }
      // Linked projects keep the record of every matched image; sync pages drop images no longer in the folder.
      const kept = linked ? prev.filter((p) => !published.some((q) => q.md5 === p.md5) && !replace.has(p.url)) : [];
      const drop = new Set(linked ? [] : prev.filter((p) => p.url && !published.some((q) => q.url === p.url) && !replace.has(p.url)).map((p) => p.url));
      const images = [...kept, ...published];
      const coverUrl = linked ? undefined : published.find((p) => p.md5 === desired[0]?.md5)?.url;

      let saved: Project;
      let changes: ReturnType<typeof diffFields> | undefined;
      let newWritten: Record<string, unknown>;
      const warnings: string[] = [...(r?.warnings ?? [])];

      if (!current) {
        const fields = buildFields(draft, fp.slug, fp.no, published.map((p) => p.url));
        const dup = duplicateSummary(fields, others);
        if (dup) warnings.push(`${dup} — two pages share a meta description; edit the summary in the admin`);
        // Re-check the slug at the last moment: never create a second record for it.
        if (await this.projects.findOneBy({ slug: fields.slug })) throw new Error(`Slug "${fields.slug}" was taken on the site meanwhile`);
        saved = await this.projects.save(this.projects.create({ ...fields, status: ProjectStatus.Published, featured: false }));
        newWritten = this.pick(fields);
        item.previousSnapshot = null;
      } else {
        const next = buildFields(draft, current.slug, current.no, []);
        const { owned, kept: editedFields } = ownedFields(current, written);
        const list = mergeGallery({ current: currentList, written: writtenList, replace, drop, add, cover: coverUrl });
        const after: Partial<Project> = { cover: list[0] ?? '', gallery: list.slice(1) };
        for (const f of owned) (after as Record<string, unknown>)[f] = next[f];
        changes = diffFields(current, { ...current, ...after } as Project);
        if (editedFields.length) extra.keptEdits = editedFields;
        if (!changes.length) {
          // Nothing on the page changes: only the record of the folder is brought up to date.
          Object.assign(item, { images, sourceHash: fp.hash, state: linked ? 'linked' : 'published', issues: [], attempts: 0 });
          await this.items.save(item);
          return null;
        }
        item.previousSnapshot = { fields: JSON.parse(JSON.stringify(current)), images: prev, written };
        Object.assign(current, after);
        saved = await this.projects.save(current);
        newWritten = { ...(written ?? {}), cover: after.cover, gallery: after.gallery };
        for (const f of owned) newWritten[f] = JSON.parse(JSON.stringify(next[f] ?? null));
        extra.imagesAdded = add.filter((u) => list.includes(u)).length;
        extra.imagesReplaced = [...replace.values()].filter((u) => list.includes(u)).length;
        extra.imagesRemoved = [...drop].filter((u) => currentList.includes(u)).length;
      }

      draft.written = newWritten;
      Object.assign(item, {
        state: 'awaiting_verification',
        projectId: saved.id,
        slug: saved.slug,
        sourceHash: fp.hash,
        images,
        issues: [],
        attempts: 0,
        approvedHash: draftHash(draft),
        lastPublishedAt: saved.updatedAt,
      });
      await this.items.save(item);
      if (warnings.length) extra.warnings = warnings;
      const onPage = [saved.cover, ...(saved.gallery ?? [])].filter(Boolean).length;
      return { item, kind: current ? 'updated' : 'created', line: this.line(item, saved.slug, onPage, 'awaiting_verification', extra), changes };
    } catch (err) {
      this.discard(writtenNow, uploadDir);
      throw err;
    }
  }

  /** The source-owned part of a record, as the sync wrote it. */
  private pick(fields: SourceFields): Record<string, unknown> {
    const out: Record<string, unknown> = { cover: fields.cover, gallery: fields.gallery };
    for (const f of TEXT_FIELDS) out[f] = JSON.parse(JSON.stringify(fields[f] ?? null));
    return out;
  }

  private line(item: ProjectSyncItem, slug: string, images: number, outcome: Outcome, extra: Partial<ProjectLine> = {}): ProjectLine {
    const draft = item.draft;
    const linked = item.mode === 'linked';
    const textSource = draft?.content.summaryEn.source;
    return {
      folder: item.folderName,
      name: (linked ? '' : draft?.facts.titleEn.value) || slug,
      category: linked || !draft ? '' : draft.facts.sectors.value.join(', '),
      urlEn: pageUrl(slug, 'en'),
      urlAr: pageUrl(slug, 'ar'),
      images,
      outcome,
      text: linked
        ? 'Existing project: text kept as in the CMS; images kept in step with the folder'
        : textSource === 'ai'
          ? 'Written by the AI from the folder facts and images, checked for added facts'
          : textSource === 'owner'
            ? 'As edited in the admin'
            : 'One-line factual summary',
      ...extra,
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
        report.issues.push('Website rebuild is not configured, so changed pages are prerendered and in the sitemap only after the next website deploy.');
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
          item.state = item.mode === 'linked' ? 'linked' : 'published';
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
      const line: ProjectLine = t?.line ?? this.line(item, item.slug, item.images.length, 'awaiting_verification');
      line.outcome = ok ? (wasUpdate ? 'updated' : 'published') : 'awaiting_verification';
      if (!ok) {
        const why = rebuildConfigured() ? `Live check: ${problems.join('; ')}` : 'Saved; live (prerendered, in the sitemap) after the next website deploy, as the rebuild is not configured';
        line.warnings = [...(line.warnings ?? []), why];
      }
      if (wasUpdate) report.updated.push({ ...line, changes: t?.changes ?? [] });
      else report.created.push(line);
      if (ok) {
        if (wasUpdate) report.summary.updated++;
        else report.summary.published++;
      } else report.summary.awaitingVerification++;
    }

    if (remaining.length) {
      const waited = control.deployRequestedAt ? Date.now() - control.deployRequestedAt.getTime() : Infinity;
      if (rebuildConfigured() && !rebuilt && waited > 2 * 60 * 60_000) {
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
