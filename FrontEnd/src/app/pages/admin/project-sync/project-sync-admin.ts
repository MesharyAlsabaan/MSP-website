import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminApi } from '../../../core/services/admin-api.service';
import { SyncImage } from './sync-image';
import {
  ItemState,
  RUN_LABEL,
  STATE_LABEL,
  SyncItem,
  SyncRun,
  SyncRunDetail,
  SyncStatus,
  runTone,
  stateTone,
  triggerLabel,
} from './project-sync.models';

type Tab = 'published' | 'missing' | 'unpublished' | 'errors' | 'hold' | 'existing' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'published', label: 'Published' },
  { key: 'missing', label: 'Missing details' },
  { key: 'unpublished', label: 'Not publishable' },
  { key: 'errors', label: 'Errors' },
  { key: 'hold', label: 'On hold' },
  { key: 'existing', label: 'Existing projects' },
  { key: 'history', label: 'History' },
];

const IN_TAB: Record<Exclude<Tab, 'history'>, (i: SyncItem) => boolean> = {
  published: (i) => i.mode === 'owned' && (i.state === 'published' || i.state === 'awaiting_verification' || i.state === 'approved'),
  missing: (i) => i.mode === 'owned' && !!i.projectId && i.missing.length > 0,
  unpublished: (i) => i.state === 'draft',
  errors: (i) => i.state === 'failed' || i.state === 'missing_from_source',
  hold: (i) => i.state === 'postponed',
  existing: (i) => i.mode === 'linked' && i.state !== 'postponed' && i.state !== 'missing_from_source',
};

const SUMMARY: [string, string][] = [
  ['scanned', 'Folders scanned'],
  ['newDetected', 'New found'],
  ['published', 'Published'],
  ['updated', 'Updated'],
  ['awaitingVerification', 'Awaiting live check'],
  ['linked', 'Existing linked'],
  ['notPublished', 'Not publishable'],
  ['failed', 'Errors'],
];

/**
 * Drive → website project sync: overview, what was published and what it
 * lacks, and run history. The folder is the owner's approval, so nothing waits
 * here for a decision; each project opens in its page (project-sync-item)
 * for corrections, hold and undo.
 */
@Component({
  selector: 'app-admin-project-sync',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, SyncImage],
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">Automation</p>
        <h1 class="mt-3 font-display text-3xl font-medium tracking-[-0.02em] text-ink">Project sync</h1>
        <p class="mt-2 max-w-xl text-sm text-muted">
          Every project folder in Google Drive is published to the website automatically. Correct details here when the folder name does not say enough.
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <button type="button" (click)="start(true)" [disabled]="busy()" data-test="rehearse"
          class="border border-ink/30 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-bg disabled:opacity-40">
          Rehearse
        </button>
        <button type="button" (click)="start(false)" [disabled]="busy()" data-test="run-now"
          class="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-bg transition-colors hover:bg-accent disabled:opacity-40">
          {{ busy() ? 'Running…' : 'Run now' }}
        </button>
      </div>
    </header>

    @if (notice()) { <p class="mt-6 border-s-2 border-accent ps-3 text-sm text-ink" data-test="notice">{{ notice() }}</p> }

    @if (loading()) {
      <p class="mt-10 text-muted">Loading…</p>
    } @else if (status(); as s) {
      <!-- Queue tiles -->
      <section class="mt-8 grid grid-cols-2 gap-px border border-hairline bg-hairline lg:grid-cols-5" data-test="tiles">
        @for (t of tiles(); track t.label) {
          <button type="button" (click)="tab.set(t.tab)" class="bg-surface p-5 text-start transition-colors hover:bg-bg">
            <span class="block font-display text-3xl font-medium" [class]="t.tone">{{ t.count }}</span>
            <span class="mt-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{{ t.label }}</span>
          </button>
        }
      </section>

      <!-- Automation status -->
      <section class="mt-px grid gap-px border border-t-0 border-hairline bg-hairline sm:grid-cols-3">
        <div class="bg-bg p-5">
          <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Schedule</p>
          <p class="mt-2 text-ink">
            <span class="font-display text-lg">{{ s.enabled ? 'On' : 'Paused' }}</span>
            <span class="text-sm text-muted"> · {{ times(s.times) }} Riyadh</span>
          </p>
          <p class="mt-1 text-sm text-muted">
            @if (!s.scheduleActive) { Not running on this server (no Drive connection) }
            @else if (s.enabled && s.nextRun) { Next: {{ s.nextRun | date: 'EEE d MMM, HH:mm' : '+0300' }} }
            @else { Manual runs still work }
          </p>
          <button type="button" (click)="toggle()" data-test="toggle"
            class="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">
            {{ s.enabled ? 'Pause automation' : 'Resume automation' }}
          </button>
        </div>
        <div class="bg-bg p-5">
          <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Last run</p>
          @if (s.lastRun) {
            <p class="mt-2 font-display text-lg" [class]="tone(s.lastRun.status)">{{ runLabel(s.lastRun.status) }}</p>
            <p class="mt-1 text-sm text-muted">{{ s.lastRun.createdAt | date: 'EEE d MMM, HH:mm' : '+0300' }}</p>
          } @else {
            <p class="mt-2 font-display text-lg text-ink">None yet</p>
          }
        </div>
        <div class="bg-bg p-5">
          <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Connections</p>
          <ul class="mt-2 space-y-1 text-sm" data-test="connections">
            <li [class]="s.source === 'configured' ? 'text-ink' : 'text-red-600'">Google Drive: {{ s.source === 'configured' ? 'connected' : 'not connected' }}</li>
            <li [class]="s.frontendRebuild !== 'missing' ? 'text-ink' : 'text-red-600'">Website rebuild: {{ s.frontendRebuild === 'missing' ? 'not configured' : s.frontendRebuild }}</li>
            <li [class]="s.notifications === 'configured' ? 'text-ink' : 'text-red-600'">Email report: {{ s.notifications === 'configured' ? 'on' : 'not configured' }}</li>
            <li class="text-muted">AI drafting: {{ s.ai === 'off' ? 'off' : 'on' }}</li>
          </ul>
        </div>
      </section>

      <!-- Tabs -->
      <nav class="mt-10 flex gap-6 overflow-x-auto border-b border-hairline" role="tablist">
        @for (t of tabs; track t.key) {
          <button type="button" role="tab" (click)="tab.set(t.key)" [attr.aria-selected]="tab() === t.key" [attr.data-test]="'tab-' + t.key"
            class="-mb-px shrink-0 border-b-2 pb-3 font-mono text-xs uppercase tracking-[0.12em] transition-colors"
            [class]="tab() === t.key ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'">
            {{ t.label }}@if (t.key !== 'history') { · {{ countIn(t.key) }} }
          </button>
        }
      </nav>

      @if (tab() !== 'history') {
        @if (visible().length === 0) {
          <p class="mt-8 text-muted" data-test="empty">{{ emptyText() }}</p>
        } @else {
          <ul class="mt-4 divide-y divide-hairline border-y border-hairline" data-test="items">
            @for (i of visible(); track i.id) {
              <li>
                <a [routerLink]="['/admin/project-sync', i.id]" class="flex items-center gap-4 py-4 transition-colors hover:bg-surface/60">
                  @if (i.cover) {
                    <app-sync-image [itemId]="i.id" [md5]="i.cover" [alt]="i.title" class="h-16 w-24 shrink-0" />
                  } @else {
                    <span class="h-16 w-24 shrink-0 bg-surface"></span>
                  }
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-display text-lg text-ink">{{ i.title }}</span>
                    @if (i.titleAr) { <span class="block truncate text-sm text-muted" dir="rtl">{{ i.titleAr }}</span> }
                    <span class="mt-1 block truncate font-mono text-[11px] text-muted">{{ i.folderName }} · {{ i.imageCount }} images</span>
                  </span>
                  <span class="hidden shrink-0 flex-col items-end gap-1 text-end sm:flex">
                    <span class="font-mono text-xs uppercase tracking-[0.1em]" [class]="stateTone(i.state)">{{ stateLabel(i) }}</span>
                    @if (i.mode === 'owned' && i.projectId && i.missing.length) { <span class="text-xs text-muted">{{ i.missing.length }} detail(s) missing</span> }
                    @if (i.issues.length && i.state !== 'linked') { <span class="max-w-xs truncate text-xs text-muted">{{ i.issues[0] }}</span> }
                    @if (i.aiText) { <span class="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">AI-written text</span> }
                  </span>
                  @if (i.mode !== 'linked') { <span class="font-mono text-xs text-muted">→</span> }
                </a>
              </li>
            }
          </ul>
        }

        @if (tab() === 'errors' && failedRuns().length) {
          <h2 class="mt-10 font-mono text-xs uppercase tracking-[0.15em] text-red-600">Runs that failed</h2>
          <ul class="mt-3 divide-y divide-hairline border-y border-hairline">
            @for (r of failedRuns(); track r.id) {
              <li class="flex flex-wrap gap-3 py-3 text-sm">
                <span class="text-ink">{{ r.createdAt | date: 'd MMM, HH:mm' : '+0300' }}</span>
                <span class="text-muted">{{ trigger(r) }}</span>
                <span class="text-red-600">{{ r.error }}</span>
                <button type="button" (click)="tab.set('history'); openRun(r)" class="ms-auto font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">Report</button>
              </li>
            }
          </ul>
        }
      }

      @if (tab() === 'history') {
        @if (runs().length === 0) {
          <p class="mt-8 text-muted">No runs yet.</p>
        } @else {
          <ul class="mt-4 divide-y divide-hairline border-y border-hairline" data-test="runs">
            @for (r of runs(); track r.id) {
              <li class="py-4">
                <button type="button" (click)="openRun(r)" class="flex w-full flex-wrap items-center gap-3 text-start">
                  <span class="font-mono text-xs uppercase tracking-[0.1em]" [class]="tone(r.status)">{{ runLabel(r.status) }}</span>
                  <span class="text-ink">{{ r.createdAt | date: 'EEE d MMM, HH:mm' : '+0300' }}</span>
                  <span class="text-sm text-muted">{{ trigger(r) }}</span>
                  <span class="ms-auto font-mono text-xs text-muted">{{ selected()?.id === r.id ? 'Hide' : 'Report' }}</span>
                </button>
                @if (r.error) { <p class="mt-1 text-sm text-red-600">{{ r.error }}</p> }

                @if (selected()?.id === r.id) {
                  @if (selected()!.report; as rep) {
                    <div class="mt-4 grid grid-cols-2 gap-px border border-hairline bg-hairline sm:grid-cols-4">
                      @for (k of summary; track k[0]) {
                        <div class="bg-bg p-3">
                          <p class="font-display text-xl text-ink">{{ rep.summary[k[0]] ?? 0 }}</p>
                          <p class="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{{ k[1] }}</p>
                        </div>
                      }
                    </div>
                    @if (rep.ownerActions.length) {
                      <h3 class="mt-5 font-mono text-xs uppercase tracking-[0.15em] text-accent">Required actions</h3>
                      <ul class="mt-2 list-disc space-y-1 ps-5 text-sm text-ink">
                        @for (a of rep.ownerActions; track $index) { <li>{{ a }}</li> }
                      </ul>
                    }
                    @if (rep.failed.length || rep.issues.length) {
                      <h3 class="mt-5 font-mono text-xs uppercase tracking-[0.15em] text-red-600">Errors</h3>
                      <ul class="mt-2 space-y-1 text-sm">
                        @for (f of rep.failed; track f.folder) { <li><span class="text-ink">{{ f.folder }}</span> — <span class="text-muted">{{ f.error }}</span></li> }
                        @for (x of rep.issues; track $index) { <li class="text-muted">{{ x }}</li> }
                      </ul>
                    }
                    <details class="mt-5">
                      <summary class="cursor-pointer font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink">Full report (as emailed)</summary>
                      <pre class="mt-3 overflow-x-auto whitespace-pre-wrap border border-hairline bg-surface p-4 font-mono text-xs leading-relaxed text-ink">{{ selected()!.reportText }}</pre>
                    </details>
                  } @else {
                    <p class="mt-3 text-sm text-muted">{{ r.status === 'running' ? 'Still running…' : 'No report for this run.' }}</p>
                  }
                }
              </li>
            }
          </ul>
        }
      }
    }
  `,
})
export class AdminProjectSync implements OnInit, OnDestroy {
  private readonly admin = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);
  private poll?: ReturnType<typeof setInterval>;

  protected readonly tabs = TABS;
  protected readonly summary = SUMMARY;
  protected readonly stateTone = stateTone;
  protected readonly tone = runTone;
  protected readonly trigger = triggerLabel;

  protected readonly loading = signal(true);
  protected readonly status = signal<SyncStatus | null>(null);
  protected readonly items = signal<SyncItem[]>([]);
  protected readonly runs = signal<SyncRun[]>([]);
  protected readonly selected = signal<SyncRunDetail | null>(null);
  protected readonly tab = signal<Tab>('published');
  protected readonly notice = signal('');

  protected readonly busy = computed(() => !!this.status()?.running || this.runs().some((r) => r.status === 'running'));
  protected readonly visible = computed(() => {
    const t = this.tab();
    return t === 'history' ? [] : this.items().filter(IN_TAB[t]);
  });
  protected readonly failedRuns = computed(() => this.runs().filter((r) => r.status === 'failed').slice(0, 10));
  protected readonly tiles = computed(() => {
    const list = this.items();
    const n = (t: Exclude<Tab, 'history'>) => list.filter(IN_TAB[t]).length;
    return [
      { label: 'Published by the sync', count: n('published'), tab: 'published' as Tab, tone: 'text-accent' },
      { label: 'With missing details', count: n('missing'), tab: 'missing' as Tab, tone: 'text-ink' },
      { label: 'Not publishable yet', count: n('unpublished'), tab: 'unpublished' as Tab, tone: n('unpublished') ? 'text-red-600' : 'text-ink' },
      { label: 'Existing projects in step', count: n('existing'), tab: 'existing' as Tab, tone: 'text-ink' },
      { label: 'Errors', count: n('errors'), tab: 'errors' as Tab, tone: n('errors') ? 'text-red-600' : 'text-ink' },
    ];
  });

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('tab') as Tab | null;
    if (t && TABS.some((x) => x.key === t)) this.tab.set(t);
    this.load();
  }

  ngOnDestroy(): void {
    clearInterval(this.poll);
  }

  private load(): void {
    let pending = 3;
    const done = () => {
      if (--pending === 0) {
        this.loading.set(false);
        if (this.busy()) this.watch();
      }
    };
    this.admin.getRaw<SyncStatus>('project-sync/status').subscribe({ next: (s) => this.status.set(s), complete: done, error: done });
    this.admin.getRaw<SyncItem[]>('project-sync/items').subscribe({ next: (i) => this.items.set(i), complete: done, error: done });
    this.admin.getRaw<SyncRun[]>('project-sync/runs', { limit: 30 }).subscribe({ next: (r) => this.runs.set(r), complete: done, error: done });
  }

  /** Polls while a run is in progress; runs take from seconds to several minutes. */
  private watch(): void {
    if (this.poll) return;
    this.poll = setInterval(() => {
      this.admin.getRaw<SyncRun[]>('project-sync/runs', { limit: 30 }).subscribe((runs) => {
        this.runs.set(runs);
        if (!runs.some((r) => r.status === 'running')) this.finished();
      });
    }, 4000);
  }

  private finished(): void {
    clearInterval(this.poll);
    this.poll = undefined;
    this.notice.set('The run has finished. Its report is under History.');
    this.admin.getRaw<SyncStatus>('project-sync/status').subscribe((s) => this.status.set(s));
    this.admin.getRaw<SyncItem[]>('project-sync/items').subscribe((i) => this.items.set(i));
  }

  protected start(dryRun: boolean): void {
    if (!dryRun && !confirm('Run the sync now? New and changed folders are published to the website.')) return;
    this.admin.create('project-sync/run', { dryRun }).subscribe(() => {
      this.notice.set(dryRun ? 'Rehearsal started — nothing will be written.' : 'Sync started.');
      this.status.update((s) => (s ? { ...s, running: true } : s));
      this.watch();
    });
  }

  protected toggle(): void {
    const s = this.status();
    if (!s) return;
    this.admin.update('project-sync', 'control', { enabled: !s.enabled }).subscribe(() => {
      this.status.set({ ...s, enabled: !s.enabled });
      this.notice.set(s.enabled ? 'Automation paused. Manual runs still work.' : 'Automation resumed.');
    });
  }

  protected openRun(r: SyncRun): void {
    if (this.selected()?.id === r.id) {
      this.selected.set(null);
      return;
    }
    this.admin.get<SyncRunDetail>('project-sync/runs', r.id).subscribe((d) => this.selected.set(d));
  }

  protected countIn(t: Tab): number {
    return t === 'history' ? 0 : this.items().filter(IN_TAB[t]).length;
  }

  protected stateLabel(i: SyncItem): string {
    return STATE_LABEL[i.state as ItemState] ?? i.state;
  }

  protected times(t: string): string {
    return t.split(',').map((x) => x.trim()).join(' · ');
  }

  protected runLabel(status: string): string {
    return RUN_LABEL[status] ?? status;
  }

  protected emptyText(): string {
    return {
      published: 'The sync has not published any project yet. New folders in Drive are published at the next run.',
      missing: 'Every published project has its location, sector, Arabic title and description.',
      unpublished: 'Every folder could be published.',
      errors: 'No errors.',
      hold: 'Nothing on hold.',
      existing: 'No folders matched projects already on the site.',
      history: '',
    }[this.tab()];
  }
}
