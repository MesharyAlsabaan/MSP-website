import {
  Component,
  inject,
  signal,
  computed,
  afterNextRender,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Section } from '../../../../shared/ui/section/section';
import { Container } from '../../../../shared/ui/container/container';
import { SectionHeading } from '../../../../shared/ui/section-heading/section-heading';
import { ScrollReveal } from '../../../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { ServiceItem } from '../../../../core/models/content.model';

interface L {
  en: string;
  ar: string;
}

/** Unified row shape used for both the API data and the static fallback. */
interface Discipline {
  readonly no: string;
  readonly title: L;
  readonly description: L;
  readonly scope: L;
}

/** Section 02 — Disciplines: a large editorial index of services. */
@Component({
  selector: 'app-services',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Section, Container, SectionHeading, ScrollReveal],
  template: `
    <app-section tone="surface">
      <app-container>
        <app-section-heading
          index="02"
          [eyebrow]="i18n.pick(t.eyebrow)"
          [title]="i18n.pick(t.title)"
          [intro]="i18n.pick(t.intro)"
        />

        <ul class="mt-16 border-t border-hairline">
          @for (item of disciplines(); track item.no) {
            <li appScrollReveal class="group relative border-b border-hairline">
              <a
                href="/services"
                class="grid grid-cols-12 items-baseline gap-4 py-7 transition-[padding] duration-500 hover:ps-3 lg:py-9"
              >
                <span
                  class="pointer-events-none absolute start-0 top-0 h-full w-0 bg-accent/[0.06] transition-all duration-500 group-hover:w-full"
                  aria-hidden="true"
                ></span>

                <span
                  class="relative col-span-2 font-mono text-xs tracking-[0.15em] text-accent sm:col-span-1"
                >
                  {{ item.no }}
                </span>

                <h3
                  class="relative col-span-10 font-display text-3xl font-medium leading-tight tracking-[-0.02em] text-ink transition-colors group-hover:text-accent sm:col-span-5 sm:text-4xl"
                >
                  {{ i18n.pick(item.title) }}
                </h3>

                <p
                  class="relative col-span-10 col-start-3 text-muted sm:col-span-4 sm:col-start-7"
                >
                  {{ i18n.pick(item.description) }}
                  <span class="mt-2 block font-mono text-xs uppercase tracking-[0.12em] text-muted/70">
                    {{ i18n.pick(item.scope) }}
                  </span>
                </p>

                <span
                  class="dir-flip relative col-span-12 hidden justify-self-end font-display text-2xl text-ink transition-transform duration-500 group-hover:translate-x-1.5 group-hover:text-accent sm:col-span-1 sm:block"
                  aria-hidden="true"
                >
                  &rarr;
                </span>
              </a>
            </li>
          }
        </ul>
      </app-container>
    </app-section>
  `,
})
export class Services {
  protected readonly i18n = inject(TranslationService);
  private readonly content = inject(PublicContentService);

  /** API services; null until a response arrives (or if the request failed). */
  private readonly fetched = signal<Discipline[] | null>(null);

  protected readonly disciplines = computed<Discipline[]>(
    () => this.fetched() ?? this.fallbackDisciplines,
  );

  constructor() {
    afterNextRender(() => {
      this.content.services().subscribe({
        next: (list) => this.fetched.set(list.map(toDiscipline)),
        error: () => {},
      });
    });
  }

  protected readonly t = {
    eyebrow: { en: 'Disciplines', ar: 'التخصصات' },
    title: {
      en: 'Five practices, one integrated team.',
      ar: 'خمسةُ تخصّصات، وفريقٌ واحد.',
    },
    intro: {
      en: 'Every capability you need to take a project from brief to handover — coordinated under a single roof.',
      ar: 'نأخذ مشروعك من الفكرة إلى التسليم، بخبرةٍ متكاملةٍ تحت إدارةٍ واحدة.',
    },
  };

  private readonly fallbackDisciplines: Discipline[] = [
    {
      no: '01',
      title: { en: 'Architecture', ar: 'العمارة' },
      description: {
        en: 'Concept, schematic, and detailed design for buildings of every scale.',
        ar: 'تصميمٌ معماريٌّ متكامل، من الفكرة الأولى إلى مخطّطات التنفيذ.',
      },
      scope: { en: 'Concept → Construction docs', ar: 'الفكرة ← مخطّطات التنفيذ' },
    },
    {
      no: '02',
      title: { en: 'Structural Engineering', ar: 'الهندسة الإنشائية' },
      description: {
        en: 'Efficient, resilient structures — concrete, steel, and hybrid systems.',
        ar: 'منشآتٌ متينةٌ واقتصادية بأنظمةٍ خرسانية وفولاذية وهجينة.',
      },
      scope: { en: 'Analysis · Detailing · Review', ar: 'تحليل · تفصيل · مراجعة' },
    },
    {
      no: '03',
      title: { en: 'MEP Engineering', ar: 'الهندسة الكهروميكانيكية' },
      description: {
        en: 'Mechanical, electrical, and plumbing design built for performance.',
        ar: 'حلولٌ ميكانيكية وكهربائية وصحّية مصمّمة للأداء والكفاءة.',
      },
      scope: { en: 'Systems · Energy · Coordination', ar: 'أنظمة · طاقة · تنسيق' },
    },
    {
      no: '04',
      title: { en: 'Urban Planning', ar: 'التخطيط العمراني' },
      description: {
        en: 'Masterplans and mixed-use frameworks that shape how places live.',
        ar: 'مخطّطاتٌ عمرانيةٌ شاملة تصوغ ملامح المكان وحياته.',
      },
      scope: { en: 'Masterplan · Feasibility', ar: 'مخطّط شامل · دراسة جدوى' },
    },
    {
      no: '05',
      title: { en: 'Project Management', ar: 'إدارة المشاريع' },
      description: {
        en: 'Cost, programme, and site supervision from groundbreaking to handover.',
        ar: 'إدارةُ التكلفة والزمن والإشراف الموقعي حتى التسليم.',
      },
      scope: { en: 'PM · Cost · Supervision', ar: 'إدارة · تكلفة · إشراف' },
    },
  ];
}

/** Maps an API service onto the indexed row this section renders. */
function toDiscipline(s: ServiceItem, i: number): Discipline {
  return {
    no: String(i + 1).padStart(2, '0'),
    title: s.title,
    description: s.shortDescription,
    scope: { en: '', ar: '' },
  };
}
