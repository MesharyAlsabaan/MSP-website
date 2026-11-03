import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Minimal centered shell for authentication screens (built in sub-project C). */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <div
      class="flex min-h-dvh items-center justify-center bg-bg px-5 text-ink"
    >
      <div class="w-full max-w-md">
        <router-outlet />
      </div>
    </div>
  `,
})
export class AuthLayout {}
