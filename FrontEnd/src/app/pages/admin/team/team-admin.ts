import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api.service';
import { Button } from '../../../shared/ui/button/button';
import { ImageUploadField } from '../../../shared/ui/image-upload/image-upload';

interface L { en: string; ar: string; }
interface TeamMember {
  id?: string;
  name: string;
  title: L;
  bio: L;
  photo: string;
  email: string;
  phone: string;
  linkedin: string;
  sortOrder: number;
  active: boolean;
}

function blank(): TeamMember {
  return {
    name: '', title: { en: '', ar: '' }, bio: { en: '', ar: '' },
    photo: '', email: '', phone: '', linkedin: '', sortOrder: 0, active: true,
  };
}

/**
 * Team CRUD for the admin CMS. Mirrors the projects module: list + inline
 * editor panel, talking to the API via AdminApi('team').
 */
@Component({
  selector: 'app-admin-team',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, ImageUploadField],
  template: `
    <header class="flex items-end justify-between">
      <div>
        <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">People</p>
        <h1 class="mt-3 font-display text-3xl font-medium tracking-[-0.02em] text-ink">Team</h1>
      </div>
      <app-button type="button" (click)="openCreate()">New member</app-button>
    </header>

    @if (loading()) {
      <p class="mt-10 text-muted">Loading…</p>
    } @else {
      <ul class="mt-8 divide-y divide-hairline border-y border-hairline">
        @for (m of items(); track m.id) {
          <li class="flex flex-wrap items-center gap-3 py-4">
            <span class="font-display text-lg text-ink">{{ m.name }}</span>
            <span class="font-mono text-xs uppercase tracking-[0.12em] text-muted">{{ m.title.en }}</span>
            @if (!m.active) { <span class="font-mono text-xs uppercase text-muted">Inactive</span> }
            <div class="ms-auto flex gap-4">
              <button (click)="edit(m)" class="font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">Edit</button>
              <button (click)="remove(m)" class="font-mono text-xs uppercase tracking-[0.12em] text-red-600 hover:underline">Delete</button>
            </div>
          </li>
        }
        @if (items().length === 0) { <li class="py-6 text-muted">No team members yet.</li> }
      </ul>
    }

    @if (editing()) {
      <div class="fixed inset-0 z-50 flex justify-end bg-black/40" (click)="cancel()">
        <div class="h-full w-full max-w-xl overflow-y-auto border-s border-hairline bg-surface p-8" (click)="$event.stopPropagation()">
          <h2 class="font-display text-2xl text-ink">{{ model().id ? 'Edit' : 'New' }} member</h2>

          @if (error()) { <p class="mt-4 border-s-2 border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-600">{{ error() }}</p> }

          <div class="mt-6 space-y-5">
            <label class="block"><span class="lbl">Name</span>
              <input [(ngModel)]="model().name" class="inp" /></label>

            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="lbl">Title (EN)</span>
                <input [(ngModel)]="model().title.en" class="inp" /></label>
              <label class="block"><span class="lbl">Title (AR)</span>
                <input [(ngModel)]="model().title.ar" dir="rtl" class="inp" /></label>
            </div>

            <label class="block"><span class="lbl">Bio (EN)</span>
              <textarea [(ngModel)]="model().bio.en" rows="3" class="inp"></textarea></label>
            <label class="block"><span class="lbl">Bio (AR)</span>
              <textarea [(ngModel)]="model().bio.ar" rows="3" dir="rtl" class="inp"></textarea></label>

            <div class="block"><span class="lbl">Photo</span>
              <app-image-upload [(value)]="model().photo" /></div>

            <label class="block"><span class="lbl">Sort order</span>
              <input type="number" [(ngModel)]="model().sortOrder" class="inp" /></label>

            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" [(ngModel)]="model().active" /> Active
              </label>
            </div>
          </div>

          <div class="mt-8 flex gap-3">
            <app-button type="button" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Save' }}
            </app-button>
            <app-button type="button" variant="outline" (click)="cancel()">Cancel</app-button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .lbl { font-family: var(--font-mono, monospace); font-size: .7rem; text-transform: uppercase; letter-spacing: .1em; color: var(--color-muted, #888); }
    .inp { margin-top: .4rem; width: 100%; border: 1px solid var(--color-hairline, #ddd); background: var(--color-bg, #fff); padding: .55rem .7rem; color: var(--color-ink, #111); outline: none; }
    .inp:focus { border-color: var(--color-accent, #c2703d); }
  `],
})
export class AdminTeam implements OnInit {
  private readonly admin = inject(AdminApi);
  private readonly path = 'team';

  protected readonly items = signal<TeamMember[]>([]);
  protected readonly loading = signal(true);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly model = signal<TeamMember>(blank());

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.admin.list<TeamMember>(this.path, { page: 1, pageSize: 100, includeInactive: true }).subscribe({
      next: (res) => { this.items.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected openCreate(): void { this.model.set(blank()); this.error.set(null); this.editing.set(true); }
  protected edit(m: TeamMember): void { this.model.set(structuredClone(m)); this.error.set(null); this.editing.set(true); }
  protected cancel(): void { this.editing.set(false); }

  protected save(): void {
    this.saving.set(true);
    this.error.set(null);
    const body = this.model();
    const req = body.id
      ? this.admin.update<TeamMember>(this.path, body.id, body)
      : this.admin.create<TeamMember>(this.path, body);
    req.subscribe({
      next: () => { this.saving.set(false); this.editing.set(false); this.load(); },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message;
        this.error.set(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Save failed.'));
      },
    });
  }

  protected remove(m: TeamMember): void {
    if (!m.id || !confirm(`Delete "${m.name}"?`)) return;
    this.admin.remove(this.path, m.id).subscribe(() => {
      this.items.update((list) => list.filter((x) => x.id !== m.id));
    });
  }
}
