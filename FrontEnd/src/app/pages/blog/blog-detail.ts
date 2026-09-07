import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Container } from '../../shared/ui/container/container';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { AssetPipe } from '../../shared/pipes/asset.pipe';
import { Lightbox } from '../../shared/ui/lightbox/lightbox';
import { PublicContentService } from '../../core/services/public-content.service';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { BlogPostItem } from '../../core/models/content.model';
import { assetUrl } from '../../core/utils/asset-url';
import { parseArticleBody } from './article-body';

type LoadState =
  | { status: 'loading'; post: null }
  | { status: 'loaded'; post: BlogPostItem }
  | { status: 'notfound'; post: null };

@Component({
  selector: 'app-blog-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Container, ScrollReveal, AssetPipe, Lightbox],
  template: `
    @if (status() === 'loading') {
      <section class="py-20">
        <app-container>
          <div class="animate-pulse">
            <div class="h-3 w-28 bg-hairline/60"></div>
            <div class="mt-8 h-14 max-w-3xl bg-hairline/60"></div>
            <div class="mt-5 h-5 max-w-xl bg-hairline/40"></div>
          </div>
        </app-container>
      </section>
    } @else if (post(); as article) {
      <article>
        <header class="border-b border-hairline bg-bg pb-12 pt-14 sm:pb-16 sm:pt-20">
          <app-container>
            <a routerLink="/blog" class="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent">
              <span class="dir-flip">&larr;</span> {{ i18n.pick(t.back) }}
            </a>
            <div class="mt-10 flex flex-wrap items-center gap-4 font-mono text-xs uppercase tracking-[0.16em] text-muted">
              <span class="text-accent">{{ article.category }}</span>
              @if (article.publishedAt) {
                <span aria-hidden="true">·</span>
                <time [attr.datetime]="article.publishedAt" dir="ltr">{{ publishedDate(article.publishedAt) }}</time>
              }
            </div>
            <h1 appScrollReveal revealType="line" class="mt-6 max-w-5xl t-display font-display font-medium tracking-[-0.035em] text-ink">
              {{ i18n.pick(article.title) }}
            </h1>
            <p appScrollReveal [revealDelay]="100" class="mt-6 max-w-3xl text-lg leading-relaxed text-muted sm:text-xl">
              {{ i18n.pick(article.excerpt) }}
            </p>
            @if (article.author) {
              <p class="mt-7 font-mono text-xs uppercase tracking-[0.14em] text-muted">{{ article.author }}</p>
            }
          </app-container>
        </header>

        @if (article.cover) {
          <div class="mx-auto max-w-[1280px] px-5 py-10 sm:px-8 sm:py-16">
            <div appScrollReveal revealType="line" class="aspect-[16/9] overflow-hidden bg-hairline/30">
              <img [src]="article.cover | asset" [alt]="i18n.pick(article.title)" fetchpriority="high" class="h-full w-full object-cover" />
            </div>
          </div>
        }

        <section class="pb-16 sm:pb-24">
          <app-container>
            <div class="mx-auto max-w-3xl">
              @for (block of blocks(); track $index) {
                @if (block.type === 'heading') {
                  <h2 appScrollReveal class="mb-5 mt-12 font-display text-3xl font-medium tracking-[-0.025em] text-ink sm:text-4xl">{{ block.text }}</h2>
                } @else {
                  <p appScrollReveal class="mb-7 whitespace-pre-line text-lg leading-[1.9] text-ink/85">{{ block.text }}</p>
                }
              }
            </div>
          </app-container>
        </section>

        @if (gallery().length) {
          <section class="border-t border-hairline pb-20 pt-12 sm:pb-28 sm:pt-16">
            <app-container>
              <div class="mb-8 flex items-center gap-5 font-mono text-xs uppercase tracking-[0.16em] text-muted">
                <span class="text-accent">{{ i18n.pick(t.gallery) }}</span>
                <span class="h-px flex-1 bg-hairline"></span>
                <span dir="ltr">{{ gallery().length }}</span>
              </div>
              <div class="grid gap-6 sm:grid-cols-2">
                @for (image of gallery(); track image; let index = $index) {
                  <button type="button" (click)="openViewer(index)" (contextmenu)="blockSave($event)"
                    [attr.aria-label]="i18n.pick(t.enlarge) + ': ' + i18n.pick(article.title)"
                    class="group block aspect-[3/2] w-full cursor-zoom-in overflow-hidden bg-hairline/30">
                    <img [src]="image | asset" [alt]="i18n.pick(article.title) + ' — ' + (index + 1)" loading="lazy" decoding="async" draggable="false"
                      (dragstart)="blockSave($event)" class="pointer-events-none h-full w-full select-none object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  </button>
                }
              </div>
            </app-container>
          </section>
          <app-lightbox [images]="gallery()" [caption]="i18n.pick(article.title)" [(index)]="viewerIndex" [(open)]="viewerOpen" />
        }
      </article>
    } @else {
      <section class="flex min-h-[60vh] items-center">
        <app-container>
          <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">404</p>
          <h1 class="mt-4 font-display text-4xl font-medium text-ink sm:text-5xl">{{ i18n.pick(t.notFound) }}</h1>
          <a routerLink="/blog" class="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">
            <span class="dir-flip">&larr;</span> {{ i18n.pick(t.back) }}
          </a>
        </app-container>
      </section>
    }
  `,
})
export class BlogDetail {
  protected readonly i18n = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(PublicContentService);
  private readonly seo = inject(SeoService);

  private readonly state = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('slug') ?? ''),
      switchMap((slug) =>
        this.content.postBySlug(slug).pipe(
          map((post) => ({ status: 'loaded', post } as LoadState)),
          catchError(() => of({ status: 'notfound', post: null } as LoadState)),
          startWith({ status: 'loading', post: null } as LoadState),
        ),
      ),
    ),
    { initialValue: { status: 'loading', post: null } as LoadState },
  );

  protected readonly status = computed(() => this.state().status);
  protected readonly post = computed(() => this.state().post);
  protected readonly blocks = computed(() => {
    const post = this.post();
    return post ? parseArticleBody(this.i18n.pick(post.body)) : [];
  });
  protected readonly gallery = computed(() => this.post()?.gallery ?? []);
  protected readonly viewerOpen = signal(false);
  protected readonly viewerIndex = signal(0);

  protected readonly t = {
    back: { en: 'All insights', ar: 'كل الرؤى' },
    gallery: { en: 'From the project', ar: 'من المشروع' },
    enlarge: { en: 'View larger', ar: 'عرض مكبّر' },
    notFound: { en: 'Article not found.', ar: 'المقال غير موجود.' },
  };

  constructor() {
    effect(() => {
      const post = this.post();
      if (post) {
        this.seo.update({
          title: this.i18n.pick(post.seoTitle ?? post.title),
          description: this.i18n.pick(post.seoDescription ?? post.excerpt),
          image: assetUrl(post.cover),
        });
      } else if (this.status() === 'notfound') {
        this.seo.update({ title: this.i18n.pick({ en: 'Insights', ar: 'الرؤى' }) });
      }
    });
  }

  protected publishedDate(value: string): string {
    return new Intl.DateTimeFormat(this.i18n.lang() === 'ar' ? 'ar-SA' : 'en-GB', {
      year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date(value));
  }

  protected openViewer(index: number): void {
    this.viewerIndex.set(index);
    this.viewerOpen.set(true);
  }

  protected blockSave(event: Event): boolean {
    event.preventDefault();
    return false;
  }
}
