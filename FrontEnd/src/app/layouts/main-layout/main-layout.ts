import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { ConsentBanner } from '../../shared/ui/consent-banner/consent-banner';

/** Public-site chrome: header + routed content + footer. */
@Component({
  selector: 'app-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Header, Footer, ConsentBanner],
  template: `
    <div class="flex min-h-dvh flex-col bg-bg text-ink">
      <app-header />
      <main class="flex-1">
        <router-outlet />
      </main>
      <app-footer />
      <app-consent-banner />
    </div>
  `,
})
export class MainLayout {}
