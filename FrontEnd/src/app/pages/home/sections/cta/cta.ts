import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Container } from '../../../../shared/ui/container/container';
import { ScrollReveal } from '../../../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../../../core/services/translation.service';
import { RouterLink } from '@angular/router';
import { LocPipe } from '../../../../shared/pipes/loc.pipe';

/** Section 10 — CTA: a full-bleed clay invitation to begin a project. */
@Component({
  selector: 'app-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Container, ScrollReveal, RouterLink, LocPipe],
  template: `
    <section class="bg-accent py-24 text-accent-ink sm:py-32">
      <app-container>
        <p class="font-mono text-xs uppercase tracking-[0.2em] text-accent-ink/70">
          {{ i18n.pick(t.kicker) }}
        </p>

        <div class="mt-8 grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-8">
          <h2
            appScrollReveal
            revealType="line"
            class="t-display font-display font-medium tracking-[-0.035em] lg:col-span-9"
          >
            {{ i18n.pick(t.headingPre)
            }}<span class="italic">{{ i18n.pick(t.headingEm) }}</span>
          </h2>

          <div class="lg:col-span-3 lg:pb-4">
            <a
              [routerLink]="'/contact' | loc"
              class="group inline-flex items-center gap-3 border-b border-accent-ink/40 pb-2 font-mono text-sm uppercase tracking-[0.12em] transition-colors hover:border-accent-ink"
            >
              {{ i18n.pick(t.cta) }}
              <span class="dir-flip transition-transform duration-300 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5">&rarr;</span>
            </a>
            <p class="mt-6 max-w-xs text-sm leading-relaxed text-accent-ink/80">
              {{ i18n.pick(t.note) }}
            </p>
          </div>
        </div>
      </app-container>
    </section>
  `,
})
export class Cta {
  protected readonly i18n = inject(TranslationService);

  protected readonly t = {
    kicker: { en: '(10) — Start a conversation', ar: '(10) — لنبدأ الحوار' },
    headingPre: { en: "Let's talk about ", ar: 'لنتحدّث عن ' },
    headingEm: { en: 'your project.', ar: 'مشروعك.' },
    cta: { en: 'Start a project', ar: 'ابدأ مشروعك' },
    note: {
      en: 'Tell us about your site, your brief, and the people it will serve. We will get back to you to arrange a first conversation.',
      ar: 'حدّثنا عن موقعك ومتطلباتك ومن سيخدمهم المشروع، وسنعود إليك لترتيب لقاء أولي.',
    },
  };
}
