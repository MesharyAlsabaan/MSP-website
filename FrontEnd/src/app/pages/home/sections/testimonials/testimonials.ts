import { Component, inject, signal, computed, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { Section } from '../../../../shared/ui/section/section';
import { Container } from '../../../../shared/ui/container/container';
import { ScrollReveal } from '../../../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { Testimonial as TestimonialModel } from '../../../../core/models/content.model';

interface L {
  en: string;
  ar: string;
}

/** Unified quote shape used for published API data. */
interface Quote {
  quote: L;
  name: L;
  role: L;
}

/** Section 06 — Words: a lead client quote with two supporting notes (from the API). */
@Component({
  selector: 'app-testimonials',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Section, Container, ScrollReveal],
  template: `
    @if (lead()) {
    <app-section>
      <app-container>
        <div
          class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted"
        >
          <span class="text-accent">(06)</span>
          <span>{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
        </div>

        @if (lead(); as ld) {
          <figure class="mt-12 max-w-4xl">
            <blockquote
              appScrollReveal
              class="font-display text-3xl font-medium leading-[1.25] tracking-[-0.02em] text-ink sm:text-4xl lg:text-5xl"
            >
              <span class="text-accent">&ldquo;</span>{{ i18n.pick(ld.quote)
              }}<span class="text-accent">&rdquo;</span>
            </blockquote>
            <figcaption
              appScrollReveal
              [revealDelay]="120"
              class="mt-8 font-mono text-xs uppercase tracking-[0.15em] text-muted"
            >
              <span class="text-ink">{{ i18n.pick(ld.name) }}</span> — {{ i18n.pick(ld.role) }}
            </figcaption>
          </figure>
        }

        @if (supporting().length) {
          <div class="mt-16 grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-2">
            @for (item of supporting(); track $index; let i = $index) {
              <figure appScrollReveal [revealDelay]="i * 90" class="bg-bg p-8 lg:p-10">
                <blockquote class="text-lg leading-relaxed text-ink">
                  {{ i18n.pick(item.quote) }}
                </blockquote>
                <figcaption class="mt-6 font-mono text-xs uppercase tracking-[0.13em] text-muted">
                  <span class="text-accent">{{ i18n.pick(item.name) }}</span> — {{ i18n.pick(item.role) }}
                </figcaption>
              </figure>
            }
          </div>
        }
      </app-container>
    </app-section>
    }
  `,
})
export class Testimonials {
  protected readonly i18n = inject(TranslationService);
  private readonly content = inject(PublicContentService);

  /** Only testimonials returned by the public (published) API are shown. */
  private readonly fetched = signal<Quote[]>([]);

  protected readonly lead = computed<Quote | null>(() => {
    const api = this.fetched();
    return api[0] ?? null;
  });

  protected readonly supporting = computed<Quote[]>(() => {
    const api = this.fetched();
    return api.slice(1, 3);
  });

  constructor() {
    afterNextRender(() => {
      this.content.testimonials().subscribe({
        next: (list) => this.fetched.set(list.map(toQuote)),
        error: () => this.fetched.set([]),
      });
    });
  }

  protected readonly t = {
    eyebrow: { en: 'Words', ar: 'آراء عملائنا' },
  };

}

/** Map an API testimonial to the unified quote shape (clientName is single-language). */
function toQuote(t: TestimonialModel): Quote {
  return {
    quote: t.quote,
    name: { en: t.clientName, ar: t.clientName },
    role: t.role,
  };
}
