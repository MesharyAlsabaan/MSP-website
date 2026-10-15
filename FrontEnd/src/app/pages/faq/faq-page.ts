import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Container } from '../../shared/ui/container/container';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';

interface L {
  en: string;
  ar: string;
}

/** FAQ page — an accessible accordion of common questions. */
@Component({
  selector: 'app-faq-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Container, ScrollReveal],
  template: `
    <section class="border-b border-hairline bg-bg pt-16 pb-14 sm:pt-20">
      <app-container>
        <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span class="text-accent">{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
        </div>
        <h1
          appScrollReveal
          revealType="line"
          class="mt-8 max-w-4xl t-display font-display font-medium tracking-[-0.035em] text-ink"
        >
          {{ i18n.pick(t.title) }}
        </h1>
      </app-container>
    </section>

    <section class="py-16 sm:py-20">
      <app-container>
        <div class="mx-auto max-w-3xl border-t border-hairline">
          @for (qa of faqs; track qa.q.en) {
            <details appScrollReveal class="group border-b border-hairline">
              <summary
                class="flex cursor-pointer list-none items-center justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden"
              >
                <span class="font-display text-lg font-medium text-ink transition-colors group-hover:text-accent sm:text-xl">
                  {{ i18n.pick(qa.q) }}
                </span>
                <span
                  class="shrink-0 text-2xl font-light text-accent transition-transform duration-300 group-open:rotate-45"
                  aria-hidden="true"
                >+</span>
              </summary>
              <p class="pb-6 pe-10 leading-relaxed text-muted">{{ i18n.pick(qa.a) }}</p>
            </details>
          }
        </div>
      </app-container>
    </section>
  `,
})
export class FaqPage {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);

  protected readonly t = {
    eyebrow: { en: 'FAQ', ar: 'الأسئلة الشائعة' },
    title: { en: 'Questions, answered.', ar: 'أسئلةٌ وأجوبتها.' },
  };

  protected readonly faqs: readonly { q: L; a: L }[] = [
    {
      q: { en: 'Do you provide both architecture and engineering?', ar: 'هل تقدّمون العمارة والهندسة معاً؟' },
      a: {
        en: 'Yes. Architecture, structural, and MEP engineering, urban planning, and project management are all in-house — one accountable team from brief to handover.',
        ar: 'نعم. العمارة والهندسة الإنشائية والكهروميكانيكية والتخطيط العمراني وإدارة المشاريع جميعها داخلية — فريقٌ واحد مسؤول من الفكرة حتى التسليم.',
      },
    },
    {
      q: { en: 'What size of project do you take on?', ar: 'ما حجم المشاريع التي تتولّونها؟' },
      a: {
        en: 'From a single villa to a city masterplan. Every project, large or small, is led by a principal.',
        ar: 'من فيلا واحدة إلى مخطّطٍ شاملٍ لمدينة. كل مشروع، كبيراً كان أو صغيراً، يقوده أحد الشركاء.',
      },
    },
    {
      q: { en: 'Where do you work?', ar: 'أين تعملون؟' },
      a: {
        en: 'We are based in Riyadh and work across the Kingdom, including the major Vision 2030 developments.',
        ar: 'مقرّنا الرياض ونعمل في أنحاء المملكة، بما في ذلك مشاريع رؤية 2030 الكبرى.',
      },
    },
    {
      q: { en: 'How do we start?', ar: 'كيف نبدأ؟' },
      a: {
        en: 'Send us a short brief through the contact page. We reply within one business day and propose a first conversation.',
        ar: 'أرسل لنا نبذةً مختصرة عبر صفحة التواصل. نردّ خلال يوم عملٍ واحد ونقترح لقاءً أولاً.',
      },
    },
    {
      q: { en: 'Do you work to Saudi codes and standards?', ar: 'هل تعملون وفق الأكواد والمعايير السعودية؟' },
      a: {
        en: 'Always. We design to the Saudi Building Code (SBC) and relevant ISO and sustainability standards, including LEED where required.',
        ar: 'دائماً. نصمّم وفق كود البناء السعودي (SBC) ومعايير الآيزو والاستدامة ذات الصلة، بما في ذلك ليد عند الحاجة.',
      },
    },
  ];

  constructor() {
    this.seo.update({
      title: this.i18n.pick({ en: 'FAQ', ar: 'الأسئلة الشائعة' }),
      description: this.i18n.pick({
        en: 'Common questions about working with MSP Consultants.',
        ar: 'أسئلة شائعة حول العمل مع MSP للاستشارات.',
      }),
    });
  }
}
