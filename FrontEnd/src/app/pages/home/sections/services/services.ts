import { SERVICE_PAGES } from '../../../../core/data/service-pages';
import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Section } from '../../../../shared/ui/section/section';
import { Container } from '../../../../shared/ui/container/container';
import { SectionHeading } from '../../../../shared/ui/section-heading/section-heading';
import { ScrollReveal } from '../../../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { ServiceItem } from '../../../../core/models/content.model';
import { RouterLink } from '@angular/router';
import { LocPipe } from '../../../../shared/pipes/loc.pipe';

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
  /** The dedicated service page, when one is published; otherwise /services. */
  readonly path?: string;
}

/** Section 02 — Disciplines: a large editorial index of services. */
@Component({
  selector: 'app-services',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Section, Container, SectionHeading, ScrollReveal, RouterLink, LocPipe],
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
                [routerLink]="(item.path ?? '/services') | loc"
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
                  class="dir-flip relative col-span-12 hidden justify-self-end font-display text-2xl text-ink transition-transform duration-500 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 group-hover:text-accent sm:col-span-1 sm:block"
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
    this.content.services().subscribe({
      next: (list) => this.fetched.set(list.map(toDiscipline)),
      error: () => {},
    });
  }

  protected readonly t = {
    eyebrow: { en: 'Services', ar: 'الخدمات' },
    title: {
      en: 'Design, engineering, and supervision — integrated.',
      ar: 'تصميم وهندسة وإشراف، في منظومة متكاملة.',
    },
    intro: {
      en: 'One consultancy coordinates architecture, interiors, engineering, planning, and project oversight, so creative intent and technical performance develop together from brief to completion.',
      ar: 'ينسّق مكتب استشاري واحد التصميم المعماري والداخلي والهندسة والتخطيط وإدارة المشاريع والإشراف، لتتطور الفكرة الإبداعية والأداء الفني معاً من المتطلبات الأولى حتى الإنجاز.',
    },
  };

  private readonly fallbackDisciplines: Discipline[] = [
    {
      no: '01',
      title: { en: 'Architectural Design', ar: 'التصميم المعماري' },
      description: {
        en: 'Concept, schematic, and detailed design shaped around the people who will use each building.',
        ar: 'تصميم مفاهيمي وابتدائي وتفصيلي، يُبنى حول احتياجات مستخدمي كل مبنى.',
      },
      scope: { en: 'Concept → Construction documents', ar: 'الفكرة ← المخططات التنفيذية' },
    },
    {
      no: '02',
      title: { en: 'Interior Design', ar: 'التصميم الداخلي' },
      description: {
        en: 'Interior spaces, finishes, and lighting developed together with the architecture.',
        ar: 'فراغات داخلية وتشطيبات وإضاءة، تُصمَّم بالتكامل مع العمارة.',
      },
      scope: { en: 'Space planning · Finishes · Lighting', ar: 'تخطيط الفراغات · التشطيبات · الإضاءة' },
    },
    {
      no: '03',
      title: { en: 'Structural Engineering', ar: 'الهندسة الإنشائية' },
      description: {
        en: 'Structural design in concrete, steel, and hybrid systems, coordinated with the architectural intent.',
        ar: 'تصميم إنشائي بأنظمة خرسانية وفولاذية وهجينة، منسَّق مع الفكرة المعمارية.',
      },
      scope: { en: 'Analysis · Design · Detailing', ar: 'تحليل · تصميم · تفصيل' },
    },
    {
      no: '04',
      title: { en: 'MEP Engineering', ar: 'الهندسة الكهروميكانيكية' },
      description: {
        en: 'Mechanical, electrical, and plumbing systems designed for comfort, efficiency, and operation.',
        ar: 'أنظمة ميكانيكية وكهربائية وصحّية، تُصمَّم للراحة والكفاءة وسهولة التشغيل.',
      },
      scope: { en: 'Systems · Energy · Coordination', ar: 'أنظمة · طاقة · تنسيق' },
    },
    {
      no: '05',
      title: { en: 'Urban Planning', ar: 'التخطيط العمراني' },
      description: {
        en: 'Site and community planning that organises movement, open space, and land use.',
        ar: 'تخطيط للمواقع والمجتمعات، يُنظّم الحركة والمساحات المفتوحة واستعمالات الأراضي.',
      },
      scope: { en: 'Masterplanning · Land use', ar: 'المخطط العام · استعمالات الأراضي' },
    },
    {
      no: '06',
      title: { en: 'Project Management & Supervision', ar: 'إدارة المشاريع والإشراف الهندسي' },
      description: {
        en: 'Consultancy oversight of programme, coordination, and quality on site, through to handover.',
        ar: 'إشراف استشاري على الجدول الزمني والتنسيق والجودة في الموقع، حتى التسليم.',
      },
      scope: { en: 'Programme · Coordination · Site supervision', ar: 'الجدول الزمني · التنسيق · الإشراف الموقعي' },
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
    path: servicePagePath(s.slug),
  };
}

function servicePagePath(cmsSlug: string): string | undefined {
  const page = SERVICE_PAGES.find((p) => p.cmsSlug === cmsSlug && p.approved);
  return page ? `/services/${page.slug}` : undefined;
}
