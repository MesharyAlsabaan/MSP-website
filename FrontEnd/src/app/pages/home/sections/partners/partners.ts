import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { CLIENT_LOGOS } from '../../../../core/data/clients';
import { assetUrl } from '../../../../core/utils/asset-url';

interface LogoItem {
  name: string;
  src: string;
  width?: number;
  height?: number;
}

/**
 * Section 08 — Clients: two quiet marquee rows of client logos on paper
 * tiles, drifting in opposite directions. Bundled logos carry an optically
 * balanced display size (see CLIENT_LOGOS), so every mark reads at the same
 * weight. Logos rest in grayscale and take their own colour on hover.
 */
@Component({
  selector: 'app-partners',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length) {
    <section class="overflow-hidden border-y border-hairline bg-bg py-12">
      <h2
        class="mb-10 text-center font-mono text-xs font-normal uppercase tracking-[0.2em] text-muted"
      >
        <span class="text-accent">(08)</span> &nbsp; {{ i18n.pick(label) }}
      </h2>

      <div class="flex flex-col gap-4">
        @for (row of rows(); track $index; let reverse = $odd) {
          <div class="marquee relative" dir="ltr">
            <div
              class="pointer-events-none absolute inset-y-0 start-0 z-10 w-24 bg-gradient-to-r from-bg to-transparent"
              aria-hidden="true"
            ></div>
            <div
              class="pointer-events-none absolute inset-y-0 end-0 z-10 w-24 bg-gradient-to-l from-bg to-transparent"
              aria-hidden="true"
            ></div>

            <ul
              class="marquee-track"
              [class.marquee-track--reverse]="reverse"
              [style.animation-duration.s]="row.length * 3"
            >
              @for (logo of row; track $index; let i = $index) {
                <li
                  class="client-tile mx-1.5 flex h-20 w-36 shrink-0 items-center justify-center border border-hairline bg-white sm:mx-2 sm:h-24 sm:w-44 dark:bg-ink"
                  [attr.aria-hidden]="i >= row.length / 2 ? 'true' : null"
                >
                  <img
                    [src]="logo.src"
                    [alt]="logo.name"
                    [attr.width]="logo.width"
                    [attr.height]="logo.height"
                    [style.width.px]="logo.width"
                    [style.height.px]="logo.height"
                    loading="lazy"
                    decoding="async"
                    class="max-h-16 max-w-[8.25rem] object-contain"
                  />
                </li>
              }
            </ul>
          </div>
        }
      </div>
    </section>
    }
  `,
})
export class Partners {
  protected readonly i18n = inject(TranslationService);
  private readonly content = inject(PublicContentService);

  protected readonly label = {
    en: 'Clients and partners',
    ar: 'عملاء وشركاء',
  };

  /** Published partners from the CMS; null until the request settles. */
  private readonly fetched = signal<LogoItem[] | null>(null);

  /** CMS partners with a logo win; otherwise the bundled client logos. */
  private readonly logos = computed<LogoItem[]>(() => {
    const cms = this.fetched();
    if (cms?.length) return cms;
    return CLIENT_LOGOS.map((c) => ({
      name: this.i18n.pick(c.name),
      src: `/images/clients/${c.slug}.webp`,
      width: c.width,
      height: c.height,
    }));
  });

  /**
   * Two rows dealt alternately, so both open on the leading clients; each row
   * is doubled so its track loops seamlessly at -50%.
   */
  protected readonly rows = computed(() => {
    const list = this.logos();
    if (!list.length) return [];
    return [list.filter((_, i) => i % 2 === 0), list.filter((_, i) => i % 2 === 1)]
      .filter((r) => r.length)
      .map((r) => [...r, ...r]);
  });

  constructor() {
    this.content.partners().subscribe({
      next: (ps) =>
        this.fetched.set(
          ps
            .map((p) => ({ name: p.name, src: assetUrl(p.logo) }))
            .filter((p) => p.name && p.src),
        ),
      error: () => this.fetched.set([]),
    });
  }
}
