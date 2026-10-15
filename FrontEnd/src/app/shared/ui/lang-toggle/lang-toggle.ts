import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';

/**
 * Small EN / عربية switch that mirrors the theme toggle styling. A real link
 * to the same page in the other edition (crawlable, opens in a new tab),
 * navigated in-app on a plain click.
 */
@Component({
  selector: 'app-lang-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [href]="i18n.counterpartUrl()"
      (click)="go($event)"
      [attr.hreflang]="i18n.isArabic() ? 'en' : 'ar'"
      [attr.lang]="i18n.isArabic() ? 'en' : 'ar'"
      [attr.aria-label]="i18n.isArabic() ? 'Switch to English' : 'التبديل إلى العربية'"
      class="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-border px-3 font-mono text-xs font-medium uppercase tracking-[0.1em] text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {{ i18n.isArabic() ? 'EN' : 'ع' }}
    </a>
  `,
})
export class LangToggle {
  protected readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);

  protected go(event: MouseEvent): void {
    // Let modified clicks (new tab / window) fall through to the browser.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void this.router.navigateByUrl(this.i18n.counterpartUrl());
  }
}
