import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Container } from '../../shared/ui/container/container';
import { SeoService } from '../../core/services/seo.service';

/**
 * Generic placeholder for public pages not yet built (sub-project B).
 * Reads its label from the route's `data.title`.
 */
@Component({
  selector: 'app-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Container],
  template: `
    <section class="flex min-h-[70vh] items-center">
      <app-container>
        <p class="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
          {{ title }}
        </p>
        <h1 class="max-w-2xl text-4xl font-bold text-ink sm:text-5xl">
          This page is coming soon.
        </h1>
        <p class="mt-4 max-w-lg text-muted">
          We’re crafting it. Check back shortly.
        </p>
      </app-container>
    </section>
  `,
})
export class ComingSoon {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  protected readonly title =
    (this.route.snapshot.data['title'] as string) ?? 'Coming soon';

  constructor() {
    this.seo.update({ title: this.title });
  }
}
