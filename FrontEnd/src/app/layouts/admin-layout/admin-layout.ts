import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeToggle } from '../../shared/ui/theme-toggle/theme-toggle';
import { AuthService } from '../../core/services/auth.service';
import { ADMIN_NAV } from '../../core/data/admin-nav';
import { Role } from '../../core/enums/role.enum';

/** Shell for the admin dashboard: fixed sidebar nav + topbar + routed content. */
@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeToggle],
  template: `
    <div class="min-h-dvh bg-bg text-ink lg:grid lg:grid-cols-[260px_1fr]">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 z-40 w-[260px] -translate-x-full border-e border-hairline bg-surface transition-transform lg:static lg:translate-x-0"
        [class.translate-x-0]="open()"
      >
        <div class="flex h-16 items-center border-b border-hairline px-6">
          <a routerLink="/admin" class="font-mono text-xs uppercase tracking-[0.18em] text-accent">
            MSP Admin
          </a>
        </div>
        <nav class="flex flex-col gap-1 p-4">
          @for (item of nav(); track item.path) {
            <a
              [routerLink]="item.path"
              [routerLinkActiveOptions]="{ exact: item.path === '/admin' }"
              routerLinkActive="bg-bg text-accent"
              (click)="open.set(false)"
              class="px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
            >
              {{ item.label }}
            </a>
          }
        </nav>
      </aside>

      @if (open()) {
        <div class="fixed inset-0 z-30 bg-black/40 lg:hidden" (click)="open.set(false)"></div>
      }

      <!-- Main column -->
      <div class="flex min-h-dvh flex-col">
        <header
          class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-hairline bg-bg/90 px-5 backdrop-blur sm:px-8"
        >
          <button
            type="button"
            (click)="open.set(!open())"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border lg:hidden"
            aria-label="Toggle navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <span class="hidden font-display text-sm text-muted lg:block">Content management</span>
          <div class="flex items-center gap-3">
            <app-theme-toggle />
            <span class="hidden text-sm text-muted sm:block">{{ auth.user()?.name }}</span>
            <button
              type="button"
              (click)="auth.logout()"
              class="border border-ink/30 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-bg"
            >
              Sign out
            </button>
          </div>
        </header>

        <main class="flex-1 px-5 py-8 sm:px-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  protected readonly open = signal(false);

  protected readonly nav = computed(() => {
    const role = this.auth.user()?.role;
    return ADMIN_NAV.filter(
      (i) => !i.roles || (role && i.roles.includes(role as Role)),
    );
  });
}
