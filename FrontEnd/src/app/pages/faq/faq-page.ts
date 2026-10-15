import { Cta } from '../home/sections/cta/cta';
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
  imports: [Cta, Container, ScrollReveal],
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

    <app-cta />
  `,
})
export class FaqPage {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);

  protected readonly t = {
    eyebrow: { en: 'FAQ', ar: 'الأسئلة الشائعة' },
    title: { en: 'Questions, answered.', ar: 'أسئلة وأجوبتها.' },
  };

  protected readonly faqs: readonly { q: L; a: L }[] = [
    {
      q: { en: 'What services does MSP provide?', ar: 'ما الخدمات التي تقدّمها MSP؟' },
      a: {
        en: 'MSP is an architecture and engineering consultancy. Our services cover architectural design, interior design, structural and MEP engineering, urban planning, project management and construction supervision, coordinated as one team from brief to handover.',
        ar: 'MSP مكتب استشارات معمارية وهندسية. تشمل خدماتنا التصميم المعماري، والتصميم الداخلي، والهندسة الإنشائية، والهندسة الكهروميكانيكية (MEP)، والتخطيط العمراني، وإدارة المشاريع، والإشراف الهندسي، بتنسيق ضمن فريق واحد من المتطلبات الأولى حتى التسليم.',
      },
    },
    {
      q: { en: 'Do you also build the project?', ar: 'هل تتولّون تنفيذ المشروع أيضاً؟' },
      a: {
        en: 'No. MSP is a consultancy, not a contractor. We design, advise and manage on the client’s behalf. Construction is carried out by a contractor appointed by the client, and we can supervise that work as the client’s consultant.',
        ar: 'لا. MSP جهة استشارية وليست مقاولاً. نصمّم ونقدّم المشورة وندير المشروع نيابة عن العميل، ويتولّى التنفيذ مقاول يعيّنه العميل، ويمكننا الإشراف على أعماله بصفتنا استشاري العميل.',
      },
    },
    {
      q: { en: 'Can you supervise construction?', ar: 'هل يمكنكم الإشراف على التنفيذ؟' },
      a: {
        en: 'Yes. Where it forms part of our appointment, we supervise the works as the client’s consultant: inspecting progress and quality on site, reviewing contractor submittals against the approved design, and reporting to the client.',
        ar: 'نعم. حين يكون الإشراف ضمن نطاق تكليفنا، نتابع الأعمال بصفتنا استشاري العميل؛ فنفحص سير العمل وجودته في الموقع، ونراجع طلبات اعتماد المقاول مقارنة بالتصميم المعتمد، ونرفع التقارير إلى العميل.',
      },
    },
    {
      q: { en: 'What kinds of projects do you work on?', ar: 'ما أنواع المشاريع التي تعملون عليها؟' },
      a: {
        en: 'Our portfolio includes residential villas and compounds, an integrated residential community, hospitality projects such as a hotel and serviced apartments, and commercial, office and commercial-residential buildings.',
        ar: 'تضمّ أعمالنا فللاً ومجمّعات سكنية، ومجتمعاً سكنياً متكاملاً، ومشاريع ضيافة منها فندق وشقق فندقية، إلى جانب مبانٍ تجارية ومكتبية وتجارية سكنية.',
      },
    },
    {
      q: { en: 'Who are your services for?', ar: 'لمن تُقدَّم خدماتكم؟' },
      a: {
        en: 'Our services are for those who commission buildings and places: private owners, real-estate developers, companies and public-sector entities. The scope of each appointment is agreed to suit the client and the project.',
        ar: 'تُقدَّم خدماتنا لكل من يُنشئ المباني والأماكن، من الملّاك الأفراد والمطوّرين العقاريين إلى الشركات والجهات الحكومية. ويُتّفق على نطاق كل تكليف بما يناسب العميل والمشروع.',
      },
    },
    {
      q: { en: 'Where do you work?', ar: 'أين تعملون؟' },
      a: {
        en: 'MSP is based in Riyadh, with an office in Cairo. Our projects are located across Saudi Arabia, including Riyadh and Madinah.',
        ar: 'يقع مقرّ MSP في الرياض، ولها مكتب في القاهرة. وتتوزّع مشاريعنا في أنحاء المملكة العربية السعودية، ومنها الرياض والمدينة المنورة.',
      },
    },
    {
      q: { en: 'Do you work to Saudi codes and standards?', ar: 'هل تعملون وفق الأكواد والمعايير السعودية؟' },
      a: {
        en: 'Yes. We design to the applicable Saudi codes, including the Saudi Building Code (SBC), and to the requirements of the relevant authorities.',
        ar: 'نعم. نصمّم وفق الأكواد السعودية المعمول بها، ومنها كود البناء السعودي (SBC)، ووفق اشتراطات الجهات المختصّة.',
      },
    },
    {
      q: { en: 'How do we start?', ar: 'كيف نبدأ؟' },
      a: {
        en: 'Send us a short brief through the contact page — the site, the type of project and what you hope to achieve. We will respond to arrange an initial conversation.',
        ar: 'أرسل إلينا نبذة مختصرة عبر صفحة التواصل، تتضمّن الموقع ونوع المشروع وما تطمح إلى تحقيقه، وسنتواصل معك لترتيب لقاء أولي.',
      },
    },
  ];

  constructor() {
    this.seo.update({
      title: this.i18n.pick({
        en: 'Frequently Asked Questions',
        ar: 'الأسئلة الشائعة',
      }),
      description: this.i18n.pick({
        en: 'Answers about working with MSP: our consultancy services, construction supervision, the projects we work on, where we work and how to start.',
        ar: 'إجابات عن العمل مع MSP: خدماتنا الاستشارية، والإشراف الهندسي، وأنواع المشاريع، ونطاق عملنا، وكيف نبدأ.',
      }),
      type: 'FAQPage',
      pageProps: {
        mainEntity: this.faqs.map((item) => ({
          '@type': 'Question',
          name: this.i18n.pick(item.q),
          acceptedAnswer: { '@type': 'Answer', text: this.i18n.pick(item.a) },
        })),
      },
    });
  }
}
