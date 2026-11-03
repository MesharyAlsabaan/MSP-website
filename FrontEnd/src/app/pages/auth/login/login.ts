import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../../../shared/ui/button/button';
import { AuthService } from '../../../core/services/auth.service';

/** Admin login screen — authenticates against the backend and routes to /admin. */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, RouterLink],
  template: `
    <div class="border border-hairline bg-surface p-8 sm:p-10">
      <a routerLink="/" class="font-mono text-xs uppercase tracking-[0.18em] text-accent">
        MSP — Architecture + Engineering
      </a>
      <h1 class="mt-6 font-display text-2xl font-medium tracking-[-0.02em] text-ink">
        Admin sign in
      </h1>
      <p class="mt-2 text-sm text-muted">Manage projects, content and messages.</p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 space-y-5">
        <label class="block">
          <span class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Email</span>
          <input
            type="email"
            formControlName="email"
            autocomplete="username"
            class="mt-2 w-full border border-hairline bg-bg px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </label>
        <label class="block">
          <span class="font-mono text-xs uppercase tracking-[0.15em] text-muted">Password</span>
          <input
            type="password"
            formControlName="password"
            autocomplete="current-password"
            class="mt-2 w-full border border-hairline bg-bg px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </label>

        @if (error()) {
          <p class="border-s-2 border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {{ error() }}
          </p>
        }

        <app-button type="submit" [disabled]="loading() || form.invalid" variant="primary">
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </app-button>
      </form>
    </div>
  `,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err?.error?.message ?? 'Sign in failed. Check your credentials.',
        );
      },
    });
  }
}
