import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminApi } from '../../../core/services/admin-api.service';
import { DESIGN_CATEGORIES, DISCIPLINES, SECTORS, Term } from '../../../core/data/taxonomy';
import { SyncImage } from './sync-image';
import { ContentKey, Fact, FactKey, SOURCE_LABEL, STATE_LABEL, SyncItemDetail, isVerified, stateTone } from './project-sync.models';

/** The editable copy of a draft. Descriptions are edited as text, one blank line between paragraphs. */
interface Form {
  titleEn: string;
  titleAr: string;
  locationEn: string;
  locationAr: string;
  year: string;
  statusEn: string;
  statusAr: string;
  sectors: string[];
  designCategories: string[];
  disciplines: string[];
  summaryEn: string;
  summaryAr: string;
  descriptionEn: string;
  descriptionAr: string;
  included: Record<string, boolean>;
  cover: string;
}

const TEXT_FACTS: { key: FactKey; label: string; ar?: boolean }[] = [
  { key: 'titleEn', label: 'Title (EN)' },
  { key: 'titleAr', label: 'Title (AR)', ar: true },
  { key: 'locationEn', label: 'Location (EN)' },
  { key: 'locationAr', label: 'Location (AR)', ar: true },
  { key: 'year', label: 'Year' },
  { key: 'statusEn', label: 'Status (EN)' },
  { key: 'statusAr', label: 'Status (AR)', ar: true },
];

const toParagraphs = (s: string) => s.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);

/** Review one drafted project: preview, gallery, bilingual editor and the decision. */
@Component({
  selector: 'app-admin-project-sync-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, RouterLink, SyncImage],
  template: `
    <a routerLink="/admin/project-sync" class="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink">← Project sync</a>

    @if (loading()) {
      <p class="mt-10 text-muted">Loading…</p>
    } @else if (item(); as it) {
      <header class="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.18em]" [class]="tone(it)">{{ stateLabel(it) }}</p>
          <h1 class="mt-3 font-display text-3xl font-medium tracking-[-0.02em] text-ink" data-test="title">{{ form().titleEn || it.folderName }}</h1>
          <p class="mt-1 font-mono text-xs text-muted">
            Drive folder {{ it.folderName }}
            @if (it.decidedBy) { · {{ it.decidedBy }}, {{ it.decidedAt | date: 'd MMM y, HH:mm' : '+0300' }} }
          </p>
        </div>
        <div class="flex flex-wrap gap-4">
          @if (it.urlEn) { <a [href]="it.urlEn" target="_blank" rel="noopener" class="font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">Live page ↗</a> }
          @if (it.urlAr) { <a [href]="it.urlAr" target="_blank" rel="noopener" class="font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">الصفحة ↗</a> }
        </div>
      </header>

      @if (notice()) { <p class="mt-6 border-s-2 border-accent ps-3 text-sm text-ink" data-test="notice">{{ notice() }}</p> }
      @if (error()) { <p class="mt-6 border-s-2 border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-600" data-test="error">{{ error() }}</p> }

      @if (it.draft; as d) {
        <!-- What blocks, what needs confirming -->
        @if (it.readiness; as r) {
          <section class="mt-8 grid gap-px border border-hairline bg-hairline md:grid-cols-3" data-test="readiness">
            <div class="bg-bg p-5">
              <p class="font-mono text-xs uppercase tracking-[0.15em]" [class]="r.blocking.length ? 'text-red-600' : 'text-accent'">
                {{ r.blocking.length ? 'To complete before approval' : 'Complete' }}
              </p>
              <ul class="mt-2 list-disc space-y-1 ps-5 text-sm text-ink">
                @for (b of r.blocking; track $index) { <li>{{ b }}</li> }
                @if (!r.blocking.length) { <li class="list-none -ms-5 text-muted">Everything required is filled in.</li> }
              </ul>
            </div>
            <div class="bg-bg p-5">
              <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink">Suggested facts to confirm</p>
              <ul class="mt-2 list-disc space-y-1 ps-5 text-sm text-ink">
                @for (u of r.unconfirmed; track $index) { <li>{{ u }}</li> }
                @if (!r.unconfirmed.length) { <li class="list-none -ms-5 text-muted">All key facts are verified.</li> }
              </ul>
            </div>
            <div class="bg-bg p-5">
              <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Notes</p>
              <ul class="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
                @for (w of r.warnings; track $index) { <li>{{ w }}</li> }
                @for (n of d.notes; track $index) { <li>{{ n }}</li> }
                @for (n of it.issues; track $index) { <li>{{ n }}</li> }
                @if (!r.warnings.length && !d.notes.length && !it.issues.length) { <li class="list-none -ms-5">None.</li> }
              </ul>
            </div>
          </section>
        }

        <div class="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <!-- Preview -->
          <section>
            <div class="flex items-center justify-between">
              <h2 class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Preview</h2>
              <div class="flex gap-1" role="group" aria-label="Preview language">
                @for (l of langs; track l) {
                  <button type="button" (click)="lang.set(l)" [attr.data-test]="'lang-' + l"
                    class="border px-3 py-1 font-mono text-xs uppercase"
                    [class]="lang() === l ? 'border-ink text-ink' : 'border-hairline text-muted hover:text-ink'">{{ l === 'en' ? 'English' : 'العربية' }}</button>
                }
              </div>
            </div>
            <article class="mt-4 border border-hairline bg-bg" [attr.dir]="lang() === 'ar' ? 'rtl' : 'ltr'" data-test="preview">
              @if (form().cover) { <app-sync-image [itemId]="it.id" [md5]="form().cover" class="aspect-[16/10] w-full" /> }
              <div class="p-6">
                <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{{ termNames(sectors, form().sectors) }}</p>
                <h3 class="mt-2 font-display text-2xl text-ink">{{ lang() === 'en' ? form().titleEn : form().titleAr }}</h3>
                <p class="mt-1 text-sm text-muted">
                  {{ lang() === 'en' ? form().locationEn : form().locationAr }}@if (form().year) { · {{ form().year }} }
                </p>
                <p class="mt-4 text-ink">{{ lang() === 'en' ? form().summaryEn : form().summaryAr }}</p>
                @for (p of paragraphs(); track $index) { <p class="mt-3 text-sm leading-relaxed text-muted">{{ p }}</p> }
                <dl class="mt-5 grid grid-cols-2 gap-3 border-t border-hairline pt-4 text-sm">
                  <div><dt class="font-mono text-[11px] uppercase text-muted">{{ lang() === 'en' ? 'Design' : 'التصميم' }}</dt><dd class="text-ink">{{ termNames(categories, form().designCategories) || '—' }}</dd></div>
                  <div><dt class="font-mono text-[11px] uppercase text-muted">{{ lang() === 'en' ? 'Our role' : 'دورنا' }}</dt><dd class="text-ink">{{ termNames(disciplines, form().disciplines) || '—' }}</dd></div>
                  @if (form().statusEn) { <div><dt class="font-mono text-[11px] uppercase text-muted">{{ lang() === 'en' ? 'Status' : 'الحالة' }}</dt><dd class="text-ink">{{ lang() === 'en' ? form().statusEn : form().statusAr }}</dd></div> }
                </dl>
              </div>
            </article>
            @if (d.visualNotes.length) {
              <div class="mt-4 border-s-2 border-hairline ps-3">
                <p class="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">What the AI saw in the images (not published)</p>
                <ul class="mt-1 list-disc ps-5 text-sm text-muted">@for (n of d.visualNotes; track $index) { <li>{{ n }}</li> }</ul>
              </div>
            }
          </section>

          <!-- Editor -->
          <section data-test="editor">
            <h2 class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Facts</h2>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              @for (f of textFacts; track f.key) {
                <label class="block">
                  <span class="flex items-center justify-between gap-2">
                    <span class="lbl">{{ f.label }}</span>
                    <span [class]="badge(fact(f.key))" [title]="fact(f.key).basis ?? ''">{{ sourceLabel(fact(f.key)) }}</span>
                  </span>
                  <input class="inp" [attr.dir]="f.ar ? 'rtl' : null" [ngModel]="text(f.key)" (ngModelChange)="set(f.key, $event)" [attr.data-test]="'f-' + f.key" />
                </label>
              }
            </div>

            @for (axis of axes; track axis.key) {
              <div class="mt-5 border-t border-hairline pt-4">
                <span class="flex items-center justify-between gap-2">
                  <span class="lbl">{{ axis.label }}</span>
                  <span [class]="badge(fact(axis.key))" [title]="fact(axis.key).basis ?? ''">{{ sourceLabel(fact(axis.key)) }}</span>
                </span>
                <div class="mt-3 flex flex-wrap gap-2">
                  @for (term of axis.terms; track term.key) {
                    <label [class]="chip(list(axis.key).includes(term.key))">
                      <input type="checkbox" class="me-2 align-middle" [checked]="list(axis.key).includes(term.key)" (change)="toggle(axis.key, term.key)" />
                      {{ term.en }} · {{ term.ar }}
                    </label>
                  }
                </div>
              </div>
            }

            <h2 class="mt-8 font-mono text-xs uppercase tracking-[0.15em] text-muted">Text {{ d.ai ? '— written by AI, edit freely' : '' }}</h2>
            @for (c of contentFields; track c.key) {
              <label class="mt-4 block">
                <span class="flex items-center justify-between gap-2">
                  <span class="lbl">{{ c.label }} @if (c.key.startsWith('summary')) { · {{ text(c.key).length }} chars }</span>
                  <span [class]="badge(content(c.key))">{{ content(c.key).source === 'ai' ? 'AI draft' : sourceLabel(content(c.key)) }}</span>
                </span>
                <textarea class="inp" [rows]="c.rows" [attr.dir]="c.ar ? 'rtl' : null" [ngModel]="text(c.key)" (ngModelChange)="set(c.key, $event)" [attr.data-test]="'c-' + c.key"></textarea>
              </label>
            }
          </section>
        </div>

        <!-- Gallery -->
        <section class="mt-10">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Gallery · {{ includedCount() }} selected of {{ d.images.length }} (at least {{ it.minImages }})</h2>
            <span class="text-xs text-muted">Images are published as they are: only resized, never cropped or retouched.</span>
          </div>
          <ul class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-test="gallery">
            @for (img of d.images; track img.md5) {
              <li class="border" [class]="form().cover === img.md5 ? 'border-accent' : 'border-hairline'" [class.opacity-50]="!form().included[img.md5]">
                @if (img.problem) {
                  <div class="flex aspect-[4/3] items-center justify-center bg-surface p-3 text-center text-xs text-red-600">{{ img.problem }}</div>
                } @else {
                  <app-sync-image [itemId]="it.id" [md5]="img.md5" [alt]="img.path" class="aspect-[4/3] w-full" />
                }
                <div class="space-y-1 p-2">
                  <p class="truncate font-mono text-[10px] text-muted" [title]="img.path">{{ img.path }}</p>
                  @if (!img.problem) {
                    <div class="flex items-center justify-between gap-2">
                      <label class="font-mono text-[10px] uppercase text-ink">
                        <input type="checkbox" class="me-1 align-middle" [checked]="form().included[img.md5]" (change)="include(img.md5)" /> Use
                      </label>
                      @if (form().cover === img.md5) {
                        <span class="font-mono text-[10px] uppercase text-accent">Cover</span>
                      } @else {
                        <button type="button" (click)="setCover(img.md5)" class="font-mono text-[10px] uppercase text-muted hover:text-ink">Make cover</button>
                      }
                    </div>
                    <p class="font-mono text-[10px] text-muted">{{ img.width }}×{{ img.height }}</p>
                  }
                </div>
              </li>
            }
          </ul>
        </section>

        <!-- Decision -->
        <section class="sticky bottom-0 z-10 -mx-5 mt-10 border-t border-hairline bg-bg/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8" data-test="decision">
          @if (dirty()) {
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-sm text-ink">Unsaved changes.</span>
              <button type="button" (click)="save()" [disabled]="saving()" data-test="save"
                class="bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-bg hover:bg-accent disabled:opacity-40">{{ saving() ? 'Saving…' : 'Save changes' }}</button>
              <button type="button" (click)="reset()" class="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink">Discard</button>
            </div>
          } @else {
            @if (canApprove()) {
              @if (it.readiness?.unconfirmed?.length) {
                <label class="mb-3 flex items-start gap-2 text-sm text-ink">
                  <input type="checkbox" class="mt-1" [checked]="confirm()" (change)="confirm.set(!confirm())" data-test="confirm" />
                  <span>I confirm the facts above are correct ({{ it.readiness!.unconfirmed.join(', ') }}) and that these images are cleared for the public website.</span>
                </label>
              }
            }
            <div class="flex flex-wrap items-center gap-3">
              @if (canApprove()) {
                <button type="button" (click)="decide('approve', true)" [disabled]="!approvable() || acting()" data-test="approve-now"
                  class="bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-bg hover:bg-accent disabled:opacity-40">Approve &amp; publish now</button>
                <button type="button" (click)="decide('approve', false)" [disabled]="!approvable() || acting()" data-test="approve"
                  class="border border-ink/30 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:bg-ink hover:text-bg disabled:opacity-40">Approve for next run</button>
              }
              @if (it.state === 'pending_review' || it.state === 'approved') {
                <button type="button" (click)="decide('postpone')" [disabled]="acting()" data-test="postpone" class="font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">{{ it.projectId ? 'Not now' : 'Postpone' }}</button>
                <button type="button" (click)="decide('reject')" [disabled]="acting()" data-test="reject" class="font-mono text-xs uppercase tracking-[0.12em] text-red-600 hover:underline">{{ it.projectId ? 'Discard update' : 'Reject' }}</button>
              }
              @if (it.state === 'postponed' || it.state === 'rejected') {
                <button type="button" (click)="decide('reopen')" [disabled]="acting()" data-test="reopen" class="font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">Reopen</button>
              }
              @if (it.state === 'failed' || it.state === 'draft') {
                <button type="button" (click)="retry()" [disabled]="acting()" data-test="retry" class="font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">Retry now</button>
              }
              @if (aiOn() && it.state !== 'published' && it.state !== 'awaiting_verification') {
                <button type="button" (click)="redraft()" [disabled]="acting()" data-test="redraft" class="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink">Redraft text with AI</button>
              }
              @if (it.canUndo) {
                <button type="button" (click)="undo()" [disabled]="acting()" data-test="undo" class="ms-auto font-mono text-xs uppercase tracking-[0.12em] text-red-600 hover:underline">Undo last update</button>
              }
            </div>
            @if (canApprove() && !approvable()) {
              <p class="mt-2 text-xs text-muted">
                {{ it.readiness?.blocking?.length ? 'Complete the items listed at the top first.' : 'Tick the confirmation to approve.' }}
              </p>
            }
          }
        </section>
      } @else {
        <p class="mt-8 text-muted">This folder has no draft yet. It is prepared on the next run.</p>
      }
    }
  `,
  styles: [`
    .lbl { font-family: var(--font-mono, monospace); font-size: .7rem; text-transform: uppercase; letter-spacing: .1em; color: var(--color-muted, #888); }
    .inp { margin-top: .4rem; width: 100%; border: 1px solid var(--color-hairline, #ddd); background: var(--color-bg, #fff); padding: .55rem .7rem; color: var(--color-ink, #111); outline: none; }
    .inp:focus { border-color: var(--color-accent, #c2703d); }
  `],
})
export class AdminProjectSyncItem implements OnInit {
  private readonly admin = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly langs = ['en', 'ar'] as const;
  protected readonly textFacts = TEXT_FACTS;
  protected readonly sectors = SECTORS;
  protected readonly categories = DESIGN_CATEGORIES;
  protected readonly disciplines = DISCIPLINES;
  protected readonly axes: { key: 'sectors' | 'designCategories' | 'disciplines'; label: string; terms: readonly Term[] }[] = [
    { key: 'designCategories', label: 'Design categories', terms: DESIGN_CATEGORIES },
    { key: 'sectors', label: 'Sectors (the first is the card label)', terms: SECTORS },
    { key: 'disciplines', label: "Scope — MSP's role", terms: DISCIPLINES },
  ];
  protected readonly contentFields: { key: ContentKey; label: string; rows: number; ar?: boolean }[] = [
    { key: 'summaryEn', label: 'Summary (EN) — meta description', rows: 3 },
    { key: 'summaryAr', label: 'Summary (AR)', rows: 3, ar: true },
    { key: 'descriptionEn', label: 'Description (EN) — blank line between paragraphs', rows: 7 },
    { key: 'descriptionAr', label: 'Description (AR)', rows: 7, ar: true },
  ];

  protected readonly loading = signal(true);
  protected readonly item = signal<SyncItemDetail | null>(null);
  protected readonly form = signal<Form>(emptyForm());
  private readonly saved = signal<Form>(emptyForm());
  protected readonly lang = signal<'en' | 'ar'>('en');
  protected readonly confirm = signal(false);
  protected readonly saving = signal(false);
  protected readonly acting = signal(false);
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly aiOn = signal(false);

  protected readonly dirty = computed(() => JSON.stringify(this.form()) !== JSON.stringify(this.saved()));
  protected readonly includedCount = computed(() => Object.values(this.form().included).filter(Boolean).length);
  protected readonly paragraphs = computed(() => toParagraphs(this.lang() === 'en' ? this.form().descriptionEn : this.form().descriptionAr));
  protected readonly canApprove = computed(() => {
    const s = this.item()?.state;
    return s === 'pending_review' || s === 'postponed' || s === 'rejected' || s === 'failed';
  });
  protected readonly approvable = computed(() => {
    const r = this.item()?.readiness;
    return !!r && !r.blocking.length && (!r.unconfirmed.length || this.confirm());
  });

  ngOnInit(): void {
    this.admin.getRaw<{ ai: string }>('project-sync/status').subscribe({ next: (s) => this.aiOn.set(s.ai !== 'off'), error: () => undefined });
    this.load();
  }

  private id(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  private load(): void {
    this.admin.getRaw<SyncItemDetail>(`project-sync/items/${this.id()}`).subscribe({
      next: (it) => this.show(it),
      error: () => {
        this.loading.set(false);
        this.error.set('This folder could not be loaded.');
      },
    });
  }

  private show(it: SyncItemDetail): void {
    this.item.set(it);
    const f = it.draft ? formOf(it) : emptyForm();
    this.form.set(f);
    this.saved.set(structuredClone(f));
    this.confirm.set(false);
    this.loading.set(false);
  }

  protected fact(key: FactKey): Fact<string | string[]> {
    return this.item()!.draft!.facts[key];
  }

  protected content(key: ContentKey): Fact<string | string[]> {
    return this.item()!.draft!.content[key];
  }

  protected text(key: keyof Form): string {
    return this.form()[key] as string;
  }

  protected list(key: 'sectors' | 'designCategories' | 'disciplines'): string[] {
    return this.form()[key];
  }

  protected set(key: keyof Form, value: string): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected toggle(key: 'sectors' | 'designCategories' | 'disciplines', term: string): void {
    this.form.update((f) => ({ ...f, [key]: f[key].includes(term) ? f[key].filter((k) => k !== term) : [...f[key], term] }));
  }

  protected include(md5: string): void {
    this.form.update((f) => {
      const included = { ...f.included, [md5]: !f.included[md5] };
      const cover = f.cover === md5 && !included[md5] ? (Object.keys(included).find((k) => included[k]) ?? '') : f.cover;
      return { ...f, included, cover };
    });
  }

  protected setCover(md5: string): void {
    this.form.update((f) => ({ ...f, cover: md5, included: { ...f.included, [md5]: true } }));
  }

  protected reset(): void {
    this.form.set(structuredClone(this.saved()));
  }

  /** Sends only what changed, so untouched suggestions stay marked as suggestions. */
  protected save(): void {
    const f = this.form();
    const s = this.saved();
    const facts: Record<string, string | string[]> = {};
    const content: Record<string, string | string[]> = {};
    for (const k of ['titleEn', 'titleAr', 'locationEn', 'locationAr', 'year', 'statusEn', 'statusAr', 'sectors', 'designCategories', 'disciplines'] as const) {
      if (JSON.stringify(f[k]) !== JSON.stringify(s[k])) facts[k] = f[k];
    }
    for (const k of ['summaryEn', 'summaryAr'] as const) if (f[k] !== s[k]) content[k] = f[k];
    for (const k of ['descriptionEn', 'descriptionAr'] as const) if (f[k] !== s[k]) content[k] = toParagraphs(f[k]);
    const images: Record<string, boolean> = {};
    for (const [md5, on] of Object.entries(f.included)) if (on !== s.included[md5]) images[md5] = on;

    this.saving.set(true);
    this.error.set('');
    this.admin.update<SyncItemDetail>('project-sync/items', `${this.id()}/draft`, { facts, content, images, ...(f.cover !== s.cover ? { cover: f.cover } : {}) }).subscribe({
      next: (it) => {
        this.saving.set(false);
        this.show(it);
        this.notice.set('Saved.');
      },
      error: (e: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(message(e));
      },
    });
  }

  protected decide(decision: 'approve' | 'postpone' | 'reject' | 'reopen', publishNow = false): void {
    if (decision === 'reject' && !confirm(this.item()?.projectId ? 'Discard this update? The live page stays as it is.' : 'Reject this project? It will not be published unless reopened.')) return;
    this.act(this.admin.create<SyncItemDetail>(`project-sync/items/${this.id()}/decision`, { decision, publishNow, confirmFacts: this.confirm() }), (it) => {
      this.show(it);
      this.notice.set(
        decision === 'approve'
          ? publishNow
            ? 'Approved. Publishing has started; the page is checked live once the website has rebuilt (about 10–20 minutes).'
            : 'Approved. It is published at the next scheduled run.'
          : decision === 'postpone'
            ? 'Postponed.'
            : decision === 'reject'
              ? it.projectId
                ? 'Update discarded.'
                : 'Rejected.'
              : 'Reopened for review.',
      );
    });
  }

  protected retry(): void {
    this.act(this.admin.create(`project-sync/items/${this.id()}/retry`, {}), () => {
      this.notice.set('Retried. See the result below and in History.');
      this.load();
    });
  }

  protected redraft(): void {
    this.act(this.admin.create<SyncItemDetail>(`project-sync/items/${this.id()}/redraft`, {}), (it) => {
      this.show(it);
      this.notice.set('The text was redrafted. Your own edits were kept.');
    });
  }

  protected undo(): void {
    if (!confirm('Put the live project back to how it was before the last sync update?')) return;
    this.act(this.admin.create(`project-sync/items/${this.id()}/revert`, {}), () => {
      this.notice.set('Undone. The website shows the earlier version after its next rebuild.');
      this.load();
    });
  }

  private act<T>(call: import('rxjs').Observable<T>, done: (r: T) => void): void {
    this.acting.set(true);
    this.error.set('');
    call.subscribe({
      next: (r) => {
        this.acting.set(false);
        done(r);
      },
      error: (e: HttpErrorResponse) => {
        this.acting.set(false);
        this.error.set(message(e));
      },
    });
  }

  protected sourceLabel(f: Fact<unknown>): string {
    return SOURCE_LABEL[f.source];
  }

  protected badge(f: Fact<string | string[]>): string {
    const empty = Array.isArray(f.value) ? !f.value.length : !f.value;
    const base = 'shrink-0 font-mono text-[10px] uppercase tracking-[0.08em]';
    if (empty) return `${base} text-muted`;
    return `${base} ${isVerified(f.source) ? 'text-accent' : 'text-amber-700 dark:text-amber-400'}`;
  }

  protected chip(selected: boolean): string {
    const base = 'cursor-pointer border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors';
    return selected ? `${base} border-accent text-accent` : `${base} border-hairline text-muted`;
  }

  protected termNames(terms: readonly Term[], keys: string[]): string {
    const ar = this.lang() === 'ar';
    return keys.map((k) => terms.find((t) => t.key === k)).filter((t): t is Term => !!t).map((t) => (ar ? t.ar : t.en)).join(ar ? '، ' : ', ');
  }

  protected stateLabel(it: SyncItemDetail): string {
    return it.state === 'pending_review' && it.projectId ? 'Update pending approval' : STATE_LABEL[it.state];
  }

  protected tone(it: SyncItemDetail): string {
    return stateTone(it.state);
  }
}

function emptyForm(): Form {
  return {
    titleEn: '', titleAr: '', locationEn: '', locationAr: '', year: '', statusEn: '', statusAr: '',
    sectors: [], designCategories: [], disciplines: [],
    summaryEn: '', summaryAr: '', descriptionEn: '', descriptionAr: '',
    included: {}, cover: '',
  };
}

function formOf(it: SyncItemDetail): Form {
  const d = it.draft!;
  const f = d.facts;
  const c = d.content;
  const usable = d.images.filter((i) => !i.problem);
  return {
    titleEn: f.titleEn.value, titleAr: f.titleAr.value, locationEn: f.locationEn.value, locationAr: f.locationAr.value,
    year: f.year.value, statusEn: f.statusEn.value, statusAr: f.statusAr.value,
    sectors: [...f.sectors.value], designCategories: [...f.designCategories.value], disciplines: [...f.disciplines.value],
    summaryEn: c.summaryEn.value, summaryAr: c.summaryAr.value,
    descriptionEn: c.descriptionEn.value.join('\n\n'), descriptionAr: c.descriptionAr.value.join('\n\n'),
    included: Object.fromEntries(usable.map((i) => [i.md5, i.included])),
    cover: d.cover || usable.find((i) => i.included)?.md5 || '',
  };
}

function message(e: HttpErrorResponse): string {
  const m = (e.error as { message?: string | string[] } | null)?.message;
  return Array.isArray(m) ? m.join('; ') : m || 'Something went wrong. Please try again.';
}
