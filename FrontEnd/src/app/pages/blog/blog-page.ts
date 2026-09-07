import { Component, inject, signal, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { Container } from '../../shared/ui/container/container';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { AssetPipe } from '../../shared/pipes/asset.pipe';
import { BlogPostItem } from '../../core/models/content.model';
import { RouterLink } from '@angular/router';

/** Journal index — editorial cards of articles loaded from the API (detail pages added later). */
@Component({
  selector: 'app-blog-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Container, ScrollReveal, AssetPipe],
  template: `
    <section class="border-b border-hairline bg-bg pt-16 pb-14 sm:pt-20">
      <app-container>
        <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span class="text-accent">{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
          <span dir="ltr">{{ posts().length }}</span>
        </div>
        <h1
          appScrollReveal
          revealType="line"
          class="mt-8 max-w-4xl t-display font-display font-medium tracking-[-0.035em] text-ink"
        >
          {{ i18n.pick(t.title) }}
        </h1>
        <p appScrollReveal [revealDelay]="120" class="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          {{ i18n.pick(t.intro) }}
        </p>
      </app-container>
    </section>

    <section class="py-16 sm:py-20">
      <app-container>
        @if (loading()) {
          <div class="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            @for (i of skeletons; track i) {
              <div class="animate-pulse">
                <div class="aspect-[16/10] bg-hairline/60"></div>
                <div class="mt-4 h-3 w-1/3 bg-hairline/40"></div>
                <div class="mt-3 h-6 w-2/3 bg-hairline/60"></div>
                <div class="mt-3 h-3 w-full bg-hairline/40"></div>
              </div>
            }
          </div>
        } @else {
          <div class="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            @for (post of posts(); track post.slug; let i = $index) {
              <a [routerLink]="['/blog', post.slug]" appScrollReveal [revealDelay]="(i % 3) * 70" class="group block">
                <div appScrollReveal revealType="line" class="aspect-[16/10] overflow-hidden bg-hairline/40">
                  @if (post.cover) {
                    <img
                      [src]="post.cover | asset"
                      [alt]="i18n.pick(post.title)"
                      loading="lazy"
                      decoding="async"
                      class="h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-[1.04] group-hover:grayscale-0"
                    />
                  }
                </div>
                <div class="mt-4 flex items-center gap-3 font-mono text-xs text-muted">
                  <span class="uppercase tracking-[0.12em] text-accent">{{ post.category }}</span>
                  @if (post.author) {
                    <span aria-hidden="true">·</span>
                    <span>{{ post.author }}</span>
                  }
                </div>
                <h2 class="mt-3 font-display text-xl font-medium leading-snug tracking-[-0.015em] text-ink transition-colors group-hover:text-accent">
                  {{ i18n.pick(post.title) }}
                </h2>
                <p class="mt-2 text-sm leading-relaxed text-muted">{{ i18n.pick(post.excerpt) }}</p>
              </a>
            }
          </div>

          @if (posts().length === 0) {
            <p class="py-16 text-center text-muted">{{ i18n.pick(t.empty) }}</p>
          }
        }
      </app-container>
    </section>
  `,
})
export class BlogPage {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);
  private readonly content = inject(PublicContentService);

  protected readonly posts = signal<BlogPostItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly skeletons = [0, 1, 2, 3, 4, 5];

  protected readonly t = {
    eyebrow: { en: 'Insights', ar: 'الرؤى' },
    title: { en: 'Perspectives on place and practice.', ar: 'رؤىٌ في المكان والممارسة.' },
    intro: {
      en: 'Architecture, engineering, and hospitality explored through the places we design.',
      ar: 'قراءاتٌ في العمارة والهندسة والضيافة من خلال الأماكن التي نصمّمها.',
    },
    empty: { en: 'No articles published yet.', ar: 'لا توجد مقالاتٌ منشورة بعد.' },
  };

  constructor() {
    this.seo.update({
      title: 'Insights',
      description: 'MSP perspectives on architecture, engineering, hospitality, and designing for place in Saudi Arabia.',
    });

    // Browser-only fetch: keeps the route prerenderable (static skeleton shell).
    afterNextRender(() => {
      this.content.posts().subscribe({
        next: (list) => {
          this.posts.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }
}
