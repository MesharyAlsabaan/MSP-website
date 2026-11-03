import {
  Injectable,
  signal,
  computed,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { STORAGE_KEYS } from '../constants/api.constants';

export type Theme = 'light' | 'dark';

/**
 * Manages the active color theme. Persists the choice to localStorage and
 * keeps the `.dark` class on <html> in sync. SSR-safe: on the server it
 * defaults to 'light' and never touches `document` / `localStorage`.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly theme = signal<Theme>(this.initialTheme());
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    effect(() => {
      const theme = this.theme();
      if (!this.isBrowser) return;
      document.documentElement.classList.toggle('dark', theme === 'dark');
      try {
        localStorage.setItem(STORAGE_KEYS.theme, theme);
      } catch {
        // Storage unavailable (private mode / disabled) — ignore.
      }
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  private initialTheme(): Theme {
    if (!this.isBrowser) return 'light';
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.theme);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // ignore
    }
    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
    return mq?.matches ? 'dark' : 'light';
  }
}
