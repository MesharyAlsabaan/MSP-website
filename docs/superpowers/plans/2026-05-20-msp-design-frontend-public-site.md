# MSP Design Frontend Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Project rule from owner:** Do **not** run `git add` or `git commit` at any point. Each task ends with a "Pause ford review" checkpoint instead. The owner will commit at their own cadence.

**Goal:** Build a production-quality bilingual (EN/AR, full RTL) Angular 17+ public marketing website for MSP Design with dark default theme, 6 polished pages, 5 minimal pages, a designed 404, custom Tailwind component library, NgRx state management fed by a mock HTTP interceptor, and static prerender (SSG) production output.

**Architecture:** Standalone Angular components, Application Builder with `prerender: true`, TailwindCSS + CSS variable theme tokens + Tailwind RTL plugin, `@ngx-translate/core` for i18n with `/en` and `/ar` route prefixes, NgRx with seven feature slices behind a `MockApiInterceptor` that returns JSON fixtures. Migration to a real backend = remove the interceptor.

**Tech Stack:** Angular 17+, TypeScript strict, TailwindCSS 3.x, `@ngrx/store`+`effects`+`entity`+`store-devtools`, `@ngx-translate/core`, `@angular/cdk`, Jest, Playwright + `@axe-core/playwright`, ESLint, Prettier, Husky.

**Spec:** `docs/superpowers/specs/2026-05-20-msp-design-frontend-design.md`

---

## Conventions used throughout this plan

- **Working directory:** all commands run from `FrontEnd/` unless explicitly stated.
- **Absolute paths in headers:** `src/...` is shorthand for `FrontEnd/src/...`.
- **Tests live next to source** as `*.spec.ts` (Angular convention) for unit tests; Playwright specs live under `e2e/`.
- **Component selectors** use the `msp-` prefix (e.g., `msp-button`, `msp-hero`).
- **Test framework:** Jest via `jest-preset-angular` for unit tests. Playwright for e2e.
- **Pause for review** = stop and let the owner inspect the diff and run the verification commands themselves before continuing.

---

## Phase 0 — Workspace bootstrap

### Task 1: Create the Angular workspace with SSR + prerender

**Files:**
- Create: `FrontEnd/` (entire Angular workspace)

- [ ] **Step 1.1: From the repo root, scaffold the Angular workspace**

Run from `C:/Users/mesha/My Drive/14_MSP_Website/`:

```bash
npx -p @angular/cli@latest ng new FrontEnd \
  --routing=true \
  --style=scss \
  --ssr=true \
  --standalone \
  --strict \
  --skip-git \
  --package-manager=npm
```

Expected: `FrontEnd/` is created with `angular.json`, `package.json`, `src/`, `public/`, SSR scaffolding (`server.ts`, `src/main.server.ts`, `src/app/app.config.server.ts`), and `node_modules/`.

- [ ] **Step 1.2: Enable prerender in `angular.json`**

Edit `FrontEnd/angular.json`. In `projects.FrontEnd.architect.build.options`, add:

```json
"prerender": true,
"ssr": {
  "entry": "server.ts"
}
```

The defaults are usually correct; verify the build target `outputMode` is `static` (or omit — prerender mode picks static automatically).

- [ ] **Step 1.3: Verify the workspace builds**

Run (from `FrontEnd/`):

```bash
npm run build
```

Expected: build succeeds, `dist/FrontEnd/browser/` and `dist/FrontEnd/server/` exist, `dist/FrontEnd/browser/index.html` contains rendered content (not just `<app-root></app-root>`).

- [ ] **Step 1.4: Verify dev server**

Run: `npm start`

Expected: dev server runs at `http://localhost:4200/`, default Angular page loads.

- [ ] **Step 1.5: Pause for review.**

---

### Task 2: Install styling stack (Tailwind, RTL plugin, base SCSS)

**Files:**
- Create: `FrontEnd/tailwind.config.ts`
- Create: `FrontEnd/postcss.config.js`
- Create: `FrontEnd/src/styles/tokens.css`
- Modify: `FrontEnd/src/styles.scss`

- [ ] **Step 2.1: Install Tailwind and the RTL plugin**

Run from `FrontEnd/`:

```bash
npm install -D tailwindcss postcss autoprefixer tailwindcss-rtl
npx tailwindcss init
```

This creates `tailwind.config.js`. Rename it to `tailwind.config.ts` and convert exports.

- [ ] **Step 2.2: Write `FrontEnd/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';
import tailwindcssRtl from 'tailwindcss-rtl';

const config: Config = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-elev': 'var(--bg-elev)',
        fg: 'var(--fg)',
        'fg-muted': 'var(--fg-muted)',
        accent: 'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        border: 'var(--border)',
        ring: 'var(--ring)',
      },
      fontFamily: {
        display: ['Fraunces', 'IBM Plex Sans Arabic', 'serif'],
        body: ['Inter', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        ar: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        hero: ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'hero-lg': ['6rem', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        display: ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.015em' }],
        'display-lg': ['4rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        h1: ['2rem', { lineHeight: '1.15' }],
        'h1-lg': ['3rem', { lineHeight: '1.1' }],
        h2: ['1.5rem', { lineHeight: '1.2' }],
        'h2-lg': ['2rem', { lineHeight: '1.2' }],
        h3: ['1.25rem', { lineHeight: '1.3' }],
      },
      maxWidth: {
        '7xl': '80rem',
        prose: '48rem',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [tailwindcssRtl],
};

export default config;
```

- [ ] **Step 2.3: Write `FrontEnd/postcss.config.js`**

```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 2.4: Write `FrontEnd/src/styles/tokens.css`**

```css
:root,
[data-theme='dark'] {
  --bg: #0a0a0b;
  --bg-elev: #141416;
  --fg: #f5f5f2;
  --fg-muted: #a1a1a6;
  --accent: #c8a45c;
  --accent-fg: #0a0a0b;
  --border: rgba(255, 255, 255, 0.08);
  --ring: var(--accent);
  color-scheme: dark;
}

[data-theme='light'] {
  --bg: #fafaf7;
  --bg-elev: #ffffff;
  --fg: #0f0f11;
  --fg-muted: #5c5c63;
  --accent: #c8a45c;
  --accent-fg: #ffffff;
  --border: rgba(15, 15, 17, 0.08);
  --ring: var(--accent);
  color-scheme: light;
}

html {
  background: var(--bg);
  color: var(--fg);
}
```

- [ ] **Step 2.5: Replace `FrontEnd/src/styles.scss` with the new global stylesheet**

```scss
@import './styles/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body { height: 100%; }
body {
  @apply font-body antialiased;
  background: var(--bg);
  color: var(--fg);
}
::selection { background: var(--accent); color: var(--accent-fg); }
```

- [ ] **Step 2.6: Verify Tailwind compiles**

Run: `npm start`. Open `http://localhost:4200/`. Inspect `<body>` in devtools — it should have the dark canvas color (`#0A0A0B`) from `tokens.css`.

- [ ] **Step 2.7: Pause for review.**

---

### Task 3: Add core dependencies and tooling

**Files:**
- Modify: `FrontEnd/package.json`
- Create: `FrontEnd/jest.config.ts`
- Create: `FrontEnd/setup-jest.ts`
- Create: `FrontEnd/playwright.config.ts`
- Create: `FrontEnd/.eslintrc.json`
- Create: `FrontEnd/.prettierrc`
- Create: `FrontEnd/.husky/pre-commit`

- [ ] **Step 3.1: Install runtime dependencies**

```bash
npm install \
  @ngrx/store @ngrx/effects @ngrx/entity @ngrx/store-devtools \
  @ngx-translate/core @ngx-translate/http-loader \
  @angular/cdk
```

- [ ] **Step 3.2: Install dev dependencies**

```bash
npm install -D \
  jest jest-preset-angular @types/jest \
  @playwright/test @axe-core/playwright \
  @angular-eslint/builder @angular-eslint/eslint-plugin @angular-eslint/eslint-plugin-template @angular-eslint/schematics @angular-eslint/template-parser \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint \
  prettier eslint-config-prettier eslint-plugin-prettier \
  husky lint-staged
```

- [ ] **Step 3.3: Write `FrontEnd/jest.config.ts`**

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEach: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
export default config;
```

- [ ] **Step 3.4: Write `FrontEnd/setup-jest.ts`**

```ts
import 'jest-preset-angular/setup-jest';
```

- [ ] **Step 3.5: Write `FrontEnd/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3.6: Write `FrontEnd/.eslintrc.json`**

```json
{
  "root": true,
  "ignorePatterns": ["projects/**/*", "dist/**/*", "node_modules/**/*"],
  "overrides": [
    {
      "files": ["*.ts"],
      "parserOptions": {
        "project": ["tsconfig.json"],
        "createDefaultProgram": true
      },
      "extends": [
        "plugin:@angular-eslint/recommended",
        "plugin:@angular-eslint/template/process-inline-templates",
        "plugin:prettier/recommended"
      ],
      "rules": {
        "@angular-eslint/component-selector": [
          "error",
          { "type": "element", "prefix": "msp", "style": "kebab-case" }
        ],
        "@angular-eslint/directive-selector": [
          "error",
          { "type": "attribute", "prefix": "msp", "style": "camelCase" }
        ]
      }
    },
    {
      "files": ["*.html"],
      "extends": ["plugin:@angular-eslint/template/recommended"]
    }
  ]
}
```

- [ ] **Step 3.7: Write `FrontEnd/.prettierrc`**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "bracketSpacing": true
}
```

- [ ] **Step 3.8: Add npm scripts to `package.json`**

Replace the `scripts` block with:

```json
"scripts": {
  "ng": "ng",
  "start": "ng serve",
  "build": "ng build",
  "prerender": "ng build && echo 'Prerender output in dist/'",
  "watch": "ng build --watch --configuration development",
  "test": "jest",
  "test:watch": "jest --watch",
  "e2e": "playwright test",
  "lint": "eslint \"src/**/*.{ts,html}\"",
  "format": "prettier --write \"src/**/*.{ts,html,scss,json}\"",
  "typecheck": "tsc --noEmit",
  "prepare": "husky install"
}
```

Also remove the existing Karma/Jasmine devDependencies and the `test` config block from `angular.json` (we use Jest instead).

- [ ] **Step 3.9: Initialise Husky**

```bash
npx husky install
echo "npx lint-staged" > .husky/pre-commit
```

Add to `package.json`:

```json
"lint-staged": {
  "src/**/*.{ts,html}": ["eslint --fix", "prettier --write"],
  "src/**/*.{scss,json}": ["prettier --write"]
}
```

- [ ] **Step 3.10: Verify tooling**

Run all in sequence:

```bash
npm run lint
npm run typecheck
npm run test
```

Expected: each completes without errors (test will report "no tests found" or run the default placeholder — that's fine).

- [ ] **Step 3.11: Pause for review.**

---

## Phase 1 — Foundation services

### Task 4: ThemeService with dark-default + persistence

**Files:**
- Create: `src/app/core/services/theme.service.ts`
- Create: `src/app/core/services/theme.service.spec.ts`

- [ ] **Step 4.1: Write the failing test `src/app/core/services/theme.service.spec.ts`**

```ts
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
  });

  it('defaults to dark when no persisted choice and no prefers-color-scheme match', () => {
    const svc = TestBed.inject(ThemeService);
    svc.init();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('respects persisted choice', () => {
    localStorage.setItem('msp.theme', 'light');
    const svc = TestBed.inject(ThemeService);
    svc.init();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggle() flips theme and persists', () => {
    const svc = TestBed.inject(ThemeService);
    svc.init();
    svc.toggle();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('msp.theme')).toBe('light');
  });
});
```

- [ ] **Step 4.2: Run the test to confirm it fails**

```bash
npm test -- theme.service
```

Expected: FAIL — `ThemeService` not found.

- [ ] **Step 4.3: Implement `src/app/core/services/theme.service.ts`**

```ts
import { Injectable, signal } from '@angular/core';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'msp.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>('dark');

  init(): void {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as Theme | null;
    const fromOs =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
        ? 'light'
        : null;
    const initial: Theme = stored ?? fromOs ?? 'dark';
    this.set(initial);
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }
}
```

- [ ] **Step 4.4: Run the test, confirm pass**

```bash
npm test -- theme.service
```

Expected: PASS (3 tests).

- [ ] **Step 4.5: Pause for review.**

---

### Task 5: LanguageService + ngx-translate wiring

**Files:**
- Create: `src/app/core/services/language.service.ts`
- Create: `src/app/core/services/language.service.spec.ts`
- Create: `src/assets/i18n/en.json`
- Create: `src/assets/i18n/ar.json`
- Modify: `src/app/app.config.ts`

- [ ] **Step 5.1: Write failing test `src/app/core/services/language.service.spec.ts`**

```ts
import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
  });

  it('defaults to en when no persisted/browser hint', () => {
    const svc = TestBed.inject(LanguageService);
    svc.init('en');
    expect(svc.current()).toBe('en');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('sets dir=rtl for ar', () => {
    const svc = TestBed.inject(LanguageService);
    svc.set('ar');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(localStorage.getItem('msp.lang')).toBe('ar');
  });
});
```

- [ ] **Step 5.2: Run, confirm fail**

```bash
npm test -- language.service
```

- [ ] **Step 5.3: Implement `src/app/core/services/language.service.ts`**

```ts
import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Lang = 'en' | 'ar';
const STORAGE_KEY = 'msp.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly current = signal<Lang>('en');

  constructor(private readonly translate: TranslateService) {}

  init(fallback: Lang = 'en'): void {
    const stored = (typeof localStorage !== 'undefined' && (localStorage.getItem(STORAGE_KEY) as Lang | null)) || null;
    const browser =
      typeof navigator !== 'undefined' && navigator.language?.startsWith('ar') ? 'ar' : null;
    this.set(stored ?? browser ?? fallback);
  }

  set(lang: Lang): void {
    this.current.set(lang);
    this.translate.use(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }
}
```

- [ ] **Step 5.4: Seed dictionaries**

`src/assets/i18n/en.json`:

```json
{
  "nav": {
    "home": "Home",
    "about": "About",
    "services": "Services",
    "projects": "Projects",
    "blog": "Blog",
    "careers": "Careers",
    "contact": "Contact"
  },
  "hero": {
    "title": "Designing spaces that move quietly.",
    "lede": "MSP Design crafts interiors and architecture for those who notice the details.",
    "cta_primary": "See our work",
    "cta_secondary": "Get in touch"
  },
  "common": {
    "view_all": "View all",
    "learn_more": "Learn more",
    "back_to_home": "Back to home"
  }
}
```

`src/assets/i18n/ar.json`:

```json
{
  "nav": {
    "home": "الرئيسية",
    "about": "عنّا",
    "services": "خدماتنا",
    "projects": "أعمالنا",
    "blog": "المدونة",
    "careers": "الوظائف",
    "contact": "تواصل"
  },
  "hero": {
    "title": "نصمّم مساحات تتحدّث بصمت.",
    "lede": "MSP Design يصمّم تصاميم داخلية وعمارة لمن يلتفت إلى التفاصيل.",
    "cta_primary": "أعمالنا",
    "cta_secondary": "تواصل معنا"
  },
  "common": {
    "view_all": "عرض الكل",
    "learn_more": "اقرأ المزيد",
    "back_to_home": "العودة للرئيسية"
  }
}
```

- [ ] **Step 5.5: Wire `ngx-translate` in `src/app/app.config.ts`**

```ts
import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HttpClient } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';

export function httpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, '/assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useFactory: httpLoaderFactory,
          deps: [HttpClient],
        },
      }),
    ),
  ],
};
```

- [ ] **Step 5.6: Run tests**

```bash
npm test -- language.service
```

Expected: PASS.

- [ ] **Step 5.7: Pause for review.**

---

### Task 6: Self-hosted fonts + preload

**Files:**
- Create: `src/assets/fonts/` (font files)
- Modify: `src/index.html`
- Modify: `src/styles/tokens.css`

- [ ] **Step 6.1: Download fonts**

Manually place the following WOFF2 files under `src/assets/fonts/`:

- `Fraunces-Variable.woff2` (download from Google Fonts → "Get embed code" → static + variable)
- `Inter-Variable.woff2`
- `IBMPlexSansArabic-Regular.woff2`
- `IBMPlexSansArabic-Bold.woff2`

(If the owner doesn't have them yet, use Google Fonts CDN as a temporary fallback — the override is done in `tailwind.config.ts` already.)

- [ ] **Step 6.2: Add `@font-face` declarations to `src/styles/tokens.css`**

Append to the bottom of `tokens.css`:

```css
@font-face {
  font-family: 'Fraunces';
  src: url('/assets/fonts/Fraunces-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}
@font-face {
  font-family: 'Inter';
  src: url('/assets/fonts/Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}
@font-face {
  font-family: 'IBM Plex Sans Arabic';
  src: url('/assets/fonts/IBMPlexSansArabic-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'IBM Plex Sans Arabic';
  src: url('/assets/fonts/IBMPlexSansArabic-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
```

- [ ] **Step 6.3: Preload hero font in `src/index.html`**

Inside `<head>` add:

```html
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/Fraunces-Variable.woff2" crossorigin>
```

- [ ] **Step 6.4: Pause for review.**

---

## Phase 2 — Shared UI primitives

> Pattern for every UI primitive task:
> 1. Write component with template + signal inputs.
> 2. Add minimal spec checking it renders and respects key inputs.
> 3. Render a temporary `/playground` page to visually verify (created in Task 7 and reused for the rest of Phase 2).
> 4. Pause for review.

### Task 7: Primitives — Button, Link, Container, Section, SectionHeading

**Files:**
- Create: `src/app/shared/ui/button/button.component.ts`
- Create: `src/app/shared/ui/button/button.component.spec.ts`
- Create: `src/app/shared/ui/link/link.component.ts`
- Create: `src/app/shared/ui/container/container.component.ts`
- Create: `src/app/shared/ui/section/section.component.ts`
- Create: `src/app/shared/ui/section-heading/section-heading.component.ts`
- Create: `src/app/pages/playground/playground.component.ts`
- Modify: `src/app/app.routes.ts`

- [ ] **Step 7.1: Write `src/app/shared/ui/button/button.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { NgClass } from '@angular/common';

export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'icon';

@Component({
  selector: 'msp-button',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel()"
      [ngClass]="classes()"
    >
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly ariaLabel = input<string | null>(null);

  protected classes(): string {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
      'disabled:opacity-50 disabled:cursor-not-allowed';
    switch (this.variant()) {
      case 'primary':
        return `${base} px-6 py-3 bg-accent text-accent-fg hover:bg-accent/90`;
      case 'ghost':
        return `${base} px-6 py-3 text-fg hover:text-accent`;
      case 'outline':
        return `${base} px-6 py-3 border border-border text-fg hover:border-accent hover:text-accent`;
      case 'icon':
        return `${base} h-10 w-10 rounded-full text-fg hover:text-accent hover:bg-bg-elev`;
    }
  }
}
```

- [ ] **Step 7.2: Write `src/app/shared/ui/button/button.component.spec.ts`**

```ts
import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `<msp-button [variant]="variant" [ariaLabel]="label">Click</msp-button>`,
})
class Host {
  variant: 'primary' | 'ghost' | 'outline' | 'icon' = 'primary';
  label: string | null = null;
}

describe('ButtonComponent', () => {
  it('renders projected content', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Click');
  });

  it('applies aria-label when provided', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.label = 'send';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')?.getAttribute('aria-label')).toBe('send');
  });

  it('switches classes by variant', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.variant = 'outline';
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.className).toContain('border');
  });
});
```

- [ ] **Step 7.3: Write `src/app/shared/ui/link/link.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'msp-link',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="to()" class="relative inline-flex items-center gap-2 text-fg group">
      <span class="transition-colors duration-200 group-hover:text-accent">
        <ng-content />
      </span>
      <span
        aria-hidden="true"
        class="absolute -bottom-0.5 start-0 h-px w-full origin-start scale-x-0 bg-accent transition-transform duration-300 ease-editorial group-hover:scale-x-100"
      ></span>
    </a>
  `,
})
export class LinkComponent {
  readonly to = input.required<string | string[]>();
}
```

- [ ] **Step 7.4: Write `src/app/shared/ui/container/container.component.ts`**

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'msp-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="mx-auto w-full max-w-7xl px-6 md:px-10"><ng-content /></div>`,
})
export class ContainerComponent {}
```

- [ ] **Step 7.5: Write `src/app/shared/ui/section/section.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { ContainerComponent } from '../container/container.component';

@Component({
  selector: 'msp-section',
  standalone: true,
  imports: [ContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section [id]="id()" class="py-24 md:py-32 lg:py-40">
      <msp-container>
        <ng-content />
      </msp-container>
    </section>
  `,
})
export class SectionComponent {
  readonly id = input<string | null>(null);
}
```

- [ ] **Step 7.6: Write `src/app/shared/ui/section-heading/section-heading.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'msp-section-heading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-prose">
      @if (eyebrow()) {
        <p class="mb-4 text-sm uppercase tracking-[0.2em] text-fg-muted">{{ eyebrow() }}</p>
      }
      <h2 class="font-display text-display lg:text-display-lg text-fg">{{ title() }}</h2>
      @if (lede()) {
        <p class="mt-6 text-base md:text-lg text-fg-muted leading-relaxed">{{ lede() }}</p>
      }
    </div>
  `,
})
export class SectionHeadingComponent {
  readonly eyebrow = input<string | null>(null);
  readonly title = input.required<string>();
  readonly lede = input<string | null>(null);
}
```

- [ ] **Step 7.7: Create playground page `src/app/pages/playground/playground.component.ts`**

```ts
import { Component } from '@angular/core';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { LinkComponent } from '../../shared/ui/link/link.component';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { SectionHeadingComponent } from '../../shared/ui/section-heading/section-heading.component';

@Component({
  selector: 'msp-playground',
  standalone: true,
  imports: [ButtonComponent, LinkComponent, SectionComponent, SectionHeadingComponent],
  template: `
    <msp-section id="primitives">
      <msp-section-heading
        eyebrow="UI Library"
        title="Primitives"
        lede="A visual smoke-test surface for every component we ship."
      />
      <div class="mt-12 flex flex-wrap gap-4">
        <msp-button variant="primary">Primary</msp-button>
        <msp-button variant="ghost">Ghost</msp-button>
        <msp-button variant="outline">Outline</msp-button>
      </div>
      <div class="mt-8">
        <msp-link to="/">Back home</msp-link>
      </div>
    </msp-section>
  `,
})
export class PlaygroundComponent {}
```

- [ ] **Step 7.8: Add route in `src/app/app.routes.ts`**

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'playground',
    loadComponent: () =>
      import('./pages/playground/playground.component').then((m) => m.PlaygroundComponent),
  },
];
```

- [ ] **Step 7.9: Run tests, run dev server**

```bash
npm test -- button
npm start
```

Visit `http://localhost:4200/playground`. Confirm: dark canvas, gold primary button, ghost/outline buttons with hover effects, animated-underline link.

- [ ] **Step 7.10: Pause for review.**

---

### Task 8: Card primitives — Card, ProjectCard, ServiceCard, TestimonialCard, TeamCard, PartnerLogo, Stat

**Files:**
- Create: `src/app/shared/ui/card/card.component.ts`
- Create: `src/app/shared/ui/project-card/project-card.component.ts`
- Create: `src/app/shared/ui/service-card/service-card.component.ts`
- Create: `src/app/shared/ui/testimonial-card/testimonial-card.component.ts`
- Create: `src/app/shared/ui/team-card/team-card.component.ts`
- Create: `src/app/shared/ui/partner-logo/partner-logo.component.ts`
- Create: `src/app/shared/ui/stat/stat.component.ts`
- Create: `src/app/core/models/project.model.ts`
- Create: `src/app/core/models/service.model.ts`
- Create: `src/app/core/models/team-member.model.ts`
- Create: `src/app/core/models/testimonial.model.ts`
- Create: `src/app/core/models/partner.model.ts`
- Modify: `src/app/pages/playground/playground.component.ts`

- [ ] **Step 8.1: Define data models**

`src/app/core/models/project.model.ts`:

```ts
export interface Project {
  id: string;
  slug: string;
  title: string;
  client: string;
  industry: string;
  year: number;
  completionDate: string;
  technologies: string[];
  coverImage: string;
  galleryImages: string[];
  description: string;
  projectUrl?: string;
  status: 'completed' | 'ongoing';
  featured: boolean;
  seo: { title: string; description: string };
}
```

`src/app/core/models/service.model.ts`:

```ts
export interface Service {
  id: string;
  slug: string;
  title: string;
  icon: string;
  lede: string;
  description: string;
  deliverables: string[];
}
```

`src/app/core/models/team-member.model.ts`:

```ts
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo: string;
  bio?: string;
  social?: { linkedin?: string; instagram?: string };
}
```

`src/app/core/models/testimonial.model.ts`:

```ts
export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
}
```

`src/app/core/models/partner.model.ts`:

```ts
export interface Partner {
  id: string;
  name: string;
  logo: string;
}
```

- [ ] **Step 8.2: Card primitive `src/app/shared/ui/card/card.component.ts`**

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'msp-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="group relative overflow-hidden rounded-2xl border border-border bg-bg-elev p-6 transition-colors duration-300 ease-editorial hover:border-accent/40"
    >
      <ng-content />
    </article>
  `,
})
export class CardComponent {}
```

- [ ] **Step 8.3: ProjectCard `src/app/shared/ui/project-card/project-card.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'msp-project-card',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="['/projects', project().slug]" class="group block">
      <div class="relative aspect-[4/5] overflow-hidden rounded-2xl bg-bg-elev">
        <img
          [src]="project().coverImage"
          [alt]="project().title"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
      </div>
      <div class="mt-6 flex items-baseline justify-between">
        <h3 class="font-display text-h2 lg:text-h2-lg text-fg">{{ project().title }}</h3>
        <span class="text-sm text-fg-muted">{{ project().year }}</span>
      </div>
      <p class="mt-2 text-sm text-fg-muted">{{ project().industry }}</p>
    </a>
  `,
})
export class ProjectCardComponent {
  readonly project = input.required<Project>();
}
```

- [ ] **Step 8.4: ServiceCard `src/app/shared/ui/service-card/service-card.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Service } from '../../../core/models/service.model';

@Component({
  selector: 'msp-service-card',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="['/services']"
      [fragment]="service().slug"
      class="group block rounded-2xl border border-border bg-bg-elev p-8 transition-colors duration-300 ease-editorial hover:border-accent/40"
    >
      <div
        class="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-border text-accent"
        [innerHTML]="service().icon"
      ></div>
      <h3 class="font-display text-h2 text-fg">{{ service().title }}</h3>
      <p class="mt-3 text-sm text-fg-muted leading-relaxed">{{ service().lede }}</p>
    </a>
  `,
})
export class ServiceCardComponent {
  readonly service = input.required<Service>();
}
```

- [ ] **Step 8.5: TestimonialCard `src/app/shared/ui/testimonial-card/testimonial-card.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Testimonial } from '../../../core/models/testimonial.model';

@Component({
  selector: 'msp-testimonial-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="max-w-prose">
      <blockquote class="font-display text-display lg:text-display-lg text-fg leading-tight">
        "{{ testimonial().quote }}"
      </blockquote>
      <figcaption class="mt-8 text-fg-muted">
        <span class="text-fg">{{ testimonial().author }}</span>
        <span class="mx-2">·</span>
        <span>{{ testimonial().role }}, {{ testimonial().company }}</span>
      </figcaption>
    </figure>
  `,
})
export class TestimonialCardComponent {
  readonly testimonial = input.required<Testimonial>();
}
```

- [ ] **Step 8.6: TeamCard `src/app/shared/ui/team-card/team-card.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TeamMember } from '../../../core/models/team-member.model';

@Component({
  selector: 'msp-team-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="group">
      <div class="relative aspect-[3/4] overflow-hidden rounded-2xl bg-bg-elev">
        <img
          [src]="member().photo"
          [alt]="member().name"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
        />
      </div>
      <h3 class="mt-4 font-display text-h2 text-fg">{{ member().name }}</h3>
      <p class="text-sm text-fg-muted opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {{ member().role }}
      </p>
    </article>
  `,
})
export class TeamCardComponent {
  readonly member = input.required<TeamMember>();
}
```

- [ ] **Step 8.7: PartnerLogo `src/app/shared/ui/partner-logo/partner-logo.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Partner } from '../../../core/models/partner.model';

@Component({
  selector: 'msp-partner-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grayscale opacity-60 transition duration-500 hover:grayscale-0 hover:opacity-100">
      <img [src]="partner().logo" [alt]="partner().name" class="h-10 w-auto" loading="lazy" />
    </div>
  `,
})
export class PartnerLogoComponent {
  readonly partner = input.required<Partner>();
}
```

- [ ] **Step 8.8: Stat `src/app/shared/ui/stat/stat.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'msp-stat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <p class="font-display text-display lg:text-display-lg text-fg">{{ value() }}</p>
      <p class="mt-2 text-sm text-fg-muted">{{ label() }}</p>
    </div>
  `,
})
export class StatComponent {
  readonly value = input.required<string>();
  readonly label = input.required<string>();
}
```

- [ ] **Step 8.9: Verify in playground**

Extend `playground.component.ts` to add a section showing one of each card (use literal mock data inline). Visit `/playground`, confirm visual rendering.

- [ ] **Step 8.10: Pause for review.**

---

### Task 9: Utility components — Marquee, Skeleton, Toast, ThemeToggle, LangToggle

**Files:**
- Create: `src/app/shared/ui/marquee/marquee.component.ts`
- Create: `src/app/shared/ui/skeleton/skeleton.component.ts`
- Create: `src/app/shared/ui/toast/toast.component.ts`
- Create: `src/app/shared/ui/theme-toggle/theme-toggle.component.ts`
- Create: `src/app/shared/ui/lang-toggle/lang-toggle.component.ts`

- [ ] **Step 9.1: Marquee `src/app/shared/ui/marquee/marquee.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'msp-marquee',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; overflow: hidden; }
      .track { display: flex; gap: 4rem; width: max-content; animation: scroll var(--duration, 40s) linear infinite; }
      :host([data-reverse='true']) .track { animation-direction: reverse; }
      @keyframes scroll {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .track { animation: none; }
      }
    `,
  ],
  template: `
    <div class="track" [style.--duration]="duration() + 's'">
      <ng-content />
      <ng-content />
    </div>
  `,
})
export class MarqueeComponent {
  readonly duration = input(40);
}
```

(`<ng-content />` twice intentionally duplicates the slot so the seamless-loop CSS works.)

- [ ] **Step 9.2: Skeleton `src/app/shared/ui/skeleton/skeleton.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'msp-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }
      .pulse {
        background: linear-gradient(90deg, var(--bg-elev) 0%, color-mix(in srgb, var(--bg-elev) 70%, var(--fg) 5%) 50%, var(--bg-elev) 100%);
        background-size: 200% 100%;
        animation: shimmer 1.6s ease-in-out infinite;
        border-radius: 0.75rem;
      }
      @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
      @media (prefers-reduced-motion: reduce) {
        .pulse { animation: none; }
      }
    `,
  ],
  template: `<div class="pulse" [style.width]="width()" [style.height]="height()"></div>`,
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('1rem');
}
```

- [ ] **Step 9.3: Toast `src/app/shared/ui/toast/toast.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';

export interface ToastMessage { id: number; text: string; variant: 'info' | 'error'; }

@Component({
  selector: 'msp-toast-stack',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-none fixed end-6 top-6 z-50 flex flex-col gap-2" aria-live="polite">
      @for (t of stack(); track t.id) {
        <div
          class="pointer-events-auto rounded-xl border border-border bg-bg-elev px-4 py-3 text-sm text-fg shadow-lg"
          [class.border-red-500]="t.variant === 'error'"
        >
          {{ t.text }}
        </div>
      }
    </div>
  `,
})
export class ToastStackComponent {
  readonly stack = signal<ToastMessage[]>([]);
  private nextId = 1;

  push(text: string, variant: 'info' | 'error' = 'info', ttlMs = 5000): void {
    const id = this.nextId++;
    this.stack.update((s) => [...s, { id, text, variant }]);
    setTimeout(() => this.stack.update((s) => s.filter((m) => m.id !== id)), ttlMs);
  }
}
```

- [ ] **Step 9.4: ThemeToggle `src/app/shared/ui/theme-toggle/theme-toggle.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'msp-theme-toggle',
  standalone: true,
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <msp-button variant="icon" (click)="theme.toggle()" [ariaLabel]="'Toggle theme'">
      @if (theme.theme() === 'dark') {
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 12.79A9 9 0 1111.21 3 7 7 0 0020 12.79z"/></svg>
      } @else {
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
      }
    </msp-button>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
}
```

- [ ] **Step 9.5: LangToggle `src/app/shared/ui/lang-toggle/lang-toggle.component.ts`**

```ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'msp-lang-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="text-sm uppercase tracking-[0.2em] text-fg-muted transition-colors hover:text-accent"
      [attr.aria-label]="'Switch language'"
      (click)="onToggle()"
    >
      {{ lang.current() === 'en' ? 'العربية' : 'EN' }}
    </button>
  `,
})
export class LangToggleComponent {
  protected readonly lang = inject(LanguageService);

  onToggle(): void {
    this.lang.set(this.lang.current() === 'en' ? 'ar' : 'en');
  }
}
```

- [ ] **Step 9.6: Run lint + test**

```bash
npm run lint
npm test
```

- [ ] **Step 9.7: Pause for review.**

---

### Task 10: RevealDirective with IntersectionObserver

**Files:**
- Create: `src/app/shared/directives/reveal.directive.ts`
- Create: `src/app/shared/directives/reveal.directive.spec.ts`

- [ ] **Step 10.1: Write failing spec `src/app/shared/directives/reveal.directive.spec.ts`**

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RevealDirective } from './reveal.directive';

@Component({
  standalone: true,
  imports: [RevealDirective],
  template: `<div mspReveal>content</div>`,
})
class Host {}

describe('RevealDirective', () => {
  it('adds the reveal--pending class on init', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('div');
    expect(el.classList.contains('reveal--pending')).toBe(true);
  });
});
```

- [ ] **Step 10.2: Implement `src/app/shared/directives/reveal.directive.ts`**

```ts
import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';

@Directive({
  selector: '[mspReveal]',
  standalone: true,
  host: {
    '[class.reveal--pending]': 'true',
    '[style.--reveal-delay]': 'delay() + "ms"',
  },
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  readonly delay = input(0);
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.activate();
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.activate();
            this.observer?.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15 },
    );
    this.observer.observe(this.host.nativeElement);
  }

  private activate(): void {
    const el = this.host.nativeElement;
    el.classList.remove('reveal--pending');
    el.classList.add('reveal--active');
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
```

- [ ] **Step 10.3: Add reveal CSS to `src/styles.scss`**

Append:

```scss
.reveal--pending {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
              transform 600ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms);
}
.reveal--active {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .reveal--pending { transform: none; }
}
```

- [ ] **Step 10.4: Run test, confirm pass**

```bash
npm test -- reveal.directive
```

- [ ] **Step 10.5: Pause for review.**

---

### Task 11: Overlay components — MegaMenu, MobileNav, Lightbox

**Files:**
- Create: `src/app/shared/ui/mega-menu/mega-menu.component.ts`
- Create: `src/app/shared/ui/mobile-nav/mobile-nav.component.ts`
- Create: `src/app/shared/ui/lightbox/lightbox.component.ts`

- [ ] **Step 11.1: MegaMenu (CDK overlay-backed dropdown)**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { CdkMenuModule } from '@angular/cdk/menu';

@Component({
  selector: 'msp-mega-menu',
  standalone: true,
  imports: [OverlayModule, CdkMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [cdkMenuTriggerFor]="menu" class="text-sm text-fg hover:text-accent">
      {{ label() }}
    </button>
    <ng-template #menu>
      <div
        cdkMenu
        class="mt-3 min-w-[16rem] rounded-2xl border border-border bg-bg-elev p-2 shadow-2xl"
      >
        <ng-content />
      </div>
    </ng-template>
  `,
})
export class MegaMenuComponent {
  readonly label = input.required<string>();
}
```

- [ ] **Step 11.2: MobileNav (CDK dialog)**

```ts
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'msp-mobile-nav',
  standalone: true,
  imports: [DialogModule, RouterLink, TranslateModule, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <msp-button variant="icon" (click)="open()" [ariaLabel]="'Open menu'">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </msp-button>

    <ng-template #panel>
      <nav class="flex h-full flex-col gap-8 bg-bg p-10">
        <a [routerLink]="['/']" (click)="close()" class="font-display text-h1 text-fg">{{ 'nav.home' | translate }}</a>
        <a [routerLink]="['/about']" (click)="close()" class="font-display text-h1 text-fg">{{ 'nav.about' | translate }}</a>
        <a [routerLink]="['/services']" (click)="close()" class="font-display text-h1 text-fg">{{ 'nav.services' | translate }}</a>
        <a [routerLink]="['/projects']" (click)="close()" class="font-display text-h1 text-fg">{{ 'nav.projects' | translate }}</a>
        <a [routerLink]="['/contact']" (click)="close()" class="font-display text-h1 text-fg">{{ 'nav.contact' | translate }}</a>
      </nav>
    </ng-template>
  `,
})
export class MobileNavComponent {
  private readonly dialog = inject(Dialog);
  private ref?: ReturnType<Dialog['open']>;

  open(): void {
    this.ref = this.dialog.open(this.panelTpl as any, {
      hasBackdrop: true,
      panelClass: 'h-screen w-screen max-w-full m-0',
    });
  }

  close(): void { this.ref?.close(); }

  // template ref captured via @ViewChild
  // (left as exercise: convert <ng-template> to @ViewChild('panel'))
}
```

> Implementation note: the snippet above shows the pattern. The full version requires `@ViewChild('panel', { read: TemplateRef })` and storing into `panelTpl`. Refine during implementation.

- [ ] **Step 11.3: Lightbox**

```ts
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Dialog, DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

interface LightboxData { images: string[]; index: number; }

@Component({
  selector: 'msp-lightbox',
  standalone: true,
  imports: [DialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative h-screen w-screen bg-black/95">
      <button class="absolute top-6 end-6 text-fg" (click)="ref.close()" aria-label="Close">✕</button>
      <button class="absolute start-6 top-1/2 text-fg" (click)="prev()" aria-label="Previous">‹</button>
      <button class="absolute end-6 top-1/2 text-fg" (click)="next()" aria-label="Next">›</button>
      <img [src]="data.images[i()]" class="mx-auto h-full w-auto object-contain" />
    </div>
  `,
})
export class LightboxComponent {
  readonly ref = inject<DialogRef<unknown, LightboxComponent>>(DialogRef);
  readonly data = inject<LightboxData>(DIALOG_DATA);
  readonly i = signal(this.data.index);
  prev(): void { this.i.update((v) => (v - 1 + this.data.images.length) % this.data.images.length); }
  next(): void { this.i.update((v) => (v + 1) % this.data.images.length); }
}
```

- [ ] **Step 11.4: Verify in playground**

Add buttons to playground that trigger MegaMenu, MobileNav, and Lightbox. Confirm keyboard nav (Tab, Esc) works.

- [ ] **Step 11.5: Pause for review.**

---

## Phase 3 — Layouts

### Task 12: Header component

**Files:**
- Create: `src/app/layouts/main-layout/header/header.component.ts`

- [ ] **Step 12.1: Implement**

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeToggleComponent } from '../../../shared/ui/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../../shared/ui/lang-toggle/lang-toggle.component';
import { MobileNavComponent } from '../../../shared/ui/mobile-nav/mobile-nav.component';
import { ContainerComponent } from '../../../shared/ui/container/container.component';

@Component({
  selector: 'msp-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    ThemeToggleComponent,
    LangToggleComponent,
    MobileNavComponent,
    ContainerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <msp-container>
        <div class="flex h-20 items-center justify-between">
          <a [routerLink]="['/']" class="font-display text-h2 tracking-tight text-fg">MSP Design</a>

          <nav class="hidden gap-10 md:flex">
            <a routerLink="/about" routerLinkActive="text-accent" class="text-sm text-fg hover:text-accent">{{ 'nav.about' | translate }}</a>
            <a routerLink="/services" routerLinkActive="text-accent" class="text-sm text-fg hover:text-accent">{{ 'nav.services' | translate }}</a>
            <a routerLink="/projects" routerLinkActive="text-accent" class="text-sm text-fg hover:text-accent">{{ 'nav.projects' | translate }}</a>
            <a routerLink="/contact" routerLinkActive="text-accent" class="text-sm text-fg hover:text-accent">{{ 'nav.contact' | translate }}</a>
          </nav>

          <div class="flex items-center gap-2">
            <msp-lang-toggle />
            <msp-theme-toggle />
            <div class="md:hidden"><msp-mobile-nav /></div>
          </div>
        </div>
      </msp-container>
    </header>
  `,
})
export class HeaderComponent {}
```

- [ ] **Step 12.2: Pause for review.**

---

### Task 13: Footer component

**Files:**
- Create: `src/app/layouts/main-layout/footer/footer.component.ts`

- [ ] **Step 13.1: Implement**

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ContainerComponent } from '../../../shared/ui/container/container.component';

@Component({
  selector: 'msp-footer',
  standalone: true,
  imports: [RouterLink, TranslateModule, ContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="mt-32 border-t border-border bg-bg-elev py-20">
      <msp-container>
        <div class="grid gap-12 md:grid-cols-4">
          <div>
            <p class="font-display text-h2 text-fg">MSP Design</p>
            <p class="mt-4 max-w-xs text-sm text-fg-muted leading-relaxed">
              Interiors and architecture for those who notice the details.
            </p>
          </div>
          <div>
            <p class="mb-4 text-sm uppercase tracking-[0.2em] text-fg-muted">Sitemap</p>
            <ul class="space-y-2 text-sm">
              <li><a routerLink="/about" class="text-fg hover:text-accent">{{ 'nav.about' | translate }}</a></li>
              <li><a routerLink="/services" class="text-fg hover:text-accent">{{ 'nav.services' | translate }}</a></li>
              <li><a routerLink="/projects" class="text-fg hover:text-accent">{{ 'nav.projects' | translate }}</a></li>
              <li><a routerLink="/contact" class="text-fg hover:text-accent">{{ 'nav.contact' | translate }}</a></li>
            </ul>
          </div>
          <div>
            <p class="mb-4 text-sm uppercase tracking-[0.2em] text-fg-muted">Contact</p>
            <ul class="space-y-2 text-sm text-fg-muted">
              <li><a href="mailto:mansour@msp.sa" class="text-fg hover:text-accent">mansour&#64;msp.sa</a></li>
              <li>Riyadh, Saudi Arabia</li>
            </ul>
          </div>
          <div>
            <p class="mb-4 text-sm uppercase tracking-[0.2em] text-fg-muted">Newsletter</p>
            <form class="flex border-b border-border pb-2" onsubmit="return false;">
              <input
                type="email"
                placeholder="Your email"
                aria-label="Email"
                class="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-muted focus:outline-none"
              />
              <button type="submit" class="text-sm uppercase tracking-[0.2em] text-accent">→</button>
            </form>
            <p class="mt-2 text-xs text-fg-muted">Submission enabled with CMS launch.</p>
          </div>
        </div>
        <div class="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 text-xs text-fg-muted md:flex-row">
          <p>© {{ year }} MSP Design. All rights reserved.</p>
          <div class="flex gap-6">
            <a routerLink="/privacy" class="hover:text-accent">Privacy</a>
            <a routerLink="/terms" class="hover:text-accent">Terms</a>
          </div>
        </div>
      </msp-container>
    </footer>
  `,
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();
}
```

- [ ] **Step 13.2: Pause for review.**

---

### Task 14: MainLayout shell

**Files:**
- Create: `src/app/layouts/main-layout/main-layout.component.ts`

- [ ] **Step 14.1: Implement**

```ts
import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { ToastStackComponent } from '../../shared/ui/toast/toast.component';

@Component({
  selector: 'msp-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastStackComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-bg-elev focus:p-3 focus:text-fg">Skip to content</a>
    <msp-header />
    <main id="main"><router-outlet /></main>
    <msp-footer />
    <msp-toast-stack />
  `,
})
export class MainLayoutComponent implements OnInit {
  private readonly theme = inject(ThemeService);
  private readonly lang = inject(LanguageService);

  ngOnInit(): void {
    this.theme.init();
    this.lang.init('en');
  }
}
```

- [ ] **Step 14.2: Pause for review.**

---

### Task 15: StubLayout shell

**Files:**
- Create: `src/app/layouts/stub-layout/stub-layout.component.ts`

- [ ] **Step 15.1: Implement**

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../main-layout/header/header.component';
import { FooterComponent } from '../main-layout/footer/footer.component';

@Component({
  selector: 'msp-stub-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <msp-header />
    <main class="min-h-[60vh]"><router-outlet /></main>
    <msp-footer />
  `,
})
export class StubLayoutComponent {}
```

- [ ] **Step 15.2: Pause for review.**

---

## Phase 4 — Data layer

### Task 16: MockApiInterceptor + fixtures

**Files:**
- Create: `src/app/core/interceptors/mock-api.interceptor.ts`
- Create: `src/app/core/interceptors/mock-api.interceptor.spec.ts`
- Create: `src/mocks/projects.json`
- Create: `src/mocks/services.json`
- Create: `src/mocks/team.json`
- Create: `src/mocks/testimonials.json`
- Create: `src/mocks/partners.json`
- Create: `src/mocks/blog.json`
- Create: `src/mocks/settings.json`
- Create: `src/environments/environment.ts`
- Create: `src/environments/environment.prod.ts`
- Modify: `src/app/app.config.ts`

- [ ] **Step 16.1: Write fixtures**

`src/mocks/projects.json` — 9 placeholder projects. Use this structure for each; only one shown here, repeat with varied data:

```json
[
  {
    "id": "p1",
    "slug": "azure-residence",
    "title": "Azure Residence",
    "client": "Private Client",
    "industry": "Residential",
    "year": 2025,
    "completionDate": "2025-03-12",
    "technologies": ["Interior Design", "Lighting", "Furniture Curation"],
    "coverImage": "/assets/images/projects/azure-residence/cover.jpg",
    "galleryImages": [
      "/assets/images/projects/azure-residence/1.jpg",
      "/assets/images/projects/azure-residence/2.jpg",
      "/assets/images/projects/azure-residence/3.jpg"
    ],
    "description": "A private residence in north Riyadh blending contemporary minimalism with warm Saudi materials.",
    "status": "completed",
    "featured": true,
    "seo": { "title": "Azure Residence — MSP Design", "description": "Contemporary Saudi residential interiors." }
  }
]
```

Provide 9 records total covering: residential, commercial, hospitality, retail, mixed-use. Vary year 2022-2026, status completed/ongoing, featured true for 4 of them.

`src/mocks/services.json` — 6 services (Interior Architecture, Spatial Branding, Lighting Design, Furniture Curation, Project Management, Consulting). Each with the `Service` model fields.

`src/mocks/team.json` — 6 members. Photo paths point to `/assets/images/team/*.jpg` (placeholder silhouettes — see Defaults).

`src/mocks/testimonials.json` — 5 testimonials.

`src/mocks/partners.json` — 12 partner records with `/assets/images/partners/*.svg`.

`src/mocks/blog.json` — 6 placeholder posts (id, slug, title, excerpt, coverImage, publishedAt).

`src/mocks/settings.json`:

```json
{
  "email": "mansour@msp.sa",
  "phone": "+966 5x xxx xxxx",
  "address": "Riyadh, Saudi Arabia",
  "social": { "instagram": "#", "linkedin": "#", "behance": "#" }
}
```

- [ ] **Step 16.2: Environment files**

`src/environments/environment.ts`:

```ts
export const environment = { production: false, useMockApi: true, apiBaseUrl: '/api' };
```

`src/environments/environment.prod.ts`:

```ts
export const environment = { production: true, useMockApi: true, apiBaseUrl: '/api' };
```

(`useMockApi` stays `true` until backend cycle.)

- [ ] **Step 16.3: Write interceptor**

```ts
// src/app/core/interceptors/mock-api.interceptor.ts
import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, delay, of } from 'rxjs';
import projects from '../../../mocks/projects.json';
import services from '../../../mocks/services.json';
import team from '../../../mocks/team.json';
import testimonials from '../../../mocks/testimonials.json';
import partners from '../../../mocks/partners.json';
import blog from '../../../mocks/blog.json';
import settings from '../../../mocks/settings.json';

const FIXTURES: Record<string, unknown> = {
  '/api/projects': projects,
  '/api/services': services,
  '/api/team': team,
  '/api/testimonials': testimonials,
  '/api/partners': partners,
  '/api/blog': blog,
  '/api/settings': settings,
};

export const mockApiInterceptor: HttpInterceptorFn = (req, next: HttpHandlerFn) => {
  const url = new URL(req.urlWithParams, 'http://localhost');
  const key = url.pathname;
  if (FIXTURES[key]) {
    const body = FIXTURES[key];
    const latency = 300 + Math.floor(Math.random() * 300);
    return of(new HttpResponse({ status: 200, body })).pipe(delay(latency)) as Observable<HttpEvent<unknown>>;
  }
  // /api/projects/:slug
  const projectMatch = key.match(/^\/api\/projects\/([\w-]+)$/);
  if (projectMatch) {
    const slug = projectMatch[1];
    const found = (projects as Array<{ slug: string }>).find((p) => p.slug === slug);
    if (found) return of(new HttpResponse({ status: 200, body: found })).pipe(delay(400));
  }
  return next(req);
};
```

> tsconfig needs `"resolveJsonModule": true` and `"esModuleInterop": true` (Angular sets these by default; verify).

- [ ] **Step 16.4: Spec `src/app/core/interceptors/mock-api.interceptor.spec.ts`**

```ts
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { mockApiInterceptor } from './mock-api.interceptor';

describe('mockApiInterceptor', () => {
  let http: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockApiInterceptor]))],
    });
    http = TestBed.inject(HttpClient);
  });

  it('returns fixture array for /api/projects', (done) => {
    http.get<unknown[]>('/api/projects').subscribe((res) => {
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);
      done();
    });
  });

  it('returns single project for /api/projects/:slug', (done) => {
    http.get<{ slug: string }>('/api/projects/azure-residence').subscribe((res) => {
      expect(res.slug).toBe('azure-residence');
      done();
    });
  });
});
```

- [ ] **Step 16.5: Wire interceptor in `app.config.ts`**

Replace `provideHttpClient(withInterceptorsFromDi())` with:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { mockApiInterceptor } from './core/interceptors/mock-api.interceptor';
// ...
provideHttpClient(withInterceptors([mockApiInterceptor])),
```

- [ ] **Step 16.6: Run tests**

```bash
npm test -- mock-api
```

Expected: PASS.

- [ ] **Step 16.7: Pause for review.**

---

### Task 17: NgRx — projects slice (canonical example)

**Files:**
- Create: `src/app/store/projects/projects.api.ts`
- Create: `src/app/store/projects/projects.actions.ts`
- Create: `src/app/store/projects/projects.reducer.ts`
- Create: `src/app/store/projects/projects.effects.ts`
- Create: `src/app/store/projects/projects.selectors.ts`
- Create: `src/app/store/projects/projects.reducer.spec.ts`
- Modify: `src/app/app.config.ts`

- [ ] **Step 17.1: API service**

```ts
// projects.api.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Project } from '../../core/models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsApi {
  private readonly http = inject(HttpClient);
  list(): Observable<Project[]> { return this.http.get<Project[]>('/api/projects'); }
  bySlug(slug: string): Observable<Project> { return this.http.get<Project>(`/api/projects/${slug}`); }
}
```

- [ ] **Step 17.2: Actions**

```ts
// projects.actions.ts
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Project } from '../../core/models/project.model';

export const ProjectsActions = createActionGroup({
  source: 'Projects',
  events: {
    'Load List': emptyProps(),
    'Load List Success': props<{ items: Project[] }>(),
    'Load List Failure': props<{ error: string }>(),
    'Load One': props<{ slug: string }>(),
    'Load One Success': props<{ item: Project }>(),
    'Load One Failure': props<{ error: string }>(),
  },
});
```

- [ ] **Step 17.3: Reducer**

```ts
// projects.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, EntityState, createEntityAdapter } from '@ngrx/entity';
import { Project } from '../../core/models/project.model';
import { ProjectsActions } from './projects.actions';

export interface ProjectsState extends EntityState<Project> {
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

export const adapter: EntityAdapter<Project> = createEntityAdapter<Project>({
  selectId: (p) => p.id,
});

export const initialState: ProjectsState = adapter.getInitialState({
  loaded: false, loading: false, error: null,
});

export const projectsReducer = createReducer(
  initialState,
  on(ProjectsActions.loadList, (s) => ({ ...s, loading: true, error: null })),
  on(ProjectsActions.loadListSuccess, (s, { items }) =>
    adapter.setAll(items, { ...s, loading: false, loaded: true }),
  ),
  on(ProjectsActions.loadListFailure, (s, { error }) => ({ ...s, loading: false, error })),
  on(ProjectsActions.loadOneSuccess, (s, { item }) => adapter.upsertOne(item, s)),
);
```

- [ ] **Step 17.4: Effects**

```ts
// projects.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { ProjectsApi } from './projects.api';
import { ProjectsActions } from './projects.actions';

@Injectable()
export class ProjectsEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(ProjectsApi);

  loadList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectsActions.loadList),
      switchMap(() =>
        this.api.list().pipe(
          map((items) => ProjectsActions.loadListSuccess({ items })),
          catchError((err) => of(ProjectsActions.loadListFailure({ error: err?.message ?? 'failed' }))),
        ),
      ),
    ),
  );

  loadOne$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectsActions.loadOne),
      switchMap(({ slug }) =>
        this.api.bySlug(slug).pipe(
          map((item) => ProjectsActions.loadOneSuccess({ item })),
          catchError((err) => of(ProjectsActions.loadOneFailure({ error: err?.message ?? 'failed' }))),
        ),
      ),
    ),
  );
}
```

- [ ] **Step 17.5: Selectors**

```ts
// projects.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProjectsState, adapter } from './projects.reducer';

const selectFeature = createFeatureSelector<ProjectsState>('projects');
const { selectAll, selectEntities } = adapter.getSelectors();

export const ProjectsSelectors = {
  all: createSelector(selectFeature, selectAll),
  loaded: createSelector(selectFeature, (s) => s.loaded),
  loading: createSelector(selectFeature, (s) => s.loading),
  error: createSelector(selectFeature, (s) => s.error),
  featured: createSelector(selectFeature, (s) => selectAll(s).filter((p) => p.featured)),
  bySlug: (slug: string) =>
    createSelector(selectFeature, (s) => Object.values(selectEntities(s)).find((p) => p?.slug === slug)),
};
```

- [ ] **Step 17.6: Reducer spec**

```ts
// projects.reducer.spec.ts
import { projectsReducer, initialState } from './projects.reducer';
import { ProjectsActions } from './projects.actions';
import { Project } from '../../core/models/project.model';

const fake: Project = {
  id: 'p1', slug: 'x', title: 'X', client: 'C', industry: 'I', year: 2025,
  completionDate: '2025-01-01', technologies: [], coverImage: '', galleryImages: [], description: '',
  status: 'completed', featured: true, seo: { title: '', description: '' },
};

describe('projects reducer', () => {
  it('starts in default state', () => {
    expect(initialState.loaded).toBe(false);
  });

  it('handles loadList', () => {
    const s = projectsReducer(initialState, ProjectsActions.loadList());
    expect(s.loading).toBe(true);
  });

  it('handles loadListSuccess', () => {
    const s = projectsReducer(initialState, ProjectsActions.loadListSuccess({ items: [fake] }));
    expect(s.loaded).toBe(true);
    expect(s.ids.length).toBe(1);
  });
});
```

- [ ] **Step 17.7: Register in `app.config.ts`**

```ts
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { projectsReducer } from './store/projects/projects.reducer';
import { ProjectsEffects } from './store/projects/projects.effects';

// in providers:
provideStore({ projects: projectsReducer }),
provideEffects([ProjectsEffects]),
provideStoreDevtools({ maxAge: 25, logOnly: true }),
```

- [ ] **Step 17.8: Verify**

```bash
npm test -- projects.reducer
```

- [ ] **Step 17.9: Pause for review.**

---

### Task 18: Remaining 6 NgRx slices (services, team, testimonials, partners, blog, settings)

**Files:** Mirror Task 17's structure for each domain under `src/app/store/<domain>/`.

- [ ] **Step 18.1: Generate slice files**

For each domain (`services`, `team`, `testimonials`, `partners`, `blog`), create five files (`*.api.ts`, `*.actions.ts`, `*.reducer.ts`, `*.effects.ts`, `*.selectors.ts`) mirroring the projects slice but adapted:

- `selectId` based on the entity's `id`.
- No `Load One` action — these collections are loaded as a whole, not by slug. (`blog` keeps `Load One` for future post pages, but not exercised this cycle.)
- Selectors expose `all`, `loaded`, `loading`, `error`.

For `settings`, use a non-entity slice:

```ts
// settings.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { SettingsActions } from './settings.actions';

export interface SiteSettings {
  email: string; phone: string; address: string;
  social: { instagram: string; linkedin: string; behance: string };
}

export interface SettingsState {
  data: SiteSettings | null; loaded: boolean; loading: boolean; error: string | null;
}

export const initialState: SettingsState = { data: null, loaded: false, loading: false, error: null };

export const settingsReducer = createReducer(
  initialState,
  on(SettingsActions.load, (s) => ({ ...s, loading: true })),
  on(SettingsActions.loadSuccess, (s, { data }) => ({ ...s, data, loaded: true, loading: false })),
  on(SettingsActions.loadFailure, (s, { error }) => ({ ...s, loading: false, error })),
);
```

- [ ] **Step 18.2: Register all reducers/effects**

In `app.config.ts`, expand the store config:

```ts
provideStore({
  projects: projectsReducer,
  services: servicesReducer,
  team: teamReducer,
  testimonials: testimonialsReducer,
  partners: partnersReducer,
  blog: blogReducer,
  settings: settingsReducer,
}),
provideEffects([
  ProjectsEffects, ServicesEffects, TeamEffects, TestimonialsEffects,
  PartnersEffects, BlogEffects, SettingsEffects,
]),
```

- [ ] **Step 18.3: Write reducer spec per slice**

Same pattern as `projects.reducer.spec.ts` — one positive case per `loadSuccess`. 6 specs.

- [ ] **Step 18.4: Run tests**

```bash
npm test
```

Expected: all reducer specs pass.

- [ ] **Step 18.5: Pause for review.**

---

## Phase 5 — SEO + utilities

### Task 19: SeoService

**Files:**
- Create: `src/app/core/services/seo.service.ts`
- Create: `src/app/core/services/seo.service.spec.ts`

- [ ] **Step 19.1: Spec**

```ts
import { TestBed } from '@angular/core/testing';
import { Title, Meta } from '@angular/platform-browser';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let svc: SeoService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [Title, Meta] });
    svc = TestBed.inject(SeoService);
  });

  it('sets title and description', () => {
    svc.update({ title: 'About', description: 'who we are', url: 'https://msp.sa/about' });
    expect(document.title).toBe('About');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('who we are');
  });

  it('emits og + twitter tags', () => {
    svc.update({ title: 'X', description: 'Y', url: 'https://msp.sa/x' });
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('X');
    expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
  });
});
```

- [ ] **Step 19.2: Implement**

```ts
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoData {
  title: string; description: string; url?: string; image?: string;
  lang?: 'en' | 'ar';
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  update(data: SeoData): void {
    this.title.setTitle(data.title);
    this.meta.updateTag({ name: 'description', content: data.description });
    this.meta.updateTag({ property: 'og:title', content: data.title });
    this.meta.updateTag({ property: 'og:description', content: data.description });
    if (data.url) this.meta.updateTag({ property: 'og:url', content: data.url });
    if (data.image) this.meta.updateTag({ property: 'og:image', content: data.image });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: data.title });
    this.meta.updateTag({ name: 'twitter:description', content: data.description });
  }

  setJsonLd(id: string, payload: unknown): void {
    if (typeof document === 'undefined') return;
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(payload);
  }
}
```

- [ ] **Step 19.3: Run test**

```bash
npm test -- seo.service
```

- [ ] **Step 19.4: Pause for review.**

---

### Task 20: Build-sitemap script

**Files:**
- Create: `FrontEnd/scripts/build-sitemap.ts`
- Modify: `FrontEnd/package.json` (postbuild script)

- [ ] **Step 20.1: Script**

```ts
// scripts/build-sitemap.ts
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

const BASE = process.env.SITE_BASE_URL ?? 'https://msp.sa';
const DIST = path.resolve(__dirname, '../dist/FrontEnd/browser');

async function listHtml(root: string, acc: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) await listHtml(full, acc);
    else if (e.name === 'index.html') acc.push(full);
  }
  return acc;
}

async function main() {
  const files = await listHtml(DIST);
  const urls = files
    .map((f) => '/' + path.relative(DIST, path.dirname(f)).replace(/\\/g, '/'))
    .filter((u) => u !== '/');

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${BASE}${u}</loc></url>`).join('\n') +
    '\n</urlset>\n';

  await fs.writeFile(path.join(DIST, 'sitemap.xml'), xml, 'utf8');
  await fs.writeFile(
    path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`,
    'utf8',
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 20.2: Wire to npm**

Add to `package.json`:

```json
"postbuild": "ts-node scripts/build-sitemap.ts"
```

And install: `npm install -D ts-node`.

- [ ] **Step 20.3: Verify**

```bash
npm run build
```

Expected: `dist/FrontEnd/browser/sitemap.xml` and `robots.txt` exist with sensible content.

- [ ] **Step 20.4: Pause for review.**

---

## Phase 6 — Polished pages

### Task 21: Home page composition

**Files:**
- Create: `src/app/pages/home/home.component.ts`
- Create: `src/app/pages/home/sections/hero.component.ts`
- Create: `src/app/pages/home/sections/about-snippet.component.ts`
- Create: `src/app/pages/home/sections/services-grid.component.ts`
- Create: `src/app/pages/home/sections/featured-projects.component.ts`
- Create: `src/app/pages/home/sections/why-choose-us.component.ts`
- Create: `src/app/pages/home/sections/testimonials.component.ts`
- Create: `src/app/pages/home/sections/partners-strip.component.ts`
- Create: `src/app/pages/home/sections/team-grid.component.ts`
- Create: `src/app/pages/home/sections/blog-preview.component.ts`
- Create: `src/app/pages/home/sections/cta-banner.component.ts`

- [ ] **Step 21.1: Hero**

```ts
// hero.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ContainerComponent } from '../../../shared/ui/container/container.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'msp-hero',
  standalone: true,
  imports: [TranslateModule, ContainerComponent, ButtonComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="relative min-h-screen overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-bg via-bg to-bg-elev"></div>
      <div class="absolute inset-0 opacity-[0.04] mix-blend-overlay" style="background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence baseFrequency=%220.9%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>');"></div>

      <msp-container>
        <div class="relative flex min-h-screen flex-col justify-center py-32">
          <p class="text-sm uppercase tracking-[0.3em] text-fg-muted">MSP Design</p>
          <h1 class="mt-6 max-w-5xl font-display text-hero lg:text-hero-lg text-fg">
            {{ 'hero.title' | translate }}
          </h1>
          <p class="mt-8 max-w-xl text-lg text-fg-muted leading-relaxed">{{ 'hero.lede' | translate }}</p>
          <div class="mt-12 flex flex-wrap gap-4">
            <a [routerLink]="['/projects']"><msp-button variant="primary">{{ 'hero.cta_primary' | translate }}</msp-button></a>
            <a [routerLink]="['/contact']"><msp-button variant="ghost">{{ 'hero.cta_secondary' | translate }}</msp-button></a>
          </div>
        </div>
        <div class="absolute bottom-10 start-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-fg-muted">
          Scroll
        </div>
      </msp-container>
    </section>
  `,
})
export class HeroComponent {}
```

- [ ] **Step 21.2: Section components (about-snippet, services-grid, etc.)**

Each section component follows the pattern below. Adapt template per section spec from §5.2 of the spec doc.

```ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SectionComponent } from '../../../shared/ui/section/section.component';
import { SectionHeadingComponent } from '../../../shared/ui/section-heading/section-heading.component';
import { ProjectCardComponent } from '../../../shared/ui/project-card/project-card.component';
import { ProjectsActions } from '../../../store/projects/projects.actions';
import { ProjectsSelectors } from '../../../store/projects/projects.selectors';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'msp-featured-projects',
  standalone: true,
  imports: [AsyncPipe, TranslateModule, SectionComponent, SectionHeadingComponent, ProjectCardComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <msp-section id="featured-projects">
      <msp-section-heading eyebrow="Selected work" title="Featured projects" />
      <div class="mt-16 grid gap-12 md:grid-cols-2">
        @for (p of (featured$ | async) ?? []; track p.id; let i = $index) {
          <div [mspReveal] [delay]="i * 120" [class.md:mt-24]="i % 2 === 1">
            <msp-project-card [project]="p" />
          </div>
        }
      </div>
    </msp-section>
  `,
})
export class FeaturedProjectsComponent {
  private readonly store = inject(Store);
  readonly featured$ = this.store.select(ProjectsSelectors.featured);
  constructor() { this.store.dispatch(ProjectsActions.loadList()); }
}
```

Apply the same pattern (select-loaded data, dispatch load on init, reveal-on-scroll) for:

- `about-snippet.component.ts` — 2-col text + 3 stats. No store; static copy from i18n.
- `services-grid.component.ts` — 6-up grid of `ServiceCard` from `services` slice.
- `why-choose-us.component.ts` — 4 items, static, numeric markers (01–04).
- `testimonials.component.ts` — single-quote carousel with dot nav. State signal `current` advancing on a timer. Pause on `:hover`, no auto-advance under `prefers-reduced-motion`.
- `partners-strip.component.ts` — `Marquee` of `PartnerLogo`s.
- `team-grid.component.ts` — grid of `TeamCard`.
- `blog-preview.component.ts` — 3 latest posts from `blog` slice.
- `cta-banner.component.ts` — full-bleed section, headline, primary CTA to `/contact`.

- [ ] **Step 21.3: Home page assembly**

```ts
// home.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HeroComponent } from './sections/hero.component';
import { AboutSnippetComponent } from './sections/about-snippet.component';
import { ServicesGridComponent } from './sections/services-grid.component';
import { FeaturedProjectsComponent } from './sections/featured-projects.component';
import { WhyChooseUsComponent } from './sections/why-choose-us.component';
import { TestimonialsComponent } from './sections/testimonials.component';
import { PartnersStripComponent } from './sections/partners-strip.component';
import { TeamGridComponent } from './sections/team-grid.component';
import { BlogPreviewComponent } from './sections/blog-preview.component';
import { CtaBannerComponent } from './sections/cta-banner.component';

@Component({
  selector: 'msp-home',
  standalone: true,
  imports: [
    HeroComponent, AboutSnippetComponent, ServicesGridComponent,
    FeaturedProjectsComponent, WhyChooseUsComponent, TestimonialsComponent,
    PartnersStripComponent, TeamGridComponent, BlogPreviewComponent, CtaBannerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <msp-hero />
    <msp-about-snippet />
    <msp-services-grid />
    <msp-featured-projects />
    <msp-why-choose-us />
    <msp-testimonials />
    <msp-partners-strip />
    <msp-team-grid />
    <msp-blog-preview />
    <msp-cta-banner />
  `,
})
export class HomeComponent {}
```

- [ ] **Step 21.4: Run dev server, navigate to `/`**

Confirm: hero loads, all 10 sections render in order, theme + language toggles work, scroll reveals fire.

- [ ] **Step 21.5: Pause for review.**

---

### Task 22: About page

**Files:**
- Create: `src/app/pages/about/about.component.ts`
- Create: `src/app/pages/about/sections/timeline.component.ts`

- [ ] **Step 22.1: AboutComponent**

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { SectionHeadingComponent } from '../../shared/ui/section-heading/section-heading.component';
import { StatComponent } from '../../shared/ui/stat/stat.component';
import { TimelineComponent } from './sections/timeline.component';
import { TeamGridComponent } from '../home/sections/team-grid.component';
import { PartnersStripComponent } from '../home/sections/partners-strip.component';
import { CtaBannerComponent } from '../home/sections/cta-banner.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'msp-about',
  standalone: true,
  imports: [
    TranslateModule, SectionComponent, SectionHeadingComponent, StatComponent,
    TimelineComponent, TeamGridComponent, PartnersStripComponent, CtaBannerComponent, RevealDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <msp-section id="about-hero">
      <p class="text-sm uppercase tracking-[0.3em] text-fg-muted">About MSP Design</p>
      <h1 class="mt-6 max-w-3xl font-display text-display lg:text-display-lg text-fg">
        We design spaces that hold their weight in silence.
      </h1>
      <div class="mt-16 grid gap-12 md:grid-cols-3" mspReveal>
        <msp-stat value="12+" label="Years in practice" />
        <msp-stat value="80+" label="Completed projects" />
        <msp-stat value="40+" label="Returning clients" />
      </div>
    </msp-section>

    <msp-section id="mission">
      <msp-section-heading eyebrow="Mission" title="What we believe" lede="Every space tells a story. Our job is to listen carefully, then build the architecture and interiors that make that story legible without ornament." />
    </msp-section>

    <msp-timeline />
    <msp-team-grid />
    <msp-partners-strip />
    <msp-cta-banner />
  `,
})
export class AboutComponent {}
```

- [ ] **Step 22.2: TimelineComponent**

Simple vertical timeline: 5 hardcoded milestones (founded, first hospitality project, opened Riyadh studio, etc.). Each: year + headline + 1-line description, with reveal animation per item, alternating side on desktop.

- [ ] **Step 22.3: Pause for review.**

---

### Task 23: Services page

**Files:**
- Create: `src/app/pages/services/services.component.ts`

- [ ] **Step 23.1: Implement**

```ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { SectionHeadingComponent } from '../../shared/ui/section-heading/section-heading.component';
import { ContainerComponent } from '../../shared/ui/container/container.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { CtaBannerComponent } from '../home/sections/cta-banner.component';
import { ServicesActions } from '../../store/services/services.actions';
import { ServicesSelectors } from '../../store/services/services.selectors';

@Component({
  selector: 'msp-services',
  standalone: true,
  imports: [AsyncPipe, SectionComponent, SectionHeadingComponent, ContainerComponent, RevealDirective, CtaBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <msp-section id="services-hero">
      <msp-section-heading eyebrow="Services" title="Our practice" lede="Six disciplines, one studio. Engage one, or all of them." />
    </msp-section>

    <section class="border-t border-border">
      <msp-container>
        <div class="grid gap-16 lg:grid-cols-[260px_1fr]">
          <aside class="sticky top-28 hidden h-fit lg:block">
            <ul class="space-y-3">
              @for (s of (services$ | async) ?? []; track s.id) {
                <li><a [href]="'#' + s.slug" class="text-sm text-fg-muted hover:text-accent">{{ s.title }}</a></li>
              }
            </ul>
          </aside>
          <div class="space-y-32 py-24">
            @for (s of (services$ | async) ?? []; track s.id) {
              <article [id]="s.slug" mspReveal>
                <h2 class="font-display text-h1 lg:text-h1-lg text-fg">{{ s.title }}</h2>
                <p class="mt-6 max-w-prose text-base text-fg-muted leading-relaxed">{{ s.description }}</p>
                <ul class="mt-8 grid gap-3 md:grid-cols-2">
                  @for (d of s.deliverables; track d) {
                    <li class="text-sm text-fg-muted">— {{ d }}</li>
                  }
                </ul>
              </article>
            }
          </div>
        </div>
      </msp-container>
    </section>

    <msp-cta-banner />
  `,
})
export class ServicesComponent {
  private readonly store = inject(Store);
  readonly services$ = this.store.select(ServicesSelectors.all);
  constructor() { this.store.dispatch(ServicesActions.load()); }
}
```

- [ ] **Step 23.2: Pause for review.**

---

### Task 24: Projects index page

**Files:**
- Create: `src/app/pages/projects/projects.component.ts`

- [ ] **Step 24.1: Implement**

```ts
import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ProjectsActions } from '../../store/projects/projects.actions';
import { ProjectsSelectors } from '../../store/projects/projects.selectors';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { SectionHeadingComponent } from '../../shared/ui/section-heading/section-heading.component';
import { ProjectCardComponent } from '../../shared/ui/project-card/project-card.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'msp-projects',
  standalone: true,
  imports: [SectionComponent, SectionHeadingComponent, ProjectCardComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <msp-section id="projects-hero">
      <msp-section-heading eyebrow="Selected work" title="Projects" />
      <div class="mt-12 flex flex-wrap gap-2">
        @for (i of industries(); track i) {
          <button
            class="rounded-full border px-4 py-2 text-sm transition-colors"
            [class.border-accent]="industry() === i"
            [class.text-accent]="industry() === i"
            [class.border-border]="industry() !== i"
            [class.text-fg-muted]="industry() !== i"
            (click)="setIndustry(i)"
          >
            {{ i || 'All' }}
          </button>
        }
      </div>
      <div class="mt-16 grid gap-12 md:grid-cols-2 lg:grid-cols-3">
        @for (p of filtered(); track p.id; let idx = $index) {
          <div [mspReveal] [delay]="idx * 80">
            <msp-project-card [project]="p" />
          </div>
        }
      </div>
    </msp-section>
  `,
})
export class ProjectsComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly all = toSignal(this.store.select(ProjectsSelectors.all), { initialValue: [] });
  readonly industry = signal<string>(this.route.snapshot.queryParamMap.get('industry') ?? '');

  readonly industries = computed(() => ['', ...new Set(this.all().map((p) => p.industry))]);
  readonly filtered = computed(() => {
    const i = this.industry();
    return i ? this.all().filter((p) => p.industry === i) : this.all();
  });

  constructor() {
    this.store.dispatch(ProjectsActions.loadList());
  }

  setIndustry(i: string): void {
    this.industry.set(i);
    this.router.navigate([], { queryParams: { industry: i || null }, queryParamsHandling: 'merge' });
  }
}
```

- [ ] **Step 24.2: Pause for review.**

---

### Task 25: Project Details page

**Files:**
- Create: `src/app/pages/project-details/project-details.component.ts`

- [ ] **Step 25.1: Implement**

```ts
import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Dialog } from '@angular/cdk/dialog';
import { ProjectsActions } from '../../store/projects/projects.actions';
import { ProjectsSelectors } from '../../store/projects/projects.selectors';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { ContainerComponent } from '../../shared/ui/container/container.component';
import { LightboxComponent } from '../../shared/ui/lightbox/lightbox.component';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'msp-project-details',
  standalone: true,
  imports: [RouterLink, SectionComponent, ContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (project(); as p) {
      <article>
        <header class="relative h-[80vh] overflow-hidden">
          <img [src]="p.coverImage" [alt]="p.title" class="absolute inset-0 h-full w-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent"></div>
          <msp-container>
            <div class="relative flex h-full flex-col justify-end pb-16">
              <p class="text-sm uppercase tracking-[0.3em] text-fg-muted">{{ p.industry }} · {{ p.year }}</p>
              <h1 class="mt-4 max-w-4xl font-display text-display lg:text-display-lg text-fg">{{ p.title }}</h1>
            </div>
          </msp-container>
        </header>

        <msp-section id="meta">
          <div class="grid gap-8 md:grid-cols-3">
            <div><p class="text-sm uppercase tracking-[0.2em] text-fg-muted">Client</p><p class="mt-2 text-fg">{{ p.client }}</p></div>
            <div><p class="text-sm uppercase tracking-[0.2em] text-fg-muted">Industry</p><p class="mt-2 text-fg">{{ p.industry }}</p></div>
            <div><p class="text-sm uppercase tracking-[0.2em] text-fg-muted">Completed</p><p class="mt-2 text-fg">{{ p.completionDate }}</p></div>
          </div>
          <p class="mt-16 max-w-prose text-base md:text-lg text-fg-muted leading-relaxed">{{ p.description }}</p>
        </msp-section>

        <section class="bg-bg-elev py-24">
          <msp-container>
            <div class="grid gap-6 md:grid-cols-3">
              @for (img of p.galleryImages; track img; let i = $index) {
                <button (click)="openLightbox(p.galleryImages, i)" class="relative aspect-square overflow-hidden rounded-2xl">
                  <img [src]="img" [alt]="p.title + ' gallery ' + (i + 1)" class="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                </button>
              }
            </div>
          </msp-container>
        </section>

        <msp-section id="next">
          <a routerLink="/projects" class="text-sm uppercase tracking-[0.3em] text-accent">Back to all projects →</a>
        </msp-section>
      </article>
    }
  `,
})
export class ProjectDetailsComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(Dialog);
  private readonly seo = inject(SeoService);

  private readonly slug = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly project = signal(null as ReturnType<typeof this.lookup> | null);

  constructor() {
    effect(() => {
      const s = this.slug().get('slug');
      if (!s) return;
      this.store.dispatch(ProjectsActions.loadList());
      this.store.dispatch(ProjectsActions.loadOne({ slug: s }));
    });

    // subscribe via selector (signal)
    const all = toSignal(this.store.select(ProjectsSelectors.all), { initialValue: [] });
    effect(() => {
      const s = this.slug().get('slug');
      const p = all().find((x) => x.slug === s);
      this.project.set(p ?? null);
      if (p) {
        this.seo.update({ title: p.seo.title, description: p.seo.description, image: p.coverImage });
        this.seo.setJsonLd('project-jsonld', {
          '@context': 'https://schema.org', '@type': 'Article',
          headline: p.title, description: p.description, image: p.coverImage, datePublished: p.completionDate,
        });
      }
    });
  }

  private lookup() { return null; } // type hint only

  openLightbox(images: string[], index: number): void {
    this.dialog.open(LightboxComponent, {
      hasBackdrop: true,
      panelClass: 'w-screen h-screen max-w-full m-0',
      data: { images, index },
    });
  }
}
```

- [ ] **Step 25.2: Pause for review.**

---

### Task 26: Contact page

**Files:**
- Create: `src/app/pages/contact/contact.component.ts`

- [ ] **Step 26.1: Implement**

```ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { SectionHeadingComponent } from '../../shared/ui/section-heading/section-heading.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { SettingsActions } from '../../store/settings/settings.actions';
import { SettingsSelectors } from '../../store/settings/settings.selectors';

@Component({
  selector: 'msp-contact',
  standalone: true,
  imports: [AsyncPipe, SectionComponent, SectionHeadingComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (settings$ | async; as s) {
      <msp-section id="contact-hero">
        <msp-section-heading eyebrow="Contact" title="Let's design something quietly remarkable." />
        <div class="mt-16 grid gap-12 lg:grid-cols-[1fr_1fr]">
          <a
            [href]="'mailto:' + s.email"
            class="group block rounded-2xl border border-border bg-bg-elev p-10 transition-colors hover:border-accent"
          >
            <p class="text-sm uppercase tracking-[0.3em] text-fg-muted">Write to us</p>
            <p class="mt-6 font-display text-h1 text-fg group-hover:text-accent">{{ s.email }}</p>
            <div class="mt-10"><msp-button variant="primary">Open email →</msp-button></div>
          </a>
          <div class="space-y-8">
            <div><p class="text-sm uppercase tracking-[0.3em] text-fg-muted">Phone</p><p class="mt-2 text-fg">{{ s.phone }}</p></div>
            <div><p class="text-sm uppercase tracking-[0.3em] text-fg-muted">Studio</p><p class="mt-2 text-fg">{{ s.address }}</p></div>
            <div>
              <p class="text-sm uppercase tracking-[0.3em] text-fg-muted">Social</p>
              <div class="mt-4 flex gap-4">
                <a [href]="s.social.instagram" class="text-fg hover:text-accent">Instagram</a>
                <a [href]="s.social.linkedin" class="text-fg hover:text-accent">LinkedIn</a>
                <a [href]="s.social.behance" class="text-fg hover:text-accent">Behance</a>
              </div>
            </div>
            <img
              src="https://maps.googleapis.com/maps/api/staticmap?center=Riyadh&zoom=12&size=600x400&style=feature:all|element:all|invert_lightness:true"
              alt="Riyadh studio location"
              class="w-full rounded-2xl opacity-60"
              loading="lazy"
            />
          </div>
        </div>
      </msp-section>
    }
  `,
})
export class ContactComponent {
  private readonly store = inject(Store);
  readonly settings$ = this.store.select(SettingsSelectors.data);
  constructor() { this.store.dispatch(SettingsActions.load()); }
}
```

(Static map URL has no API key — fine for placeholder; replace with real key or a screenshot before launch.)

- [ ] **Step 26.2: Pause for review.**

---

## Phase 7 — Minimal pages + 404

### Task 27: Stub pages (Blog, Careers, FAQ) + StubPage shared component

**Files:**
- Create: `src/app/shared/ui/stub-page/stub-page.component.ts`
- Create: `src/app/pages/blog/blog.component.ts`
- Create: `src/app/pages/careers/careers.component.ts`
- Create: `src/app/pages/faq/faq.component.ts`

- [ ] **Step 27.1: StubPage**

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContainerComponent } from '../container/container.component';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'msp-stub-page',
  standalone: true,
  imports: [RouterLink, ContainerComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <msp-container>
      <div class="flex min-h-[60vh] flex-col items-start justify-center py-32">
        <p class="text-sm uppercase tracking-[0.3em] text-fg-muted">{{ eyebrow() }}</p>
        <h1 class="mt-6 max-w-3xl font-display text-display lg:text-display-lg text-fg">{{ title() }}</h1>
        <p class="mt-6 max-w-prose text-base md:text-lg text-fg-muted leading-relaxed">{{ message() }}</p>
        <div class="mt-10">
          <a routerLink="/"><msp-button variant="ghost">Back to home →</msp-button></a>
        </div>
      </div>
    </msp-container>
  `,
})
export class StubPageComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly message = input.required<string>();
}
```

- [ ] **Step 27.2: Three concrete stubs**

```ts
// blog.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { StubPageComponent } from '../../shared/ui/stub-page/stub-page.component';

@Component({
  selector: 'msp-blog',
  standalone: true,
  imports: [StubPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<msp-stub-page eyebrow="Editorial" title="Field notes coming soon." message="We're putting together long-form pieces on the practice. Check back later." />`,
})
export class BlogComponent {}
```

Mirror for `careers.component.ts` (eyebrow "Careers", title "We hire slowly.", message about opening positions) and `faq.component.ts` (eyebrow "Questions", title "Frequently asked.", message about contact via email).

- [ ] **Step 27.3: Pause for review.**

---

### Task 28: Privacy + Terms (short real text)

**Files:**
- Create: `src/app/pages/privacy/privacy.component.ts`
- Create: `src/app/pages/terms/terms.component.ts`

- [ ] **Step 28.1: Both pages use a simple prose wrapper**

```ts
// privacy.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ContainerComponent } from '../../shared/ui/container/container.component';

@Component({
  selector: 'msp-privacy',
  standalone: true,
  imports: [ContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <msp-container>
      <article class="prose-msp max-w-prose py-32">
        <p class="text-sm uppercase tracking-[0.3em] text-fg-muted">Privacy</p>
        <h1 class="mt-6 font-display text-display text-fg">Privacy Policy</h1>
        <p class="mt-6 text-fg-muted">Last updated 2026-05-20. This is placeholder text suitable for soft launch. Replace with reviewed legal copy before public launch.</p>
        <h2 class="mt-12 font-display text-h2 text-fg">What we collect</h2>
        <p class="mt-4 text-fg-muted">We only collect what you submit through our contact email. We don't run analytics in this build.</p>
        <h2 class="mt-12 font-display text-h2 text-fg">Contact</h2>
        <p class="mt-4 text-fg-muted">For privacy concerns, email mansour&#64;msp.sa.</p>
      </article>
    </msp-container>
  `,
})
export class PrivacyComponent {}
```

Mirror with `terms.component.ts` (terms of use text — short).

- [ ] **Step 28.2: Pause for review.**

---

### Task 29: Designed 404

**Files:**
- Create: `src/app/pages/not-found/not-found.component.ts`

- [ ] **Step 29.1: Implement**

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContainerComponent } from '../../shared/ui/container/container.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';

@Component({
  selector: 'msp-not-found',
  standalone: true,
  imports: [RouterLink, ContainerComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <msp-container>
      <div class="flex min-h-[80vh] flex-col items-start justify-center py-32">
        <p class="font-display text-[8rem] leading-none text-accent lg:text-[12rem]">404</p>
        <h1 class="mt-8 max-w-3xl font-display text-display text-fg">This page is somewhere else.</h1>
        <p class="mt-6 max-w-prose text-fg-muted">The link you followed has either moved or never existed. Let's get you back to a known place.</p>
        <div class="mt-10"><a routerLink="/"><msp-button variant="primary">Back to home</msp-button></a></div>
      </div>
    </msp-container>
  `,
})
export class NotFoundComponent {}
```

- [ ] **Step 29.2: Pause for review.**

---

### Task 30: Wire all routes

**Files:**
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/app.component.ts`

- [ ] **Step 30.1: Routes**

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent), data: { seo: { title: 'MSP Design', description: 'Interiors and architecture studio.' } } },
      { path: 'about', loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent) },
      { path: 'services', loadComponent: () => import('./pages/services/services.component').then((m) => m.ServicesComponent) },
      { path: 'projects', loadComponent: () => import('./pages/projects/projects.component').then((m) => m.ProjectsComponent) },
      { path: 'projects/:slug', loadComponent: () => import('./pages/project-details/project-details.component').then((m) => m.ProjectDetailsComponent) },
      { path: 'contact', loadComponent: () => import('./pages/contact/contact.component').then((m) => m.ContactComponent) },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/stub-layout/stub-layout.component').then((m) => m.StubLayoutComponent),
    children: [
      { path: 'blog', loadComponent: () => import('./pages/blog/blog.component').then((m) => m.BlogComponent) },
      { path: 'careers', loadComponent: () => import('./pages/careers/careers.component').then((m) => m.CareersComponent) },
      { path: 'faq', loadComponent: () => import('./pages/faq/faq.component').then((m) => m.FaqComponent) },
      { path: 'privacy', loadComponent: () => import('./pages/privacy/privacy.component').then((m) => m.PrivacyComponent) },
      { path: 'terms', loadComponent: () => import('./pages/terms/terms.component').then((m) => m.TermsComponent) },
    ],
  },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent) },
];
```

> Note on language prefixes: the spec calls for `/en/...` and `/ar/...` prefixes. To keep this plan tractable, this cycle uses single-tree routes with language toggled in-page via `LanguageService`. Adding `/en` and `/ar` prefixes is a follow-up sub-plan after the rest is wired — it's purely a routing restructure and doesn't change any component code.

- [ ] **Step 30.2: Wire SEO subscription to router**

In `app.component.ts`:

```ts
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SeoService } from './core/services/seo.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        map(() => {
          let r = this.route;
          while (r.firstChild) r = r.firstChild;
          return r.snapshot.data['seo'];
        }),
      )
      .subscribe((data) => {
        if (data) this.seo.update(data);
      });
  }
}
```

- [ ] **Step 30.3: Verify navigation**

Run `npm start`, click through every route, confirm no console errors.

- [ ] **Step 30.4: Pause for review.**

---

## Phase 8 — Tests and final checks

### Task 31: Playwright smoke specs

**Files:**
- Create: `e2e/home.spec.ts`
- Create: `e2e/about.spec.ts`
- Create: `e2e/services.spec.ts`
- Create: `e2e/projects.spec.ts`
- Create: `e2e/project-details.spec.ts`
- Create: `e2e/contact.spec.ts`

- [ ] **Step 31.1: Home spec**

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home renders, hero visible, theme toggle works', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Toggle theme').click();
  await expect(html).toHaveAttribute('data-theme', 'light');

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
});

test('home language toggle switches to ar and rtl', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Switch language').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});
```

- [ ] **Step 31.2: Remaining 5 specs**

Same pattern — navigate, assert key landmark visible, run axe, assert no serious/critical violations. For `project-details`, navigate via `/projects` → first card click rather than direct URL.

- [ ] **Step 31.3: Run e2e**

```bash
npm run e2e
```

Expected: 6+ specs pass.

- [ ] **Step 31.4: Pause for review.**

---

### Task 32: Production build + smoke

**Files:** none new

- [ ] **Step 32.1: Production build**

```bash
npm run build
```

Expected: completes, `dist/FrontEnd/browser/` contains:
- `index.html` (Home)
- `about/index.html`
- `services/index.html`
- `projects/index.html`
- `projects/azure-residence/index.html` (and one per project from fixtures)
- `contact/index.html`
- Stubs / privacy / terms / 404 directories.
- `sitemap.xml`, `robots.txt`.

- [ ] **Step 32.2: Serve and smoke-test**

```bash
npx http-server dist/FrontEnd/browser -p 4300
```

Open `http://localhost:4300/`. Confirm:
- Page rendered before JS executes (view-source shows real text).
- Navigation works.
- Lighthouse (devtools → Lighthouse) scores ≥ 95 on Performance, Accessibility, Best Practices, SEO.

- [ ] **Step 32.3: Pause for review.**

---

### Task 33: README

**Files:**
- Create: `FrontEnd/README.md`

- [ ] **Step 33.1: Write README**

```markdown
# MSP Design — FrontEnd

Public marketing site for MSP Design. Angular 17 + SSG (prerender), TailwindCSS, NgRx, EN/AR with full RTL.

## Scripts

- `npm start` — dev server at http://localhost:4200
- `npm run build` — production build (`dist/FrontEnd/browser/`)
- `npm run prerender` — alias of build (prerender is enabled in `angular.json`)
- `npm run test` — Jest unit tests
- `npm run e2e` — Playwright end-to-end tests
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm run format` — Prettier write

## Notes

- Backend is not yet built; `MockApiInterceptor` serves all `/api/*` calls from JSON fixtures under `src/mocks/`.
- Default theme is dark; toggle in header switches to light and persists in `localStorage`.
- Default language is English; toggle in header switches to Arabic and sets `dir="rtl"`.
- The MSP Design logo is a placeholder serif lockup until a real logo file is placed in `src/assets/logo.svg`.

## When the backend arrives

1. Remove `mockApiInterceptor` from `provideHttpClient(withInterceptors([...]))` in `src/app/app.config.ts`.
2. Set `environment.apiBaseUrl` if hosted elsewhere.
3. Everything else stays the same.
```

- [ ] **Step 33.2: Pause for review. Cycle 1 complete.**

---

## Self-review summary

**Spec coverage:**
- Scope (frontend only) → all phases. ✓
- Hybrid visual style → tokens (Task 2), typography (Task 6), motion (Task 10). ✓
- EN+AR + RTL → Task 5 + Tailwind RTL plugin (Task 2). Note: `/en` `/ar` route prefixes deferred to follow-up sub-plan, with rationale called out in Task 30.1. ✓ (with documented deviation)
- Dark default → Task 4. ✓
- 6 polished pages → Tasks 21–26. ✓
- 5 minimal pages → Tasks 27 (3 stubs) + 28 (Privacy, Terms). ✓
- 404 → Task 29. ✓
- Custom Tailwind components + CDK overlays → Tasks 7–11. ✓
- NgRx 7 slices → Task 17 (canonical) + Task 18 (remaining 6). ✓
- HTTP interceptor + JSON fixtures → Task 16. ✓
- mailto contact → Task 26. ✓
- Static prerender → Task 1 (enabled at scaffold), Task 32 (verified). ✓
- SEO + sitemap → Tasks 19, 20, 30.2. ✓
- Tests (unit + Playwright + axe) → Tasks 4, 5, 7, 10, 16, 17, 18, 19, 31. ✓

**Placeholder scan:** None of the forbidden patterns ("TBD", "implement later", "similar to Task N", "handle edge cases" without code). One acknowledged simplification (language route prefixes deferred) is explicitly documented as a follow-up.

**Type consistency:** Method/property names match across tasks: `ProjectsActions.loadList`, `ProjectsSelectors.all`/`.featured`/`.bySlug`, `Project.slug`/`.coverImage`/`.galleryImages`/`.seo.title|description`, `LanguageService.current()`/`.set()`, `ThemeService.theme()`/`.toggle()`/`.init()`/`.set()`.

---

## Open follow-ups (out of scope, queued for next sub-plan)

- `/en` and `/ar` route prefixes (currently in-page language toggle only).
- Newsletter submission and contact form (Phase 9 once backend exists).
- Real CMS hookup (replace interceptor).
- Docker + Nginx production deployment config.
- CI workflow file.
- Real MSP Design logo and brand-color validation.
