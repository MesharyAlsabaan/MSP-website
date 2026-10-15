# MSP Website — Release-Readiness Report

Date: 2026-10-15 · Branch: `seo-content-transformation` (local; **nothing committed, pushed or deployed**) · Base commit: `14e997f` · Previous report: [MSP-WEBSITE-FINAL-REPORT.md](MSP-WEBSITE-FINAL-REPORT.md)

> **Update — management decisions, 2026-10-15.**
> - **Security release:** the security fix is prepared as a separate, minimal release on `security/public-content-access` (`a897264`), built on `origin/main`. See [MSP-SECURITY-RELEASE-PLAN.md](MSP-SECURITY-RELEASE-PLAN.md).
> - **P0-3 (clean commit):** closed locally. `seo-content-transformation` now has three commits (security, design round, content); line-ending-only changes and ignored files are excluded. Nothing has been pushed.
> - **Content approval:** the exact text is in [MSP-FINAL-CONTENT-FOR-APPROVAL.md](../content/MSP-FINAL-CONTENT-FOR-APPROVAL.md).
> - **Remaining checklist:** in Arabic, in [MSP-PRE-DEPLOYMENT-CHECKLIST-AR.md](MSP-PRE-DEPLOYMENT-CHECKLIST-AR.md).
> - **Vision and Mission:** two small unrequested edits were reverted, so they match the approved wording exactly ("recognized"; the comma before "and continuous innovation").

## Verdict

**Not yet ready for production.** The code is complete and tested. Three release gates (P0) need management action before deployment: an admin unpublish, content sign-off, and a clean commit of the branch. None of them needs more engineering. Once all three are closed and the deployment order in §8 is followed, the release is ready.

## 1. Work completed in this round

| # | Item | Result |
|---|---|---|
| 1 | **Public API security** (release-blocking) | Fixed. See §2. |
| 2 | **Homepage performance (A1)** | Done. The hero H1 and intro paint on the first frame; the motion is kept as a position-only settle. English homepage LCP 2.90 s → 2.10 s (§5). The Project Showcase is untouched. |
| 3 | **Placeholder content** | All published or hidden placeholders identified. Exact admin steps are in [MSP-PLACEHOLDER-CONTENT-ADMIN-ACTIONS.md](../content/MSP-PLACEHOLDER-CONTENT-ADMIN-ACTIONS.md). Job vacancies are hidden in code. No CMS record was changed. |
| 4 | **Service pages** | Architecture built for Architectural Design, Interior Design and Construction Supervision. All three are unpublished, behind an approval flag. See [MSP-SERVICE-PAGES.md](../content/MSP-SERVICE-PAGES.md). |
| 5 | **Project content** | All 11 projects audited. The information request is in [MSP-PROJECT-INFORMATION-REQUEST.md](../content/MSP-PROJECT-INFORMATION-REQUEST.md). |
| 6 | **Arabic editorial review** | 59 substantive corrections and a canonical glossary, all applied. See [MSP-ARABIC-EDITORIAL-REVIEW.md](../content/MSP-ARABIC-EDITORIAL-REVIEW.md). |
| 7 | **Repository safety** | Inventory in §6. No destructive Git command was run. |
| 8 | **Release validation** | All checks in §4. |
| — | Found during validation: **tablet header overflow** (pre-existing) | Fixed. At 768–840 px, the English header pushed the language and theme buttons off-screen. |

## 2. Public API security

**The problem, confirmed on production (read-only GET requests, 2026-10-15).** The public endpoints honoured `includeDrafts=true` / `includeInactive=true` from anyone, and lookups by slug or id ignored the published status.

The exposure was concrete. Anyone could fetch:

- two **fabricated seed testimonials** (NEOM, Qiddiya);
- four **seed "partners"** (NEOM, Qiddiya, Diriyah Gate, Red Sea Global);
- one inactive team member.

No draft projects or articles existed at the time.

**The fix (backend, 15 files):**

- **Public routes recognise a valid staff token.** The global `JwtAuthGuard` now sets the user on `@Public()` routes when a valid token is sent. Visitors without a token are unaffected.
- **Only content staff see unpublished items.** A new rule, `canPreviewContent()`, allows only Super Admin, Content Manager and Editor to see drafts or inactive items.
- **The rule covers six modules:** projects, blog, services, testimonials, team and partners. List endpoints ignore the preview flags for anyone else, and lookups by slug or id return 404 for unpublished items.
- **Admin edits keep working on drafts.** The internal update path still loads them.
- **Expired sessions refresh instead of failing silently.** If a request sends a token **and** asks for drafts, but the token is expired or invalid, it gets a 401. The admin then refreshes its session and retries, rather than quietly showing published items only. Visitors and stale-token browsing of the public site are unaffected.
- **The vendor service is not affected.** It uses its own `VendorServiceAuthGuard`.

**Tests** (`BackEnd/src/modules/public-content-access.spec.ts`, 35 tests) run over HTTP with the real global guards, the real JWT strategy and signed tokens:

- **Visibility:** published content is visible to everyone.
- **Drafts:** drafts are excluded for anonymous visitors, for invalid and expired tokens, and for the Vendor Reviewer role.
- **Direct access:** slug and id lookups of drafts return 404.
- **Admin preview:** Editor, Content Manager and Super Admin can list and open drafts.
- **Expired sessions:** an expired token gets a 401 when it asks for drafts.
- **Writes:** requests without a token still return 401.
- **Other modules:** services, testimonials, team and partners are checked at the service level.

**Proven against the old code.** On the original code the same spec fails 16 tests (every leak case) and passes the preview cases. This confirms the tests catch the vulnerability and that admin preview is preserved.

## 3. Changes to the website in this round

**Frontend:**

1. **Hero (A1).** A `revealVisible` option was added to the reveal directive, plus a `reveal-settle` keyframe that moves without fading or clipping. It is applied to the three H1 lines and the intro. The eyebrow, buttons and Project Showcase keep their existing animations. A regression test was added.
2. **Careers.** The vacancies are hidden (`rolesConfirmed = false`) and the page invites general applications. The page description no longer implies openings. A test was added.
3. **Service pages.**
   - New: the registry `core/data/service-pages.ts` (the shared service content moved there from the services page), the `ServiceDetail` page and the routes `services/:slug` and `ar/services/:slug`.
   - Only approved slugs are prerendered; other URLs return a real 404.
   - The services page links to a dedicated page only when it is approved.
   - Six tests were added.
4. **Arabic.** Corrections were applied across 18 files.
5. **Header.** The logo caption is hidden only between 768 and 1023 px. This fixes the tablet overflow.
6. **Tried and reverted.** An Arabic font preload had no measurable effect (LCP 5.33 s → 5.34 s on the harness), so it was removed.

**Backend:** see §2.

## 4. Validation results

| Check | Result |
|---|---|
| Frontend unit tests | **79 / 79 pass** (26 files). Baseline was 61; this round added 18. |
| Frontend production build | Pass: 52 routes prerendered, sitemap 48 URLs |
| Backend tests affected by the change | **89 / 89 pass** (13 suites, including the 35 new access tests) |
| Backend tests not run | 43 tests in 6 vendor-portal suites need a PostgreSQL database, which this machine lacks. They fail identically (43) on the original code. The vendor service uses its own guard and is untouched. **Run them in an environment with PostgreSQL before deploying (P1-1).** |
| Backend type check and `nest build` | Pass |
| SSR / prerender | All 52 pages prerender with content. Every indexable page has exactly one H1, a unique title and description, and one valid JSON-LD graph. |
| Canonical and hreflang | 48 / 48 indexable pages: self-canonical on `https://www.msp.sa`, with en / ar / x-default alternates |
| Sitemap | Well-formed XML, 48 URLs, and **every URL returns 200**. No admin, vendor, 404, redirect or unapproved service URLs. |
| Service-page approval path, tested end-to-end in a throwaway copy with all three pages approved | 58 routes; sitemap 54 URLs; each page has one H1 and Service schema; related projects come only from CMS records (supervision → 1 project) |
| Routing (nginx 1.27.5, production template) | `msp.sa` → 301 `www`; `/about/` → 301 `/about`; unknown pages 404 (EN/AR); unapproved `/services/<slug>` 404; old SBC URL 301; `/api` proxied |
| Mobile and tablet layout | 23 pages (EN/AR, including service pages) at 360, 390 and 768 px: no horizontal overflow, one H1, no console or hydration errors |
| Visual check | Hero mid-animation (text visible from frame 1); Arabic service page on mobile; careers |
| Unverified-claims sweep | No removed claim appears in the site copy. "MSP Consultants" appears only in the legal text, left for counsel. |

## 5. Performance — before and after

Lighthouse 12 lab data, simulated mobile. These are lab measurements, not real-user Core Web Vitals; no field data exists yet. The original site and the final build ran on the same local nginx with **gzip on, as in production**, alternating runs. Each value is the median of 3.

| Page | Performance | FCP | LCP | CLS |
|---|---|---|---|---|
| Home (EN) | 94 → **98** | 1.65 → 1.80 s | 2.90 → **2.10 s** | 0.002 → 0.001 |
| Home (AR) | 93 → 93 | 2.41 → 2.41 s | 2.72 → 2.73 s | 0.008 → 0.013 |
| Projects | 98 → 98 | 1.81 → 1.80 s | 2.11 → **1.80 s** | 0.001 → 0.001 |
| Project page (Madinah Hotel) | 78 → **98** | 1.65 → 1.95 s | 2.89 → **1.95 s** | **0.322 → 0.000** |

Accessibility (95–96), SEO (100) and Best Practices (96) are unchanged on every page.

**Correction to the previous report.** Its §8 reported a homepage regression (LCP 5.38 → 5.90 s). Those runs used a local nginx compiled **without gzip**, which overstated the cost of the larger HTML this release ships: +12 KB gzipped on the homepage, +5.5 KB on Projects. With gzip, as in production, there is no regression. The Arabic homepage was unaffected by A1 (2.72 → 2.73 s); its largest element is reached by first paint, not held back by the animation.

## 6. Repository inventory

At the time of writing the branch had **249 modified files and 27 untracked paths**. Classified by content, with line endings ignored:

| Category | Files | Notes |
|---|---|---|
| **Line-ending (CRLF) changes only** | 174 | Google Drive converted them. **Do not commit.** |
| **Real changes: this release and the design round in the same file** | 36 | Cannot be split by file. The design round (steps 1–3: harden, adapt, optimize) and this release both edited them. Includes `styles.scss`, `scroll-reveal.directive.ts` and `hero.spec.ts`, which A1 touched. |
| **Real changes: design round only** | 20 | For example `translation.service.ts`, `project-showcase.ts`, `styles/themes`, `tailwind.css`, `app.config.ts`, and backend `main.ts` / `uploads` / `package*.json` (sharp image variants), `seed.ts`, `taxonomy.ts`. |
| **Real changes: this release only** | 19 | The guard and the 12 backend service/controller files; `public-content.service.ts`, `app.routes.server.spec.ts`, `why-us.ts`, the `partners` and `testimonials` sections, and the `package.json` build line |
| **Unrelated real changes** | 0 | `.claude/settings.local.json` and `prd.md` have line-ending changes only |
| **Untracked, this release** | 10 paths | `BackEnd/src/common/auth/`, `public-content-access.spec.ts`, `FrontEnd/scripts/`, `core/seo/`, `core/data/service-pages.ts`, `service-detail*.ts`, `careers-page.spec.ts`, `docs/audits/`, `docs/content/`, `docs/seo/` |
| **Untracked, design round** | 16 paths | Image-variant backend and backfill script, `bidi` / `responsive-image` utilities and specs, `loc` / `srcset` pipes, new favicons / OG image, `robots.txt` (edited in this release), `translation.service.spec.ts` |
| **Untracked, not for commit** | 1 | `.impeccable/` (design-critique working files) |

- **Line endings:** every file touched in this release is LF. The only CRLF one, `FrontEnd/package.json`, was normalised; its diff is now the single `build` line.
- **Deleted:** `FrontEnd/public/sitemap.xml` (untracked, from the design round) is replaced by the generated sitemap.

**Commit plan.** Not executed: it needs your approval.

1. Never use `git add -A`, `git add .` or `git commit -a`: they would sweep in the 174 line-ending-only files.
2. Stage an explicit file list: the 75 real changes plus the untracked paths above, excluding `.impeccable/`.
3. The design round and this release overlap in 36 files, so release them together. Either:
   - one commit for both rounds, described as such; or
   - two commits: first the design-round versions of the shared files, then this release on top. The pre-release snapshot needed for this exists only in this session's temporary workspace, so split it **in the same session** as the commit; otherwise use the single combined commit (recommended).
4. **Never run** `git checkout -- .`, `git reset --hard`, `git clean` or `git stash` here. They would destroy uncommitted design-round work that exists nowhere else.
5. Commit with the identity used before: `-c user.name="Mansour - MSP" -c user.email="mansour@msp.sa"`.
6. Recall: local `main` was already ahead of `origin/main` with unpushed vendor-portal commits. Push only per `DEPLOYMENT.md` (database baseline steps first).

## 7. Remaining issues

### P0 — release blockers (must be closed before deployment)

| # | Issue | Owner / action |
|---|---|---|
| P0-1 | **Placeholder article "Designing for the Desert" is published.** The build would prerender it and list it in the sitemap. | Admin: set it to draft **before** the frontend build. Admin actions §1. |
| P0-2 | **Content sign-off.** New public copy (EN/AR): homepage, About with the CEO message, Services, FAQ, Contact, Careers and metadata. The Arabic has had an expert editorial pass, but MSP's own reviewer has not signed it off (A14). | Management approves the copy, or returns corrections. |
| P0-3 | **The release exists only as uncommitted changes in a Google Drive folder.** It can't be deployed reproducibly. | Approve the commit plan (§6); then commit, review the diff, and tag. |

The release-blocking security issue (public API draft exposure) is **resolved in code and tested**. It remains open on the live site until the backend is deployed (§8, step 2).

### P1 — fix soon

| # | Issue |
|---|---|
| P1-1 | Run the 6 database-backed vendor suites (43 tests) against PostgreSQL before the backend deploy. |
| P1-2 | Delete the fabricated testimonials (2) and seed partners (4) from production (admin actions §2). Since the fix they are not publicly retrievable, but they should not exist. |
| P1-3 | Privacy policy and terms: placeholder text naming "MSP Consultants", already live. Counsel to finalise them with the registered entity name. |
| P1-4 | Guard `seed.ts` so it refuses to run against production. It recreates fabricated testimonials and partners. |
| P1-5 | CMS settings: replace the tagline, complete the Riyadh address (Irqah), replace the promise-style service one-liners (admin actions §5–7). |
| P1-6 | Confirm the `careers@msp.sa` mailbox exists. |
| P1-7 | Design-round deployment dependency: deploy the backend image-variant route and run the image backfill, or project images on the new pages fall back to originals. |
| P1-8 | After deployment: Search Console (Domain property, submit the sitemap), Rich Results Test on a project, an article and FAQ URLs, and a re-run of Lighthouse on the live site. |

### P2 — future improvements

| # | Item |
|---|---|
| P2-1 | Approve and publish the service pages (Architectural Design first). Add the Interior Design and Construction Supervision CMS services (admin actions §8). |
| P2-2 | Collect project facts through the information request. Add structured case studies, starting with Madinah Hotel and Al Munsiyah. Rename the three "Private Residential Villa" projects. Settle the SBC naming and slug. |
| P2-3 | Remove the placeholder social links (admin actions §4), or replace them with verified profiles and add `sameAs`. |
| P2-4 | Arabic open questions: «مكتب» or «شركة»; «شقق فندقية» or «شقق مخدومة» (the CMS project title uses the latter); «الرؤى» for Insights versus «الرؤية» for Vision; the schematic-phase term; the "+" placement in «16+ عاماً». |
| P2-5 | Add a per-image alt and caption field in the CMS (alt text is currently generated from title, location and position). |
| P2-6 | Remove the dead fictional sample data `FrontEnd/src/app/core/data/projects.ts` (`PROJECTS`); it is not rendered or bundled. |
| P2-7 | Team bios: seed text on one member, and a gendered Arabic verb to check. |
| P2-8 | Insights: first two articles from the editorial roadmap. |
| P2-9 | Rebuild the frontend automatically when content is published, so new projects and articles are prerendered without a manual deploy. |
| P2-10 | Careers page: the whitespace left where the hidden roles list was could be tightened when roles return. |

## 8. Deployment order (after the P0 gates)

1. **Admin:** unpublish "Designing for the Desert" (P0-1). Optionally do admin actions §2 and §5–7 now too.
2. **Backend:** deploy (security fix + design-round image variants). Run the image backfill (dry run first).
   - Verify: `GET /api/testimonials?includeDrafts=true` → `total: 0` (or only published).
   - Verify: an admin login still lists drafts in Admin → Projects.
3. **Frontend:** deploy. The build prerenders from the live API and writes the sitemap.
   - Verify: `msp.sa` → `www`; `/about/` → `/about`; `/sitemap.xml` is XML.
   - Verify: a project page's source shows its H1 and JSON-LD.
   - Verify: `/services/architectural-design` is 404 until approved.
4. **Search Console** and live Lighthouse (P1-8).
