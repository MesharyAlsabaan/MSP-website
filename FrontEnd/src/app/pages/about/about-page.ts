import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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
import { SrcsetPipe } from '../../shared/pipes/srcset.pipe';

interface L {
  en: string;
  ar: string;
}

/**
 * Practice / About page — positioning, philosophy, vision and mission, values,
 * collective expertise, technology, leadership (CEO message + team) and
 * long-term ambition.
 */
@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Container, Section, SectionHeading, ScrollReveal, CountUp, Cta, AssetPipe, SrcsetPipe],
  template: `
    <!-- Header: who we are -->
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

    <!-- Philosophy -->
    <app-section>
      <app-container>
        <app-section-heading index="01" [eyebrow]="i18n.pick(t.philEyebrow)" [title]="i18n.pick(t.philTitle)" />
        <div class="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div class="lg:col-span-7">
            <p
              appScrollReveal
              revealType="line"
              class="font-display text-3xl font-medium leading-[1.2] tracking-[-0.02em] text-ink sm:text-4xl"
            >
              {{ i18n.pick(t.philLead) }}
            </p>
          </div>
          <div class="lg:col-span-4 lg:col-start-9">
            <p appScrollReveal class="leading-relaxed text-muted">{{ i18n.pick(t.phil1) }}</p>
            <p appScrollReveal [revealDelay]="100" class="mt-4 leading-relaxed text-muted">
              {{ i18n.pick(t.phil2) }}
            </p>
          </div>
        </div>
      </app-container>
    </app-section>

    <!-- Numbers (verified facts only) -->
    <section class="bg-band dark:border-y dark:border-hairline py-20 text-on-band sm:py-24">
      <app-container>
        <dl class="grid grid-cols-2 gap-x-8 gap-y-12">
          @for (s of stats; track s.label.en; let i = $index) {
            <div appScrollReveal [revealDelay]="i * 90">
              <dt
                [appCountUp]="s.value"
                class="font-display text-5xl font-medium leading-none tracking-[-0.02em] text-on-band sm:text-6xl"
              >
                <span data-count>0</span><span class="text-accent">{{ s.suffix }}</span>
              </dt>
              <dd class="mt-4 border-t border-on-band/15 pt-4 font-mono text-xs uppercase tracking-[0.12em] text-on-band/60">
                {{ i18n.pick(s.label) }}
              </dd>
            </div>
          }
        </dl>
      </app-container>
    </section>

    <!-- Vision & Mission -->
    <app-section>
      <app-container>
        <app-section-heading index="02" [eyebrow]="i18n.pick(t.vmEyebrow)" [title]="i18n.pick(t.vmTitle)" />
        <div class="mt-14 grid gap-px overflow-hidden border border-hairline bg-hairline md:grid-cols-2">
          @for (item of visionMission; track item.title.en; let i = $index) {
            <div appScrollReveal [revealDelay]="i * 70" class="bg-bg p-7 lg:p-10">
              <h3 class="font-mono text-xs uppercase tracking-[0.18em] text-accent">{{ i18n.pick(item.title) }}</h3>
              <p class="mt-5 font-display text-xl font-medium leading-snug text-ink sm:text-2xl">
                {{ i18n.pick(item.body) }}
              </p>
            </div>
          }
        </div>
      </app-container>
    </app-section>

    <!-- Values -->
    <app-section tone="surface">
      <app-container>
        <app-section-heading
          index="03"
          [eyebrow]="i18n.pick(t.valuesEyebrow)"
          [title]="i18n.pick(t.valuesTitle)"
        />
        <div class="mt-14 grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
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

    <!-- Collective expertise -->
    <app-section>
      <app-container>
        <app-section-heading index="04" [eyebrow]="i18n.pick(t.ceEyebrow)" [title]="i18n.pick(t.ceTitle)" />
        <div class="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div class="lg:col-span-7">
            <p
              appScrollReveal
              revealType="line"
              class="font-display text-3xl font-medium leading-[1.2] tracking-[-0.02em] text-ink sm:text-4xl"
            >
              {{ i18n.pick(t.ceLead) }}
            </p>
          </div>
          <div class="lg:col-span-4 lg:col-start-9">
            <p appScrollReveal class="leading-relaxed text-muted">{{ i18n.pick(t.ce1) }}</p>
            <p appScrollReveal [revealDelay]="100" class="mt-4 leading-relaxed text-muted">
              {{ i18n.pick(t.ce2) }}
            </p>
          </div>
        </div>
      </app-container>
    </app-section>

    <!-- Technology & innovation -->
    <app-section tone="surface">
      <app-container>
        <app-section-heading
          index="05"
          [eyebrow]="i18n.pick(t.techEyebrow)"
          [title]="i18n.pick(t.techTitle)"
          [intro]="i18n.pick(t.techIntro)"
        />
        <div class="mt-14 grid gap-px overflow-hidden border border-hairline bg-hairline md:grid-cols-2">
          @for (item of technology; track item.title.en; let i = $index) {
            <div appScrollReveal [revealDelay]="i * 70" class="bg-bg p-7 lg:p-8">
              <span class="font-mono text-xs uppercase tracking-[0.12em] text-accent">{{ i18n.pick(item.tag) }}</span>
              <h3 class="mt-4 font-display text-xl font-medium text-ink">{{ i18n.pick(item.title) }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-muted">{{ i18n.pick(item.body) }}</p>
            </div>
          }
        </div>
      </app-container>
    </app-section>

    <!-- Leadership: CEO message + team -->
    <app-section>
      <app-container>
        <app-section-heading
          index="06"
          [eyebrow]="i18n.pick(t.leadEyebrow)"
          [title]="i18n.pick(t.leadTitle)"
          [intro]="i18n.pick(t.leadIntro)"
        />

        <figure class="mt-14 grid gap-12 border-t border-hairline pt-12 lg:grid-cols-12 lg:gap-8">
          <div class="lg:col-span-4">
            <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">{{ i18n.pick(t.ceoEyebrow) }}</p>
            <h3 appScrollReveal class="mt-4 font-display text-xl font-medium text-ink sm:text-2xl">
              {{ i18n.pick(t.ceoTitle) }}
            </h3>
            <figcaption class="mt-8 border-t border-hairline pt-4">
              <span class="block font-display text-lg font-medium text-ink">{{ i18n.pick(t.ceoName) }}</span>
              <span class="mt-1 block font-mono text-xs uppercase tracking-[0.12em] text-muted">
                {{ i18n.pick(t.ceoRole) }}
              </span>
            </figcaption>
          </div>
          <blockquote class="lg:col-span-7 lg:col-start-6">
            <p
              appScrollReveal
              revealType="line"
              class="font-display text-3xl font-medium leading-[1.2] tracking-[-0.02em] text-ink sm:text-4xl"
            >
              {{ i18n.pick(ceoMessage[0]) }}
            </p>
            @for (para of ceoBody; track para.en; let i = $index) {
              <p appScrollReveal [revealDelay]="i * 60" class="mt-5 leading-relaxed text-muted">
                {{ i18n.pick(para) }}
              </p>
            }
          </blockquote>
        </figure>

        @if (loading()) {
          <div class="mt-20 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
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
          <div class="mt-20 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            @for (member of team(); track member.id; let i = $index) {
              <article appScrollReveal [revealDelay]="i * 70" class="group">
                <div appScrollReveal revealType="line" class="aspect-[4/5] overflow-hidden bg-hairline/40">
                  @if (member.photo) {
                    <img
                      sizes="(min-width: 1024px) 23vw, (min-width: 640px) 46vw, 92vw"
                      [attr.srcset]="member.photo | srcset"
                      [src]="member.photo | asset"
                      width="800"
                      height="1000"
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

    <!-- Long-term institutional ambition -->
    <app-section tone="surface">
      <app-container>
        <app-section-heading index="07" [eyebrow]="i18n.pick(t.ambEyebrow)" [title]="i18n.pick(t.ambTitle)" />
        <div class="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div class="lg:col-span-7">
            <p
              appScrollReveal
              revealType="line"
              class="font-display text-3xl font-medium leading-[1.2] tracking-[-0.02em] text-ink sm:text-4xl"
            >
              {{ i18n.pick(t.ambLead) }}
            </p>
          </div>
          <div class="lg:col-span-4 lg:col-start-9">
            <p appScrollReveal class="leading-relaxed text-muted">{{ i18n.pick(t.amb1) }}</p>
            <p appScrollReveal [revealDelay]="100" class="mt-4 leading-relaxed text-muted">
              {{ i18n.pick(t.amb2) }}
            </p>
          </div>
        </div>
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
    // Who we are
    eyebrow: { en: 'Who We Are', ar: 'من نحن' },
    title: {
      en: 'A multidisciplinary architecture and engineering consultancy.',
      ar: 'مكتب استشارات معمارية وهندسية متعدد التخصصات.',
    },
    intro: {
      en: 'MSP creates environments that enrich human experiences and deliver lasting value. Founded in Riyadh in 2010, we bring together diverse expertise, creative thinking and advanced technologies in a collaborative practice that places people, performance and long-term impact at the heart of every project.',
      ar: 'تصمّم MSP بيئات تُثري التجربة الإنسانية وتحقق قيمة تدوم. تأسّست في الرياض عام 2010، وتجمع خبرات متنوعة وتفكيراً إبداعياً وتقنيات متقدمة ضمن ممارسة تعاونية تضع الإنسان والأداء والأثر بعيد المدى في صميم كل مشروع.',
    },

    // Philosophy
    philEyebrow: { en: 'Our Philosophy', ar: 'فلسفتنا' },
    philTitle: { en: 'Architecture Beyond Buildings.', ar: 'عمارةٌ تتجاوز المباني.' },
    philLead: {
      en: 'Architecture is not merely about the spaces we create, but about the experiences those spaces make possible.',
      ar: 'لا تقتصر العمارة على الفراغات التي نصمّمها، بل تمتد إلى التجارب التي تتيحها تلك الفراغات.',
    },
    phil1: {
      en: 'Every building type has its own experience. A museum moves people through spatial drama; a residence through comfort, privacy and daylight; a commercial destination through clear circulation and a lively public realm. We integrate architectural creativity with functional performance, well-being and long-term value.',
      ar: 'لكل نوع من المباني تجربته الخاصة؛ فالمتحف يأخذ زوّاره في تجربة فراغية مؤثرة، والمسكن يمنح الراحة والخصوصية والإضاءة الطبيعية، والوجهة التجارية تقوم على وضوح الحركة وحيوية الفراغات العامة. ونحن ندمج الإبداع المعماري مع الأداء الوظيفي ورفاه الإنسان والقيمة بعيدة المدى.',
    },
    phil2: {
      en: 'We measure success in two ways. The first is professional: the agreed quality, schedule, budget and standards, met with reliable engineering advice. The second comes later — the life a project takes on once it is occupied, used and valued.',
      ar: 'نقيس النجاح ببُعدين: الأول مهني، ويتمثّل في تحقيق الجودة والجداول الزمنية والميزانيات والمعايير المتفق عليها، مع تقديم مشورة هندسية موثوقة. والثاني يأتي لاحقاً، وهو الحياة التي يحياها المشروع بعد إشغاله واستخدامه وتقدير الناس له.',
    },

    // Vision & mission
    vmEyebrow: { en: 'Vision & Mission', ar: 'الرؤية والرسالة' },
    vmTitle: { en: 'What we work towards.', ar: 'ما نسعى إليه.' },

    // Values
    valuesEyebrow: { en: 'Values', ar: 'قيمنا' },
    valuesTitle: { en: 'What we hold to.', ar: 'ما نلتزم به.' },

    // Collective expertise
    ceEyebrow: { en: 'Collective Expertise', ar: 'الخبرة الجماعية' },
    ceTitle: { en: 'Many disciplines, one practice.', ar: 'تخصصات متعددة، وممارسة واحدة.' },
    ceLead: {
      en: 'Excellence is not the achievement of an individual, but the outcome of collective knowledge and shared purpose.',
      ar: 'التميّز ليس إنجاز فرد واحد، بل ثمرة معرفة جماعية وغاية مشتركة.',
    },
    ce1: {
      en: 'MSP brings together architects, engineers and specialists of different nationalities, academic backgrounds and experience. Architectural design, interior design, structural and MEP engineering, urban planning, project management and construction supervision work as one team, united by shared values and a common professional philosophy.',
      ar: 'تجمع MSP معماريين ومهندسين ومتخصصين من جنسيات وخلفيات أكاديمية وخبرات متنوعة. وتعمل تخصصات التصميم المعماري والتصميم الداخلي والهندسة الإنشائية والهندسة الكهروميكانيكية (MEP) والتخطيط العمراني وإدارة المشاريع والإشراف الهندسي فريقاً واحداً، تجمعه قيم مشتركة وفلسفة مهنية واحدة.',
    },
    ce2: {
      en: 'Diversity of thought strengthens our solutions. We are building a working methodology that stays consistent as our teams grow and change, so the quality of our advice never rests on one person alone.',
      ar: 'يُثري تنوّع الأفكار حلولنا. ونعمل على ترسيخ منهجية عمل تحافظ على اتساقها مع نموّ فرقنا وتغيّرها، كي لا ترتبط جودة مشورتنا بشخص بعينه.',
    },

    // Technology & innovation
    techEyebrow: { en: 'Technology & Innovation', ar: 'التقنية والابتكار' },
    techTitle: { en: 'Technology-enabled. Expertise-led.', ar: 'تمكّننا التقنية، وتقودنا الخبرة.' },
    techIntro: {
      en: 'Digital tools help us coordinate, test and decide with greater confidence. They do not replace engineering expertise; professional judgement stays at the centre of every decision.',
      ar: 'تساعدنا الأدوات الرقمية على التنسيق والتحقق واتخاذ القرار بثقة أكبر، لكنها لا تحلّ محل الخبرة الهندسية؛ فالحكم المهني يبقى في صميم كل قرار.',
    },

    // Leadership
    leadEyebrow: { en: 'Leadership', ar: 'القيادة' },
    leadTitle: { en: 'Guided by shared values.', ar: 'قيادة تحكمها قيم مشتركة.' },
    leadIntro: {
      en: 'The people who guide the practice and hold it to its professional standards.',
      ar: 'الأشخاص الذين يوجّهون ممارستنا ويحرصون على التزامها بمعاييرها المهنية.',
    },
    ceoEyebrow: { en: 'A message from the CEO', ar: 'كلمة الرئيس التنفيذي' },
    ceoTitle: {
      en: 'Designing Experiences. Creating Lasting Impact.',
      ar: 'نصمّم التجارب، ونصنع أثراً يدوم.',
    },
    ceoName: { en: 'Mansour Al-Sabaan', ar: 'منصور السبعان' },
    ceoRole: { en: 'Chief Executive Officer, MSP', ar: 'الرئيس التنفيذي' },

    // Long-term ambition (aspirational)
    ambEyebrow: { en: 'Long-Term Ambition', ar: 'طموحنا بعيد المدى' },
    ambTitle: { en: 'An institution, not only a practice.', ar: 'مؤسسة، لا مجرد مكتب.' },
    ambLead: {
      en: 'We design for the people of today, with a responsibility to the generations of tomorrow.',
      ar: 'نصمّم لإنسان اليوم، ونحمل مسؤوليتنا تجاه أجيال الغد.',
    },
    amb1: {
      en: 'Over the long term, MSP aspires to become an institution whose contribution reaches beyond its own people and projects — to architectural and engineering knowledge, building materials and construction technologies, design methodology and professional education.',
      ar: 'على المدى البعيد، تطمح MSP إلى أن تصبح مؤسسة يتجاوز إسهامها أفرادها ومشاريعها، ليشمل المعرفة المعمارية والهندسية، ومواد البناء وتقنياته، ومنهجيات التصميم، والتعليم المهني.',
    },
    amb2: {
      en: 'It is an ambition we intend to pursue step by step: by sharing what we learn, developing our people, and holding each project to a standard worth passing on.',
      ar: 'وهو طموح نعتزم تحقيقه خطوة بخطوة: بمشاركة ما نتعلّمه، وتطوير كوادرنا، والالتزام في كل مشروع بمعيار يستحق أن يُورَث.',
    },
  };

  // Verified facts only: years since founding in 2010, and the two offices.
  protected readonly stats = [
    {
      value: new Date().getFullYear() - 2010,
      suffix: '+',
      label: { en: 'Years in practice, since 2010', ar: 'عاماً من الممارسة منذ 2010' },
    },
    { value: 2, suffix: '', label: { en: 'Offices — Riyadh and Cairo', ar: 'مكتبان في الرياض والقاهرة' } },
  ];

  protected readonly visionMission: readonly { title: L; body: L }[] = [
    {
      title: { en: 'Vision', ar: 'رؤيتنا' },
      body: {
        en: 'To become a globally respected institution in architecture and engineering, trusted for our expertise, recognized for advancing knowledge, and valued for creating meaningful human experiences and a lasting legacy for future generations.',
        ar: 'أن نصبح مؤسسة تحظى باحترام عالمي في العمارة والهندسة، موثوقة بخبرتها، ومعروفة بإسهامها في تطوير المعرفة، ومقدَّرة لما تصنعه من تجارب إنسانية ذات معنى وإرث باقٍ للأجيال القادمة.',
      },
    },
    {
      title: { en: 'Mission', ar: 'رسالتنا' },
      body: {
        en: 'To create exceptional built environments through purposeful design, integrated engineering expertise, and continuous innovation — enhancing human experiences, delivering lasting value, and contributing to the advancement of architectural and engineering knowledge.',
        ar: 'أن نصنع بيئات عمرانية استثنائية من خلال التصميم الهادف والخبرة الهندسية المتكاملة والابتكار المستمر، بما يُثري التجربة الإنسانية، ويحقق قيمة تدوم، ويسهم في تطوير المعرفة المعمارية والهندسية.',
      },
    },
  ];

  protected readonly values: readonly { no: string; title: L; body: L }[] = [
    {
      no: '01',
      title: { en: 'Human Experience', ar: 'التجربة الإنسانية' },
      body: {
        en: 'We design around the people who will use a place — their comfort, well-being and sense of belonging.',
        ar: 'نصمّم انطلاقاً من الإنسان الذي سيستخدم المكان: راحته ورفاهه وإحساسه بالانتماء.',
      },
    },
    {
      no: '02',
      title: { en: 'Purposeful Creativity', ar: 'الإبداع الهادف' },
      body: {
        en: 'Creativity and function work together. Every design idea earns its place by serving the project and the people it is for.',
        ar: 'يتكامل الإبداع مع الوظيفة؛ فكل فكرة تصميمية تستحق مكانها بقدر ما تخدم المشروع ومستخدميه.',
      },
    },
    {
      no: '03',
      title: { en: 'Collective Intelligence', ar: 'الذكاء الجماعي' },
      body: {
        en: 'Strong solutions come from many disciplines and perspectives thinking together, not from any single voice.',
        ar: 'الحلول المتميزة ثمرة تفكير مشترك بين تخصصات ووجهات نظر متعددة، لا نتاج صوت واحد.',
      },
    },
    {
      no: '04',
      title: { en: 'Professional Integrity', ar: 'النزاهة المهنية' },
      body: {
        en: 'We give independent, honest advice, and constructively challenge proposals that would not serve a client’s long-term interests.',
        ar: 'نقدّم مشورة مهنية مستقلة وصادقة، ونناقش بموضوعية المقترحات التي لا تخدم مصالح العميل على المدى البعيد.',
      },
    },
    {
      no: '05',
      title: { en: 'Continuous Evolution', ar: 'التطوّر المستمر' },
      body: {
        en: 'We keep learning and refining our methods, adopting new tools where they genuinely improve the work.',
        ar: 'نواصل التعلّم وتطوير أساليبنا، ونتبنّى الأدوات الجديدة حين تُحسّن العمل فعلاً.',
      },
    },
    {
      no: '06',
      title: { en: 'Enduring Value', ar: 'القيمة الدائمة' },
      body: {
        en: 'Buildings are not short-lived products. We weigh the cultural, social, environmental and economic consequences of every decision.',
        ar: 'المباني ليست منتجات قصيرة العمر؛ لذا نزن الأثر الثقافي والاجتماعي والبيئي والاقتصادي لكل قرار نتخذه.',
      },
    },
  ];

  // Current practice vs. areas still being developed — kept explicitly separate.
  protected readonly technology: readonly { tag: L; title: L; body: L }[] = [
    {
      tag: { en: 'Current', ar: 'حالياً' },
      title: { en: 'In our practice today', ar: 'في ممارستنا اليوم' },
      body: {
        en: 'Building Information Modelling (BIM), digital coordination between disciplines, model validation, digital project management and structured quality assurance across design and supervision.',
        ar: 'نمذجة معلومات البناء (BIM)، والتنسيق الرقمي بين التخصصات، والتحقق من النماذج، والإدارة الرقمية للمشاريع، وضمان الجودة وفق منهجية واضحة في مراحل التصميم والإشراف.',
      },
    },
    {
      tag: { en: 'Evolving', ar: 'قيد التطوير' },
      title: { en: 'What we are developing', ar: 'ما نعمل على تطويره' },
      body: {
        en: 'AI-assisted workflows, engineering automation and data-informed decision support. We are introducing these step by step, and only where they prove their value under expert review.',
        ar: 'أساليب العمل المدعومة بالذكاء الاصطناعي، وأتمتة المهام الهندسية، ودعم القرار المبني على البيانات. ونُدخلها تدريجياً، ولا نعتمدها إلا حيث تثبت جدواها بمراجعة المختصين.',
      },
    },
  ];

  /** CEO message (approved text). The first paragraph is set as the pull-quote. */
  protected readonly ceoMessage: readonly L[] = [
    {
      en: 'At MSP, we believe architecture is more than the creation of buildings. It is about shaping experiences, enriching lives, and creating spaces that leave a meaningful impact on people and places.',
      ar: 'نؤمن في MSP بأن العمارة أكثر من مجرد إقامة المباني؛ إنها صياغة للتجارب، وإثراء للحياة، وصناعة لفراغات تترك أثراً عميقاً في الناس والأماكن.',
    },
    {
      en: 'To us, great architecture is where creativity, purpose, and human experience come together. Its true success is measured not only by how a project looks or performs, but by how people interact with it, the experiences it inspires, and the value it continues to create long after completion.',
      ar: 'فالعمارة المتميزة في نظرنا هي التي يلتقي فيها الإبداع بالغاية والتجربة الإنسانية. ولا يُقاس نجاحها الحقيقي بمظهر المشروع أو أدائه فحسب، بل بطريقة تفاعل الناس معه، والتجارب التي يُلهمها، والقيمة التي يواصل تقديمها بعد اكتماله بزمن طويل.',
    },
    {
      en: 'Our strength lies in the collective intelligence of our people. By bringing together diverse perspectives, multidisciplinary expertise, and advanced technologies, we have developed a collaborative approach driven by shared values, continuous learning, and a commitment to quality.',
      ar: 'تكمن قوتنا في الذكاء الجماعي لفريقنا. فمن خلال الجمع بين وجهات النظر المتنوعة والخبرات متعددة التخصصات والتقنيات المتقدمة، طوّرنا نهجاً تعاونياً تقوده القيم المشتركة والتعلّم المستمر والالتزام بالجودة.',
    },
    {
      en: 'As engineering consultants, we recognize that our responsibility extends beyond meeting expectations. The decisions we make today shape environments that may serve generations to come.',
      ar: 'وبصفتنا مستشارين هندسيين، ندرك أن مسؤوليتنا تتجاوز تلبية التوقعات؛ فالقرارات التي نتخذها اليوم تُشكّل بيئات قد تخدم أجيالاً قادمة.',
    },
    {
      en: 'This responsibility guides our professional judgment and our pursuit of meaningful, enduring solutions.',
      ar: 'وهذه المسؤولية هي ما يوجّه حكمنا المهني وسعينا إلى حلول هادفة ودائمة.',
    },
    {
      en: 'Our ambition reaches beyond the projects we deliver. We aspire to build an institution that advances architectural and engineering knowledge, encourages research and innovation, and contributes to the future of our profession.',
      ar: 'ويمتد طموحنا إلى ما هو أبعد من المشاريع التي نقدّمها؛ إذ نتطلّع إلى بناء مؤسسة تُسهم في تطوير المعرفة المعمارية والهندسية، وتشجّع البحث والابتكار، وتشارك في صياغة مستقبل مهنتنا.',
    },
    {
      en: 'Our greatest legacy will not simply be the buildings we leave behind, but the lives we enrich, the knowledge we advance, and the possibilities we create for generations to come.',
      ar: 'ولن يكون إرثنا الأعظم مجرد المباني التي نتركها خلفنا، بل الحياة التي نُثريها، والمعرفة التي نطوّرها، والإمكانات التي نصنعها للأجيال القادمة.',
    },
  ];

  protected readonly ceoBody = this.ceoMessage.slice(1);

  constructor() {
    this.seo.update({
      title: this.i18n.pick({
        en: 'About MSP: Architecture & Engineering Consultants',
        ar: 'من نحن: مكتب استشارات هندسية ومعمارية',
      }),
      description: this.i18n.pick({
        en: 'Who MSP is: a multidisciplinary architecture and engineering consultancy founded in Riyadh in 2010. Our philosophy, vision, mission, values and leadership.',
        ar: 'تأسست MSP في الرياض عام 2010 مكتباً للاستشارات المعمارية والهندسية متعدد التخصصات. تعرّف على فلسفتنا ورؤيتنا ورسالتنا وقيمنا وقيادتنا.',
      }),
      type: 'AboutPage',
    });

    this.content.team().subscribe({
      next: (list) => {
        this.team.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
