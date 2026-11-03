# MSP Design — Frontend Public Site (Cycle 1) Design

**Status:** Draft — awaiting user review
**Date:** 2026-05-20
**Owner:** mansour@msp.sa
**Scope cycle:** 1 of N

---

## 1. Context & scope

The PRD (`/prd.md`) describes a full enterprise platform: Angular SSR public site, NestJS backend, PostgreSQL, JWT/RBAC auth, admin CMS, Docker stack. This is too large for one design/implementation cycle.

**This cycle delivers the public marketing website only**, using mock data. Backend, admin dashboard, authentication, file uploads, DevOps containerization, and CI are explicitly deferred to later cycles.

### Goals (this cycle)

- Production-quality public marketing site for MSP Design.
- Bilingual (English + Arabic) with full RTL support from day one.
- Dark default theme with a light theme toggle.
- 6 polished pages, 5 minimal pages (3 "coming soon" stubs + 2 short text pages), a designed 404.
- Architecture that swaps cleanly to a real backend later (no refactor required).

### Non-goals (this cycle)

- Backend API of any kind.
- Admin dashboard, authentication, RBAC.
- Real CMS, file uploads, real newsletter or contact form submission.
- Docker, Nginx config, CI/CD pipelines, hosting setup.
- Real blog content, real careers postings, real project case studies.

---

## 2. Decisions log

Each row is a decision the user explicitly made during brainstorming, not a default I picked.

| Topic | Decision |
|---|---|
| First slice | Frontend public marketing site only (backend + admin deferred). |
| Visual style | Hybrid of editorial-minimal + dark-cinematic + corporate-premium. |
| Content source | Real MSP brand info + placeholder projects/team/testimonials. |
| Languages | Arabic + English from day one, full RTL. |
| Default theme | Dark; toggle to light. |
| Page polish scope | Core 6 fully polished, 5 stubbed: Home, About, Services, Projects, Project Details, Contact (polished); Blog, Careers, FAQ, Privacy, Terms (stubs). |
| UI components | Custom components on TailwindCSS, Angular CDK for a11y primitives. No Material/PrimeNG. |
| Animation | Angular Animations API + IntersectionObserver. No GSAP/Motion. |
| State mgmt | NgRx (full Redux pattern). |
| Mock data delivery | `HttpClient` + `MockApiInterceptor` returning JSON fixtures. Swap = remove interceptor. |
| Brand assets | Placeholder MSP wordmark in this cycle; real logo dropped into `assets/` later. Palette/typography proposed below. |
| Contact form | No form. `mailto:` link to `mansour@msp.sa`. |
| Rendering | Static prerender (SSG) via Angular Application Builder. No runtime SSR this cycle. |

---

## 3. Stack

- **Framework:** Angular 17+ (standalone components, signals where natural).
- **Build:** Angular Application Builder with `prerender: true` for production.
- **Styling:** TailwindCSS + a small SCSS file for resets and custom scrollbars. CSS variables for theme tokens.
- **RTL:** Tailwind RTL plugin + logical properties throughout.
- **i18n:** `@ngx-translate/core` + `@ngx-translate/http-loader`. JSON dictionaries under `assets/i18n/`.
- **State:** `@ngrx/store`, `@ngrx/effects`, `@ngrx/entity`, `@ngrx/store-devtools`.
- **HTTP:** Angular `HttpClient` + `MockApiInterceptor` (provided behind `environment.useMockApi`).
- **A11y/UX primitives:** `@angular/cdk` (overlay, a11y, dialog, menu, drag).
- **Testing:** Jest (unit), Playwright + `@axe-core/playwright` (e2e + a11y).
- **Tooling:** TypeScript strict mode, ESLint (Angular preset), Prettier, Husky pre-commit (lint + format).

---

## 4. Architecture

### 4.1 App shell

- Standalone components throughout. No NgModules except where a library requires one.
- Three layouts planned; two implemented this cycle:
  - `MainLayout` — header, footer, mobile-nav. Used by all public pages.
  - `StubLayout` — header, slim "coming soon" body, footer. Used by Blog/Careers/FAQ/Privacy/Terms.
  - `AuthLayout`, `AdminLayout` — deferred.
- Eager route loading for public pages (prerendered, no benefit to lazy-loading).
- Lazy-loading reserved for the admin chunk in later cycles.

### 4.2 Rendering

- **Production:** Angular `prerender` writes static HTML for every public route, per language. Output is a static-host-ready `dist/` (Nginx, Cloudflare Pages, S3, etc.).
- **Development:** `ng serve` with SSR enabled, so server-side issues surface during dev.
- **Migration path to real SSR:** swap `prerender: true` → `server`/`ssr` in `angular.json`. No code changes.

### 4.3 i18n strategy

- Two dictionaries: `assets/i18n/en.json`, `assets/i18n/ar.json`.
- `LanguageService` is the single source of truth:
  - Reads persisted choice from `localStorage` (key `msp.lang`).
  - Otherwise picks browser language if it's `ar`, else `en`.
  - Writes `lang` and `dir` attributes on `<html>`.
  - Exposes `lang$` signal/observable consumed by `TranslateModule`.
- Routes are prefixed: `/en/...` and `/ar/...`. Bare `/` redirects based on persisted choice → browser hint → `en`.
- Prerender renders both language variants. Hreflang link tags are emitted for each page's counterpart.

### 4.4 Theme strategy

- CSS variables on `<html>` define every color/border/shadow token (see section 6.1).
- `ThemeService` toggles a `data-theme="dark"` / `data-theme="light"` attribute on `<html>`.
- Initial value:
  - Persisted (`msp.theme`) if present.
  - Else `prefers-color-scheme` if user hasn't toggled before.
  - Else `dark` (project default).
- All Tailwind classes consume CSS variables, never hard-coded colors.

### 4.5 State management (NgRx)

One feature slice per domain, registered with `provideState` in `app.config.ts`:

- `projects` — `EntityState<Project>` + selected slug + filters.
- `services` — list.
- `team` — list.
- `testimonials` — list + active index.
- `partners` — list.
- `blog` — list (used only for the home "Blog Preview" section in this cycle).
- `settings` — site-level settings (social links, contact info, footer columns).

Each slice contains: `*.actions.ts`, `*.reducer.ts`, `*.effects.ts`, `*.selectors.ts`. Effects call thin API services (`projects.api.ts`, etc.) over `HttpClient`. Selectors are exposed as observables; components convert with `toSignal()` where signals fit better.

`@ngrx/store-devtools` enabled only in development.

### 4.6 Data flow (read path)

1. Page component dispatches `loadX()` in `ngOnInit` (idempotent — guarded by selector that checks "already loaded").
2. Effect calls `XApi.list()` → `HttpClient.get('/api/x')`.
3. `MockApiInterceptor` matches `/api/*`, looks up fixture JSON under `src/mocks/`, returns with a randomized 300–600ms delay (so loading states actually render).
4. Effect dispatches `loadXSuccess(payload)` or `loadXFailure(error)`.
5. Reducer updates state. Selectors push to subscribers. Component re-renders.

### 4.7 Error handling

- Effects always `catchError` and dispatch a typed `*Failure` action.
- A global `error$` selector aggregates failures.
- A non-blocking `Toast` (top-right, auto-dismiss 5s) renders errors.
- 404: wildcard route to `NotFoundComponent`. Prerender configured to also emit `404.html` for hosts that look for one.
- Mock interceptor never fails in production prerender (synchronous data) — so error paths exercise only during dev or once real backend exists.

### 4.8 SEO

- `SeoService` (used by a top-level `RouterOutlet` subscription):
  - Sets `<title>`, `<meta name="description">`.
  - Sets OG (`og:title`, `og:description`, `og:image`, `og:url`, `og:locale`).
  - Sets Twitter card meta.
  - Sets canonical link.
  - Emits hreflang link tags for the counterpart language.
- Per-route SEO data declared in `Route.data.seo` and consumed by the service.
- JSON-LD:
  - Home: `Organization` schema with logo, social profiles, contact.
  - Project Details: `Article` schema with author, datePublished, image, description.
- Post-build script (`scripts/build-sitemap.ts`) walks the prerender manifest and writes `sitemap.xml` (with hreflang entries) and `robots.txt` to `dist/`.

### 4.9 Accessibility

- All interactive overlays/menus/dialogs use Angular CDK primitives.
- Color contrast verified at WCAG AA against both themes for every token pair used.
- `prefers-reduced-motion: reduce` collapses transform-based reveals to fade-only.
- Skip-to-content link at the top of `<body>`.
- Semantic landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`.
- Focus ring uses `--accent` color, never removed.
- Keyboard traversal verified for header, mega-menu, mobile-nav, project gallery lightbox.
- Lighthouse target: ≥ 95 across all four categories on every polished page.

---

## 5. Routing & pages

### 5.1 Route map

| Path | Component | Polish | Notes |
|---|---|---|---|
| `/` | redirect | — | → `/en` or `/ar` based on persisted/browser language. |
| `/en` `/ar` | `HomeComponent` | Full | See §5.2. |
| `/{lang}/about` | `AboutComponent` | Full | |
| `/{lang}/services` | `ServicesComponent` | Full | |
| `/{lang}/projects` | `ProjectsIndexComponent` | Full | URL-synced filters. |
| `/{lang}/projects/:slug` | `ProjectDetailsComponent` | Full | One prerendered HTML per project from fixtures. |
| `/{lang}/contact` | `ContactComponent` | Full | mailto-driven, no form. |
| `/{lang}/blog` | `BlogStubComponent` | Stub | |
| `/{lang}/careers` | `CareersStubComponent` | Stub | |
| `/{lang}/faq` | `FaqStubComponent` | Stub | |
| `/{lang}/privacy` | `PrivacyComponent` | Text | Real privacy text — short. |
| `/{lang}/terms` | `TermsComponent` | Text | Real terms text — short. |
| `**` | `NotFoundComponent` | Designed | |

### 5.2 Home page sections

(Trimmed from the PRD's 12 → 11 deliberately: Statistics folded into About; standalone Contact Section folded into footer.)

1. **Hero** — full-bleed dark canvas, large editorial display headline (Fraunces), 1-line lede, primary + ghost CTA, scroll cue. Background: dark gradient + subtle grain texture this cycle (swap to video later).
2. **About snippet** — 2-column: editorial paragraph + `Stat × 3` (years, projects, clients).
3. **Services** — 6-up grid of `ServiceCard` (icon, title, short lede, link).
4. **Featured Projects** — 2-column staggered grid, 4 items, "View all" link.
5. **Why Choose Us** — 4-up grid with numeric markers (01–04).
6. **Testimonials** — single quote at a time, dot navigation, gentle auto-advance (pauses on hover, respects reduced-motion).
7. **Partners** — infinite horizontal marquee, grayscale logos, color on hover.
8. **Team** — 3–4-up grid of `TeamCard`, hover lifts and reveals role.
9. **Blog Preview** — 3-up card row.
10. **CTA Banner** — full-bleed, single sentence, primary CTA.
11. **Footer** — multi-column (Sitemap · Services · Contact · Social) + newsletter email input (visual-only this cycle).

### 5.3 Other polished pages

- **About** — hero paragraph, mission/vision, founding-to-now timeline, team grid, partners strip, CTA.
- **Services** — hero, vertical list of services (each = title, description, deliverables, related projects link), anchor nav rail on side.
- **Projects index** — hero, filter bar (industry, year, status as chips), URL-synced filters (`?industry=...`), responsive grid. Single prerendered grid; filtering is client-side this cycle.
- **Project Details** — hero with cover + title + meta strip (client, industry, year, technologies as chips), description, full-width gallery (lightbox via CDK overlay), "Next project" link.
- **Contact** — hero, large mailto: CTA card with `mansour@msp.sa`, secondary channels (phone, address, social), embedded map (Google Maps static image — no JS, no API call).

### 5.4 Stubs

- All five share a `StubLayout` and a `StubPage` component fed by route data (title, message). Branded, not jarring. Single CTA: "Back to home".
- Privacy/Terms use the same layout but with real (short, placeholder-acceptable) text content so they're legally usable.

### 5.5 404

Full-page design: large display "404", short copy, CTA back to home. Same dark canvas treatment as the hero.

---

## 6. Design system

### 6.1 Color tokens (CSS variables)

| Token | Dark (default) | Light |
|---|---|---|
| `--bg` | `#0A0A0B` | `#FAFAF7` |
| `--bg-elev` | `#141416` | `#FFFFFF` |
| `--fg` | `#F5F5F2` | `#0F0F11` |
| `--fg-muted` | `#A1A1A6` | `#5C5C63` |
| `--accent` | `#C8A45C` | `#C8A45C` |
| `--accent-fg` | `#0A0A0B` | `#FFFFFF` |
| `--border` | `rgba(255,255,255,0.08)` | `rgba(15,15,17,0.08)` |
| `--ring` | `--accent` | `--accent` |

Final palette will be re-validated against the real MSP logo when provided.

### 6.2 Typography

- **Display (Latin):** Fraunces — modern serif, multiple optical sizes.
- **Body (Latin):** Inter.
- **Display + Body (Arabic):** IBM Plex Sans Arabic.
- All fonts self-hosted under `src/assets/fonts/` with `font-display: swap`. Hero face preloaded via `<link rel="preload">`.

Type scale (Tailwind extension):

| Token | px (mobile / desktop) |
|---|---|
| `text-hero` | 56 / 96 |
| `text-display` | 40 / 64 |
| `text-h1` | 32 / 48 |
| `text-h2` | 24 / 32 |
| `text-h3` | 20 / 24 |
| `text-body` | 16 / 16 |
| `text-small` | 14 / 14 |

### 6.3 Spacing & rhythm

- 8px base scale (Tailwind default).
- Section vertical padding: `py-24 md:py-32 lg:py-40`.
- Max content width: `max-w-7xl` (grids), `max-w-3xl` (prose).
- 12-column grid with frequent intentional column-spans for editorial feel.

### 6.4 Motion

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-expo) used everywhere.
- Durations: 200ms micro, 600ms reveal, 900ms hero entrance.
- Built with Angular Animations API + a `RevealDirective` using IntersectionObserver.
- All transform-based motion collapses to fade-only under `prefers-reduced-motion: reduce`.

### 6.5 Component library (`shared/ui/`)

Bespoke, Tailwind-styled, CDK-backed where overlays are needed:

`Button` (variants: primary, ghost, outline, icon) · `Link` (animated underline) · `Container` · `Section` · `SectionHeading` (eyebrow + title + lede) · `Card` · `ProjectCard` · `ServiceCard` · `TestimonialCard` · `TeamCard` · `PartnerLogo` · `Stat` · `Marquee` · `Reveal` (directive) · `Skeleton` · `Toast` · `ThemeToggle` · `LangToggle` · `Header` · `Footer` · `MegaMenu` (CDK overlay) · `MobileNav` (CDK dialog) · `Lightbox` (CDK overlay).

---

## 7. Folder structure

```
FrontEnd/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── interceptors/        mock-api.interceptor.ts
│   │   │   ├── services/            language.service.ts, theme.service.ts, seo.service.ts
│   │   │   ├── models/              project.model.ts, service.model.ts, ...
│   │   │   ├── constants/           routes.ts, breakpoints.ts
│   │   │   └── utils/               slugify.ts, format-date.ts
│   │   │
│   │   ├── shared/
│   │   │   ├── ui/                  (component library — see §6.5)
│   │   │   ├── directives/          reveal.directive.ts, lazy-bg.directive.ts
│   │   │   └── pipes/               translate-fallback.pipe.ts
│   │   │
│   │   ├── layouts/
│   │   │   ├── main-layout/         header, footer, mobile-nav
│   │   │   └── stub-layout/
│   │   │
│   │   ├── pages/
│   │   │   ├── home/                + section components in subfolders
│   │   │   ├── about/
│   │   │   ├── services/
│   │   │   ├── projects/
│   │   │   ├── project-details/
│   │   │   ├── contact/
│   │   │   ├── blog/                stub
│   │   │   ├── careers/             stub
│   │   │   ├── faq/                 stub
│   │   │   ├── privacy/
│   │   │   ├── terms/
│   │   │   └── not-found/
│   │   │
│   │   ├── store/
│   │   │   ├── projects/            actions, reducer, effects, selectors
│   │   │   ├── services/
│   │   │   ├── team/
│   │   │   ├── testimonials/
│   │   │   ├── partners/
│   │   │   ├── blog/
│   │   │   ├── settings/
│   │   │   └── index.ts             root provider
│   │   │
│   │   ├── app.routes.ts
│   │   ├── app.config.ts
│   │   └── app.component.ts
│   │
│   ├── assets/
│   │   ├── i18n/                    en.json, ar.json
│   │   ├── fonts/                   self-hosted Fraunces, Inter, IBM Plex Sans Arabic
│   │   ├── images/                  hero, projects (placeholder), team, partners
│   │   └── icons/                   svg sprite
│   │
│   ├── mocks/                       fixture JSON consumed by the interceptor
│   │   ├── projects.json
│   │   ├── services.json
│   │   ├── team.json
│   │   ├── testimonials.json
│   │   ├── partners.json
│   │   ├── blog.json
│   │   └── settings.json
│   │
│   ├── environments/                environment.ts, environment.prod.ts
│   ├── styles/                      global.scss, tokens.css
│   ├── index.html
│   └── main.ts
│
├── scripts/                         build-sitemap.ts
├── tailwind.config.ts
├── angular.json
├── package.json
├── tsconfig*.json
├── jest.config.ts
├── playwright.config.ts
└── .eslintrc.json
```

---

## 8. Testing

Proportional to a marketing site — not exhaustive.

- **Unit (Jest):**
  - Every NgRx reducer.
  - Every utility (`slugify`, `format-date`, etc.).
  - Every directive (`RevealDirective`, `LazyBgDirective`).
  - `LanguageService`, `ThemeService`, `SeoService`, `MockApiInterceptor`.
  - Components only where non-trivial logic exists (e.g., `TestimonialsCarousel` auto-advance, `ProjectsIndex` filter sync).
  - No snapshot tests.
- **E2E (Playwright):** one smoke spec per polished page (6 specs) covering: page renders, hero visible, primary CTA navigates, theme toggle works, language toggle works.
- **A11y:** `@axe-core/playwright` runs on every polished page in CI; zero serious/critical violations required.
- **Visual regression:** out of scope this cycle.

**Pre-merge checks (npm scripts):** `lint` · `typecheck` · `test` · `build` · `e2e`.

---

## 9. Deliverables

1. Angular 17+ workspace at `FrontEnd/` with all decisions wired.
2. 6 polished pages + 3 stubs + 2 short text pages + designed 404.
3. Dark/light theme, EN/AR languages, full RTL.
4. NgRx store with 7 feature slices fed by the mock interceptor.
5. Component library under `shared/ui/`.
6. SEO service + JSON-LD on Home & Project Details.
7. `sitemap.xml`, `robots.txt`, hreflang tags emitted at build.
8. README with `npm install`, `npm start`, `npm run build`, `npm run test`, `npm run e2e`, `npm run prerender`.
9. Husky pre-commit running `lint` + `format`.

---

## 10. Defaults (will use unless objected to during implementation)

- Hero background: dark gradient + subtle grain texture. Static, no video.
- Project placeholders: 9 fake projects with royalty-free architecture/design imagery.
- Team placeholders: 6 fake members with neutral portrait silhouettes.
- Partner logos: 12 grayscale placeholder brand marks.
- MSP Design wordmark: placeholder serif lockup until real logo provided.
- Privacy/Terms: short generic Saudi-applicable text, marked as placeholder in a comment.

---

## 11. Out of scope (explicit)

- Backend API, database, auth, RBAC, admin dashboard.
- Real CMS, file uploads.
- Newsletter submission, contact form submission.
- Docker, Nginx, CI/CD pipelines, hosting setup.
- Real blog posts, real careers postings, real project case studies, real testimonials.
- Visual regression testing.
- AI chatbot, client portal, mobile app integration (PRD future enhancements).

---

## 12. Open questions for the user

None blocking. Defaults in §10 will be used unless flagged during implementation.

---

## 13. Migration path (post-cycle 1)

When the backend cycle begins:
1. Remove `MockApiInterceptor` from `app.config.ts` providers.
2. Set `environment.apiBaseUrl` to the real API origin.
3. NgRx effects, API services, and components remain unchanged.
4. For dynamic content updates without rebuild, swap `prerender: true` to runtime SSR in `angular.json` — code is unchanged.
