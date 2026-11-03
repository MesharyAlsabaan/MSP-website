import {
  Directive,
  ElementRef,
  inject,
  input,
  NgZone,
  PLATFORM_ID,
  afterNextRender,
  OnDestroy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Subtle vertical parallax: translates the element as it moves through the
 * viewport. `parallaxSpeed` is the fraction of scroll distance to offset by.
 *
 * The scroll listener and rAF run OUTSIDE Angular's zone so they never trigger
 * change detection — essential, otherwise every scroll frame would churn CD
 * (which also starves sibling signal updates). SSR-safe and reduced-motion-aware.
 */
@Directive({
  selector: '[appParallax]',
})
export class Parallax implements OnDestroy {
  readonly parallaxSpeed = input(0.12);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private ticking = false;
  private readonly onScroll = () => this.requestUpdate();

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      if (prefersReduced) return;

      this.zone.runOutsideAngular(() => {
        this.host.nativeElement.style.willChange = 'transform';
        window.addEventListener('scroll', this.onScroll, { passive: true });
        this.update();
      });
    });
  }

  private requestUpdate(): void {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.update();
      this.ticking = false;
    });
  }

  private update(): void {
    const el = this.host.nativeElement;
    const rect = el.getBoundingClientRect();
    const viewportCenter = window.innerHeight / 2;
    const distance = rect.top + rect.height / 2 - viewportCenter;
    el.style.transform = `translate3d(0, ${(-distance * this.parallaxSpeed()).toFixed(2)}px, 0)`;
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      window.removeEventListener('scroll', this.onScroll);
    }
  }
}
