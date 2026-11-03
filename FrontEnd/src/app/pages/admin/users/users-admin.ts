import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api.service';
import { Button } from '../../../shared/ui/button/button';
import { Role } from '../../../core/enums/role.enum';

interface User {
  id?: string;
  email: string;
  name: string;
  role: Role | string;
  active: boolean;
  password?: string;
}

function blank(): User {
  return { email: '', name: '', role: Role.Editor, active: true, password: '' };
}

/**
 * Users CRUD for the admin CMS. Mirrors the Projects template, but the users
 * list endpoint returns a plain array (not paginated), and the password field
 * is required on create yet optional on edit.
 */
@Component({
  selector: 'app-admin-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button],
  template: `
    <header class="flex items-end justify-between">
      <div>
        <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">Access</p>
        <h1 class="mt-3 font-display text-3xl font-medium tracking-[-0.02em] text-ink">Users</h1>
      </div>
      <app-button type="button" (click)="openCreate()">New user</app-button>
    </header>

    @if (loading()) {
      <p class="mt-10 text-muted">Loading…</p>
    } @else {
      <ul class="mt-8 divide-y divide-hairline border-y border-hairline">
        @for (u of items(); track u.id) {
          <li class="flex flex-wrap items-center gap-3 py-4">
            <span class="font-display text-lg text-ink">{{ u.name }}</span>
            <span class="font-mono text-xs text-muted">{{ u.email }}</span>
            <span class="font-mono text-xs uppercase tracking-[0.12em] text-muted">{{ u.role }}</span>
            @if (!u.active) { <span class="font-mono text-xs uppercase text-muted">Inactive</span> }
            <div class="ms-auto flex gap-4">
              <button (click)="edit(u)" class="font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">Edit</button>
              <button (click)="remove(u)" class="font-mono text-xs uppercase tracking-[0.12em] text-red-600 hover:underline">Delete</button>
            </div>
          </li>
        }
        @if (items().length === 0) { <li class="py-6 text-muted">No users yet.</li> }
      </ul>
    }

    @if (editing()) {
      <div class="fixed inset-0 z-50 flex justify-end bg-black/40" (click)="cancel()">
        <div class="h-full w-full max-w-xl overflow-y-auto border-s border-hairline bg-surface p-8" (click)="$event.stopPropagation()">
          <h2 class="font-display text-2xl text-ink">{{ model().id ? 'Edit' : 'New' }} user</h2>

          @if (error()) { <p class="mt-4 border-s-2 border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-600">{{ error() }}</p> }

          <div class="mt-6 space-y-5">
            <label class="block"><span class="lbl">Name</span>
              <input [(ngModel)]="model().name" class="inp" /></label>

            <label class="block"><span class="lbl">Email</span>
              <input type="email" [(ngModel)]="model().email" class="inp" /></label>

            <label class="block"><span class="lbl">Password{{ model().id ? ' (leave blank to keep)' : '' }}</span>
              <input type="password" [(ngModel)]="model().password" class="inp" /></label>

            <label class="block"><span class="lbl">Role</span>
              <select [(ngModel)]="model().role" class="inp">
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="CONTENT_MANAGER">Content Manager</option>
                <option value="EDITOR">Editor</option>
              </select>
            </label>

            <label class="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" [(ngModel)]="model().active" /> Active
            </label>
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
export class AdminUsers implements OnInit {
  private readonly admin = inject(AdminApi);
  private readonly path = 'users';

  protected readonly items = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly model = signal<User>(blank());

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.admin.getRaw<User[]>(this.path).subscribe({
      next: (arr) => { this.items.set(arr); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected openCreate(): void { this.model.set(blank()); this.error.set(null); this.editing.set(true); }
  protected edit(u: User): void { this.model.set({ ...structuredClone(u), password: '' }); this.error.set(null); this.editing.set(true); }
  protected cancel(): void { this.editing.set(false); }

  protected save(): void {
    this.saving.set(true);
    this.error.set(null);
    const body = { ...this.model() };
    if (body.id && !body.password) { delete body.password; }
    const req = body.id
      ? this.admin.update<User>(this.path, body.id, body)
      : this.admin.create<User>(this.path, body);
    req.subscribe({
      next: () => { this.saving.set(false); this.editing.set(false); this.load(); },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message;
        this.error.set(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Save failed.'));
      },
    });
  }

  protected remove(u: User): void {
    if (!u.id || !confirm(`Delete "${u.name || u.email}"?`)) return;
    this.admin.remove(this.path, u.id).subscribe(() => {
      this.items.update((list) => list.filter((x) => x.id !== u.id));
    });
  }
}
