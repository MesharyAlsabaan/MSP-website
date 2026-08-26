import {
  Component,
  inject,
  signal,
  computed,
  PLATFORM_ID,
  NgZone,
  afterNextRender,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { AssetPipe } from '../../../../shared/pipes/asset.pipe';
import { Project } from '../../../../core/data/projects';

/**
 * Hero project showcase — an expanding-panels accordion (desktop) that
 * auto-advances through featured projects and expands the one under the
 * cursor. Below `sm` it falls back to a swipeable filmstrip.
 *
 * The auto-advance interval runs OUTSIDE Angular's zone and only nudges a
 * signal, so it never churns change detection. Disabled under reduced motion.
 */
@Component({
  selector: 'app-project-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AssetPipe],
  template: `
    <div class="mx-auto max-w-[1200px] px-5 pb-16 sm:px-8">
      @if (loading()) {
        <div class="h-[320px] animate-pulse bg-hairline/40 sm:h-[460px] lg:h-[540px]"></div>
      } @else if (projects().length === 0) {
        <div class="flex min-h-48 items-center justify-center border-y border-hairline py-12 text-center">
          <p class="font-mono text-xs uppercase tracking-[0.14em] text-muted">
            {{ i18n.pick(t.empty) }}
          </p>
        </div>
      } @else {
      <!-- Desktop: expanding panels -->
      <div
        class="hidden h-[460px] gap-1.5 sm:flex lg:h-[540px]"
        (mouseenter)="pause()"
        (mouseleave)="resume()"
      >
        @for (p of projects(); track p.slug; let i = $index) {
          <a
            [routerLink]="['/projects', p.slug]"
            (mouseenter)="setActive(i)"
            (focus)="setActive(i)"
            [attr.aria-label]="i18n.pick(p.title)"
            class="group relative block min-w-[56px] overflow-hidden transition-[flex-grow] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            [style.flexGrow]="active() === i ? 6 : 1"
          >
            <img
              [src]="p.cover | asset"
              [alt]="i18n.pick(p.title)"
              class="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              [class.grayscale]="active() !== i"
              [class.scale-105]="active() === i"
              fetchpriority="high"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent"
            ></div>

            <!-- Collapsed: vertical label -->
            <div
              class="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
              [class.opacity-0]="active() === i"
              [class.opacity-100]="active() !== i"
              aria-hidden="true"
            >
              <span
                class="whitespace-nowrap font-mono text-xs uppercase tracking-[0.15em] text-bg/90 [writing-mode:vertical-rl] rotate-180"
              >
                <span class="text-accent">{{ p.no }}</span> &nbsp;
                {{ i18n.pick(p.title) }}
              </span>
            </div>

            <!-- Active: full caption -->
            <div
              class="absolute inset-x-0 bottom-0 p-6 transition-all duration-500 lg:p-8"
              [class.opacity-0]="active() !== i"
              [class.translate-y-3]="active() !== i"
            >
              <p class="font-mono text-xs uppercase tracking-[0.15em] text-bg/70">
                <span class="text-accent">{{ p.no }}</span> ·
                {{ i18n.pick(p.typology) }} · {{ i18n.pick(p.location) }}
              </p>
              <h3 class="mt-2 font-display text-2xl font-medium text-bg lg:text-3xl">
                {{ i18n.pick(p.title) }}
              </h3>
              <span
                class="mt-3 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-bg"
              >
                {{ i18n.pick(t.view) }}
                <span class="dir-flip text-accent transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
              </span>
            </div>
          </a>
        }
      </div>

      <!-- Mobile: swipeable filmstrip -->
      <div
        class="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        @for (p of projects(); track p.slug) {
          <a
            [routerLink]="['/projects', p.slug]"
            class="block w-[82%] shrink-0 snap-start"
          >
            <div class="aspect-[4/3] overflow-hidden">
              <img
                [src]="p.cover | asset"
                [alt]="i18n.pick(p.title)"
                class="h-full w-full object-cover"
              />
            </div>
            <h3 class="mt-3 font-display text-xl font-medium text-ink">
              {{ i18n.pick(p.title) }}
            </h3>
            <p class="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-muted">
              {{ i18n.pick(p.typology) }} · {{ i18n.pick(p.location) }}
            </p>
          </a>
        }
      </div>
      }
    </div>
  `,
})
export class ProjectShowcase implements OnDestroy {
  protected readonly i18n = inject(TranslationService);
  private readonly zone = inject(NgZone);
  private readonly content = inject(PublicContentService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Published projects from the API. Bundled sample data is never rendered. */
  private readonly fetched = signal<Project[]>([]);
  protected readonly loading = signal(true);

  protected readonly projects = computed<Project[]>(() => {
    const api = this.fetched();
    // Prefer what the admin marked as featured; until anything is marked, show
    // the newest published work rather than the bundled sample projects.
    const featured = api.filter((p) => p.featured);
    return (featured.length ? featured : api).slice(0, 4);
  });

  protected readonly active = signal(0);

  protected readonly t = {
    view: { en: 'View project', ar: 'عرض المشروع' },
    empty: { en: 'No published projects yet.', ar: 'لا توجد مشاريع منشورة بعد.' },
  };

  private intervalId?: ReturnType<typeof setInterval>;
  private autoOk = false;

  constructor() {
    if (!this.isBrowser) return;
    afterNextRender(() => {
      this.autoOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resume();
      this.content.projects().subscribe({
        next: (list) => {
          this.fetched.set(list);
          this.loading.set(false);
          this.active.set(0);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  protected setActive(i: number): void {
    this.active.set(i);
  }

  protected pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  protected resume(): void {
    if (!this.autoOk || this.intervalId) return;
    this.zone.runOutsideAngular(() => {
      this.intervalId = setInterval(() => {
        this.active.update((i) => (i + 1) % Math.max(1, this.projects().length));
      }, 4000);
    });
  }

  ngOnDestroy(): void {
    this.pause();
  }
}
