import {
  Component,
  inject,
  signal,
  computed,
  PLATFORM_ID,
  NgZone,
  afterNextRender,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslationService } from '../../../core/services/translation.service';

/**
 * Live local time in Riyadh (Asia/Riyadh, UTC+3). Ticks every second.
 *
 * The interval runs OUTSIDE Angular's zone and only nudges a signal, so it
 * refreshes just this component — no app-wide change-detection churn. Renders a
 * stable placeholder during SSR / before hydration to avoid a hydration
 * mismatch, then fills in on the client.
 */
@Component({
  selector: 'app-riyadh-clock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="font-mono text-xs uppercase tracking-[0.15em] text-muted">
      <span class="text-accent">{{ i18n.pick(label) }}</span>
      <span dir="ltr">{{ time() }}</span>
    </span>
  `,
})
export class RiyadhClock implements OnDestroy {
  protected readonly i18n = inject(TranslationService);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly label = { en: 'Riyadh', ar: 'الرياض' };

  private readonly tick = signal(0);
  private readonly ready = signal(false);
  private intervalId?: ReturnType<typeof setInterval>;

  protected readonly time = computed(() => {
    this.tick(); // re-evaluate every second
    return this.ready() ? this.format() : '··:··:··';
  });

  constructor() {
    if (!this.isBrowser) return;
    afterNextRender(() => {
      this.ready.set(true);
      this.zone.runOutsideAngular(() => {
        this.intervalId = setInterval(() => this.tick.update((t) => t + 1), 1000);
      });
    });
  }

  private format(): string {
    const locale = this.i18n.lang() === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB';
    try {
      return new Intl.DateTimeFormat(locale, {
        timeZone: 'Asia/Riyadh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date());
    } catch {
      return '';
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
