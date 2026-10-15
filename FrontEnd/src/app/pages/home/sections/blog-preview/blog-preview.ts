import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Section } from '../../../../shared/ui/section/section';
import { Container } from '../../../../shared/ui/container/container';
import { ScrollReveal } from '../../../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { BlogPostItem } from '../../../../core/models/content.model';
import { RouterLink } from '@angular/router';
import { LocPipe } from '../../../../shared/pipes/loc.pipe';

interface L {
  en: string;
  ar: string;
}

/** Row shape rendered for each published post. */
interface Post {
  readonly key: string;
  readonly title: L;
  readonly category: string;
  readonly date: L;
  readonly readingTime: L;
}

/** Section 09 — Journal: latest writing as an editorial index of rows. */
@Component({
  selector: 'app-blog-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Section, Container, ScrollReveal, RouterLink, LocPipe],
  template: `
    @if (posts().length) {
    <app-section>
      <app-container>
        <div
          class="flex flex-wrap items-end justify-between gap-6 border-b border-hairline pb-8"
        >
          <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
            <span class="text-accent">(09)</span>
            <span>{{ i18n.pick(t.eyebrow) }}</span>
          </div>
          <a
            [routerLink]="'/blog' | loc"
            class="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-ink"
          >
            {{ i18n.pick(t.all) }}
            <span class="dir-flip text-accent transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">&rarr;</span>
          </a>
        </div>

        <ul>
          @for (post of posts(); track post.key) {
            <li appScrollReveal class="group border-b border-hairline">
              <a
                [routerLink]="'/blog' | loc"
                class="grid grid-cols-12 items-baseline gap-4 py-8 transition-[padding] duration-500 hover:ps-3"
              >
                <span class="col-span-12 font-mono text-xs uppercase tracking-[0.12em] text-muted sm:col-span-3 lg:col-span-2">
                  {{ post.category }}
                </span>
                <h3
                  class="col-span-12 font-display text-2xl font-medium tracking-[-0.02em] text-ink transition-colors group-hover:text-accent sm:col-span-6 lg:col-span-7 sm:text-3xl"
                >
                  {{ i18n.pick(post.title) }}
                </h3>
                <span class="col-span-6 font-mono text-xs text-muted sm:col-span-2 sm:text-end lg:col-span-2">
                  {{ i18n.pick(post.date) }}
                </span>
                <span class="col-span-6 text-end font-mono text-xs text-muted sm:col-span-1">
                  {{ i18n.pick(post.readingTime) }}
                </span>
              </a>
            </li>
          }
        </ul>
      </app-container>
    </app-section>
    }
  `,
})
export class BlogPreview {
  protected readonly i18n = inject(TranslationService);
  private readonly content = inject(PublicContentService);

  /** Published API posts only; the section stays hidden until there is at least one. */
  private readonly fetched = signal<Post[]>([]);

  protected readonly posts = computed<Post[]>(() => this.fetched().slice(0, 3));

  constructor() {
    this.content.posts().subscribe({
      next: (list) => this.fetched.set(list.map(toPost)),
      error: () => {},
    });
  }

  protected readonly t = {
    eyebrow: { en: 'Insights', ar: 'الرؤى' },
    all: { en: 'All writing', ar: 'كل المقالات' },
  };
}

/** Arabic minute count, with the dual/plural forms Arabic actually uses. */
function arabicMinutes(n: number): string {
  const digits = n.toLocaleString('ar-EG-u-nu-latn');
  if (n === 1) return 'دقيقة واحدة';
  if (n === 2) return 'دقيقتان';
  if (n <= 10) return `${digits} دقائق`;
  return `${digits} دقيقة`;
}

/** Reading time from the post body, at ~200 words per minute. */
function readingTime(post: BlogPostItem): L {
  const words = `${post.body?.en ?? ''} ${post.body?.ar ?? ''}`.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 2 / 200));
  return { en: `${minutes} min`, ar: arabicMinutes(minutes) };
}

/** Maps an API post onto the row this section renders. */
function toPost(post: BlogPostItem): Post {
  const published = post.publishedAt ? new Date(post.publishedAt) : null;
  const fmt = (locale: string) =>
    published
      ? published.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
      : '';
  return {
    key: post.id,
    title: post.title,
    category: post.category,
    date: { en: fmt('en-GB'), ar: fmt('ar-EG-u-nu-latn') },
    readingTime: readingTime(post),
  };
}
