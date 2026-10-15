import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Section } from '../../../../shared/ui/section/section';
import { Container } from '../../../../shared/ui/container/container';
import { ScrollReveal } from '../../../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../../../core/services/translation.service';

interface Principle {
  readonly no: string;
  readonly title: string;
  readonly description: string;
}

/** Section 05 — Approach: the studio's working principles. */
@Component({
  selector: 'app-why-us',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Section, Container, ScrollReveal],
  template: `
    <app-section tone="surface">
      <app-container>
        <div class="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div class="lg:col-span-4">
            <div class="lg:sticky lg:top-28">
              <div
                class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted"
              >
                <span class="text-accent">(05)</span>
                <span>{{ i18n.pick(t.eyebrow) }}</span>
              </div>
              <h2
                appScrollReveal
                revealType="line"
                class="mt-6 t-section font-display font-medium tracking-[-0.03em] text-ink"
              >
                {{ i18n.pick(t.headingPre)
                }}<span class="italic text-accent">{{ i18n.pick(t.headingEm) }}</span>
              </h2>
              <p appScrollReveal [revealDelay]="120" class="mt-6 max-w-sm text-muted">
                {{ i18n.pick(t.sub) }}
              </p>
            </div>
          </div>

          <ol class="lg:col-span-7 lg:col-start-6">
            @for (item of i18n.pick(t.principles); track item.no; let last = $last) {
              <li
                appScrollReveal
                class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-hairline py-8"
                [class.border-b]="last"
              >
                <span class="font-mono text-sm text-accent">{{ item.no }}</span>
                <h3 class="font-display text-2xl font-medium text-ink sm:text-3xl">
                  {{ item.title }}
                </h3>
                <p class="col-start-2 max-w-md leading-relaxed text-muted">
                  {{ item.description }}
                </p>
              </li>
            }
          </ol>
        </div>
      </app-container>
    </app-section>
  `,
})
export class WhyUs {
  protected readonly i18n = inject(TranslationService);

  protected readonly t = {
    eyebrow: { en: 'Approach', ar: 'منهجنا' },
    headingPre: { en: 'What we ', ar: 'ما ' },
    headingEm: { en: 'believe.', ar: 'نؤمن به.' },
    sub: {
      en: 'Four convictions that guide every commission, from a single residence to a residential community.',
      ar: 'أربع قناعات توجّه عملنا في كل مشروع، من المسكن الواحد إلى المجتمع السكني المتكامل.',
    },
    principles: {
      en: [
        { no: '01', title: 'Human experience first', description: 'A building is measured by the experiences it makes possible: comfort, daylight, circulation, character, and well-being. Creativity and performance are designed together, never traded.' },
        { no: '02', title: 'Collective intelligence', description: 'Excellence comes from shared knowledge, not one individual. Architects and engineers of different backgrounds work as one team, guided by a common method.' },
        { no: '03', title: 'Technology-enabled, expertise-led', description: 'BIM, digital coordination, and model validation support our work, and we are developing AI-assisted workflows. Professional judgement remains decisive.' },
        { no: '04', title: 'Responsibility beyond handover', description: 'We give independent professional advice, protect our clients\' long-term interests, and consider the people who will use a building for generations.' },
      ],
      ar: [
        { no: '01', title: 'التجربة الإنسانية أولاً', description: 'تُقاس قيمة المبنى بالتجارب التي يُتيحها: الراحة، وضوء النهار، وسلاسة الحركة، والطابع المعماري، وجودة الحياة. نصمّم الإبداع والأداء معاً، ولا نُقايض أحدهما بالآخر.' },
        { no: '02', title: 'الذكاء الجماعي', description: 'التميّز ثمرة معرفة مشتركة، لا جهد فرد واحد. يعمل معماريون ومهندسون من خلفيات متنوّعة فريقاً واحداً، تجمعهم منهجية عمل مشتركة.' },
        { no: '03', title: 'تمكّننا التقنية، وتقودنا الخبرة', description: 'نعتمد نمذجة معلومات البناء (BIM) والتنسيق الرقمي والتحقق من النماذج، ونعمل على تطوير أساليب عمل مدعومة بالذكاء الاصطناعي. ويبقى الحكم المهني هو الفيصل.' },
        { no: '04', title: 'مسؤولية تتجاوز التسليم', description: 'نقدّم مشورة مهنية مستقلة، ونحرص على مصالح عملائنا على المدى البعيد، ونراعي من سيستخدمون المبنى لأجيال قادمة.' },
      ],
    },
  };
}
