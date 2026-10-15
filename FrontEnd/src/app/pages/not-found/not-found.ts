import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Container } from '../../shared/ui/container/container';
import { Button } from '../../shared/ui/button/button';
import { SeoService } from '../../core/services/seo.service';
import { TranslationService } from '../../core/services/translation.service';
import { LocPipe } from '../../shared/pipes/loc.pipe';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Container, Button, LocPipe],
  template: `
    <section class="flex min-h-[70vh] items-center text-center">
      <app-container>
        <p class="font-display text-7xl font-bold text-accent">404</p>
        <h1 class="mt-4 text-3xl font-bold text-ink">{{ i18n.pick(t.heading) }}</h1>
        <p class="mx-auto mt-3 max-w-md text-muted">
          {{ i18n.pick(t.body) }}
        </p>
        <a [routerLink]="'/' | loc" class="mt-8 inline-block">
          <app-button>{{ i18n.pick(t.back) }}</app-button>
        </a>
      </app-container>
    </section>
  `,
})
export class NotFound {
  private readonly seo = inject(SeoService);
  protected readonly i18n = inject(TranslationService);

  protected readonly t = {
    heading: { en: 'Page not found', ar: 'الصفحة غير موجودة' },
    body: {
      en: 'The page you’re looking for doesn’t exist or has moved.',
      ar: 'الصفحة التي تبحث عنها غير موجودة أو نُقلت إلى عنوان آخر.',
    },
    back: { en: 'Back to home', ar: 'العودة إلى الرئيسية' },
  };

  constructor() {
    this.seo.update({ title: this.i18n.pick(this.t.heading), noindex: true });
  }
}
