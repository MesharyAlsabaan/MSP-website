import { Component, inject, signal, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { Container } from '../../shared/ui/container/container';
import { Section } from '../../shared/ui/section/section';
import { SectionHeading } from '../../shared/ui/section-heading/section-heading';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { CountUp } from '../../shared/directives/count-up.directive';
import { Cta } from '../home/sections/cta/cta';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { AssetPipe } from '../../shared/pipes/asset.pipe';
import { TeamMember } from '../../core/models/content.model';

interface L {
  en: string;
  ar: string;
}

/** Practice / About page — studio story, numbers, values, leadership, timeline. */
@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Container, Section, SectionHeading, ScrollReveal, CountUp, Cta, AssetPipe],
  template: `
    <!-- Header -->
    <section class="border-b border-hairline bg-bg pt-16 pb-14 sm:pt-20">
      <app-container>
        <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span class="text-accent">{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
          <span dir="ltr">EST. 2010</span>
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

    <!-- Story -->
    <app-section>
      <app-container>
        <div class="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div class="lg:col-span-7">
            <p
              appScrollReveal
              revealType="line"
              class="font-display text-3xl font-medium leading-[1.2] tracking-[-0.02em] text-ink sm:text-4xl"
            >
              {{ i18n.pick(t.storyLead) }}
            </p>
          </div>
          <div class="lg:col-span-4 lg:col-start-9">
            <p appScrollReveal class="leading-relaxed text-muted">{{ i18n.pick(t.story1) }}</p>
            <p appScrollReveal [revealDelay]="100" class="mt-4 leading-relaxed text-muted">
              {{ i18n.pick(t.story2) }}
            </p>
          </div>
        </div>
      </app-container>
    </app-section>

    <!-- Numbers -->
    <section class="bg-ink py-20 text-bg sm:py-24">
      <app-container>
        <dl class="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-4">
          @for (s of stats; track s.label.en; let i = $index) {
            <div appScrollReveal [revealDelay]="i * 90">
              <dt
                [appCountUp]="s.value"
                class="font-display text-5xl font-medium leading-none tracking-[-0.02em] text-bg sm:text-6xl"
              >
                <span data-count>0</span><span class="text-accent">{{ s.suffix }}</span>
              </dt>
              <dd class="mt-4 border-t border-bg/15 pt-4 font-mono text-xs uppercase tracking-[0.12em] text-bg/60">
                {{ i18n.pick(s.label) }}
              </dd>
            </div>
          }
        </dl>
      </app-container>
    </section>

    <!-- Values -->
    <app-section tone="surface">
      <app-container>
        <app-section-heading
          index="01"
          [eyebrow]="i18n.pick(t.valuesEyebrow)"
          [title]="i18n.pick(t.valuesTitle)"
        />
        <div class="mt-14 grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          @for (v of values; track v.no; let i = $index) {
            <div appScrollReveal [revealDelay]="i * 70" class="bg-bg p-7 lg:p-8">
              <span class="font-mono text-xs text-accent">{{ v.no }}</span>
              <h3 class="mt-4 font-display text-xl font-medium text-ink">{{ i18n.pick(v.title) }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-muted">{{ i18n.pick(v.body) }}</p>
            </div>
          }
        </div>
      </app-container>
    </app-section>

    <!-- Leadership -->
    <app-section>
      <app-container>
        <app-section-heading
          index="02"
          [eyebrow]="i18n.pick(t.leadEyebrow)"
          [title]="i18n.pick(t.leadTitle)"
          [intro]="i18n.pick(t.leadIntro)"
        />
        @if (loading()) {
          <div class="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            @for (i of skeletons; track i) {
              <div class="animate-pulse">
                <div class="aspect-[4/5] bg-hairline/60"></div>
                <div class="mt-5 h-6 w-2/3 bg-hairline/60"></div>
                <div class="mt-3 h-3 w-1/3 bg-hairline/40"></div>
                <div class="mt-4 h-3 w-full bg-hairline/30"></div>
              </div>
            }
          </div>
        } @else {
          <div class="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            @for (member of team(); track member.id; let i = $index) {
              <article appScrollReveal [revealDelay]="i * 70" class="group">
                <div appScrollReveal revealType="line" class="aspect-[4/5] overflow-hidden bg-hairline/40">
                  @if (member.photo) {
                    <img
                      [src]="member.photo | asset"
                      [alt]="member.name"
                      loading="lazy"
                      decoding="async"
                      class="h-full w-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0"
                    />
                  } @else {
                    <!-- Awaiting a portrait: a monogram keeps the grid even. -->
                    <span
                      class="grid h-full w-full place-items-center font-display text-4xl text-muted/60"
                      aria-hidden="true"
                      >{{ initials(member.name) }}</span
                    >
                  }
                </div>
                <h3 class="mt-5 font-display text-xl font-medium text-ink">{{ member.name }}</h3>
                <p class="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-accent">{{ i18n.pick(member.title) }}</p>
                <p class="mt-3 text-sm leading-relaxed text-muted">{{ i18n.pick(member.bio) }}</p>
              </article>
            }
          </div>
        }
      </app-container>
    </app-section>

    <!-- Timeline -->
    <app-section tone="surface">
      <app-container>
        <app-section-heading index="03" [eyebrow]="i18n.pick(t.timelineEyebrow)" [title]="i18n.pick(t.timelineTitle)" />
        <ol class="mt-14 border-t border-hairline">
          @for (e of timeline; track e.year) {
            <li
              appScrollReveal
              class="grid grid-cols-12 items-baseline gap-4 border-b border-hairline py-7"
            >
              <span class="col-span-3 font-mono text-sm text-accent sm:col-span-2" dir="ltr">{{ e.year }}</span>
              <h3 class="col-span-9 font-display text-xl font-medium text-ink sm:col-span-4 sm:text-2xl">
                {{ i18n.pick(e.title) }}
              </h3>
              <p class="col-span-12 text-muted sm:col-span-6">{{ i18n.pick(e.body) }}</p>
            </li>
          }
        </ol>
      </app-container>
    </app-section>

    <app-cta />
  `,
})
export class AboutPage {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);
  private readonly content = inject(PublicContentService);

  protected readonly team = signal<TeamMember[]>([]);
  protected readonly loading = signal(true);
  protected readonly skeletons = [0, 1, 2, 3];

  /** First letters of the first two name parts, e.g. "MOHAMMED ALSABAAN" -> "MA". */
  protected initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  protected readonly t = {
    eyebrow: { en: 'The Practice', ar: 'المكتب' },
    title: { en: 'An integrated practice.', ar: 'ممارسةٌ متكاملة.' },
    intro: {
      en: 'MSP Consultants unites architecture and engineering under one roof — a single team accountable for how a building looks, stands, and performs.',
      ar: 'تجمع إم إس بي للاستشارات العمارة والهندسة تحت سقفٍ واحد — فريقٌ واحد مسؤولٌ عن شكل المبنى وثباته وأدائه.',
    },
    storyLead: {
      en: 'We started in 2010 with a simple conviction: design and engineering should never be two conversations.',
      ar: 'بدأنا عام ٢٠١٠ بقناعةٍ بسيطة: ألا يكون التصميم والهندسة حديثين منفصلين.',
    },
    story1: {
      en: 'From a small Riyadh studio, MSP grew into a multidisciplinary practice trusted with civic landmarks, towers, and masterplans across the Kingdom.',
      ar: 'من استوديو صغير في الرياض، نمت إم إس بي لتصبح مكتباً متعدّد التخصصات يُؤتمَن على المعالم العامة والأبراج والمخطّطات الشاملة في أنحاء المملكة.',
    },
    story2: {
      en: 'Every commission is still led by a principal, and still held to the standard we began with: clarity of thought, rigour of detail.',
      ar: 'لا يزال كل تكليفٍ يقوده أحد الشركاء، وفق المعيار الذي بدأنا به: وضوحُ الفكرة ودقّةُ التفصيل.',
    },
    valuesEyebrow: { en: 'Values', ar: 'قِيَمنا' },
    valuesTitle: { en: 'What we hold to.', ar: 'ما نلتزم به.' },
    leadEyebrow: { en: 'Leadership', ar: 'القيادة' },
    leadTitle: { en: 'The principals.', ar: 'الشركاء.' },
    leadIntro: {
      en: 'A senior team that stays close to every project, from first sketch to final inspection.',
      ar: 'فريقٌ خبيرٌ يبقى قريباً من كل مشروع، من أول رسمٍ حتى التفتيش النهائي.',
    },
    timelineEyebrow: { en: 'Trajectory', ar: 'المسيرة' },
    timelineTitle: { en: 'A measured climb.', ar: 'مسيرةٌ ثابتة.' },
  };

  protected readonly stats = [
    { value: 240, suffix: '+', label: { en: 'Projects delivered', ar: 'مشروع مُنجَز' } },
    { value: 4, suffix: ' M m²', label: { en: 'Built area designed', ar: 'مساحة مُصمَّمة' } },
    { value: 16, suffix: '', label: { en: 'Years in practice', ar: 'عاماً من الخبرة' } },
    { value: 30, suffix: '', label: { en: 'Awards & citations', ar: 'جائزة وتكريم' } },
  ];

  protected readonly values: readonly { no: string; title: L; body: L }[] = [
    {
      no: '01',
      title: { en: 'Integrated', ar: 'التكامل' },
      body: {
        en: 'Architects and engineers share one table, so design and structure arrive as a single decision.',
        ar: 'يجلس المعماريون والمهندسون إلى طاولةٍ واحدة، فيصل التصميم والإنشاء كقرارٍ واحد.',
      },
    },
    {
      no: '02',
      title: { en: 'Evidence-led', ar: 'الدليل أولاً' },
      body: {
        en: 'Site, climate, code, and cost decide. The brief leads; the drawing follows.',
        ar: 'الموقع والمناخ والكود والتكلفة هي الفيصل. المتطلّبات تقود، والرسم يتبع.',
      },
    },
    {
      no: '03',
      title: { en: 'Detailed', ar: 'الإتقان' },
      body: {
        en: 'A building is its junctions. We resolve the hard parts before the site does.',
        ar: 'قيمةُ المبنى في وصلاته. نحسم الأجزاء الصعبة قبل أن يصل إليها الموقع.',
      },
    },
    {
      no: '04',
      title: { en: 'Durable', ar: 'الديمومة' },
      body: {
        en: 'We design for the long life of a place — efficient, generous, and built to last.',
        ar: 'نصمّم لعمرٍ طويلٍ للمكان — فعّالٌ وكريمٌ ومبنيٌّ ليدوم.',
      },
    },
  ];

  protected readonly timeline: readonly { year: string; title: L; body: L }[] = [
    {
      year: '2010',
      title: { en: 'Founded in Riyadh', ar: 'التأسيس في الرياض' },
      body: { en: 'A three-person studio opens on King Fahd Road.', ar: 'افتتاح استوديو من ثلاثة أشخاص على طريق الملك فهد.' },
    },
    {
      year: '2016',
      title: { en: 'Engineering in-house', ar: 'الهندسة داخلياً' },
      body: { en: 'Structural and MEP teams join, completing the integrated model.', ar: 'انضمام فريقي الإنشاءات والكهروميكانيكا، فيكتمل النموذج المتكامل.' },
    },
    {
      year: '2020',
      title: { en: 'First civic landmark', ar: 'أول معلمٍ عام' },
      body: { en: 'A cultural commission marks a shift to public-scale work.', ar: 'تكليفٌ ثقافي يؤذن بالانتقال إلى المشاريع العامة الكبرى.' },
    },
    {
      year: '2024',
      title: { en: 'Vision 2030 projects', ar: 'مشاريع رؤية ٢٠٣٠' },
      // Client names stay out of public copy until the office approves them.
      body: { en: 'Commissions widen across residential, commercial and hospitality work.', ar: 'اتساع التكليفات لتشمل السكني والتجاري والضيافة.' },
    },
  ];

  constructor() {
    this.seo.update({
      title: 'Practice',
      description:
        'MSP Consultants — an integrated architecture & engineering practice in Riyadh. Our story, values, leadership, and trajectory.',
    });

    // Browser-only fetch: keeps the route prerenderable (static skeleton shell).
    afterNextRender(() => {
      this.content.team().subscribe({
        next: (list) => {
          this.team.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }
}
