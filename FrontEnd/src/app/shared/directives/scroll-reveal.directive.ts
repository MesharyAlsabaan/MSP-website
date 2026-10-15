import {
  booleanAttribute,
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
 * Reveals an element with a subtle fade/rise as it scrolls into view.
 * Adds `.reveal` (or `.reveal-line` for a clip-wipe) immediately and
 * `.is-visible` once the element enters the viewport (see styles.scss).
 *
 * Visibility is detected with `getBoundingClientRect`, NOT IntersectionObserver:
 * the `line` variant clips itself to zero height, which would collapse an
 * observer's intersection area and prevent it from ever firing. A rect check
 * ignores `clip-path`, so it works for both variants.
 *
 * SSR-safe (renders final state on the server) and disabled under reduced motion.
 *
 * `revealOnLoad` is for above-the-fold content (the hero): the same entrance
 * runs as a CSS animation from the first paint of the server HTML, instead of
 * hiding the already-painted content at hydration and fading it back in. That
 * keeps the motion while the text counts as painted right away (LCP).
 *
 * `revealVisible` (with `revealOnLoad`) keeps the element visible for the
 * whole entrance: it only settles into place, with no fade or clip. Use it for
 * the primary hero text, so the largest text on the page paints at once
 * instead of waiting for an opacity animation.
 */
@Directive({
  selector: '[appScrollReveal]',
  host: {
    '[class.reveal-load]': 'revealOnLoad()',
    '[class.reveal-load--line]': "revealOnLoad() && revealType() === 'line'",
    '[class.reveal-load--visible]': 'revealOnLoad() && revealVisible()',
    '[style.--reveal-delay]': "revealOnLoad() ? revealDelay() + 'ms' : null",
  },
})
export class ScrollReveal implements OnDestroy {
  /** Optional stagger delay in milliseconds. */
  readonly revealDelay = input(0);

  /** `rise` fades/lifts the element; `line` clip-wipes it up (for headlines). */
  readonly revealType = input<'rise' | 'line'>('rise');

  /** Play the entrance on page load with CSS (above the fold) instead of on scroll. */
  readonly revealOnLoad = input(false, { transform: booleanAttribute });

  /** On-load entrance that moves but never hides the element (primary hero text). */
  readonly revealVisible = input(false, { transform: booleanAttribute });

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private cleanup?: () => void;

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => {
      if (this.revealOnLoad()) return;
      const el = this.host.nativeElement;
      el.classList.add(this.revealType() === 'line' ? 'reveal-line' : 'reveal');
      if (this.revealDelay()) {
        el.style.transitionDelay = `${this.revealDelay()}ms`;
      }

      let ticking = false;
      const reveal = () => {
        el.classList.add('is-visible');
        this.cleanup?.();
        this.cleanup = undefined;
      };
      const inView = () => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
      };
      const check = () => {
        ticking = false;
        if (inView()) reveal();
      };
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(check);
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      this.cleanup = () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };

      // Reveal immediately if already in view on load (e.g. above the fold).
      requestAnimationFrame(check);
    });
  }

  ngOnDestroy(): void {
    this.cleanup?.();
  }
}
