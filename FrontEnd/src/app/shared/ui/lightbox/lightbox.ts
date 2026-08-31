import {
  Component,
  computed,
  inject,
  input,
  model,
  signal,
  effect,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AssetPipe } from '../../pipes/asset.pipe';
import { TranslationService } from '../../../core/services/translation.service';

/**
 * Full-screen image viewer for project galleries.
 *
 * Viewing only: the context menu, dragging and long-press save are suppressed,
 * and the image is painted as a CSS background layer with a transparent shield
 * over it, so "save image as" has nothing to grab. This deters casual copying —
 * it cannot make a published image un-downloadable, since any browser can still
 * read it from the network tab or the page cache.
 *
 * Keyboard: Escape closes, arrows move between images. The dialog traps nothing
 * else, so the page behind stays where it was.
 */
@Component({
  selector: 'app-lightbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AssetPipe],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-[100] flex flex-col bg-ink/95 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="i18n.pick(t.viewer)"
        (click)="close()"
        (contextmenu)="block($event)"
      >
        <!-- Top bar: counter + close -->
        <div
          class="flex items-center justify-between px-5 py-4 sm:px-8"
          (click)="$event.stopPropagation()"
        >
          <p class="font-mono text-xs uppercase tracking-[0.16em] text-bg/70" dir="ltr">
            {{ index() + 1 }} / {{ images().length }}
          </p>
          <button
            type="button"
            (click)="close()"
            [attr.aria-label]="i18n.pick(t.close)"
            class="grid h-10 w-10 place-items-center border border-bg/30 font-display text-2xl leading-none text-bg transition-colors hover:border-accent hover:text-accent"
          >
            &times;
          </button>
        </div>

        <!-- Stage -->
        <div class="relative flex min-h-0 flex-1 items-center justify-center px-5 pb-6 sm:px-8">
          @if (images().length > 1) {
            <button
              type="button"
              (click)="prev($event)"
              [attr.aria-label]="i18n.pick(t.previous)"
              class="dir-flip absolute start-2 z-10 grid h-12 w-12 place-items-center text-3xl text-bg/70 transition-colors hover:text-accent sm:start-6"
            >
              &lsaquo;
            </button>
          }

          <!-- The picture itself: a background layer plus a transparent shield,
               so there is no <img> element to drag out or save directly. -->
          <div
            class="relative h-full w-full max-w-[1400px] select-none bg-contain bg-center bg-no-repeat"
            [style.backgroundImage]="'url(' + (current() | asset) + ')'"
            role="img"
            [attr.aria-label]="caption() || i18n.pick(t.viewer)"
            (click)="$event.stopPropagation()"
            (contextmenu)="block($event)"
            (dragstart)="block($event)"
          >
            <div class="absolute inset-0" aria-hidden="true"></div>
          </div>

          @if (images().length > 1) {
            <button
              type="button"
              (click)="next($event)"
              [attr.aria-label]="i18n.pick(t.next)"
              class="dir-flip absolute end-2 z-10 grid h-12 w-12 place-items-center text-3xl text-bg/70 transition-colors hover:text-accent sm:end-6"
            >
              &rsaquo;
            </button>
          }
        </div>

        @if (caption()) {
          <p
            class="px-5 pb-6 text-center font-mono text-xs uppercase tracking-[0.14em] text-bg/60 sm:px-8"
            (click)="$event.stopPropagation()"
          >
            {{ caption() }}
          </p>
        }
      </div>
    }
  `,
  host: {
    '(document:keydown)': 'onKey($event)',
  },
})
export class Lightbox {
  protected readonly i18n = inject(TranslationService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Stored image paths, in gallery order. */
  readonly images = input<readonly string[]>([]);
  /** Caption shown under the picture (usually the project title). */
  readonly caption = input<string>('');
  /** Index being viewed; `null` closes the viewer. */
  readonly index = model<number>(0);
  readonly open = model<boolean>(false);

  protected readonly current = computed(() => this.images()[this.index()] ?? '');

  private readonly scrollLocked = signal(false);

  constructor() {
    // Keep the page behind from scrolling while the viewer is up.
    effect(() => {
      if (!this.isBrowser) return;
      const shouldLock = this.open();
      if (shouldLock === this.scrollLocked()) return;
      document.body.style.overflow = shouldLock ? 'hidden' : '';
      this.scrollLocked.set(shouldLock);
    });
  }

  protected readonly t = {
    viewer: { en: 'Image viewer', ar: 'عارض الصور' },
    close: { en: 'Close viewer', ar: 'إغلاق العارض' },
    next: { en: 'Next image', ar: 'الصورة التالية' },
    previous: { en: 'Previous image', ar: 'الصورة السابقة' },
  };

  protected close(): void {
    this.open.set(false);
  }

  protected next(event?: Event): void {
    event?.stopPropagation();
    const total = this.images().length;
    if (total) this.index.set((this.index() + 1) % total);
  }

  protected prev(event?: Event): void {
    event?.stopPropagation();
    const total = this.images().length;
    if (total) this.index.set((this.index() - 1 + total) % total);
  }

  protected block(event: Event): boolean {
    event.preventDefault();
    return false;
  }

  protected onKey(event: KeyboardEvent): void {
    if (!this.open()) return;
    if (event.key === 'Escape') this.close();
    if (event.key === 'ArrowRight') this.next();
    if (event.key === 'ArrowLeft') this.prev();
  }
}
