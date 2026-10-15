# MSP Website — Baseline Audit

Date: 2026-10-15 · Scope: public website (www.msp.sa), frontend `FrontEnd/`, public content API `BackEnd/` · Status: discovery complete, no files changed at the time of writing.

Evidence comes from three places: the repository working tree (including uncommitted work from the October design round), a local production build of that tree, and the live site and API as fetched on 2026-10-15.

---

## 1. Current architecture

| Layer | Implementation | Notes |
|---|---|---|
| Frontend | Angular 21.2, standalone components, Tailwind 4, SCSS tokens | `FrontEnd/` |
| Rendering | `outputMode: "static"`; every parameterless route prerendered at build | `angular.json`, `src/app/app.routes.server.ts` |
| Client-only routes | `projects/:slug`, `blog/:slug` (+ `/ar`), vendors, admin, auth | `RenderMode.Client` → served as `index.csr.html` |
| Hosting | nginx 1.27 container on Railway, Cloudflare in front | `FrontEnd/Dockerfile`, `FrontEnd/nginx.conf.template` |
| Backend | NestJS + TypeORM + PostgreSQL, global prefix `/api` | `BackEnd/` |
| CMS | Built-in admin (`/admin`) writing to the same DB | Projects, services, team, blog, testimonials, partners, settings |
| Language | URL-based: `/` English, `/ar/...` Arabic; `lang`/`dir` set on `<html>` server-side | `core/services/translation.service.ts` |
| Copy | Inline `{ en, ar }` objects in each component; no translation files | |

**Uncommitted design-round work.** The working tree carries steps 1–3 of the October design round (harden, adapt, optimize) that are not yet deployed: `/ar` routes, canonical + hreflang in `SeoService`, responsive WebP variants (`/api/uploads/_w/`), soft-404 handling in nginx, `robots.txt`, a static `sitemap.xml`, an OG image. The live site therefore lags the repository. This audit treats the working tree as the baseline for code and the live site as the baseline for observed behaviour.

## 2. Existing functionality (public)

Routes (each mounted twice, English at `/` and Arabic at `/ar`): home, about, services, projects, projects/:slug, blog (labelled "Insights"), blog/:slug, team, careers, faq, contact, privacy, terms, 404. Redirect: `projects/sbc-commercial-office` → `projects/al-ateeq-real-estate-commercial-office` (target slug does not exist in the live CMS — see risks).

Home sections in order: hero (with the vertical Project Showcase), about, services, featured projects, stats, why-us, testimonials, team, partners, blog preview, CTA, contact.

## 3. Content inventory

### 3.1 CMS content (live API, 2026-10-15)

| Type | Count | Quality |
|---|---|---|
| Projects | 11 published | All have bilingual title, summary, location, cover and gallery (2–28 images). Only 2 have long descriptions (Madinah Hotel, Al Munsiyah). Year missing on 6. Client named on 1 (Diyari Real Estate, in specs). Disciplines empty on 4. Slug `SBC` is uppercase. |
| Services | 5 | Architecture, Structural Engineering, MEP Engineering, Urban Planning, Project Management. One-line descriptions only. Interior design and supervision appear in project data but not as services. |
| Blog / Insights | 2 published | "Madinah Hotel: Hospitality Design Rooted in Place" is real. **"Designing for the Desert" is seed placeholder** (body: "Long-form article body.", cover `images/proj-1.jpg`). |
| Team | 31 active of 32 (29 active members have no English bio) | CEO bio is one line; two founders without bios; one Arabic bio uses a feminine verb ("تقود") that should be checked against the person. |
| Testimonials, partners | 0 / not checked | Seed file contains fabricated NEOM/Qiddiya testimonials and partners — confirm these were never loaded in production. |
| Settings | 1 record | Phones, email, Cairo office set. Riyadh address is only "Riyadh, Saudi Arabia" (Irqah is in the code fallback). **Social links are generic placeholders** (`x.com/msp`, `linkedin.com/company/msp`, `instagram.com/msp`). |

### 3.2 Hardcoded copy with unverified claims

| Claim | Where | Ruling (management, 2026-10-15) |
|---|---|---|
| "Est. 2010", "Established 2010", years since 2010 | hero, footer, stats, about | Keep, subject to official records |
| "500+ projects delivered" | home stats, about page | Unverified — do not present as confirmed |
| "16+ years in practice" | about page | Keep (derived from 2010) |
| Timeline: "three-person studio on King Fahd Road", "Engineering in-house", "First civic landmark", "Vision 2030 projects" | about page | Remove |
| "civic landmarks, towers, and masterplans across the Kingdom" | about page | Remove (no such projects in the portfolio) |
| "major Vision 2030 developments" | FAQ | Remove |
| "ISO and sustainability standards, including LEED where required" | FAQ | Remove LEED; ISO also unverified |
| "We reply within one business day" | FAQ | Operational promise — needs confirmation |
| "Every project is led by a principal" | FAQ, about | Unverified |
| "Commissions open for 2026" | CTA | Time-bound marketing line |
| Three blog teasers ("Designing for 50°C…", "When structure becomes the architecture", "Masterplanning for the city after oil") | home blog-preview fallback | **Fabricated articles, rendered in the prerendered homepage** |
| Four open roles (Senior Architect, Structural Engineer, MEP Engineer, Intern) | careers | Unverified vacancies |
| Brand names "MSP Consultants", "MSP Designs", "MSP — Architecture + Engineering" | throughout | Use "MSP" (ruling); legal name pending |

### 3.3 Philosophy gap

None of the approved philosophy (architecture as human experience, two dimensions of success, collective intelligence, technology-enabled/expertise-led, professional independence, legacy, knowledge ambition), vision, mission, positioning or CEO message is on the site. The current voice is generic studio copy ("for what endures", "design discipline meets engineering certainty") that leans on structure and rigour, not on human experience.

## 4. SEO inventory

| Area | Baseline | Severity |
|---|---|---|
| Canonical host | `msp.sa` and `www.msp.sa` both return 200 with identical HTML; code emits `https://msp.sa` | High |
| Trailing slash | Live nginx 301s `/about` → `/about/`; canonicals, hreflang and sitemap use `/about` | High (every canonical points at a redirect) |
| robots.txt / sitemap.xml (live) | Both return the HTML app shell (files not deployed) | High |
| robots.txt (repo) | OK, but `/ar/vendors` not disallowed; sitemap URL on non-canonical host | Medium |
| sitemap.xml (repo) | Static, 20 URLs with hreflang; no projects, no articles, no lastmod | High |
| Soft 404 | Live: any unknown URL returns 200. Repo: fixed for static paths; unknown project/blog slugs still 200 | Medium |
| Titles | Generic: home = "MSP — Architecture + Engineering"; others "Works", "Practice", "Disciplines", "Studio" — no service or location terms | High |
| Descriptions | Present on most pages, reference "MSP Consultants"; legal pages and 404 have none | Medium |
| Canonical + hreflang | Present (repo) on prerendered pages: en, ar, x-default; absent from client-rendered detail pages' initial HTML | Medium |
| Structured data | None (no JSON-LD anywhere) | High |
| H1 | One per page. Home H1 is "Architecture & engineering for what endures." (no reference to consultancy or place) | Medium |
| Crawlable content | Prerendered pages hold layout and hardcoded copy only; **all CMS content (services list, projects grid, team, articles) is fetched in the browser**. `/projects/` prerenders with **0 links to projects**; home links to 4 featured projects only (via the showcase) | Critical |
| Project & article pages | Client-rendered: initial HTML is the generic shell with no title, description, H1 or content | Critical |
| Images | Alt text = project title for every image in a gallery (duplicates); logo alt "MSP Designs"; responsive WebP variants added in repo but not deployed | Medium |
| Vendor pages | Indexable (no noindex), English-only metadata | Low |
| Internal linking | Footer and nav fine; services do not link to projects; projects do not link to services | Medium |
| Redirect `projects/sbc-commercial-office` | Target `al-ateeq-real-estate-commercial-office` does not exist in the CMS → 404 chain | Medium |

## 5. Technical risks

1. **CMS data at build time.** Making project and article pages crawlable requires the build to read the API (the showcase already does this via `PRERENDER_API_ORIGIN`). If the API is unreachable during the build, pages must degrade to today's behaviour, not fail.
2. **Content published after a build** will not be prerendered until the next frontend deploy. nginx must keep serving the client shell for unknown slugs so new projects still work.
3. **Production database.** All CMS improvements (service descriptions, project case-study text, removing the placeholder article, social links) must go through the admin by an authorised person. This work will not write to the database.
4. **Host redirect** (`msp.sa` → `www.msp.sa`) changes production behaviour; it must be tested so Railway's internal health checks and the API proxy are unaffected.
5. **Uncommitted design-round work** is intertwined with this round in the same files; commits must be reviewed together.
6. **Google Drive working copy.** Builds run on a copy in a scratch directory; the working tree shows ~240 CRLF-only changes that must not be committed.
7. **Showcase.** The hero Project Showcase is protected; copy changes around it must not alter its composition or behaviour.

## 6. Existing test coverage

Vitest via `@angular/build:unit-test`, 23 spec files, 61 tests. Baseline result: **61/61 pass** when run with `NODE_OPTIONS=--no-experimental-webstorage` (Node 25's experimental `localStorage` shadows jsdom's and breaks 6 tests in `auth.guard.spec.ts` and `theme.service.spec.ts`; the production build image uses Node 22 and is unaffected). Build: `ng build` succeeds, 24 static routes prerendered, ~18 s. No e2e tests; no SEO assertions beyond `seo.service.spec.ts`.

Backend has its own Jest specs; out of scope except where touched.

## 7. Required modifications

**Technical SEO**
- Canonical origin → `https://www.msp.sa`; nginx 301 `msp.sa` → `www.msp.sa`.
- One URL form without trailing slash: serve `/about` directly, 301 `/about/` → `/about`.
- Server-side data fetching for CMS content during prerender (projects grid, services, team, articles), with transfer to the browser.
- Prerender every published project and article in both languages (`getPrerenderParams`); keep the client shell as fallback for slugs created after the build.
- Sitemap generated at build time from prerendered routes, with hreflang and lastmod where known; robots.txt on the canonical host; disallow `/ar/vendors`.
- JSON-LD: Organization (+ name "MSP", no unverified properties), WebSite, page-level WebPage/AboutPage/CollectionPage/ContactPage, BreadcrumbList, Service, CreativeWork for projects, Article for insights.
- Descriptive, unique titles and descriptions per page and language.
- noindex for vendor portal pages.
- Per-image alt text derived from the project title plus the descriptor already present in each uploaded filename.
- Fix or remove the broken `sbc-commercial-office` redirect.

**Content**
- Homepage hero, about, services, approach, stats, CTA rewritten around the approved philosophy; fabricated blog fallbacks removed.
- About page rebuilt: who we are, philosophy, vision, mission, values, collective expertise, technology, leadership with CEO message, institutional ambition; timeline removed.
- Services page: consultancy framing, per-discipline scope and methodology, links to related projects; proposed service subpages recorded for approval.
- Project detail: structured case-study layout that only shows sections with verified data.
- FAQ and footer corrected; brand name unified to "MSP".

## 8. Files expected to change

Frontend (`FrontEnd/`):
- `src/app/core/services/seo.service.ts` (+ spec), new `src/app/core/seo/structured-data.ts` (+ spec)
- `src/app/core/services/public-content.service.ts`, `src/app/core/services/api.service.ts`
- `src/app/app.routes.server.ts`, `src/app/app.routes.ts`
- `src/app/pages/home/home.ts` and `sections/{hero,about,services,stats,why-us,cta,blog-preview}/*.ts`
- `src/app/pages/about/about-page.ts`, `services/services-page.ts`, `projects/projects.ts`, `projects/project-detail.ts`, `blog/blog-page.ts`, `blog/blog-detail.ts`, `team/team-page.ts`, `faq/faq-page.ts`, `contact/contact-page.ts`, `careers/careers-page.ts`, `legal/legal-page.ts`, `vendors/*` (noindex only)
- `src/app/layouts/main-layout/components/{header,footer}/*.ts`
- `public/robots.txt`, `public/sitemap.xml` (replaced by a build step), new `scripts/build-sitemap.mjs`, `package.json` (build script)
- `nginx.conf.template`

Backend: none planned. Database: none (CMS changes are listed as admin actions for approval).

Docs: this file, `docs/seo/MSP-KEYWORD-MAP.md`, `docs/content/MSP-INSIGHTS-EDITORIAL-ROADMAP.md`, `docs/audits/MSP-WEBSITE-FINAL-REPORT.md`.
