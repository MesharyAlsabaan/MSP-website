# MSP Stage One Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish stage-one navigation, team, real-project rendering, SEO tests, and approved content corrections without disturbing existing work.

**Architecture:** Keep the current standalone Angular component architecture and `PublicContentService` data flow. New UI behavior stays in the header, hero, and a focused team page; public project sections use explicit loading/loaded/error states rather than static sample data.

**Tech Stack:** Angular 21 standalone components, signals, Angular Router, Vitest/jsdom, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-08-26-msp-stage-one-design.md`

## Global Constraints

- Preserve every existing dirty Git change.
- Do not modify approved copy or contact data except the listed corrections.
- Do not add sample content.
- Do not commit or push.
- Follow red-green-refactor for each behavior.

---

### Task 1: Mobile navigation

**Files:**
- Modify: `src/app/layouts/main-layout/components/header/header.ts`
- Create: `src/app/layouts/main-layout/components/header/header.spec.ts`

**Interfaces:**
- Consumes: `TranslationService`, Angular `RouterLink`, document keyboard and pointer events.
- Produces: a mobile menu button with `aria-expanded`, a labeled dialog/menu surface, and close behavior for link selection, Escape, and outside click.

- [ ] Write a failing component test that opens the mobile menu and asserts the six real links are available.
- [ ] Run the header test and confirm it fails because no menu button exists.
- [ ] Add the smallest accessible signal-driven menu implementation using the existing header visual language.
- [ ] Add failing tests for Escape, outside-click, and link-selection closure, then implement each behavior.
- [ ] Run the focused header test to green.

### Task 2: Hero CTA router navigation

**Files:**
- Modify: `src/app/pages/home/sections/hero/hero.ts`
- Create: `src/app/pages/home/sections/hero/hero.spec.ts`

**Interfaces:**
- Consumes: Angular `RouterLink`.
- Produces: real links to `/contact` and `/projects` without full-page reloads.

- [ ] Write a failing component test that locates CTA anchors by their translated labels and asserts `href` values `/contact` and `/projects`.
- [ ] Run the focused test and confirm failure because the current `app-button` instances are plain buttons.
- [ ] Wrap or replace the CTA presentation with router links while preserving button styling.
- [ ] Run the focused test to green.

### Task 3: Public team page and route

**Files:**
- Create: `src/app/pages/team/team-page.ts`
- Create: `src/app/pages/team/team-page.spec.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `PublicContentService.team(): Observable<TeamMember[]>`, `TranslationService`, `AssetPipe`, `SeoService`.
- Produces: lazy `/team` route with loading, loaded, empty, and error-safe states.

- [ ] Write a failing route test that asserts `/team` resolves to `TeamPage` rather than the wildcard.
- [ ] Write a failing component test with two full API team fixtures and assert names, localized titles, and images render.
- [ ] Create the page using existing container, heading, typography, and grid patterns.
- [ ] Register the lazy route before the wildcard.
- [ ] Run route and team page tests to green.

### Task 4: Real projects only on home

**Files:**
- Modify: `src/app/pages/home/sections/hero/project-showcase.ts`
- Create: `src/app/pages/home/sections/hero/project-showcase.spec.ts`
- Modify: `src/app/pages/home/sections/featured-projects/featured-projects.ts`
- Create: `src/app/pages/home/sections/featured-projects/featured-projects.spec.ts`

**Interfaces:**
- Consumes: `PublicContentService.projects()`.
- Produces: first four featured API projects, or first four API projects when none are featured; explicit loading and empty states; no `PROJECTS` fallback.

- [ ] Write failing tests proving four API projects render in order and bundled sample names never render.
- [ ] Write a failing test proving a successful empty response stays empty and displays the bilingual empty message.
- [ ] Remove the `PROJECTS` import and fallback branch from `ProjectShowcase`; introduce explicit request state.
- [ ] Add loading/empty markup to both home project sections without fake cards.
- [ ] Run both focused suites to green.

### Task 5: Year, footer links, and SEO correctness

**Files:**
- Modify: `src/app/pages/projects/projects.ts`
- Modify: `src/app/pages/projects/project-detail.ts`
- Modify: `src/app/pages/home/sections/featured-projects/featured-projects.ts`
- Modify: `src/app/layouts/main-layout/components/footer/footer.ts`
- Modify: `src/app/layouts/main-layout/components/footer/footer.spec.ts`
- Modify: `src/app/core/services/seo.service.spec.ts`

**Interfaces:**
- Produces: missing years omitted; phone/WhatsApp/email are actionable links; SEO tests match production brand.

- [ ] Update SEO expectations first and run them to observe the stale-test failure against the correct production service.
- [ ] Add failing footer tests for `tel:`, `mailto:`, and WhatsApp URLs, then implement the links.
- [ ] Add failing component assertions that empty project years create no year element, then guard year markup.
- [ ] Run affected tests to green.

### Task 6: Approved data corrections

**Files/Data:**
- Modify through authenticated admin API/UI only; do not introduce frontend hardcoded records.

**Interfaces:**
- Produces: corrected projects 06/08/09/10/11 and a deduplicated team dataset.

- [ ] Inspect current admin/API records and identify stable IDs before mutation.
- [ ] Update only the approved fields and preserve all other values.
- [ ] Delete only the empty duplicate Abdullah Alhibshi record.
- [ ] Verify the public API returns 10 projects, unique slugs, corrected public titles, blank unverified years, standardized architect titles, and one Abdullah Alhibshi.

### Task 7: Full verification

**Files:** none unless verification reveals a regression.

- [ ] Run `npm test -- --watch=false` and record the test count and failures.
- [ ] Run `npm run build` and record the result.
- [ ] Inspect `/`, `/projects`, all ten project detail routes, `/team`, `/contact`, `/admin/projects`, and `/admin/team`.
- [ ] Verify Arabic/English, 360px/390px mobile navigation, console errors, 404s, and broken images.
- [ ] Inspect `git diff` and confirm unrelated existing changes remain intact and no commit/push occurred.

