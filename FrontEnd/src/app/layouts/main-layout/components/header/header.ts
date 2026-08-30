import {
  Component,
  ElementRef,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Container } from '../../../../shared/ui/container/container';
import { ThemeToggle } from '../../../../shared/ui/theme-toggle/theme-toggle';
import { LangToggle } from '../../../../shared/ui/lang-toggle/lang-toggle';
import { RiyadhClock } from '../../../../shared/ui/riyadh-clock/riyadh-clock';
import { TranslationService } from '../../../../core/services/translation.service';

interface NavLink {
  readonly path: string;
  readonly label: { en: string; ar: string };
}

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeMenu()',
    '(document:click)': 'onDocumentClick($event)',
  },
  imports: [
    RouterLink,
    RouterLinkActive,
    Container,
    ThemeToggle,
    LangToggle,
    RiyadhClock,
  ],
  template: `
    <header
      class="sticky top-0 z-50 border-b border-hairline bg-bg/80 backdrop-blur-md"
    >
      <app-container>
        <nav class="flex h-20 items-center justify-between gap-6">
          <a
            routerLink="/"
            class="flex items-center gap-3 text-ink"
            [attr.aria-label]="i18n.pick(brandLabel)"
          >
            <img
              src="/images/msp-logo.png"
              alt="MSP Designs"
              width="48"
              height="48"
              class="h-12 w-12 shrink-0 object-contain dark:brightness-0 dark:invert"
            />
            <span
              class="hidden font-mono text-[0.65rem] uppercase leading-tight tracking-[0.18em] text-muted sm:block"
              [innerHTML]="i18n.pick(brandSub)"
            ></span>
          </a>

          <ul
            class="hidden items-center gap-9 font-mono text-xs uppercase tracking-[0.12em] md:flex"
          >
            @for (item of navItems; track item.path) {
              <li>
                <a
                  [routerLink]="item.path"
                  routerLinkActive="text-ink"
                  [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                  class="text-muted transition-colors hover:text-ink"
                >
                  {{ i18n.pick(item.label) }}
                </a>
              </li>
            }
          </ul>

          <div class="flex items-center gap-3 sm:gap-4">
            <app-riyadh-clock class="hidden lg:block" />
            <span class="hidden h-5 w-px bg-hairline lg:block" aria-hidden="true"></span>
            <app-lang-toggle />
            <app-theme-toggle />
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center border border-hairline text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:hidden"
              [attr.aria-label]="i18n.pick(menuOpenLabel)"
              aria-controls="mobile-navigation"
              [attr.aria-expanded]="menuOpen()"
              (click)="toggleMenu()"
            >
              <span class="sr-only">{{ i18n.pick(menuOpenLabel) }}</span>
              <span class="relative block h-4 w-5" aria-hidden="true">
                <span
                  class="absolute start-0 top-0 block h-px w-5 bg-current transition-transform"
                  [class.translate-y-[7px]]="menuOpen()"
                  [class.rotate-45]="menuOpen()"
                ></span>
                <span
                  class="absolute start-0 top-[7px] block h-px w-5 bg-current transition-opacity"
                  [class.opacity-0]="menuOpen()"
                ></span>
                <span
                  class="absolute start-0 top-[14px] block h-px w-5 bg-current transition-transform"
                  [class.-translate-y-[7px]]="menuOpen()"
                  [class.-rotate-45]="menuOpen()"
                ></span>
              </span>
            </button>
          </div>
        </nav>

        @if (menuOpen()) {
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            [attr.aria-label]="i18n.pick(menuLabel)"
            class="absolute inset-x-0 top-20 border-b border-hairline bg-bg shadow-lg md:hidden"
          >
            <div class="mx-auto max-w-[1200px] px-5 py-7 sm:px-8">
              <ul class="divide-y divide-hairline border-y border-hairline">
                @for (item of navItems; track item.path) {
                  <li>
                    <a
                      [routerLink]="item.path"
                      routerLinkActive="text-accent"
                      [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                      (click)="closeMenu()"
                      class="flex items-center justify-between py-4 font-display text-2xl text-ink transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      <span>{{ i18n.pick(item.label) }}</span>
                      <span class="dir-flip font-mono text-sm text-accent" aria-hidden="true">&rarr;</span>
                    </a>
                  </li>
                }
              </ul>
            </div>
          </div>
        }
      </app-container>
    </header>
  `,
})
export class Header {
  protected readonly i18n = inject(TranslationService);
  private readonly element = inject(ElementRef<HTMLElement>);
  protected readonly menuOpen = signal(false);

  protected readonly brandSub = {
    en: 'Engineering<br />Consultancy',
    ar: 'استشارات<br />هندسية',
  };

  protected readonly brandLabel = {
    en: 'MSP Engineering Consultancy',
    ar: 'إم إس بي للاستشارات الهندسية',
  };

  protected readonly menuOpenLabel = {
    en: 'Open navigation',
    ar: 'فتح قائمة التنقل',
  };

  protected readonly menuLabel = {
    en: 'Mobile navigation',
    ar: 'قائمة التنقل للجوال',
  };

  protected readonly navItems: readonly NavLink[] = [
    { path: '/about', label: { en: 'About', ar: 'عن المكتب' } },
    { path: '/services', label: { en: 'Services', ar: 'الخدمات' } },
    { path: '/projects', label: { en: 'Projects', ar: 'المشاريع' } },
    { path: '/team', label: { en: 'Team', ar: 'الفريق' } },
    { path: '/blog', label: { en: 'Insights', ar: 'الرؤى' } },
    { path: '/contact', label: { en: 'Contact', ar: 'تواصل معنا' } },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected onDocumentClick(event: Event): void {
    if (!this.menuOpen()) return;
    if (!this.element.nativeElement.contains(event.target as Node)) {
      this.closeMenu();
    }
  }
}
