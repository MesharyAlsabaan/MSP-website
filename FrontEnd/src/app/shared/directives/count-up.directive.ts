import {
  Directive,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  afterNextRender,
  OnDestroy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Animates a number from 0 to `countTo` once the element scrolls into view.
 * Keeps any prefix/suffix in the markup (e.g. "+", "k", "%") by only writing
 * into a `<span data-count>` child, falling back to the host's text.
 *
 * SSR-safe: on the server (or with reduced motion) the final value renders
 * immediately. Usage: `<span data-count>0</span>` inside `[appCountUp]="240"`.
 */
@Directive({
  selector: '[appCountUp]',
})
export class CountUp implements OnDestroy {
  readonly appCountUp = input.required<number>();
  /** Animation duration in milliseconds. */
  readonly countDuration = input(1600);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;
  private frame?: number;

  constructor() {
    afterNextRender(() => {
      const target = this.targetEl();
      if (!this.isBrowser) {
        target.textContent = String(this.appCountUp());
        return;
      }
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      if (prefersReduced) {
        target.textContent = String(this.appCountUp());
        return;
      }

      target.textContent = '0';

      // If the section is already on screen at load (e.g. a short page, or the
      // browser restored the scroll position), the observer may never report a
      // fresh intersection and the number would sit at 0. Run at once in that
      // case; otherwise animate when it scrolls into view.
      const rect = this.host.nativeElement.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        this.run(target);
        return;
      }

      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.run(target);
              this.observer?.disconnect();
            }
          }
        },
        { threshold: 0.25 },
      );
      this.observer.observe(this.host.nativeElement);
    });
  }

  private targetEl(): HTMLElement {
    const found = this.host.nativeElement.querySelector('[data-count]');
    return found instanceof HTMLElement ? found : this.host.nativeElement;
  }

  private run(target: HTMLElement): void {
    const end = this.appCountUp();
    const duration = this.countDuration();
    let startTime = -1;

    const tick = (now: number) => {
      if (startTime < 0) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      // easeOutExpo for a refined deceleration.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      target.textContent = String(Math.round(eased * end));
      if (progress < 1) {
        this.frame = requestAnimationFrame(tick);
      }
    };
    this.frame = requestAnimationFrame(tick);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.frame) cancelAnimationFrame(this.frame);
  }
}
