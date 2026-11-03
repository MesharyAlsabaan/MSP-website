import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

export type ButtonVariant = 'primary' | 'outline' | 'ghost';

/**
 * Editorial button: sharp-cornered, with a small-caps monospace label. The
 * primary variant is an ink block that shifts to clay on hover. Projects its
 * label/content.
 */
@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [attr.type]="type()" [disabled]="disabled()" [class]="classes()">
      <ng-content />
    </button>
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);

  private readonly base =
    'group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 font-mono text-xs font-medium uppercase tracking-[0.12em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none';

  private readonly variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-ink text-bg hover:bg-accent hover:text-accent-ink',
    outline: 'border border-ink/30 text-ink hover:bg-ink hover:text-bg',
    ghost: 'px-0 py-1 text-ink hover:text-accent',
  };

  readonly classes = computed(
    () => `${this.base} ${this.variantClasses[this.variant()]}`,
  );
}
