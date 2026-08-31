import { Component, inject, signal, computed, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Container } from '../../shared/ui/container/container';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { AssetPipe } from '../../shared/pipes/asset.pipe';
import { Project } from '../../core/data/projects';
import { DESIGN_CATEGORIES, SECTORS, Term, label } from '../../core/data/taxonomy';
import { countsFor, filterProjects, sectorsOf } from '../../core/data/project-filter';

/**
 * Works index — a two-level filter over a uniform grid.
 *
 * The top row is the design field, the second the sector; picking one from each
 * intersects them. Both rows list the whole taxonomy so the page reads the same
 * every visit, with chips that would empty the grid dimmed rather than hidden.
 */
@Component({
  selector: 'app-projects',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Container, ScrollReveal, AssetPipe],
  template: `
    <!-- Page header -->
    <section class="border-b border-hairline bg-bg pt-16 pb-12 sm:pt-20">
      <app-container>
        <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span class="text-accent">{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
          <span dir="ltr">{{ filtered().length }} / {{ projects().length }}</span>
        </div>
        <h1
          appScrollReveal
          revealType="line"
          class="mt-8 max-w-4xl t-display font-display font-medium tracking-[-0.035em] text-ink"
        >
          {{ i18n.pick(t.title) }}
        </h1>
        <p appScrollReveal [revealDelay]="120" class="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          {{ i18n.pick(t.intro) }}
        </p>
      </app-container>
    </section>

    <!-- Two-level filter: design field over sector -->
    <section class="sticky top-20 z-30 border-b border-hairline bg-bg/90 py-5 backdrop-blur-md">
      <app-container>
        <!-- Row 1 — design field. Carries the visual weight of the two. -->
        <div class="flex flex-wrap items-center gap-x-2 gap-y-2.5">
          <button type="button" (click)="setCategory(null)" [class]="topChip(category() === null, true)">
            {{ i18n.pick(t.all) }}
          </button>
          @for (term of designCategories; track term.key) {
            <button
              type="button"
              [disabled]="categoryCount(term.key) === 0"
              (click)="setCategory(term.key)"
              [class]="topChip(category() === term.key, categoryCount(term.key) > 0)"
            >
              {{ i18n.pick(term) }}
            </button>
          }
        </div>

        <!-- Row 2 — sector. Quieter, and clearly subordinate to the row above. -->
        <div class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-hairline/70 pt-3">
          <button type="button" (click)="setSector(null)" [class]="subChip(sector() === null, true)">
            {{ i18n.pick(t.allSectors) }}
          </button>
          @for (term of sectors; track term.key) {
            <button
              type="button"
              [disabled]="sectorCount(term.key) === 0"
              (click)="setSector(term.key)"
              [class]="subChip(sector() === term.key, sectorCount(term.key) > 0)"
            >
              {{ i18n.pick(term) }}
            </button>
          }
        </div>
      </app-container>
    </section>

    <!-- Grid -->
    <section class="py-16 sm:py-20">
      <app-container>
        @if (loading()) {
          <div class="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            @for (i of skeletons; track i) {
              <div class="animate-pulse">
                <div class="aspect-[4/3] bg-hairline/60"></div>
                <div class="mt-5 h-6 w-2/3 bg-hairline/60"></div>
                <div class="mt-3 h-3 w-1/3 bg-hairline/40"></div>
              </div>
            }
          </div>
        } @else {
          <div class="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            @for (project of filtered(); track project.slug) {
              <a [routerLink]="['/projects', project.slug]" class="group block">
                <div appScrollReveal revealType="line" class="aspect-[4/3] overflow-hidden bg-hairline/40">
                  @if (project.cover) {
                    <img
                      [src]="project.cover | asset"
                      [alt]="i18n.pick(project.title)"
                      loading="lazy"
                      decoding="async"
                      class="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                    />
                  }
                </div>
                <div class="mt-5 flex items-baseline justify-between gap-4">
                  <h2
                    class="font-display text-xl font-medium tracking-[-0.02em] text-ink transition-colors group-hover:text-accent sm:text-2xl"
                  >
                    <span class="font-mono text-xs align-top text-accent">{{ project.no }}&ensp;</span>
                    {{ i18n.pick(project.title) }}
                  </h2>
                  @if (project.year) {
                    <span data-project-year class="shrink-0 font-mono text-xs text-muted">{{ project.year }}</span>
                  }
                </div>
                <p class="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                  {{ i18n.pick(cardLabel(project)) }} · {{ i18n.pick(project.location) }}
                </p>
              </a>
            }
          </div>

          @if (filtered().length === 0) {
            <p class="py-16 text-center text-muted">{{ i18n.pick(t.empty) }}</p>
          }
        }
      </app-container>
    </section>
  `,
})
export class Projects {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);
  private readonly content = inject(PublicContentService);

  protected readonly projects = signal<Project[]>([]);
  protected readonly loading = signal(true);
  protected readonly skeletons = [0, 1, 2, 3, 4, 5];

  protected readonly designCategories = DESIGN_CATEGORIES;
  protected readonly sectors = SECTORS;

  protected readonly category = signal<string | null>(null);
  protected readonly sector = signal<string | null>(null);

  /** Both axes at once: a project must satisfy every active one. */
  protected readonly filtered = computed(() =>
    filterProjects(this.projects(), this.category(), this.sector()),
  );

  // Each row is counted against the OTHER row's selection, so a chip is dimmed
  // exactly when clicking it would leave the visitor with an empty grid.
  private readonly categoryCounts = computed(() =>
    countsFor(this.projects(), 'category', DESIGN_CATEGORIES, this.sector()),
  );
  private readonly sectorCounts = computed(() =>
    countsFor(this.projects(), 'sector', SECTORS, this.category()),
  );

  protected categoryCount(key: string): number {
    return this.categoryCounts().get(key) ?? 0;
  }

  protected sectorCount(key: string): number {
    return this.sectorCounts().get(key) ?? 0;
  }

  /** Cards name the first sector. The legacy label is a display-only
   *  fallback for a record nobody has classified yet — it filters nothing. */
  protected cardLabel(project: Project): Term {
    const [first] = sectorsOf(project);
    return first ? label(SECTORS, first) : project.typology;
  }

  protected readonly t = {
    eyebrow: { en: 'Works', ar: 'الأعمال' },
    title: { en: 'Selected works.', ar: 'أعمالٌ مختارة.' },
    intro: {
      en: 'Buildings, infrastructure, and places across the Kingdom — from civic landmarks to masterplans.',
      ar: 'مبانٍ وبنىً تحتية وأماكنُ في أنحاء المملكة — من المعالم العامة إلى المخطّطات الشاملة.',
    },
    all: { en: 'All', ar: 'الكل' },
    allSectors: { en: 'All sectors', ar: 'كل القطاعات' },
    empty: { en: 'No projects in this category yet.', ar: 'لا توجد مشاريع في هذه الفئة بعد.' },
  };

  constructor() {
    this.seo.update({
      title: 'Works',
      description:
        'Selected architecture and engineering projects by MSP Consultants across Saudi Arabia.',
    });

    // Browser-only fetch: keeps the route prerenderable (static skeleton shell).
    afterNextRender(() => {
      this.content.projects().subscribe({
        next: (list) => {
          this.projects.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  /** Changing one row clears the other only if the pair would show nothing. */
  protected setCategory(key: string | null): void {
    this.category.set(key);
    const sector = this.sector();
    if (sector !== null && this.sectorCount(sector) === 0) this.sector.set(null);
  }

  protected setSector(key: string | null): void {
    this.sector.set(key);
    const category = this.category();
    if (category !== null && this.categoryCount(category) === 0) this.category.set(null);
  }

  /** Top row: bigger type, and the active one goes solid dark. */
  protected topChip(active: boolean, enabled: boolean): string {
    const base =
      'rounded-full border px-4 py-2 text-sm font-medium tracking-[0.02em] transition-colors sm:px-5 sm:text-base';
    if (active) return `${base} border-ink bg-ink text-bg`;
    if (!enabled) return `${base} cursor-not-allowed border-hairline/60 text-muted/40`;
    return `${base} border-hairline text-ink hover:border-ink hover:bg-ink/5`;
  }

  /** Second row: the quieter mono chip the page already used. */
  protected subChip(active: boolean, enabled: boolean): string {
    const base =
      'rounded-full border px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.1em] transition-colors sm:text-xs';
    if (active) return `${base} border-ink bg-ink text-bg`;
    if (!enabled) return `${base} cursor-not-allowed border-hairline/60 text-muted/40`;
    return `${base} border-hairline text-muted hover:border-ink hover:text-ink`;
  }
}
