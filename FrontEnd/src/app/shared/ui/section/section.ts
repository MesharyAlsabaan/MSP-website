import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

export type SectionTone = 'default' | 'surface';

/**
 * Applies consistent vertical rhythm between page sections. The optional
 * `tone` input swaps the full-width background so sections can alternate
 * between the page background and the raised surface color.
 */
@Component({
  selector: 'app-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section [class]="classes()">
      <ng-content />
    </section>
  `,
})
export class Section {
  readonly tone = input<SectionTone>('default');

  readonly classes = computed(
    () => `py-20 sm:py-28 ${this.tone() === 'surface' ? 'bg-surface' : 'bg-bg'}`,
  );
}
