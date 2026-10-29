import { Component, ChangeDetectionStrategy, DestroyRef, PLATFORM_ID, effect, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/constants/api.constants';

/**
 * A private preview image from the sync. Folder images not used on the page
 * are never on the public site, so previews are fetched through the
 * authenticated API (the auth interceptor adds the token) and shown from a
 * local object URL.
 */
@Component({
  selector: 'app-sync-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src()) {
      <img [src]="src()" [alt]="alt()" class="h-full w-full object-cover" loading="lazy" />
    } @else {
      <span class="flex h-full w-full items-center justify-center bg-surface font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        {{ failed() ? 'No preview' : '…' }}
      </span>
    }
  `,
  host: { class: 'block overflow-hidden bg-surface' },
})
export class SyncImage {
  readonly itemId = input.required<string>();
  readonly md5 = input.required<string>();
  readonly alt = input('');

  private readonly http = inject(HttpClient);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly src = signal('');
  protected readonly failed = signal(false);
  private url = '';

  constructor() {
    effect((onCleanup) => {
      const id = this.itemId();
      const md5 = this.md5();
      if (!this.browser || !id || !md5) return;
      const sub = this.http.get(`${API_URL}/project-sync/items/${id}/images/${md5}`, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          this.release();
          this.url = URL.createObjectURL(blob);
          this.src.set(this.url);
        },
        error: () => this.failed.set(true),
      });
      onCleanup(() => sub.unsubscribe());
    });
    inject(DestroyRef).onDestroy(() => this.release());
  }

  private release(): void {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = '';
  }
}
