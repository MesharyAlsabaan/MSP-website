import { Component, inject, signal, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { Container } from '../../shared/ui/container/container';
import { Section } from '../../shared/ui/section/section';
import { SectionHeading } from '../../shared/ui/section-heading/section-heading';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { Cta } from '../home/sections/cta/cta';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { AssetPipe } from '../../shared/pipes/asset.pipe';
import { ServiceItem } from '../../core/models/content.model';

interface L {
  en: string;
  ar: string;
}

/** Services / Disciplines page — deep-dive into the five practices + process. */
@Component({
  selector: 'app-services-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, Container, Section, SectionHeading, ScrollReveal, Cta, AssetPipe],
  template: `
    <!-- Header -->
    <section class="border-b border-hairline bg-bg pt-16 pb-14 sm:pt-20">
      <app-container>
        <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span class="text-accent">{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
          <span dir="ltr">05</span>
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
                  <p class="mt-5 max-w-md text-lg leading-relaxed text-muted">
                    {{ i18n.pick(item.fullDescription) }}
                  </p>
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
    title: { en: 'Five disciplines, one team.', ar: 'خمسة تخصّصات، فريقٌ واحد.' },
    intro: {
      en: 'Every capability to take a project from first idea to handover — coordinated in-house, so design and engineering never pull apart.',
      ar: 'كلُّ ما يلزم لأخذ المشروع من الفكرة الأولى إلى التسليم — بتنسيقٍ داخلي، فلا ينفصل التصميم عن الهندسة.',
    },
    empty: { en: 'No disciplines published yet.', ar: 'لا توجد تخصّصات منشورة بعد.' },
    processEyebrow: { en: 'Process', ar: 'منهجية العمل' },
    processTitle: { en: 'From brief to handover.', ar: 'من الفكرة إلى التسليم.' },
    processIntro: {
      en: 'A clear, milestone-driven path that keeps cost, programme, and quality in sight at every stage.',
      ar: 'مسارٌ واضحٌ بمحطّاتٍ محدّدة يُبقي التكلفة والبرنامج والجودة تحت العين في كل مرحلة.',
    },
  };

  protected readonly process: readonly { no: string; title: L; body: L }[] = [
    {
      no: '01',
      title: { en: 'Brief & feasibility', ar: 'الفكرة والجدوى' },
      body: { en: 'We frame the problem, test the site, and set the budget and ambition.', ar: 'نصوغ المسألة، ونختبر الموقع، ونحدّد الميزانية والطموح.' },
    },
    {
      no: '02',
      title: { en: 'Concept design', ar: 'التصميم المفاهيمي' },
      body: { en: 'A clear architectural idea, tested early against structure and cost.', ar: 'فكرةٌ معماريةٌ واضحة، تُختبر مبكراً أمام الإنشاء والتكلفة.' },
    },
    {
      no: '03',
      title: { en: 'Detailed design', ar: 'التصميم التفصيلي' },
      body: { en: 'Architecture and engineering resolved together, down to the junction.', ar: 'تُحلّ العمارة والهندسة معاً، حتى أدقّ وصلة.' },
    },
    {
      no: '04',
      title: { en: 'Documentation', ar: 'إعداد المستندات' },
      body: { en: 'Coordinated drawings and specifications ready for tender.', ar: 'مخطّطاتٌ ومواصفاتٌ منسّقة جاهزة للطرح.' },
    },
    {
      no: '05',
      title: { en: 'Construction', ar: 'التنفيذ' },
      body: { en: 'We supervise on site, protecting design intent, cost, and programme.', ar: 'نُشرف في الموقع، حمايةً لنيّة التصميم والتكلفة والبرنامج.' },
    },
    {
      no: '06',
      title: { en: 'Handover', ar: 'التسليم' },
      body: { en: 'A building delivered complete, documented, and ready to perform.', ar: 'مبنىً يُسلَّم مكتملاً وموثّقاً وجاهزاً للأداء.' },
    },
  ];

  constructor() {
    this.seo.update({
      title: 'Disciplines',
      description:
        'Architecture, structural and MEP engineering, urban planning, and project management — the five in-house disciplines of MSP Consultants.',
    });

    // Browser-only fetch: keeps the route prerenderable (static skeleton shell).
    afterNextRender(() => {
      this.content.services().subscribe({
        next: (list) => {
          this.services.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  /** Zero-pads the 1-based row index for the mono number label (e.g. "01"). */
  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
