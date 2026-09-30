import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VendorsService } from '../../../core/services/vendors.service';
import { countryName, countryOptions } from '../../../core/data/countries';

export interface VendorRow {
  id: string;
  requestNumber: string | null;
  vendorNumber: string;
  companyName: string;
  country: string;
  primaryCategoryKey: string;
  status: 'draft' | 'under_review' | 'needs_completion' | 'approved' | 'rejected';
  currentRevisionNo: number;
  submitterEmail: string;
  createdAt: string;
  updatedAt: string;
  archiveStatus: 'pending' | 'transferring' | 'completed' | 'failed' | null;
}

interface ArchiveStatusView {
  agents: { id: string; name: string; active: boolean; lastSeenAt: string | null; lastHeartbeat: Record<string, unknown> | null }[];
  pending: { id: string; vendorNumber: string; companyName: string; revisionNo: number; attempts: number; status: string }[];
  failed: VendorRow[];
}

export const QUAL_LABEL: Record<VendorRow['status'], string> = {
  draft: 'Draft (not submitted)',
  under_review: 'Under review',
  needs_completion: 'Needs completion',
  approved: 'Approved',
  rejected: 'Rejected',
};
export const ARCHIVE_LABEL: Record<NonNullable<VendorRow['archiveStatus']>, string> = {
  pending: 'Waiting for archive',
  transferring: 'Transferring',
  completed: 'Archived',
  failed: 'Archive failed',
};

/** Admin: vendor applications with qualification + archive status, and the agent panel. */
@Component({
  selector: 'app-admin-vendors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink],
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">Qualification</p>
        <h1 class="mt-3 font-display text-3xl font-medium tracking-[-0.02em] text-ink">Vendors</h1>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <input type="search" [value]="search()" (input)="search.set($any($event.target).value); reload()" placeholder="Search company / number / email" class="border-b border-hairline bg-transparent px-0 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none" />
        <select [value]="status()" (change)="status.set($any($event.target).value); reload()" class="border-b border-hairline bg-transparent py-2 text-sm text-ink focus:outline-none">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="under_review">Under review</option>
          <option value="needs_completion">Needs completion</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select [value]="country()" (change)="country.set($any($event.target).value); reload()" class="border-b border-hairline bg-transparent py-2 text-sm text-ink focus:outline-none">
          <option value="">All countries</option>
          @for (c of countries; track c.code) { <option [value]="c.code">{{ c.name }}</option> }
        </select>
        <span class="font-mono text-xs uppercase tracking-[0.12em] text-muted">{{ total() }} total</span>
      </div>
    </header>

    @if (archive(); as a) {
      <section class="mt-8 grid gap-4 border border-hairline p-5 sm:grid-cols-3">
        <div>
          <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">Office archive agents</p>
          @if (a.agents.length === 0) { <p class="mt-2 text-sm text-muted">No agent key yet.</p> }
          @for (g of a.agents; track g.id) {
            <p class="mt-2 text-sm text-ink">
              <span class="font-medium">{{ g.name }}</span>
              @if (!g.active) { <span class="ms-2 font-mono text-[10px] uppercase text-muted">revoked</span> }
              <span class="block font-mono text-xs text-muted">last seen {{ g.lastSeenAt ? (g.lastSeenAt | date: 'medium') : 'never' }}</span>
              @if (g.lastHeartbeat?.['lastSuccessAt']) { <span class="block font-mono text-xs text-muted">last success {{ $any(g.lastHeartbeat)['lastSuccessAt'] | date: 'medium' }}</span> }
              @if (g.lastHeartbeat && g.lastHeartbeat['archiveRootReachable'] === false) { <span class="block font-mono text-xs text-red-600">archive folder unreachable</span> }
            </p>
          }
        </div>
        <div>
          <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">Waiting for archive</p>
          <p class="mt-2 font-display text-3xl text-ink">{{ a.pending.length }}</p>
          @for (p of a.pending.slice(0, 5); track p.id) {
            <p class="font-mono text-xs text-muted">{{ p.vendorNumber }} v{{ p.revisionNo }} · {{ p.companyName }}@if (p.attempts) { · {{ p.attempts }} attempts }</p>
          }
        </div>
        <div>
          <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">Failed</p>
          <p class="mt-2 font-display text-3xl" [class.text-red-600]="a.failed.length" [class.text-ink]="!a.failed.length">{{ a.failed.length }}</p>
          @for (f of a.failed.slice(0, 5); track f.id) {
            <a [routerLink]="['/admin/vendors', f.id]" class="block font-mono text-xs text-red-600 hover:underline">{{ f.vendorNumber }} · {{ f.companyName }}</a>
          }
        </div>
      </section>
    }

    @if (loading()) {
      <p class="mt-10 text-muted">Loading…</p>
    } @else if (rows().length === 0) {
      <p class="mt-10 text-muted">No applications.</p>
    } @else {
      <ul class="mt-8 divide-y divide-hairline border-y border-hairline">
        @for (r of rows(); track r.id) {
          <li class="py-4">
            <a [routerLink]="['/admin/vendors', r.id]" class="group flex flex-wrap items-center gap-3">
              <span class="font-mono text-xs text-muted" dir="ltr">{{ r.vendorNumber }}</span>
              <span class="font-display text-lg text-ink group-hover:text-accent">{{ r.companyName }}</span>
              @if (r.country) { <span class="font-mono text-xs text-muted">{{ countryName(r.country, 'en') }}</span> }
              <span class="font-mono text-xs text-muted" dir="ltr">{{ r.requestNumber ?? '—' }} · v{{ r.currentRevisionNo }}</span>
              <span class="font-mono text-[10px] uppercase tracking-[0.12em]" [class]="qualClass(r.status)">{{ qual[r.status] }}</span>
              @if (r.archiveStatus) {
                <span class="font-mono text-[10px] uppercase tracking-[0.12em]" [class]="archiveClass(r.archiveStatus)">{{ arch[r.archiveStatus] }}</span>
              }
              <span class="ms-auto font-mono text-xs text-muted">{{ r.updatedAt | date: 'medium' }}</span>
            </a>
          </li>
        }
      </ul>
      @if (total() > rows().length) {
        <button (click)="more()" class="mt-6 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">Load more</button>
      }
    }
  `,
})
export class AdminVendors implements OnInit {
  private readonly api = inject(VendorsService); // the OFFICE vendor service, staff token attached
  protected readonly rows = signal<VendorRow[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly status = signal('');
  protected readonly country = signal('');
  protected readonly countries = countryOptions('en');
  protected readonly countryName = countryName;
  protected readonly archive = signal<ArchiveStatusView | null>(null);
  protected readonly qual = QUAL_LABEL;
  protected readonly arch = ARCHIVE_LABEL;
  private page = 1;

  ngOnInit(): void {
    this.reload();
    this.api.adminGet<ArchiveStatusView>('archive/status').subscribe((a) => this.archive.set(a));
  }

  protected reload(): void {
    this.page = 1;
    this.loading.set(true);
    this.fetch().subscribe((res) => { this.rows.set(res.data); this.total.set(res.total); this.loading.set(false); });
  }

  protected more(): void {
    this.page += 1;
    this.fetch().subscribe((res) => this.rows.update((r) => [...r, ...res.data]));
  }

  private fetch() {
    const params: Record<string, string | number> = { page: this.page, pageSize: 25 };
    if (this.search()) params['search'] = this.search();
    if (this.status()) params['status'] = this.status();
    if (this.country()) params['country'] = this.country();
    return this.api.adminList<VendorRow>(params);
  }

  protected qualClass(s: VendorRow['status']): string {
    return { draft: 'text-muted', under_review: 'text-amber-700', needs_completion: 'text-accent', approved: 'text-emerald-700', rejected: 'text-red-600' }[s];
  }
  protected archiveClass(s: NonNullable<VendorRow['archiveStatus']>): string {
    return { pending: 'text-muted', transferring: 'text-amber-700', completed: 'text-emerald-700', failed: 'text-red-600' }[s];
  }
}
