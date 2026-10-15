# MSP Website — Content, SEO & Digital Identity: Final Report

Date: 2026-10-15 · Branch: `seo-content-transformation` (local, **not committed, not pushed, not deployed**) · Baseline: [MSP-WEBSITE-BASELINE-AUDIT.md](MSP-WEBSITE-BASELINE-AUDIT.md) · Keyword map: [../seo/MSP-KEYWORD-MAP.md](../seo/MSP-KEYWORD-MAP.md) · Insights plan: [../content/MSP-INSIGHTS-EDITORIAL-ROADMAP.md](../content/MSP-INSIGHTS-EDITORIAL-ROADMAP.md)

---

## الملخص التنفيذي (العربية)

أُعيدت صياغة محتوى موقع MSP باللغتين العربية والإنجليزية ليعكس فلسفة الشركة المعتمدة: «عمارةٌ تتجاوز المباني». وتشمل الصياغة الجديدة التجربة الإنسانية، والمعيارين لنجاح المشروع، والذكاء الجماعي، و«التقنية تُمكّن والخبرة تقود»، والاستقلالية المهنية، والطموح المعرفي بوصفه طموحاً مستقبلياً.

- **الصفحات التي أُعيد بناؤها:** صفحة «من نحن» بالكامل، ومعها الرؤية والرسالة والقيم الست ورسالة الرئيس التنفيذي.
- **الصفحات التي حُدّث محتواها:** الصفحة الرئيسية، والخدمات (نطاق كل خدمة ومنهجيتها)، والأسئلة الشائعة، والتواصل.
- **الادعاءات التي أُزيلت:** «أكثر من 500 مشروع»، والخط الزمني غير الموثّق، والمشاركة في مشاريع رؤية 2030، وشهادة LEED، وثلاثة مقالات وهمية كانت تظهر في الصفحة الرئيسية.

تقنياً، أصبحت صفحات جميع المشاريع والمقالات تُولَّد مسبقاً بمحتواها الحقيقي حتى تقرأها محركات البحث، وكانت قبل ذلك فارغة لمن لا يشغّل JavaScript.

- **ما أُضيف تقنياً:**
  - بيانات منظمة (JSON-LD) لكل صفحة.
  - عناوين وأوصاف فريدة لكل صفحة.
  - رابط أساسي (canonical) موحّد على www.msp.sa.
  - خريطة موقع تُولَّد تلقائياً، وعدد روابطها 48.
  - تحويل msp.sa إلى www.msp.sa.
  - إزالة الشرطة المائلة في نهاية الروابط.
- **الاختبارات والبناء:** نجحت الاختبارات جميعها (71 من 71)، ونجح البناء.

**الجاهزية:** التعديلات جاهزة للمراجعة والمعاينة، ولم تُنشر بعد. قبل النشر يلزم ما يلي:

- اعتماد الإدارة للنصوص، ومراجعة العربية من متحدث أصلي.
- الحسم في البنود الواردة في القسم 10.
- نشر الواجهة الخلفية أولاً، وفق تسلسل النشر في القسم 11.

---

## 1. Executive summary

The site now says what MSP believes, and what it can demonstrate, in both languages. The approved philosophy, vision, mission, values and CEO message are on the site. Unverifiable claims are gone. The site also states clearly that MSP is an architecture and engineering consultancy in Riyadh, not a contractor.

The largest SEO problem was structural: every project page, article and CMS-driven list was empty for crawlers that don't run JavaScript. All of them now prerender with real content, structured data, unique metadata and correct canonical/hreflang links.

Nothing has been committed, pushed or deployed. The work sits on a local branch for your review.

## 2. Changes implemented

### Content (EN + AR)

| Area | Before | After |
|---|---|---|
| Home hero H1 | "Architecture & engineering for what endures." | **"Architecture beyond buildings."** / «عمارةٌ تتجاوز المباني.» + approved supporting line + "MSP is an architecture and engineering consultancy based in Riyadh." |
| Home about | "great buildings begin where design discipline meets engineering certainty" | Core principle on experience; positioning; creativity and performance as one task |
| Home stats | "500+ projects", years | Years since 2010; two offices (Riyadh, Cairo) |
| Home approach | Four generic convictions | Human experience · Collective intelligence · Technology-enabled, expertise-led · Responsibility beyond handover |
| Home insights preview | **Three fabricated articles** rendered when the API was slow | Section hidden unless real articles exist |
| Home CTA / team | "Commissions open for 2026", "Principals lead every commission", "reply within one business day" | Neutral invitation; collective-expertise framing |
| About | Story from 2010, civic landmarks, four values, unverified timeline | Who we are · Philosophy · Vision & Mission · six values · Collective expertise · Technology (current vs evolving, clearly separated) · Leadership with the CEO message · Long-term ambition (aspirational). Timeline removed. |
| Services | "Five disciplines", one-line CMS text | Count-neutral consultancy framing; per discipline: description, client needs, scope, relevant project types, link to projects; process rewritten around independent advice; supervision explicitly a consultancy service |
| FAQ | Vision 2030, LEED/ISO, principal-led, one-day reply | Eight factual answers, including "Do you also build the project? — No" and "Can you supervise construction? — Yes, as the client's consultant" |
| Projects / Insights intros | "from civic landmarks to masterplans" | Verified typologies; Insights framed as a developing knowledge platform |
| Project pages | Title + summary + paragraphs | + "Project overview" heading, location row, "About these services" link, contact prompt; supports CMS section headings (a paragraph starting `## ` becomes a heading, so case studies can follow Overview / Challenge / Approach / … without a schema change) |
| Brand | "MSP Consultants", "MSP Designs", "إم إس بي للاستشارات" | "MSP" everywhere except the legal pages (left for counsel) |

### Technical SEO

| Item | Before | After |
|---|---|---|
| CMS content in HTML | Fetched in the browser only | Fetched during prerender, handed to the browser for hydration, then refreshed from the API (admin edits still appear without a redeploy) |
| Project & article pages | Client-rendered shell | Prerendered for every published slug, both languages (52 routes, was 24); new slugs fall back to the client shell |
| Canonical host | msp.sa and www both 200 | Canonicals on `https://www.msp.sa`; nginx 301 `msp.sa` → `www.msp.sa` in one hop |
| Trailing slash | `/about` 301 → `/about/` (canonicals pointed at redirects) | `/about` served directly; `/about/` 301 → `/about` |
| Titles | "Practice", "Works", "Disciplines"… | Keyword-map titles, format `Page \| MSP`, unique (duplicate villa names disambiguated by project number) |
| Descriptions | Some missing; "MSP Consultants" | Unique per page and language, accurate to page content |
| Structured data | None | One JSON-LD graph per page: Organization, WebSite, page type (WebPage/AboutPage/ContactPage/CollectionPage/FAQPage with questions), BreadcrumbList, Service ×5, CreativeWork per project, Article per insight. No ratings, reviews, awards, legal name or social profiles. |
| Sitemap | Static, 20 URLs, wrong host; live URL served HTML | Generated after each build from the prerendered pages (self-canonical, indexable only), 48 URLs with en/ar/x-default |
| robots.txt | Live URL served HTML; `/ar/vendors` open | Canonical sitemap URL; `/ar/vendors` disallowed |
| Vendor portal | Indexable | `noindex` (metadata only; no behaviour change) |
| Old URL `projects/sbc-commercial-office` | Redirected to a non-existent slug | Real 301 to `/projects/SBC` (needs confirmation, see §10) |
| Image alt text | Project title on every image | Cover: title + location; gallery: title + location + "image n of m" (unique, no invented details) |
| Payload | — | Project lists ship list fields only; detail pages fetch full records |

## 3. Files modified

All under `FrontEnd/` unless noted. 43 files: 4 new, 1 removed, the rest modified.

- **New:**
  - `scripts/build-sitemap.mjs`
  - `src/app/core/seo/structured-data.ts`
  - `src/app/core/seo/prerender-slugs.ts`
  - `src/app/core/seo/prerender-slugs.spec.ts`
- **Removed:** `public/sitemap.xml`, which is now generated.
- **Infrastructure:**
  - `nginx.conf.template`
  - `package.json` (`build` now runs the sitemap step)
  - `public/robots.txt`
  - `src/index.html` (fallback title)
- **Routing and SEO:**
  - `src/app/app.routes.server.ts` and its spec
  - `src/app/app.routes.ts` (SBC redirect)
  - `core/services/seo.service.ts` and its spec
  - `core/services/public-content.service.ts`
  - `core/services/api.service.ts` (prerender origin)
- **Pages:**
  - `about`, `services`, `projects` (index and detail), `blog` (index and detail), `team`, `careers`, `faq`, `contact`, `legal` (metadata only)
  - `vendors` (noindex only)
  - `home/home.ts`
  - home sections: `hero`, `about`, `services`, `stats`, `why-us`, `cta`, `team`, `blog-preview`, `testimonials`, `partners`, `featured-projects`, `contact`
- **Layout:**
  - footer
  - header and its spec

Docs (repo root):

- `docs/audits/MSP-WEBSITE-BASELINE-AUDIT.md`
- this report
- `docs/seo/MSP-KEYWORD-MAP.md`
- `docs/content/MSP-INSIGHTS-EDITORIAL-ROADMAP.md`

Not touched:

- Backend
- Database
- Admin
- Authentication
- Vendor portal behaviour
- The Project Showcase component (`project-showcase.ts`)

## 4. Content before / after

The most important pairs are listed in §2. The full per-service content (EN/AR scope, needs and project types) is in `src/app/pages/services/services-page.ts` (`details` map). The About page structure is in `src/app/pages/about/about-page.ts`.

## 5. SEO before / after (prerendered output)

| Check | Before | After |
|---|---|---|
| Prerendered routes | 24 | 52 |
| Project links in `/projects` HTML | 0 | 11 |
| Pages with JSON-LD | 0 | All 48 indexable pages |
| Indexable pages with exactly one H1 | All 22 prerendered | All 48 |
| Duplicate titles / missing descriptions | Generic titles; 4 indexable pages with no description | 0 / 0 |
| Canonical = own URL on canonical host | 0 (host + slash mismatch) | 48 / 48 |
| hreflang en/ar/x-default | Static pages only | 48 / 48 |
| Sitemap URLs | 20 static (repo); HTML (live) | 48, generated, well-formed XML |

## 6. Technical issues resolved

1. CMS content was invisible to non-JS crawlers.
2. Project and article pages were empty shells.
3. The project page had a 0.32 CLS from client rendering. It is now 0.00.
4. Canonicals pointed at redirecting URLs and at a duplicate host.
5. robots.txt and sitemap.xml returned HTML on the live site. This is fixed once deployed, because the files are now part of the build.
6. The sitemap was missing projects and articles.
7. A broken legacy redirect.
8. Vendor pages were indexable.
9. Fabricated article teasers appeared in the prerendered homepage.
10. Some alt text was duplicated or generic.

## 7. Tests executed

| Test | Result |
|---|---|
| Unit tests (Vitest) | **71 / 71 pass** in 24 files. Baseline was 61 / 61. New tests cover: JSON-LD graph and breadcrumbs, unverified-fact exclusion, noindex removing structured data, server route modes, and an unreachable API never failing the build. Run with `NODE_OPTIONS=--no-experimental-webstorage` on this Mac's Node 25; the production image uses Node 22 and needs no flag. |
| Type checks | `tsc` and `ngc` (templates) pass |
| Prerender validation script | All 52 pages: H1, title, description, canonical, hreflang and JSON-LD validated. The only flag is "MSP Consultants" in the privacy/terms text, which was left on purpose. |
| nginx, compiled 1.27.5 against the new template | `/about` 200; `/about/` → 301 `/about`; `/ar/` → 301 `/ar`; query strings preserved; `msp.sa/*` → 301 `https://www.msp.sa/*`; Railway hostname unaffected; unknown pages 404 (EN/AR); unknown project slug → client shell; old SBC URL → 301; `/api` proxied |
| Mobile layout, 390 px emulated, EN/AR, 8 pages | No horizontal overflow, before or after |
| Hydration | No Angular hydration errors on any tested page |
| Visual review | Home, About, Services, Project (desktop); Arabic home and services (mobile) |

## 8. Build results and performance

> **Correction (2026-10-15, release-readiness review).** The measurements below were taken on a local nginx compiled without gzip, which overstated the cost of the larger HTML. Re-measured with gzip on, as in production, there is **no homepage regression**: English homepage LCP 2.90 s → 2.10 s after A1, and the project page 2.89 s → 1.95 s. The current figures are in [MSP-RELEASE-READINESS-REPORT.md](MSP-RELEASE-READINESS-REPORT.md) §5.

`npm run build` succeeds: 52 routes prerendered and a 48-URL sitemap written, in about 18 s.

Lighthouse 12 **lab** data used simulated mobile, on a local nginx serving each build, with the same API relay. These are not real-user Core Web Vitals, and no field data was available. All images on the harness failed equally in both builds, because the live backend doesn't yet serve the responsive-image route. So treat LCP as text-driven.

| Page | Baseline (median) | After (median) |
|---|---|---|
| `/projects` | Perf 79, LCP 3.97 s, CLS 0.001 | **Perf 89, LCP 3.15 s**, CLS 0.001 |
| `/projects/madinah-hotel` | Perf 60, LCP 5.1 s, **CLS 0.32** | **Perf 78–89, LCP 3.2–4.3 s, CLS 0.000** |
| `/` (EN) | Perf 71, LCP 5.38 s | Perf 71, LCP 5.90 s |
| `/ar` | Perf 72, LCP 5.05 s | Perf 69, LCP 5.34 s |
| Accessibility / SEO / Best practices | 95–96 / 100 / 96 | unchanged |

**Homepage regression, explained.** The homepage HTML grew (111 → 162 KB) because it now carries the real services, projects and team data. The dominant cost exists in both builds, though: the LCP element is the hero paragraph, which the load-reveal animation keeps at opacity 0, producing 3.5–6 s of "render delay". Fixing this means changing an animation, so it is an approval item (§10, A1). That delay is several times larger than the regression, so it is where the gain is; the actual effect must be measured after the change.

## 9. Remaining issues

1. Homepage LCP is held back by the hero load-reveal animation (A1).
2. **CMS content** that the code cannot fix:
   - **Placeholder article** "Designing for the Desert". It is published, so it is now prerendered and in the sitemap.
   - **CMS tagline** "A Saudi architecture & engineering consultancy." overrides the new footer tagline.
   - **Service short descriptions** such as "Delivery, on time." and "Safe, efficient structures." are promise-style one-liners shown on the homepage.
   - **Placeholder social links** (`x.com/msp`, `linkedin.com/company/msp`, `instagram.com/msp`).
   - **Riyadh address** reads only "Riyadh, Saudi Arabia".
   - **Thin projects:** 9 of 11 have no case-study text, 6 have no year and 4 have no disciplines.
   - **Duplicate names:** three projects are called "Private Residential Villa".
   - **Uppercase slug** `SBC`, whose image filenames say "commercial-center-hittin-riyadh" while the title says "Commercial Office".
   - **Team bios:** two are empty, one is a one-liner, and one Arabic bio uses a feminine verb (تقود) that should be checked against the person.
3. **Legal pages** are self-described placeholders ("Final wording will be reviewed by counsel before launch") and name "MSP Consultants".
4. **Careers:** four roles are listed without confirmation that they are open (code comment added).
5. **No per-image alt or caption field** in the CMS. Alt text is generated from title, location and position.
6. Dead sample data `core/data/projects.ts` (`PROJECTS`) contains fictional projects (Najd Cultural Centre, LEED Gold). It is not rendered or bundled; remove it in a cleanup.
7. **Backend:** `includeDrafts=true` on public list endpoints returns drafts, and slug lookups return unpublished items. This is a data-exposure issue for unpublished projects and articles. It is outside this scope, but it should be fixed.
8. **Seed file** `BackEnd/src/database/seeds/seed.ts` contains fabricated NEOM/Qiddiya testimonials and partners. Confirm they never reached production, and never run the seed against production.
9. **Arabic copy** needs native professional review. The writers flagged terms such as the H1 split, «التقنية تُمكّن، والخبرة تقود», feminine agreement for MSP, and «المتطلبات» for "brief".

## 10. Items requiring management approval

| # | Decision | Recommendation |
|---|---|---|
| A1 | Make the hero text LCP-safe: keep the motion, but start the hero paragraph and H1 visible (animate position only, not opacity) | Approve. It addresses the brief's rule against hiding primary content behind animation. |
| A2 | Unpublish "Designing for the Desert" in the admin | Approve, now |
| A3 | Confirm `/projects/sbc-commercial-office` should redirect to `/projects/SBC` | Confirm, or give the right target |
| A4 | Verify the registered legal names: Arabic «منصور سليمان السبعان للاستشارات الهندسية» and the English equivalent. Once verified, add them as `legalName` in structured data and use them in the legal pages. | Provide CR extract |
| A5 | "500+ projects": verify against project records before it reappears | Pending records |
| A6 | Real social profile URLs (for the footer and schema `sameAs`) | Provide or remove from settings |
| A7 | Privacy policy and terms: final wording by counsel, with the registered entity name | Required before relying on them |
| A8 | Careers: confirm which roles are open | Confirm |
| A9 | Add "Interior Design" and "Construction Supervision" as CMS services. The frontend already has full EN/AR content for both. | Approve |
| A10 | Service subpages (`/services/<slug>`). Proposals are in the keyword map. Do not publish urban planning until a verified planning project exists. | Approve architecture, interior and supervision first |
| A11 | Project case studies: supply the challenge, approach and scope per project. Editors can use `## ` headings in the description. | Start with Madinah Hotel and Al Munsiyah |
| A12 | Rename the three "Private Residential Villa" projects with distinguishing names (location or typology) | Approve |
| A13 | FAQ answer "Who are your services for?" names public-sector entities as a client category | Confirm comfortable |
| A14 | Native Arabic review of all new copy | Required |
| A15 | Add a CMS alt/caption field per image (backend change) | Approve for a later round |

## 11. Deployment recommendations

Do this in order, and only after approval. Nothing here has been done.

1. Review this branch locally. The preview harness is in the session scratchpad; this report's author can restart it.
2. **Commit only real changes.** The working tree also contains about 240 CRLF-only files from Google Drive, plus uncommitted design-round steps 1–3. Commit this branch's files deliberately. Don't add everything.
3. **Deploy the backend first** (from the design round): the `sharp` image variants, then run the image backfill (`npm run images:variants:prod -- --dry-run`, then without the flag). The prerender reads the live API at build time (`PRERENDER_API_ORIGIN`, default `https://www.msp.sa`).
4. **Deploy the frontend.** The Docker build runs `npm run build`, which prerenders projects and articles from the live API and writes the sitemap.
5. **Check after deploy:**
   - `curl -I https://msp.sa/about` → 301 to `https://www.msp.sa/about`.
   - `/about/` → 301.
   - `/sitemap.xml` and `/robots.txt` return XML/text.
   - `/nonexistent` → 404.
   - A project page's view-source shows its title, H1 and JSON-LD.
   - If Cloudflare also has a redirect rule for the apex, make sure there is no loop.
6. **Search Console:** add a Domain property for msp.sa, submit `https://www.msp.sa/sitemap.xml`, and inspect a few project URLs. Validate structured data with the Rich Results Test and the Schema.org validator.
7. **Redeploy the frontend after publishing** new projects or articles, so they are prerendered and enter the sitemap. Until then they work client-side.

## 12. Future SEO roadmap

| When | Work |
|---|---|
| 0–1 month | Approvals A1–A3, A6, A9, A12; Search Console setup; Google Business Profile check (below) |
| 1–3 months | Service subpages (A10); first two case studies (A11); first two Insights articles from the roadmap; Search Console query review against the keyword map |
| 3–6 months | Remaining case studies; residential and hospitality landing pages if Search Console shows demand; per-image alt field (A15); automatic frontend rebuild when content is published (webhook) |
| Ongoing | One reviewed article a month; quarterly metadata review; keep the "no unverifiable claims" rule (see the claims list in the baseline audit) |

**Google Business Profile.** No access was available, so nothing has been changed. Recommended checks:

- Use the same name ("MSP") on every listing. The Cairo listing is "MSP DESIGNS".
- Riyadh address: Irqah, matching the site.
- Phone +966 11 200 0087.
- Website `https://www.msp.sa/` (Arabic listing: `https://www.msp.sa/ar`).
- Primary category: "Architect" or "Engineering consultant".
- Recent project photos with descriptive filenames.
- Ask satisfied clients for reviews. Never add reviews to structured data yourself.

## Definition of Done — status

| Item | Status |
|---|---|
| All public routes audited | ✅ |
| Homepage reflects philosophy | ✅ |
| About reflects approved vision; mission and values consistent | ✅ |
| CEO message integrated | ✅ (About → Leadership) |
| Services reflect verified capabilities | ✅ with A9/A10 pending |
| Project descriptions reviewed | ✅ reviewed; enrichment needs MSP input (A11) |
| Arabic and English consistent | ✅ structurally; native review pending (A14) |
| Unique metadata, valid canonicals, hreflang, sitemap, robots | ✅ |
| Structured data validated | ✅ parsed and checked locally; Google's Rich Results Test should be run on the deployed URLs |
| Internal links functional | ✅ (projects ↔ services, CTAs, breadcrumbs) |
| SSR output crawlable | ✅ 52 routes |
| No important page noindexed | ✅ only 404s and the vendor portal |
| Mobile rendering correct | ✅ 390 px, EN/AR |
| Project Showcase works | ✅ unchanged component |
| Build passes; tests pass; new tests added | ✅ 71/71 |
| No critical accessibility regressions | ✅ Lighthouse a11y unchanged |
| No critical performance regressions | ⚠️ minor homepage lab regression; fix proposed (A1) |
| No unsupported factual claims remain | ✅ in site copy; legal pages and CMS items listed in §9 |
| Final report generated | ✅ |
