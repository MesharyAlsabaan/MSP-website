import {
  Component,
  computed,
  inject,
  model,
  signal,
  viewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { assetUrl } from '../../../core/utils/asset-url';

/**
 * Admin image field: pick a file, POST it to `/api/uploads`, store the returned
 * URL via two-way `[(value)]`. Shows a thumbnail preview (resolved with
 * `assetUrl`) plus replace/clear controls and surfaces upload errors.
 */
@Component({
  selector: 'app-image-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      @if (value()) {
        <div class="relative inline-block">
          <img
            [src]="preview()"
            alt=""
            class="h-24 w-32 border border-hairline object-cover"
          />
          <button
            type="button"
            (click)="clear()"
            title="Remove image"
            class="absolute -end-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-hairline bg-surface text-ink hover:text-red-600"
          >
            &times;
          </button>
        </div>
      }

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          (click)="pick()"
          [disabled]="uploading()"
          class="cursor-pointer border border-hairline px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {{ uploading() ? 'Uploading…' : value() ? 'Replace' : 'Upload image' }}
        </button>
        <input
          #fileInput
          type="file"
          accept="image/*"
          class="hidden"
          (change)="onFile($event)"
        />
        @if (error()) {
          <span class="font-mono text-xs text-red-600">{{ error() }}</span>
        }
      </div>
    </div>
  `,
})
export class ImageUploadField {
  private readonly api = inject(ApiService);

  /** Two-way bound stored image URL/path. */
  readonly value = model<string>('');

  private readonly fileInput =
    viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly preview = computed(() => assetUrl(this.value()));

  /**
   * Opens the OS file picker programmatically. The input is driven by an
   * explicit button rather than a wrapping `<label>`: admin forms nest these
   * fields inside their own `<label>`, and a nested label re-forwards the click
   * to the input, reopening the picker in a loop until the browser stops
   * honouring the requests.
   */
  protected pick(): void {
    if (this.uploading()) return;
    this.fileInput().nativeElement.click();
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);
    this.uploading.set(true);
    this.error.set(null);

    this.api
      .post<ApiResponse<{ url: string }>>('uploads', data)
      .pipe(map((r) => r.data))
      .subscribe({
        next: (res) => {
          this.value.set(res.url);
          this.uploading.set(false);
          input.value = '';
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.error.set(
            Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Upload failed.'),
          );
          this.uploading.set(false);
          input.value = '';
        },
      });
  }

  protected clear(): void {
    this.value.set('');
  }
}
