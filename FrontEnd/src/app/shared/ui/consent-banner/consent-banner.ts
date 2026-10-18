import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { ConsentService } from '../../../core/services/consent.service';
import { TranslationService } from '../../../core/services/translation.service';
import { LocPipe } from '../../pipes/loc.pipe';

/**
 * Asks before any non-essential analytics runs. Shown only when a GA4
 * property is configured and the visitor hasn't chosen yet; "Decline" is as
 * prominent as "Accept", and nothing loads until "Accept".
 */
@Component({
  selector: 'app-consent-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LocPipe],
  template: `
    @if (visible()) {
      <section
        role="region"
        [attr.aria-label]="i18n.pick(t.label)"
        class="fixed inset-x-0 bottom-0 z-[60] border-t border-hairline bg-bg/95 backdrop-blur-md"
      >
        <div class="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p class="max-w-2xl text-sm leading-relaxed text-ink/90">
            {{ i18n.pick(t.text) }}
            <a [routerLink]="'/privacy' | loc" class="text-accent underline underline-offset-4">{{ i18n.pick(t.policy) }}</a>
          </p>
          <div class="flex shrink-0 gap-3">
            <button type="button" (click)="decline()" class="border border-ink/30 px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-bg">
              {{ i18n.pick(t.decline) }}
            </button>
            <button type="button" (click)="accept()" class="border border-ink bg-ink px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-bg transition-colors hover:bg-accent hover:border-accent hover:text-accent-ink">
              {{ i18n.pick(t.accept) }}
            </button>
          </div>
        </div>
      </section>
    }
  `,
})
export class ConsentBanner {
  protected readonly i18n = inject(TranslationService);
  private readonly analytics = inject(AnalyticsService);
  private readonly consent = inject(ConsentService);

  /** Only after hydration: the server never renders the banner. */
  private readonly hydrated = signal(false);
  protected readonly visible = computed(
    () => this.hydrated() && this.analytics.configured && this.consent.state() === null,
  );

  constructor() {
    afterNextRender(() => this.hydrated.set(true));
  }

  protected readonly t = {
    label: { en: 'Analytics choice', ar: 'خيار التحليلات' },
    text: {
      en: 'With your permission, we use Google Analytics to understand how visitors use this site and which contact options they use. It never receives your name, email, phone number or message.',
      ar: 'بعد موافقتك، نستخدم Google Analytics لفهم طريقة استخدام الموقع ووسائل التواصل التي يختارها الزوار، ولا يتلقى اسمك أو بريدك أو رقم جوالك أو نص رسالتك.',
    },
    policy: { en: 'Privacy policy', ar: 'سياسة الخصوصية' },
    accept: { en: 'Accept', ar: 'موافق' },
    decline: { en: 'Decline', ar: 'رفض' },
  };

  protected accept(): void {
    this.consent.grant();
    this.analytics.init();
  }

  protected decline(): void {
    this.consent.deny();
  }
}
