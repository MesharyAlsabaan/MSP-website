import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Container } from '../../shared/ui/container/container';
import { Section } from '../../shared/ui/section/section';
import { SectionHeading } from '../../shared/ui/section-heading/section-heading';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';

interface L {
  en: string;
  ar: string;
}

/** Careers page — culture, open roles, and how to apply. */
@Component({
  selector: 'app-careers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Container, Section, SectionHeading, ScrollReveal],
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
        <p appScrollReveal [revealDelay]="120" class="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          {{ i18n.pick(t.intro) }}
        </p>
      </app-container>
    </section>

    <!-- Open roles -->
    <app-section>
      <app-container>
        <app-section-heading [eyebrow]="i18n.pick(t.rolesEyebrow)" [title]="i18n.pick(t.rolesTitle)" />
        <ul class="mt-12 border-t border-hairline">
          @for (role of roles; track role.title.en) {
            <li appScrollReveal class="group border-b border-hairline">
              <a
                href="mailto:careers@msp.sa"
                class="grid grid-cols-12 items-center gap-4 py-7 transition-[padding] duration-500 hover:ps-3"
              >
                <h2 class="col-span-12 font-display text-xl font-medium text-ink transition-colors group-hover:text-accent sm:col-span-6 sm:text-2xl">
                  {{ i18n.pick(role.title) }}
                </h2>
                <span class="col-span-6 font-mono text-xs uppercase tracking-[0.12em] text-muted sm:col-span-3">
                  {{ i18n.pick(role.type) }}
                </span>
                <span class="col-span-6 font-mono text-xs uppercase tracking-[0.12em] text-muted sm:col-span-2">
                  {{ i18n.pick(role.location) }}
                </span>
                <span class="dir-flip col-span-12 hidden justify-self-end text-accent transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 sm:col-span-1 sm:block">&rarr;</span>
              </a>
            </li>
          }
        </ul>

        <p appScrollReveal class="mt-10 max-w-xl leading-relaxed text-muted">
          {{ i18n.pick(t.openNote) }}
          <a href="mailto:careers@msp.sa" class="text-accent hover:underline" dir="ltr">careers&#64;msp.sa</a>
        </p>
      </app-container>
    </app-section>
  `,
})
export class CareersPage {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);

  protected readonly t = {
    eyebrow: { en: 'Careers', ar: 'الوظائف' },
    title: { en: 'Build with us.', ar: 'ابنِ معنا.' },
    intro: {
      en: 'We are a small, senior team that values craft, rigour, and a calm process. If that sounds like you, we’d like to talk.',
      ar: 'نحن فريقٌ صغيرٌ وخبير يُقدّر الإتقان والدقّة والعمل الهادئ. إن كان هذا يشبهك، نودّ التحدّث معك.',
    },
    rolesEyebrow: { en: 'Open roles', ar: 'الوظائف المتاحة' },
    rolesTitle: { en: 'Join the studio.', ar: 'انضمّ إلى المكتب.' },
    openNote: {
      en: 'Don’t see your role? We’re always glad to meet talented people. Write to us at ',
      ar: 'لم تجد دورك؟ يسعدنا دائماً لقاء الموهوبين. راسلنا على ',
    },
  };

  protected readonly roles: readonly { title: L; type: L; location: L }[] = [
    {
      title: { en: 'Senior Architect', ar: 'معماري أول' },
      type: { en: 'Full-time', ar: 'دوام كامل' },
      location: { en: 'Riyadh', ar: 'الرياض' },
    },
    {
      title: { en: 'Structural Engineer', ar: 'مهندس إنشائي' },
      type: { en: 'Full-time', ar: 'دوام كامل' },
      location: { en: 'Riyadh', ar: 'الرياض' },
    },
    {
      title: { en: 'MEP Engineer', ar: 'مهندس كهروميكانيكا' },
      type: { en: 'Full-time', ar: 'دوام كامل' },
      location: { en: 'Riyadh', ar: 'الرياض' },
    },
    {
      title: { en: 'Architectural Intern', ar: 'متدرّب معماري' },
      type: { en: 'Internship', ar: 'تدريب' },
      location: { en: 'Riyadh', ar: 'الرياض' },
    },
  ];

  constructor() {
    this.seo.update({
      title: this.i18n.pick({ en: 'Careers', ar: 'الوظائف' }),
      description: this.i18n.pick({
        en: 'Join MSP Consultants — open architecture and engineering roles in Riyadh.',
        ar: 'انضم إلى MSP للاستشارات — وظائف شاغرة في العمارة والهندسة في الرياض.',
      }),
    });
  }
}
