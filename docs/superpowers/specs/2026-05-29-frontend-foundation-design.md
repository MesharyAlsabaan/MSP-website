# Frontend Foundation — Design Spec

**Date:** 2026-05-29
**Project:** MSP Design website (`14_MSP_Website`)
**Sub-project:** A — Frontend Foundation
**Status:** Approved (design), implementation pending

## Context

The repo contains a full enterprise PRD (`prd.md`) describing a program of several
independent subsystems: (A) frontend foundation, (B) public website, (C) admin CMS,
(D) NestJS backend API, (E) DevOps. These are brainstormed and built one at a time,
each with its own spec → plan → build cycle.

`FrontEnd/` currently holds only a fresh Angular 21 SSR scaffold (empty routes, default
root component, no Tailwind, no shared structure). `BackEnd/` is empty.

This spec covers **sub-project A only**: turning the bare scaffold into a scalable,
production-ready foundation that every page and the admin CMS will build on, without
yet building the pages themselves.

> Note: `prd.md` ends with "do not add or commit". No `git add`/`commit` is performed
> for any artifact (including this spec) unless the user explicitly asks.

## Goal / Definition of Done

The app runs end to end on the new architecture:
- `npm run build` succeeds (browser + SSR), `npm start` serves with no TypeScript errors (strict).
- Dark/light theme toggle works and persists.
- Routing renders a real `main-layout` (header + footer) wrapping a placeholder Home.
- A small shared UI kit and the core services/guards/interceptors exist and are wired.

## Key Decision: UI Library

**Chosen: Tailwind CSS + Angular CDK (headless primitives) + custom components.**

Rationale: the PRD requires a premium, Awwwards-inspired *custom* look. Material/PrimeNG
ship opinionated styling that fights custom design. Angular CDK provides the hard parts
(a11y, focus trap, overlays/dialogs, drag-drop for the admin) with zero visual opinion,
keeping the look 100% ours and the bundle lighter. PrimeNG may be reconsidered *only* for
the admin CMS data tables later if it saves meaningful time.

## Architecture

- **Folder structure** per PRD: `core/`, `shared/`, `layouts/`, `pages/`, `features/`,
  `admin/`, plus `styles/` and `environments/`.
- **Standalone components + lazy routes** — every page/feature lazy-loaded via
  `loadComponent` / `loadChildren`; route-level code splitting.
- **State = Angular Signals** in services; RxJS only at async boundaries (HTTP).
  No NgRx (YAGNI for this size).
- **SSR stays enabled** (already scaffolded) for SEO.
- **Strict TypeScript** throughout.

## Building Blocks Created in This Phase

### core/
- `services/theme.service.ts` — signal-based dark/light, persisted to `localStorage`,
  toggles a class on `<html>`; SSR-safe (guards `localStorage`/`document` access).
- `services/seo.service.ts` — wrapper over Angular `Title` / `Meta` (title, description,
  Open Graph tags).
- `services/api.service.ts` — typed HTTP base reading `environment.apiUrl`.
- `interceptors/` — `auth.interceptor` (attach token), `error.interceptor` (central error
  handling), `loading.interceptor` (global loading signal).
- `guards/` — `authGuard`, `roleGuard` (functional guards; stubs ready for backend).
- `models/`, `constants/`, `enums/` — shared types (e.g. `Role` enum), API base path.

### layouts/
- `main-layout/` — header (nav + theme toggle) + footer + `<router-outlet>`.
- `auth-layout/`, `admin-layout/` — thin shells for later sub-projects.

### shared/ui/
Starter kit only (more added as pages need them — YAGNI): `Button`, `Container`,
`Section`, `ThemeToggle`.

### styles/
- Tailwind v4 wired into `styles.scss`.
- Design tokens (color palette, typography scale, spacing, radius) as **CSS custom
  properties** so dark/light is a token swap, not duplicated styles.
- `styles/themes/` and `styles/variables/` as single sources of truth.

### environments/
- `environment.ts` / `environment.prod.ts` with `apiUrl`.

## Routing in This Phase

- `/` → `main-layout` → placeholder Home ("coming soon" section) so the app runs.
- `**` → `not-found`.
- Remaining public pages registered as lazy routes pointing to stub components
  (filled in sub-project B).

## Out of Scope (other sub-projects)

Real page designs (B), admin modules (C), backend wiring (D), Docker/DevOps (E).

## Testing Strategy

- Unit-test the genuinely logic-bearing units with Vitest (already in devDeps):
  `ThemeService` (toggle, persistence, SSR-safety), `SeoService` (tag setting),
  guards (allow/deny). Pure scaffolding/config is verified via successful build + serve.
