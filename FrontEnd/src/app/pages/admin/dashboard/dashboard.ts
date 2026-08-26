import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AdminApi } from '../../../core/services/admin-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ADMIN_NAV, AdminNavItem } from '../../../core/data/admin-nav';
import { Role } from '../../../core/enums/role.enum';

interface Card {
  path: string;
  label: string;
  count: number | null;
}

/** Admin landing: greeting + section cards with live record counts. */
@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header>
      <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">Overview</p>
      <h1 class="mt-3 font-display text-3xl font-medium tracking-[-0.02em] text-ink">
        Welcome, {{ auth.user()?.name }}
      </h1>
    </header>

    <div class="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
      @for (card of cards(); track card.path) {
        <a
          [routerLink]="card.path"
          class="group bg-surface p-6 transition-colors hover:bg-bg"
        >
          <div class="flex items-baseline justify-between">
            <span class="font-mono text-xs uppercase tracking-[0.14em] text-muted">
              {{ card.label }}
            </span>
            <span class="font-display text-3xl font-medium text-ink">
              {{ card.count === null ? '—' : card.count }}
            </span>
          </div>
          <span class="mt-4 inline-block font-mono text-xs uppercase tracking-[0.12em] text-accent opacity-0 transition-opacity group-hover:opacity-100">
            Manage →
          </span>
        </a>
      }
    </div>
  `,
})
export class AdminDashboard implements OnInit {
  private readonly admin = inject(AdminApi);
  protected readonly auth = inject(AuthService);

  /** Sections this user may actually read — others would 403 on their count. */
  private readonly visible: AdminNavItem[] = ADMIN_NAV.filter(
    (i) =>
      i.resource &&
      (!i.roles || i.roles.includes(this.auth.user()?.role as Role)),
  );

  protected readonly cards = signal<Card[]>(
    this.visible.map((i) => ({ path: i.path, label: i.label, count: null })),
  );

  ngOnInit(): void {
    const items = this.visible;
    forkJoin(
      items.map((i) =>
        this.admin
          .list<unknown>(i.resource as string, { page: 1, pageSize: 1 })
          .pipe(
            map((res) => res.total),
            catchError(() => of(null)),
          ),
      ),
    ).subscribe((totals) => {
      this.cards.set(
        items.map((i, idx) => ({ path: i.path, label: i.label, count: totals[idx] })),
      );
    });
  }
}
