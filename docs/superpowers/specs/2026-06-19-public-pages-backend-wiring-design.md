# Wiring public pages to the backend + admin-managed images

**Date:** 2026-06-19
**Status:** Approved, in implementation
**Scope:** Frontend (`FrontEnd/`) + light admin-form work. Backend already exposes everything needed.

## Problem

The public website renders from static TypeScript data (`core/data/projects.ts` plus
inline `{en,ar}` content in components). The admin CMS reads/writes the NestJS API
(Postgres). They are two disconnected data sources: editing a project in the admin does
not change what visitors see. Images on the public site are static files under
`FrontEnd/public/images/`; there is no way for an admin to upload an image and have it
appear publicly.

## Goal

1. Public pages read their content from the backend API (the DB-backed entities:
   projects, services, team, testimonials, partners, blog, settings).
2. Admins upload images in the CMS and those images display on the public site.

Out of scope: content with no DB table (home hero copy, about-page narrative, section
eyebrows) stays as inline static content.

## Architecture

### Public content layer
- **`PublicContentService`** (`core/services/public-content.service.ts`) — wraps the
  existing `ApiService`, GETs the public endpoints, and unwraps the `{data}` /
  `{data,total,page,pageSize}` envelopes. Returns the **same view-model shapes** the
  public components already use (`Project`, `L`, etc.), so templates change minimally.
  Methods: `projects()`, `featuredProjects()`, `project(slug)`, `services()`, `team()`,
  `testimonials()`, `partners()`, `posts()`, `post(slug)`, `settings(key)`.

### Image URL resolution
- **`assetUrl(value)`** (`core/utils/asset-url.ts`) + an `| asset` pipe
  (`shared/pipes/asset.pipe.ts`). Resolves any stored image string:
  - `http(s)://…` → unchanged.
  - `/api/uploads/…` (admin uploads) → unchanged in prod (same-origin via nginx); in dev,
    prefixed with the backend origin derived from `environment.apiUrl`
    (`http://localhost:3000` — i.e. apiUrl with the trailing `/api` stripped).
  - `/images/…` or a bare filename → frontend static asset (back-compat with the existing
    placeholder paths like `/images/proj-1.jpg`).
  - empty/null → `''` (templates guard with `@if`).

### Rendering / SSR
Output mode is `static`. To avoid the prerender-worker crash (documented gotcha: HTTP
calls in `ngOnInit` crash the prerender worker):
- **Index/list/section pages** stay `RenderMode.Prerender` and emit a static **skeleton**;
  the data fetch is **browser-only** (`afterNextRender` / `isPlatformBrowser` guard), then
  hydration fills content. Content updates with no rebuild.
- **Project detail (`/projects/:slug`)** can't prerender unknown slugs → `RenderMode.Client`.

Every wired page has explicit **loading (skeleton) / loaded / empty** states via signals.

### Admin images + rich fields
- **`ImageUploadField`** (`shared/ui/image-upload/`) — reusable control: file picker →
  `POST /api/uploads` (multipart) → stores the returned `url` on the record; shows a
  thumbnail preview (via `assetUrl`) + a clear button; surfaces upload errors. Replaces the
  plain image text inputs in projects / team / testimonials / partners / blog / services.
- **Projects admin** is extended with a **gallery** (multi-image upload) and the detail-page
  fields — `description[]`, `specs[] ({label,value})`, `services[]` — so detail pages have
  full content once they read from the DB. These are repeating bilingual rows with
  add/remove controls.

## Data flow

admin picks image → `POST /api/uploads` → `{ url: "/api/uploads/<file>" }` → url saved on
the record via CRUD (`PUT/POST`) → public page GETs the record → `assetUrl()` renders the
image (dev: backend origin prefix; prod: same-origin).

## Affected files (indicative)

New: `core/services/public-content.service.ts`, `core/utils/asset-url.ts`,
`shared/pipes/asset.pipe.ts`, `shared/ui/image-upload/image-upload.ts`.

Public (static → service): `pages/home/sections/featured-projects`,
`pages/projects/projects.ts`, `pages/projects/project-detail.ts`,
`pages/services/services-page.ts`, `pages/about/about-page.ts` (leadership/team),
`pages/blog/blog-page.ts`, testimonials/partners home sections, footer, contact-page
(settings). `app.routes.server.ts` (detail → Client).

Admin: `pages/admin/projects` (image fields + gallery/description/specs/services),
`pages/admin/{services,team,testimonials,partners,blog}` (image fields).

`core/data/projects.ts` stays as the seed reference but is no longer imported by public pages.

## Testing / verification

- `ng build` → 0 errors.
- Run the full stack; in the admin, upload an image and edit a project; confirm it renders
  on `/projects` and the detail page. Verify a section's empty/loading state when the API
  returns nothing.
- Respect the no-commit rule — do not commit.
