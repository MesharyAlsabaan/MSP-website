import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VendorsService } from '../../../core/services/vendors.service';
import { ARCHIVE_LABEL, QUAL_LABEL, VendorRow } from './vendors-admin';
import { countryName } from '../../../core/data/countries';

interface Doc { id: string; docTypeKey: string; originalFilename: string; expiresAt: string | null; sizeBytes: number; mime: string; sha256: string; }
interface Revision {
  id: string; revisionNo: number; submittedAt: string | null; decision: string | null; decidedAt: string | null; decidedByName: string; decisionNote: string;
  data: Record<string, string | string[] | undefined>; documents: Doc[];
}
interface Detail {
  application: { id: string; requestNumber: string | null; status: VendorRow['status']; currentRevisionNo: number; submitterEmail: string; createdAt: string };
  vendor: { vendorNumber: string; companyName: string; companyNameEn: string; primaryCategoryKey: string; secondaryCategoryKeys: string[]; approvedRevisionId: string | null };
  revisions: Revision[];
  events: { id: string; action: string; note: string; missingItems: string[]; actorName: string; createdAt: string }[];
  archiveJobs: { id: string; sequenceNo: number; status: NonNullable<VendorRow['archiveStatus']>; attempts: number; lastError: string; lastStep: string; archivePath: string; completedAt: string | null; leaseOwner: string | null }[];
}

const FIELDS: [string, string][] = [
  ['companyName', 'Company'], ['companyNameEn', 'Company (EN)'], ['specialty', 'Specialty'], ['contactName', 'Contact'], ['email', 'Email'],
  ['mobile', 'Mobile'], ['phone', 'Phone'], ['country', 'Country'], ['city', 'City'], ['address', 'Address'], ['commercialRegistrationNo', 'CR no.'], ['vatNo', 'VAT no.'],
  ['website', 'Website'], ['notes', 'Vendor notes'],
];

/** Admin: one application — data, documents, history, decisions, archive state. */
@Component({
  selector: 'app-admin-vendor-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, RouterLink],
  template: `
    <a routerLink="/admin/vendors" class="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-accent">← Vendors</a>

    @if (d(); as d) {
      <header class="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent" dir="ltr">{{ d.vendor.vendorNumber }} · {{ d.application.requestNumber }} · v{{ d.application.currentRevisionNo }}</p>
          <h1 class="mt-3 font-display text-3xl font-medium tracking-[-0.02em] text-ink">{{ d.vendor.companyName }}</h1>
          <p class="mt-1 text-sm text-muted">{{ d.vendor.primaryCategoryKey }}@if (d.vendor.secondaryCategoryKeys.length) { · {{ d.vendor.secondaryCategoryKeys.join(', ') }} }</p>
        </div>
        <div class="text-end">
          <p class="font-mono text-xs uppercase tracking-[0.12em]">{{ qual[d.application.status] }}</p>
          @if (d.archiveJobs[0]; as j) { <p class="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-muted">{{ arch[j.status] }} (v{{ j.sequenceNo }})</p> }
        </div>
      </header>

      @if (current(); as rev) {
        <section class="mt-10 grid gap-10 lg:grid-cols-12">
          <div class="lg:col-span-7">
            <h2 class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Current revision · v{{ rev.revisionNo }} · {{ rev.submittedAt ? ('submitted ' + (rev.submittedAt | date: 'medium')) : 'draft — the vendor is still editing' }}</h2>
            <dl class="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              @for (f of fields; track f[0]) {
                @if (rev.data[f[0]]) {
                  <div><dt class="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{{ f[1] }}</dt><dd class="text-ink">{{ f[0] === 'country' ? countryName($any(rev.data[f[0]]), 'en') : rev.data[f[0]] }}</dd></div>
                }
              }
            </dl>

            <h2 class="mt-10 font-mono text-xs uppercase tracking-[0.15em] text-muted">Documents</h2>
            <ul class="mt-3 divide-y divide-hairline border-y border-hairline">
              @for (doc of rev.documents; track doc.id) {
                <li class="flex flex-wrap items-center gap-3 py-3">
                  <span class="font-mono text-xs text-muted">{{ doc.docTypeKey }}</span>
                  <button (click)="download(doc)" class="text-ink hover:text-accent">{{ doc.originalFilename }}</button>
                  <span class="font-mono text-xs text-muted">{{ (doc.sizeBytes / 1024) | number: '1.0-0' }} KB</span>
                  @if (doc.expiresAt) { <span class="font-mono text-xs" [class.text-red-600]="expired(doc.expiresAt)" [class.text-muted]="!expired(doc.expiresAt)">exp {{ doc.expiresAt }}</span> }
                </li>
              }
            </ul>
          </div>

          <aside class="lg:col-span-5">
            <h2 class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Decision</h2>
            @if (d.application.status === 'under_review') {
              <div class="mt-4 space-y-4 border border-hairline p-5">
                <label class="block">
                  <span class="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Note to vendor (optional)</span>
                  <textarea [value]="note()" (input)="note.set($any($event.target).value)" rows="2" class="mt-1 w-full border-b border-hairline bg-transparent py-2 text-sm text-ink focus:border-accent focus:outline-none"></textarea>
                </label>
                <label class="block">
                  <span class="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Missing items (one per line — for "request completion")</span>
                  <textarea [value]="missing()" (input)="missing.set($any($event.target).value)" rows="3" class="mt-1 w-full border-b border-hairline bg-transparent py-2 text-sm text-ink focus:border-accent focus:outline-none"></textarea>
                </label>
                <div class="flex flex-wrap gap-4 pt-2">
                  <button (click)="act('approve')" [disabled]="busy()" class="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-bg hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                  <button (click)="act('request-completion')" [disabled]="busy() || !missing().trim()" class="border border-ink/30 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:bg-ink hover:text-bg disabled:opacity-50">Request completion</button>
                  <button (click)="act('reject')" [disabled]="busy() || !note().trim()" class="px-2 py-2 font-mono text-xs uppercase tracking-[0.12em] text-red-600 hover:underline disabled:opacity-50">Reject (needs a reason in the note)</button>
                </div>
              </div>
            } @else if (d.application.status === 'approved') {
              <div class="mt-4 space-y-4 border border-hairline p-5">
                <p class="text-sm text-muted">Approved. To collect renewed documents, open an update round — the vendor receives a one-time link; the current approved record stays valid until the new revision is approved.</p>
                <label class="block">
                  <span class="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">What to update (one per line)</span>
                  <textarea [value]="missing()" (input)="missing.set($any($event.target).value)" rows="3" class="mt-1 w-full border-b border-hairline bg-transparent py-2 text-sm text-ink focus:border-accent focus:outline-none"></textarea>
                </label>
                <button (click)="act('request-update')" [disabled]="busy() || !missing().trim()" class="border border-ink/30 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:bg-ink hover:text-bg disabled:opacity-50">Request update</button>
              </div>
            } @else {
              <p class="mt-4 text-sm text-muted">{{ d.application.status === 'needs_completion' ? 'Waiting for the vendor to update and resubmit from their dashboard.' : d.application.status === 'draft' ? 'The vendor has not submitted yet.' : 'This application was rejected.' }}</p>
            }
            @if (error(); as e) { <p class="mt-3 font-mono text-xs text-red-600">{{ e }}</p> }

            <h2 class="mt-10 font-mono text-xs uppercase tracking-[0.15em] text-muted">Archive</h2>
            @if (d.archiveJobs.length === 0) {
              <p class="mt-3 text-sm text-muted">No archive job yet (created on approval).</p>
            }
            <ul class="mt-3 space-y-3">
              @for (j of d.archiveJobs; track j.id) {
                <li class="border border-hairline p-4 text-sm">
                  <div class="flex flex-wrap items-center gap-3">
                    <span class="font-mono text-xs text-muted">v{{ j.sequenceNo }}</span>
                    <span class="font-mono text-[10px] uppercase tracking-[0.12em]" [class.text-emerald-700]="j.status === 'completed'" [class.text-red-600]="j.status === 'failed'">{{ arch[j.status] }}</span>
                    @if (j.lastStep) { <span class="font-mono text-xs text-muted">step: {{ j.lastStep }}</span> }
                    @if (j.attempts) { <span class="font-mono text-xs text-muted">{{ j.attempts }} attempts</span> }
                    @if (j.status === 'failed') {
                      <button (click)="retry(j.id)" [disabled]="busy()" class="ms-auto font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">Retry</button>
                    }
                  </div>
                  @if (j.archivePath) { <p class="mt-2 break-all font-mono text-xs text-muted" dir="ltr">{{ j.archivePath }}</p> }
                  @if (j.lastError) { <p class="mt-2 font-mono text-xs text-red-600">{{ j.lastError }}</p> }
                  @if (j.completedAt) { <p class="mt-1 font-mono text-xs text-muted">completed {{ j.completedAt | date: 'medium' }}</p> }
                </li>
              }
            </ul>
          </aside>
        </section>
      }

      <section class="mt-12">
        <h2 class="font-mono text-xs uppercase tracking-[0.15em] text-muted">History</h2>
        <ol class="mt-3 divide-y divide-hairline border-y border-hairline">
          @for (e of d.events; track e.id) {
            <li class="py-3 text-sm">
              <span class="font-mono text-xs text-muted">{{ e.createdAt | date: 'medium' }}</span>
              <span class="ms-3 font-medium text-ink">{{ e.action }}</span>
              <span class="ms-2 text-muted">{{ e.actorName }}</span>
              @if (e.note) { <p class="mt-1 text-muted">{{ e.note }}</p> }
              @if (e.missingItems.length) { <ul class="mt-1 list-disc ps-6 text-muted">@for (m of e.missingItems; track m) { <li>{{ m }}</li> }</ul> }
            </li>
          }
        </ol>
      </section>

      @if (d.revisions.length > 1) {
        <section class="mt-12">
          <h2 class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Earlier revisions</h2>
          @for (r of d.revisions.slice(1); track r.id) {
            <details class="mt-3 border border-hairline p-4">
              <summary class="cursor-pointer text-sm text-ink">v{{ r.revisionNo }} · {{ r.submittedAt | date: 'medium' }} · {{ r.decision ?? 'no decision' }}@if (r.decidedByName) { by {{ r.decidedByName }} }</summary>
              <ul class="mt-3 space-y-1 text-sm">
                @for (doc of r.documents; track doc.id) {
                  <li><span class="font-mono text-xs text-muted">{{ doc.docTypeKey }}</span> <button (click)="download(doc)" class="text-ink hover:text-accent">{{ doc.originalFilename }}</button></li>
                }
              </ul>
            </details>
          }
        </section>
      }
    } @else {
      <p class="mt-10 text-muted">Loading…</p>
    }
  `,
})
export class AdminVendorDetail implements OnInit {
  private readonly api = inject(VendorsService); // the OFFICE vendor service, staff token attached
  private readonly route = inject(ActivatedRoute);
  protected readonly d = signal<Detail | null>(null);
  protected readonly note = signal('');
  protected readonly missing = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly qual = QUAL_LABEL;
  protected readonly arch = ARCHIVE_LABEL;
  protected readonly fields = FIELDS;
  protected readonly countryName = countryName;
  private readonly id = this.route.snapshot.paramMap.get('id')!;

  ngOnInit(): void { this.load(); }

  protected current(): Revision | null {
    const d = this.d();
    return d?.revisions.find((r) => r.revisionNo === d.application.currentRevisionNo) ?? d?.revisions[0] ?? null;
  }

  protected expired(date: string): boolean { return date < new Date().toISOString().slice(0, 10); }

  protected act(action: 'approve' | 'reject' | 'request-completion' | 'request-update'): void {
    const items = this.missing().split('\n').map((s) => s.trim()).filter(Boolean);
    const body = action === 'reject' ? { reason: this.note() } : action === 'approve' ? { note: this.note() } : { missingItems: items, note: this.note() };
    if (action === 'reject' && !confirm('Reject this application? The vendor will be emailed the reason.')) return;
    if (action === 'approve' && !confirm('Approve this revision? It becomes the approved record and is queued for archiving.')) return;
    this.busy.set(true);
    this.error.set(null);
    this.api.adminPost(`${this.id}/${action}`, body).subscribe({
      next: () => { this.busy.set(false); this.note.set(''); this.missing.set(''); this.load(); },
      error: (err: HttpErrorResponse) => { this.busy.set(false); this.error.set(String(err.error?.message ?? err.message)); },
    });
  }

  protected retry(jobId: string): void {
    this.busy.set(true);
    this.api.adminPost(`archive/jobs/${jobId}/retry`, {}).subscribe({
      next: () => { this.busy.set(false); this.load(); },
      error: (err: HttpErrorResponse) => { this.busy.set(false); this.error.set(String(err.error?.message ?? err.message)); },
    });
  }

  /** Authenticated download: the bearer token goes on the request, the blob is saved client-side. */
  protected download(doc: Doc): void {
    this.api.adminDocumentBlob(doc.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFilename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    });
  }

  private load(): void {
    this.api.adminGet<Detail>(this.id).subscribe((d) => this.d.set(d));
  }
}
