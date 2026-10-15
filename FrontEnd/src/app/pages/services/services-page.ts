import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Container } from '../../shared/ui/container/container';
import { Section } from '../../shared/ui/section/section';
import { SectionHeading } from '../../shared/ui/section-heading/section-heading';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { Cta } from '../home/sections/cta/cta';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { AssetPipe } from '../../shared/pipes/asset.pipe';
import { ORG_ID } from '../../core/seo/structured-data';
import { LocPipe } from '../../shared/pipes/loc.pipe';
import { ServiceItem } from '../../core/models/content.model';
import { L, SERVICE_DETAILS, SERVICE_PAGES } from '../../core/data/service-pages';



/** Services / Disciplines page — a deep-dive into each discipline + process. */
@Component({
  selector: 'app-services-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, Container, Section, SectionHeading, ScrollReveal, Cta, AssetPipe, LocPipe],
  template: `
    <!-- Header -->
    <section class="border-b border-hairline bg-bg pt-16 pb-14 sm:pt-20">
      <app-container>
        <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span class="text-accent">{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
          @if (!loading() && services().length) {
            <span dir="ltr">{{ pad(services().length) }}</span>
          }
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

    <!-- Disciplines as alternating rows -->
    <app-section>
      <app-container>
        @if (loading()) {
          <div class="flex flex-col gap-20 lg:gap-28">
            @for (s of skeletons; track s) {
              <div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                <div class="aspect-[4/3] animate-pulse bg-hairline/60"></div>
                <div class="animate-pulse">
                  <div class="h-4 w-10 bg-hairline/60"></div>
                  <div class="mt-3 h-9 w-2/3 bg-hairline/60"></div>
                  <div class="mt-5 h-4 w-full bg-hairline/40"></div>
                  <div class="mt-2 h-4 w-4/5 bg-hairline/40"></div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="flex flex-col gap-20 lg:gap-28">
            @for (item of services(); track item.id; let i = $index) {
              <div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                <!-- image -->
                @if (item.icon | asset; as iconSrc) {
                  <div
                    appScrollReveal
                    revealType="line"
                    class="aspect-[4/3] overflow-hidden"
                    [ngClass]="{ 'lg:order-2': i % 2 === 1 }"
                  >
                    <img
                      [src]="iconSrc"
                      [alt]="i18n.pick(item.title)"
                      loading="lazy"
                      decoding="async"
                      class="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.04]"
                    />
                  </div>
                }

                <!-- text -->
                <div appScrollReveal [ngClass]="{ 'lg:order-1': i % 2 === 1 }">
                  <span class="font-mono text-sm text-accent" dir="ltr">{{ pad(i + 1) }}</span>
                  <h2 class="mt-3 t-section font-display font-medium tracking-[-0.03em] text-ink">
                    {{ i18n.pick(item.title) }}
                  </h2>
                  @if (details[item.slug]; as d) {
                    <p class="mt-5 max-w-md text-lg leading-relaxed text-muted">
                      {{ i18n.pick(d.description) }}
                    </p>
                    <span class="mt-6 block font-mono text-xs uppercase tracking-[0.18em] text-accent">
                      {{ i18n.pick(t.needsLabel) }}
                    </span>
                    <p class="mt-2 max-w-md text-sm leading-relaxed text-muted">{{ i18n.pick(d.needs) }}</p>
                    <span class="mt-6 block font-mono text-xs uppercase tracking-[0.18em] text-accent">
                      {{ i18n.pick(t.scopeLabel) }}
                    </span>
                    <ul class="mt-2 max-w-md border-t border-hairline">
                      @for (s of d.scope; track s.en) {
                        <li class="border-b border-hairline py-2 text-sm leading-relaxed text-ink">{{ i18n.pick(s) }}</li>
                      }
                    </ul>
                    <span class="mt-6 block font-mono text-xs uppercase tracking-[0.18em] text-accent">
                      {{ i18n.pick(t.typesLabel) }}
                    </span>
                    <p class="mt-2 max-w-md text-sm leading-relaxed text-muted">{{ i18n.pick(d.projectTypes) }}</p>
                  } @else {
                    <p class="mt-5 max-w-md text-lg leading-relaxed text-muted">
                      {{ i18n.pick(item.fullDescription) }}
                    </p>
                  }
                  <a
                    [routerLink]="'/projects' | loc"
                    class="mt-6 inline-block font-mono text-xs uppercase tracking-[0.12em] text-accent hover:underline"
                  >
                    {{ i18n.pick(t.projectsLink) }}{{ i18n.pick(item.title) }}
                    <span class="dir-flip inline-block" aria-hidden="true">&rarr;</span>
                  </a>
                  @if (pageFor(item.slug); as sp) {
                    <a
                      [routerLink]="['/services', sp.slug] | loc"
                      class="mt-3 block font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent"
                    >
                      {{ i18n.pick(t.moreLink) }}{{ i18n.pick(sp.title) }}
                      <span class="dir-flip inline-block" aria-hidden="true">&rarr;</span>
                    </a>
                  }
                </div>
              </div>
            }
          </div>

          @if (services().length === 0) {
            <p class="py-16 text-center text-muted">{{ i18n.pick(t.empty) }}</p>
          }
        }
      </app-container>
    </app-section>

    <!-- Dedicated service pages (includes services not yet listed in the CMS) -->
    <app-section>
      <app-container>
        <app-section-heading
          index="—"
          [eyebrow]="i18n.pick(t.pagesEyebrow)"
          [title]="i18n.pick(t.pagesTitle)"
        />
        <ul class="mt-12 grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          @for (sp of servicePages; track sp.slug) {
            <li class="bg-bg">
              <a [routerLink]="['/services', sp.slug] | loc" class="group block h-full p-7 lg:p-8">
                <h3 class="font-display text-xl font-medium text-ink transition-colors group-hover:text-accent">
                  {{ i18n.pick(sp.title) }}
                </h3>
                <p class="mt-2 text-sm leading-relaxed text-muted">{{ i18n.pick(sp.seoDescription) }}</p>
                <span class="mt-4 inline-block font-mono text-xs uppercase tracking-[0.12em] text-accent">
                  {{ i18n.pick(t.moreLink) }}{{ i18n.pick(sp.title) }}
                  <span class="dir-flip inline-block" aria-hidden="true">&rarr;</span>
                </span>
              </a>
            </li>
          }
        </ul>
      </app-container>
    </app-section>

    <!-- Process -->
    <app-section tone="surface">
      <app-container>
        <app-section-heading
          index="—"
          [eyebrow]="i18n.pick(t.processEyebrow)"
          [title]="i18n.pick(t.processTitle)"
          [intro]="i18n.pick(t.processIntro)"
        />
        <ol class="mt-14 grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          @for (step of process; track step.no; let i = $index) {
            <li appScrollReveal [revealDelay]="i * 60" class="bg-bg p-7 lg:p-8">
              <span class="font-mono text-xs text-accent">{{ step.no }}</span>
              <h3 class="mt-3 font-display text-xl font-medium text-ink">{{ i18n.pick(step.title) }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-muted">{{ i18n.pick(step.body) }}</p>
            </li>
          }
        </ol>
      </app-container>
    </app-section>

    <app-cta />
  `,
})
export class ServicesPage {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);
  private readonly content = inject(PublicContentService);

  protected readonly services = signal<ServiceItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly skeletons = [0, 1, 2];

  protected readonly t = {
    eyebrow: { en: 'Disciplines', ar: 'التخصصات' },
    title: { en: 'Integrated consultancy, across disciplines.', ar: 'استشارات هندسية متكاملة عبر التخصّصات.' },
    intro: {
      en: 'Architecture, engineering, planning and project management, coordinated as one consultancy — so that design intent, technical performance and cost are resolved together, from the first brief to handover.',
      ar: 'العمارة والهندسة والتخطيط وإدارة المشاريع، منسّقة ضمن جهة استشارية واحدة، لتُحسم الفكرة التصميمية والأداء الفني والتكلفة معاً، من المتطلبات الأولى حتى التسليم.',
    },
    empty: { en: 'No disciplines published yet.', ar: 'لا توجد تخصّصات منشورة بعد.' },
    needsLabel: { en: 'Client needs addressed', ar: 'احتياجات العميل' },
    scopeLabel: { en: 'Scope', ar: 'نطاق الخدمة' },
    typesLabel: { en: 'Relevant project types', ar: 'أنواع المشاريع ذات الصلة' },
    projectsLink: { en: 'View projects related to ', ar: 'اطّلع على مشاريع ذات صلة: ' },
    moreLink: { en: 'More about ', ar: 'المزيد عن ' },
    pagesEyebrow: { en: 'Service pages', ar: 'صفحات الخدمات' },
    pagesTitle: { en: 'Explore each service in detail.', ar: 'تعرّف على كل خدمة بالتفصيل.' },
    processEyebrow: { en: 'Process', ar: 'منهجية العمل' },
    processTitle: { en: 'From brief to handover.', ar: 'من المتطلبات إلى التسليم.' },
    processIntro: {
      en: 'A clear, staged path. At every step we give independent professional advice, keep quality, programme and cost in view, and keep the people who will use the building at the centre.',
      ar: 'مسار واضح بمراحل محدّدة. نقدّم في كل خطوة مشورة مهنية مستقلة، ونُبقي الجودة والجدول الزمني والتكلفة في الحسبان، ونضع مستخدمي المبنى في صميم القرار.',
    },
  };

  /**
   * Per-discipline detail, keyed by CMS slug. The CMS holds only a one-line
   * description; this map adds scope and context. A slug with no entry here
   * falls back to the CMS text. `interior-design` and `supervision` are ready
   * for when the CMS publishes those slugs.
   */
  protected readonly details = SERVICE_DETAILS;
  protected readonly servicePages = SERVICE_PAGES.filter((p) => p.approved);

  /** The dedicated page for a CMS service, once it is approved for publication. */
  protected pageFor(cmsSlug: string) {
    return SERVICE_PAGES.find((p) => p.cmsSlug === cmsSlug && p.approved) ?? null;
  }

  protected readonly process: readonly { no: string; title: L; body: L }[] = [
    {
      no: '01',
      title: { en: 'Brief & feasibility', ar: 'المتطلبات والجدوى' },
      body: {
        en: 'We listen, test the site and the brief, and constructively challenge assumptions where a better outcome is possible — before budget and ambition are fixed.',
        ar: 'نستمع، ونختبر الموقع والمتطلبات، ونناقش الافتراضات بموضوعية حيث تتاح نتيجة أفضل، قبل تثبيت الميزانية والطموح.',
      },
    },
    {
      no: '02',
      title: { en: 'Concept design', ar: 'التصميم المفاهيمي' },
      body: {
        en: 'A clear architectural idea shaped around the people who will use the building, tested early against structure, services and cost.',
        ar: 'فكرة معمارية واضحة تتشكّل حول مستخدمي المبنى، وتُختبر مبكراً أمام متطلبات الإنشاء والأنظمة والتكلفة.',
      },
    },
    {
      no: '03',
      title: { en: 'Detailed design', ar: 'التصميم التفصيلي' },
      body: {
        en: 'Architecture and engineering developed together and coordinated digitally, so that decisions hold up on site.',
        ar: 'تتطوّر العمارة والهندسة معاً وتُنسَّق رقمياً، لتصمد القرارات عند التنفيذ في الموقع.',
      },
    },
    {
      no: '04',
      title: { en: 'Documentation', ar: 'إعداد المستندات' },
      body: {
        en: 'Drawings and specifications checked across disciplines and ready for tender.',
        ar: 'مخطّطات ومواصفات مُراجَعة بين التخصّصات وجاهزة للطرح.',
      },
    },
    {
      no: '05',
      title: { en: 'Construction', ar: 'التنفيذ' },
      body: {
        en: 'Where supervision is part of our appointment, we oversee the works as the client’s consultant, protecting design intent, quality and programme.',
        ar: 'حين يكون الإشراف ضمن نطاق تكليفنا، نتابع الأعمال بصفتنا استشاري العميل، حفاظاً على الفكرة التصميمية والجودة والجدول الزمني.',
      },
    },
    {
      no: '06',
      title: { en: 'Handover', ar: 'التسليم' },
      body: {
        en: 'A complete, documented building, handed over with an eye to how it will be used, operated and maintained for years to come.',
        ar: 'مبنى مكتمل وموثّق، يُسلَّم مع مراعاة طريقة استخدامه وتشغيله وصيانته لسنوات قادمة.',
      },
    },
  ];

  constructor() {
    this.updateSeo([]);

    this.content.services().subscribe({
      next: (list) => {
        this.services.set(list);
        this.updateSeo(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Page metadata, with one schema.org Service per published discipline. */
  private updateSeo(list: ServiceItem[]): void {
    this.seo.update({
      title: this.i18n.pick({
        en: 'Architectural Design & Engineering Services, Riyadh',
        ar: 'خدمات التصميم المعماري والاستشارات الهندسية في الرياض',
      }),
      description: this.i18n.pick({
        en: 'Architectural and interior design, structural and MEP engineering, urban planning, project management and construction supervision: MSP consultancy services in Riyadh.',
        ar: 'تصميم معماري وداخلي، وهندسة إنشائية وكهروميكانيكية، وتخطيط عمراني، وإدارة مشاريع، وإشراف هندسي: خدمات MSP الاستشارية في الرياض.',
      }),
      schema: list.map((item) => ({
        '@type': 'Service',
        name: this.i18n.pick(item.title),
        description: this.i18n.pick(this.details[item.slug]?.description ?? item.fullDescription),
        serviceType: item.title.en,
        provider: { '@id': ORG_ID },
        areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
      })),
    });
  }

  /** Zero-pads the 1-based row index for the mono number label (e.g. "01"). */
  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
