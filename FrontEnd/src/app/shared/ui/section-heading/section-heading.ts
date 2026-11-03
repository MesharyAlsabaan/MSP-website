import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ScrollReveal } from '../../directives/scroll-reveal.directive';

/**
 * Editorial section heading: a monospace index + label sitting on a hairline
 * rule, followed by a large Fraunces serif title and an optional intro.
 * The index (e.g. "02") is the architectural-monograph touch.
 */
@Component({
  selector: 'app-section-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScrollReveal],
  template: `
    <div [class.mx-auto]="align() === 'center'" [class.text-center]="align() === 'center'" class="max-w-3xl">
      <div
        class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted"
      >
        @if (index()) {
          <span class="text-accent">({{ index() }})</span>
        }
        <span>{{ eyebrow() }}</span>
        @if (align() !== 'center') {
          <span class="h-px flex-1 bg-hairline"></span>
        }
      </div>

      <h2
        appScrollReveal
        revealType="line"
        class="mt-6 t-section font-display font-medium tracking-[-0.03em] text-ink"
      >
        {{ title() }}
      </h2>

      @if (intro()) {
        <p
          appScrollReveal
          [revealDelay]="120"
          class="mt-6 max-w-xl text-lg leading-relaxed text-muted"
          [class.mx-auto]="align() === 'center'"
        >
          {{ intro() }}
        </p>
      }
    </div>
  `,
})
export class SectionHeading {
  readonly index = input<string>('');
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly intro = input<string>('');
  readonly align = input<'left' | 'center'>('left');
}
