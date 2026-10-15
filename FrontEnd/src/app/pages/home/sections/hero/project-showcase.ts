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
  TransferState,
  makeStateKey,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of, timeout } from 'rxjs';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { AssetPipe } from '../../../../shared/pipes/asset.pipe';
import { Project } from '../../../../core/data/projects';
import { LocPipe } from '../../../../shared/pipes/loc.pipe';
import { SrcsetPipe } from '../../../../shared/pipes/srcset.pipe';

/** The four showcased projects, carried from the prerendered page to the browser. */
const SHOWCASE_STATE = makeStateKey<Project[]>('showcase-projects');

/** Just the fields the showcase renders — keeps the inlined state small. */
function slim(p: Project): Project {
  const { slug, no, title, typology, location, cover, featured } = p;
  return { slug, no, title, typology, location, cover, featured } as Project;
}

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
  imports: [RouterLink, AssetPipe, LocPipe, SrcsetPipe],
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
            [routerLink]="['/projects', p.slug] | loc"
            (mouseenter)="setActive(i)"
            (focus)="setActive(i)"
            [attr.aria-label]="i18n.pick(p.title)"
            class="group relative block min-w-[56px] overflow-hidden transition-[flex-grow] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            [style.flexGrow]="active() === i ? 6 : 1"
          >
            <!-- Every panel loads the size the EXPANDED panel needs, so it is
                 sharp the moment it opens. Same srcset + sizes as the phone
                 filmstrip, so a project's image is fetched once, not twice. -->
            <img
              sizes="(min-width: 1200px) 760px, (min-width: 640px) 64vw, 82vw"
              [attr.srcset]="p.cover | srcset"
              [src]="p.cover | asset"
              [alt]="i18n.pick(p.title)"
              width="1600"
              height="1000"
              [attr.loading]="i === 0 ? null : 'lazy'"
              [attr.fetchpriority]="i === 0 ? 'high' : null"
              class="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              [class.grayscale]="active() !== i"
              [class.scale-105]="active() === i"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-scrim/85 via-scrim/15 to-transparent"
            ></div>

            <!-- Collapsed: vertical label -->
            <div
              class="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
              [class.opacity-0]="active() === i"
              [class.opacity-100]="active() !== i"
              aria-hidden="true"
            >
              <span
                class="whitespace-nowrap font-mono text-xs uppercase tracking-[0.15em] text-on-scrim/90 [writing-mode:vertical-rl] rotate-180"
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
              <p class="font-mono text-xs uppercase tracking-[0.15em] text-on-scrim/70">
                <span class="text-accent">{{ p.no }}</span> ·
                {{ i18n.pick(p.typology) }} · {{ i18n.pick(p.location) }}
              </p>
              <h3 class="mt-2 font-display text-2xl font-medium text-on-scrim lg:text-3xl">
                {{ i18n.pick(p.title) }}
              </h3>
              <span
                class="mt-3 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-on-scrim"
              >
                {{ i18n.pick(t.view) }}
                <span class="dir-flip text-accent transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">&rarr;</span>
              </span>
            </div>
          </a>
        }
      </div>

      <!-- Mobile: swipeable filmstrip -->
      <div
        class="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        @for (p of projects(); track p.slug; let i = $index) {
          <a
            [routerLink]="['/projects', p.slug] | loc"
            class="block w-[82%] shrink-0 snap-start"
          >
            <div class="aspect-[4/3] overflow-hidden">
              <img
                sizes="(min-width: 1200px) 760px, (min-width: 640px) 64vw, 82vw"
                [attr.srcset]="p.cover | srcset"
                [src]="p.cover | asset"
                [alt]="i18n.pick(p.title)"
                width="1600"
                height="1200"
                [attr.loading]="i === 0 ? null : 'lazy'"
                [attr.fetchpriority]="i === 0 ? 'high' : null"
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
    const state = inject(TransferState);

    if (!this.isBrowser) {
      // Prerender: put the showcase in the HTML so its first image is found by
      // the browser's preload scanner instead of after the app boots. A slow
      // or failing API leaves the skeleton, exactly as before.
      this.content
        .projects()
        .pipe(
          timeout(8000),
          catchError(() => of(null)),
        )
        .subscribe((list) => {
          if (!list?.length) return;
          this.fetched.set(list);
          this.loading.set(false);
          state.set(SHOWCASE_STATE, this.projects().map(slim));
        });
      return;
    }

    // Start from what was prerendered so hydration matches the HTML.
    const prerendered = state.get(SHOWCASE_STATE, null);
    if (prerendered) {
      this.fetched.set(prerendered);
      this.loading.set(false);
      state.remove(SHOWCASE_STATE);
    }

    afterNextRender(() => {
      this.autoOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resume();
      // Always refresh: the prerendered list is from the last deploy, and the
      // admin may have changed the featured projects since.
      this.content.projects().subscribe({
        next: (list) => {
          this.fetched.set(list);
          this.loading.set(false);
          if (this.active() >= this.projects().length) this.active.set(0);
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
