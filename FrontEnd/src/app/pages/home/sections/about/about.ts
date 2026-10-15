import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Section } from '../../../../shared/ui/section/section';
import { Container } from '../../../../shared/ui/container/container';
import { ScrollReveal } from '../../../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../../../core/services/translation.service';

/** Section 01 — The Practice: a large statement of intent and core facts. */
@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Section, Container, ScrollReveal],
  template: `
    <app-section>
      <app-container>
        <div
          class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted"
        >
          <span class="text-accent">(01)</span>
          <span>{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
        </div>

        <div class="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div class="lg:col-span-7">
            <p
              appScrollReveal
              revealType="line"
              class="font-display text-3xl font-medium leading-[1.18] tracking-[-0.02em] text-ink sm:text-4xl lg:text-[2.75rem]"
            >
              {{ i18n.pick(t.statementPre)
              }}<span class="text-accent">{{ i18n.pick(t.statementEm) }}</span
              >{{ i18n.pick(t.statementPost) }}
            </p>
          </div>

          <div class="lg:col-span-4 lg:col-start-9">
            <p appScrollReveal class="leading-relaxed text-muted">
              {{ i18n.pick(t.para1) }}
            </p>
            <p appScrollReveal [revealDelay]="100" class="mt-4 leading-relaxed text-muted">
              {{ i18n.pick(t.para2) }}
            </p>
          </div>
        </div>

        <dl
          class="mt-16 grid grid-cols-2 gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-4"
        >
          @for (fact of i18n.pick(t.facts); track fact.label; let i = $index) {
            <div appScrollReveal [revealDelay]="i * 80" class="bg-bg p-6 lg:p-8">
              <dt class="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                {{ fact.label }}
              </dt>
              <dd class="mt-3 font-display text-xl leading-tight text-ink">
                {{ fact.value }}
              </dd>
            </div>
          }
        </dl>
      </app-container>
    </app-section>
  `,
})
export class About {
  protected readonly i18n = inject(TranslationService);

  protected readonly t = {
    eyebrow: { en: 'About', ar: 'عن المكتب' },
    statementPre: {
      en: 'Architecture is not merely about the spaces we create, but about ',
      ar: 'لا تقتصر العمارة على الفراغات التي نصمّمها، بل تمتد إلى ',
    },
    statementEm: { en: 'the experiences', ar: 'التجارب' },
    statementPost: {
      en: ' those spaces make possible.',
      ar: ' التي تتيحها تلك الفراغات.',
    },
    para1: {
      en: 'MSP is a multidisciplinary architecture and engineering consultancy, established in Riyadh in 2010. Our practice brings together diverse expertise, creative thinking, and advanced technologies in a collaborative framework that places people, performance, and long-term impact at the heart of every project.',
      ar: 'تأسّست MSP في الرياض عام 2010، وهي مكتب استشارات معمارية وهندسية متعدد التخصصات. تجمع ممارستنا خبرات متنوعة وفكراً إبداعياً وتقنيات متقدمة في إطار تعاوني يضع الإنسان والأداء والأثر بعيد المدى في صميم كل مشروع.',
    },
    para2: {
      en: 'We treat creativity and performance as one task. Every building type has its own user experience — the comfort and privacy of a home, the welcome of a hotel, the clarity of a workplace — and we design for it alongside function, environment, and lasting value.',
      ar: 'نرى الإبداع والأداء مهمة واحدة. فلكل نوع من المباني تجربته الخاصة لدى مستخدميه: راحة المسكن وخصوصيته، وحفاوة الفندق، ووضوح بيئة العمل. ونحن نصمّم لهذه التجربة، إلى جانب الوظيفة والبيئة والقيمة الدائمة.',
    },
    facts: {
      en: [
        { label: 'Founded', value: 'Riyadh, 2010' },
        { label: 'Offices', value: 'Riyadh · Cairo' },
        { label: 'Disciplines', value: 'Architecture · Engineering · Planning' },
        { label: 'Sectors', value: 'Residential · Hospitality · Commercial' },
      ],
      ar: [
        { label: 'التأسيس', value: 'الرياض، 2010' },
        { label: 'المكاتب', value: 'الرياض · القاهرة' },
        { label: 'التخصصات', value: 'عمارة · هندسة · تخطيط' },
        { label: 'القطاعات', value: 'سكني · ضيافة · تجاري' },
      ],
    },
  };
}
