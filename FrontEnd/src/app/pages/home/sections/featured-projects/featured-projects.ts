import {
  Component,
  inject,
  signal,
  computed,
  afterNextRender,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Section } from '../../../../shared/ui/section/section';
import { Container } from '../../../../shared/ui/container/container';
import { ScrollReveal } from '../../../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { AssetPipe } from '../../../../shared/pipes/asset.pipe';
import { Project } from '../../../../core/data/projects';

/** Section 03 — Selected Works: a uniform, aligned grid of featured projects. */
@Component({
  selector: 'app-featured-projects',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Section, Container, ScrollReveal, AssetPipe],
  template: `
    <app-section>
      <app-container>
        <div
          class="flex flex-wrap items-end justify-between gap-6 border-b border-hairline pb-8"
        >
          <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
            <span class="text-accent">(03)</span>
            <span>{{ i18n.pick(t.eyebrow) }}</span>
          </div>
          <a
            routerLink="/projects"
            class="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-ink"
          >
            {{ i18n.pick(t.all) }}
            <span class="dir-flip text-accent transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
          </a>
        </div>

        @if (loading()) {
          <div class="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2">
            @for (item of skeletons; track item) {
              <div class="animate-pulse">
                <div class="aspect-[4/3] bg-hairline/40"></div>
                <div class="mt-5 h-7 w-2/3 bg-hairline/50"></div>
                <div class="mt-3 h-3 w-1/3 bg-hairline/40"></div>
              </div>
            }
          </div>
        } @else if (projects().length) {
          <div class="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2">
            @for (project of projects(); track project.slug) {
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
                <h3
                  class="font-display text-2xl font-medium tracking-[-0.02em] text-ink transition-colors group-hover:text-accent sm:text-3xl"
                >
                  <span class="font-mono text-sm align-top text-accent">{{ project.no }}&ensp;</span>
                  {{ i18n.pick(project.title) }}
                </h3>
                @if (project.year) {
                  <span class="shrink-0 font-mono text-xs text-muted">{{ project.year }}</span>
                }
              </div>
              <p class="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                {{ i18n.pick(project.typology) }} · {{ i18n.pick(project.location) }}
              </p>
            </a>
            }
          </div>
        } @else {
          <p class="py-16 text-center font-mono text-xs uppercase tracking-[0.14em] text-muted">
            {{ i18n.pick(t.empty) }}
          </p>
        }
      </app-container>
    </app-section>
  `,
})
export class FeaturedProjects {
  protected readonly i18n = inject(TranslationService);
  private readonly content = inject(PublicContentService);

  private readonly fetched = signal<Project[]>([]);
  protected readonly loading = signal(true);
  protected readonly skeletons = [0, 1, 2, 3];

  protected readonly projects = computed<Project[]>(() => {
    const api = this.fetched();
    // Prefer what the admin marked as featured; until anything is marked, the
    // newest published work stands in so the section is never empty.
    const featured = api.filter((p) => p.featured);
    return (featured.length ? featured : api).slice(0, 4);
  });

  constructor() {
    afterNextRender(() => {
      this.content.projects().subscribe({
        next: (list) => {
          this.fetched.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  protected readonly t = {
    eyebrow: { en: 'Selected Works', ar: 'مختاراتٌ من أعمالنا' },
    all: { en: 'Full index', ar: 'الأرشيف الكامل' },
    empty: { en: 'No published projects yet.', ar: 'لا توجد مشاريع منشورة بعد.' },
  };
}
