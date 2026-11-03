import { Component, ChangeDetectionStrategy } from '@angular/core';

/** Centers content and applies the standard page gutter / max width. */
@Component({
  selector: 'app-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
      <ng-content />
    </div>
  `,
})
export class Container {}
