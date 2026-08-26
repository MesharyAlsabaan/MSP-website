import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api.service';
import { Button } from '../../../shared/ui/button/button';

interface Field {
  key: string;
  label: string;
  /** When true, the value is a { en, ar } pair. */
  bilingual?: boolean;
}

/** Site-wide company & contact settings, stored as jsonb key/value on the API. */
@Component({
  selector: 'app-admin-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button],
  template: `
    <header>
      <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">Site</p>
      <h1 class="mt-3 font-display text-3xl font-medium tracking-[-0.02em] text-ink">Settings</h1>
    </header>

    @if (loading()) {
      <p class="mt-10 text-muted">Loading…</p>
    } @else {
      <div class="mt-8 max-w-2xl space-y-6">
        @for (f of fields; track f.key) {
          <div class="border-t border-hairline pt-4">
            <label class="font-mono text-xs uppercase tracking-[0.15em] text-muted">{{ f.label }}</label>
            @if (f.bilingual) {
              <div class="mt-2 grid gap-3 sm:grid-cols-2">
                <input [(ngModel)]="values[f.key].en" placeholder="English"
                  class="w-full border border-hairline bg-bg px-3 py-2.5 text-ink outline-none focus:border-accent" />
                <input [(ngModel)]="values[f.key].ar" placeholder="العربية" dir="rtl"
                  class="w-full border border-hairline bg-bg px-3 py-2.5 text-ink outline-none focus:border-accent" />
              </div>
            } @else {
              <input [(ngModel)]="values[f.key]"
                class="mt-2 w-full border border-hairline bg-bg px-3 py-2.5 text-ink outline-none focus:border-accent" />
            }
          </div>
        }

        @if (saved()) { <p class="text-sm text-accent">Saved.</p> }
        <app-button type="button" (click)="save()" [disabled]="saving()">
          {{ saving() ? 'Saving…' : 'Save settings' }}
        </app-button>
      </div>
    }
  `,
})
export class AdminSettings implements OnInit {
  private readonly admin = inject(AdminApi);

  protected readonly fields: Field[] = [
    { key: 'companyName', label: 'Company name', bilingual: true },
    { key: 'tagline', label: 'Tagline', bilingual: true },
    { key: 'phone', label: 'Phone' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'email', label: 'Email' },
    { key: 'addressEn', label: 'Address (English)' },
    { key: 'addressAr', label: 'Address (Arabic)' },
    { key: 'cairoPhone', label: 'Cairo phone' },
    { key: 'cairoAddressEn', label: 'Cairo address (English)' },
    { key: 'cairoAddressAr', label: 'Cairo address (Arabic)' },
    { key: 'cairoMapUrl', label: 'Cairo Google Maps URL' },
  ];

  // Mutable model bound by ngModel; keyed by field key.
  protected values: Record<string, any> = {};
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);

  ngOnInit(): void {
    for (const f of this.fields) {
      this.values[f.key] = f.bilingual ? { en: '', ar: '' } : '';
    }
    this.admin.getRaw<Record<string, any>>('settings').subscribe({
      next: (map) => {
        for (const f of this.fields) {
          if (map?.[f.key] != null) this.values[f.key] = map[f.key];
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected save(): void {
    this.saving.set(true);
    this.saved.set(false);
    let pending = this.fields.length;
    for (const f of this.fields) {
      this.admin.update('settings', f.key, { value: this.values[f.key] }).subscribe({
        next: () => this.done(--pending),
        error: () => this.done(--pending),
      });
    }
  }

  private done(pending: number): void {
    if (pending <= 0) {
      this.saving.set(false);
      this.saved.set(true);
    }
  }
}
