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
    eyebrow: { en: 'The Practice', ar: 'عن المكتب' },
    statementPre: {
      en: 'We believe great buildings begin where ',
      ar: 'العمارةُ الاستثنائية تولد حين يلتقي ',
    },
    statementEm: { en: 'design discipline', ar: 'انضباطُ التصميم' },
    statementPost: {
      en: ' meets engineering certainty — considered, measured, and built to outlast their makers.',
      ar: ' بيقين الهندسة؛ عمارةٌ مدروسةٌ ومحسوبة، تبقى أطول من بُناتها.',
    },
    para1: {
      en: 'MSP Consultants is an integrated architecture and engineering studio. We bring architects, structural and MEP engineers, and urban planners under one roof — so ideas survive contact with gravity, budget, and time.',
      ar: 'تجمع إم إس بي المعماريين ومهندسي الإنشاءات والميكانيكا والكهرباء ومخطّطي المدن في فريقٍ واحد؛ لتصمد الفكرة أمام الجاذبية والميزانية والزمن.',
    },
    para2: {
      en: 'From a single villa to a city masterplan, every project is held to the same standard: clarity of thought, rigour of detail.',
      ar: 'من فيلّا واحدة إلى مخطّطٍ لمدينةٍ كاملة، نُطبّق المعيار نفسه: فكرةٌ واضحة، وتفصيلٌ مُحكَم.',
    },
    facts: {
      en: [
        { label: 'Founded', value: 'Riyadh, 2010' },
        { label: 'Disciplines', value: 'Five, in-house' },
        { label: 'Sectors', value: 'Civic · Commercial · Residential' },
        { label: 'Standards', value: 'SBC · ISO · LEED' },
      ],
      ar: [
        { label: 'التأسيس', value: 'الرياض، ٢٠١٠' },
        { label: 'التخصصات', value: 'خمسة، داخلياً' },
        { label: 'القطاعات', value: 'مدني · تجاري · سكني' },
        { label: 'المعايير', value: 'كود البناء · آيزو · ليد' },
      ],
    },
  };
}
