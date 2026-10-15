import { Component, ChangeDetectionStrategy, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './core/services/analytics.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    // Analytics stays off unless a GA4 ID is configured (see environment.ts).
    const analytics = inject(AnalyticsService);
    afterNextRender(() => analytics.init());
  }
}
