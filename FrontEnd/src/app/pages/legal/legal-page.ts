import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Container } from '../../shared/ui/container/container';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';

interface L {
  en: string;
  ar: string;
}
interface LegalDoc {
  title: L;
  updated: L;
  intro: L;
  sections: readonly { heading: L; body: L }[];
}

/** Privacy / Terms — placeholder legal prose, selected by route `data.doc`. */
@Component({
  selector: 'app-legal-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Container, ScrollReveal],
  template: `
    @if (doc(); as d) {
      <section class="border-b border-hairline bg-bg pt-16 pb-14 sm:pt-20">
        <app-container>
          <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
            <span class="text-accent">{{ i18n.pick(eyebrow()) }}</span>
            <span class="h-px flex-1 bg-hairline"></span>
            <span>{{ i18n.pick(d.updated) }}</span>
          </div>
          <h1
            appScrollReveal
            revealType="line"
            class="mt-8 max-w-4xl t-display font-display font-medium tracking-[-0.035em] text-ink"
          >
            {{ i18n.pick(d.title) }}
          </h1>
          <p appScrollReveal [revealDelay]="120" class="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {{ i18n.pick(d.intro) }}
          </p>
        </app-container>
      </section>

      <section class="py-16 sm:py-20">
        <app-container>
          <div class="mx-auto max-w-3xl space-y-12">
            @for (s of d.sections; track s.heading.en; let i = $index) {
              <div appScrollReveal>
                <h2 class="font-display text-xl font-medium text-ink sm:text-2xl">
                  <span class="me-3 font-mono text-sm text-accent">{{ pad(i + 1) }}</span>
                  {{ i18n.pick(s.heading) }}
                </h2>
                <p class="mt-4 leading-relaxed text-muted">{{ i18n.pick(s.body) }}</p>
              </div>
            }
            <p class="border-t border-hairline pt-8 text-sm text-muted">
              {{ i18n.pick(contactNote) }}
              <a href="mailto:hello@msp.sa" class="text-accent hover:underline" dir="ltr">hello&#64;msp.sa</a>
            </p>
          </div>
        </app-container>
      </section>
    }
  `,
})
export class LegalPage {
  protected readonly i18n = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  private readonly key = this.route.snapshot.data['doc'] as 'privacy' | 'terms';

  protected readonly contactNote = {
    en: 'Questions about this policy? Contact us at ',
    ar: 'هل لديك أسئلة حول هذه السياسة؟ تواصل معنا على ',
  };

  protected readonly eyebrow = computed<L>(() =>
    this.key === 'terms' ? { en: 'Terms', ar: 'الشروط' } : { en: 'Privacy', ar: 'الخصوصية' },
  );

  protected readonly doc = computed<LegalDoc>(() =>
    this.key === 'terms' ? TERMS : PRIVACY,
  );

  protected pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  constructor() {
    const privacy = this.doc() === PRIVACY;
    this.seo.update({
      title: this.i18n.pick(this.doc().title),
      description: this.i18n.pick(
        privacy
          ? {
              en: 'How MSP collects, uses and protects personal information submitted through www.msp.sa.',
              ar: 'كيف تجمع MSP المعلومات الشخصية المرسلة عبر www.msp.sa وتستخدمها وتحميها.',
            }
          : {
              en: 'The terms that govern use of the MSP website, www.msp.sa.',
              ar: 'الشروط التي تنظّم استخدام موقع MSP الإلكتروني www.msp.sa.',
            },
      ),
    });
  }
}

const UPDATED: L = { en: 'Updated June 2026', ar: 'حُدّثت يونيو 2026' };

const PRIVACY: LegalDoc = {
  title: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
  updated: UPDATED,
  intro: {
    en: 'This placeholder policy explains, in plain terms, how MSP Consultants handles the information you share with us. Final wording will be reviewed by counsel before launch.',
    ar: 'توضّح هذه السياسة التمهيدية، بعباراتٍ بسيطة، كيف تتعامل إم إس بي للاستشارات مع المعلومات التي تشاركها معنا. ستُراجع الصياغة النهائية قانونياً قبل الإطلاق.',
  },
  sections: [
    {
      heading: { en: 'Information we collect', ar: 'المعلومات التي نجمعها' },
      body: {
        en: 'We collect only what you provide through our contact form — your name, email, and message — to respond to your enquiry.',
        ar: 'نجمع فقط ما تقدّمه عبر نموذج التواصل — اسمك وبريدك ورسالتك — للردّ على استفسارك.',
      },
    },
    {
      heading: { en: 'How we use it', ar: 'كيف نستخدمها' },
      body: {
        en: 'Your information is used to reply to you and to discuss potential work. We do not sell or share it with third parties.',
        ar: 'تُستخدم معلوماتك للردّ عليك ومناقشة العمل المحتمل. لا نبيعها أو نشاركها مع أطرافٍ ثالثة.',
      },
    },
    {
      heading: { en: 'Data retention', ar: 'الاحتفاظ بالبيانات' },
      body: {
        en: 'We keep enquiry records only as long as needed for the conversation, then remove them on request.',
        ar: 'نحتفظ بسجلّات الاستفسار للمدّة اللازمة للمحادثة فقط، ثم نحذفها عند الطلب.',
      },
    },
    {
      heading: { en: 'Your rights', ar: 'حقوقك' },
      body: {
        en: 'You may ask to see, correct, or delete any information you have shared with us at any time.',
        ar: 'يمكنك طلب الاطّلاع على أي معلوماتٍ شاركتها معنا أو تصحيحها أو حذفها في أي وقت.',
      },
    },
  ],
};

const TERMS: LegalDoc = {
  title: { en: 'Terms & Conditions', ar: 'الشروط والأحكام' },
  updated: UPDATED,
  intro: {
    en: 'These placeholder terms govern your use of this website. Final wording will be reviewed by counsel before launch.',
    ar: 'تحكم هذه الشروط التمهيدية استخدامك لهذا الموقع. ستُراجع الصياغة النهائية قانونياً قبل الإطلاق.',
  },
  sections: [
    {
      heading: { en: 'Use of this site', ar: 'استخدام الموقع' },
      body: {
        en: 'This website is provided for general information about MSP Consultants. Content may change without notice.',
        ar: 'يُقدَّم هذا الموقع لأغراض المعلومات العامة عن إم إس بي للاستشارات. وقد يتغيّر المحتوى دون إشعار.',
      },
    },
    {
      heading: { en: 'Intellectual property', ar: 'الملكية الفكرية' },
      body: {
        en: 'All project imagery, text, and designs are the property of MSP Consultants or their respective owners.',
        ar: 'جميع صور المشاريع والنصوص والتصاميم ملكٌ لإم إس بي للاستشارات أو لأصحابها المعنيّين.',
      },
    },
    {
      heading: { en: 'No professional advice', ar: 'لا تُعدّ مشورةً مهنية' },
      body: {
        en: 'Nothing here constitutes architectural or engineering advice. Any engagement is governed by a separate written agreement.',
        ar: 'لا يُشكّل أيٌّ مما هنا مشورةً معمارية أو هندسية. ويخضع أي تكليفٍ لاتفاقيةٍ خطّيةٍ منفصلة.',
      },
    },
    {
      heading: { en: 'Liability', ar: 'المسؤولية' },
      body: {
        en: 'We make no warranties as to the accuracy of website content and accept no liability for its use.',
        ar: 'لا نقدّم أي ضماناتٍ بشأن دقّة محتوى الموقع ولا نتحمّل أي مسؤوليةٍ عن استخدامه.',
      },
    },
  ],
};
