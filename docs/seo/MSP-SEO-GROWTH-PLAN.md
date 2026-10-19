# MSP Organic Search Growth Plan

Date: 2026-10-19 · Market: Saudi Arabia (Riyadh first), then Egypt (Cairo office) · Languages: English and Arabic
Branch: `seo-growth` (not deployed) · Progress log: `docs/seo/SEO-PROGRESS.md`

## How to read this plan

- **No measured search data exists yet.** Search Console is not verified, GA4 is not installed, and no paid keyword tool is used. This plan therefore contains **no search volumes, rankings, traffic or conversion figures**. Every priority below is a judgement from the portfolio, the services and observed result pages. Re-rank it against Search Console data once 8–12 weeks of data exist.
- **Live search observation** was done with a web search tool that returns US-based results, not Saudi-localised ones. Competitor findings in §10 are qualitative: they show which kinds of pages win, not where anyone ranks in Riyadh.
- **Content rule:** nothing goes on the site that MSP has not verified. Where a page needs facts (years, areas, scope, client permission), it waits for them.

---

## 1. Audit: gap update since the baseline (2026-10-15)

The full baseline is `docs/audits/MSP-WEBSITE-BASELINE-AUDIT.md`. Below is what has changed and what is still open.

| Area | Baseline (Oct 15) | Now (live `main`) | On this branch |
|---|---|---|---|
| Rendering | Client-rendered project/blog pages | All public pages prerendered EN/AR | Sector pages prerendered |
| Canonical / hreflang | Missing on dynamic pages | www canonical, en/ar/x-default alternates on every page | Same on new pages |
| Sitemap | Static, main routes only | Generated from prerendered HTML (60 URLs) | + sector pages, + `lastmod` for projects and insights from the CMS |
| Soft 404s | App shell for unknown URLs | Real 404s | Unpublished sector URLs are real 404s |
| Service pages | None | 5 approved pages | + FAQ (with FAQPage schema), + project image cards |
| Structured data | Organization only | Organization, WebSite, BreadcrumbList, Service, CreativeWork, Article | + ProfessionalService per office, + CEO as Person |
| Internal links | Thin | Services ↔ projects, insights → projects | + related projects, project → sector, sector → services, index → sectors |
| Measurement | None | Consent banner + GA4 code (off until ID), lead events, enquiry email alerts (off until SMTP vars) | — |
| Search Console | Not verified | **Still not verified** | — |
| Project content | Thin records | **Still thin** (see below) | CMS checklist shows editors what is missing |

**Project content gap (measured 2026-10-19 by running the new CMS checklist against the 11 live projects):**

| Missing | Projects affected |
|---|---|
| Description (two bilingual paragraphs) | 9 of 11 |
| Year | 7 |
| Disciplines | 5 (3 private villas, 2 mixed-use) |
| Sectors | 5 (the same five) |
| Summary length (70–160 characters, both languages) | 2 |
| Gallery (3+ images) | 1 |
| Slug format | 1 (`SBC`, which already redirects from `sbc-commercial-office`; **leave it**, since changing a published slug breaks links) |

This is now the biggest limit on organic growth. The pages are technically sound but say little. Project pages are where MSP can earn long-tail searches ("villa compound design Riyadh", "تصميم فندق المدينة المنورة"), and they need MSP's facts to do it. Request form: `docs/content/MSP-PROJECT-INFORMATION-REQUEST.md`.

## 2. Bilingual keyword strategy: topic clusters

Page-level assignments stay in `docs/seo/MSP-KEYWORD-MAP.md` (one primary keyword per page and language). This section groups them into clusters, each with one hub page and its supporting pages.

| Cluster | Hub (EN / AR) | Supporting pages | Main query patterns (EN / AR) |
|---|---|---|---|
| **A. Brand and firm** | `/` · `/ar` | `/about`, `/team`, `/contact` | MSP Riyadh, engineering consultancy Riyadh / مكتب استشارات هندسية بالرياض، شركة استشارات هندسية |
| **B. Architectural design** | `/services/architectural-design` | residential and hospitality sector pages, villa and compound projects | architectural design firm Riyadh, villa design / تصميم معماري، تصميم فلل، مكتب تصميم معماري |
| **C. Interior design** | `/services/interior-design` | Madinah Hotel, serviced apartments, Al Munsiyah, hospitality sector page | interior design consultancy Riyadh, hotel interior design / تصميم داخلي، تصميم داخلي فنادق |
| **D. Engineering design** | `/services/structural-engineering`, `/services/mep-engineering` | commercial and residential projects with these disciplines | structural design office Riyadh, MEP design / تصميم إنشائي، تصميم كهروميكانيكي |
| **E. Supervision** | `/services/construction-supervision` | residential villas compound | construction supervision Riyadh / إشراف هندسي، استشاري إشراف |
| **F. Sectors** | `/projects/sector/residential`, `/projects/sector/hospitality` (`commercial` once two projects are tagged) | the projects in each | villa / compound / hotel / office building design / تصميم فلل ومجمعات سكنية، تصميم فنادق، مبانٍ تجارية |
| **G. Insights** | `/blog` | articles linked to a project and a service | how-to and climate/design questions (only with MSP authorship; see §8) |

**Out of scope until verified work exists:** urban planning, masterplanning and landscape. These stay distinct services in MSP's offer, but there is no published project to support them, so no page is created (a thin page would hurt more than help).

## 3. Intent mapping

| Intent | What the searcher wants | Page type that serves it | MSP page |
|---|---|---|---|
| Navigational | Find MSP | Home, contact | `/`, `/contact` |
| Commercial investigation | Compare consultancies for a service | Service page with process, scope, FAQ, proof | `/services/*` |
| Commercial / evaluation | See relevant work before contacting | Sector collection, project page | `/projects/sector/*`, `/projects/*` |
| Local | An office nearby, phone, map | Contact + Google Business Profile | `/contact`, GBP (§7) |
| Informational | Understand a topic (climate, codes, process) | Insight article | `/blog/*` |
| Transactional | Start a project | Contact form with service prefilled | `/contact?service=…` (CTA on every service page) |

Directories and classifieds dominate the broad "best engineering offices in Riyadh" queries (§10). MSP's realistic path is the **commercial-investigation and evaluation** intents (service + sector + project pages), plus being listed in the directories that win the broad queries.

## 4. SEO site architecture

```
/ (EN)                                   /ar (AR mirror of every page)
├── /about  /team  /careers  /faq  /contact
├── /services
│   ├── /services/architectural-design
│   ├── /services/interior-design
│   ├── /services/structural-engineering
│   ├── /services/mep-engineering
│   └── /services/construction-supervision
├── /projects
│   ├── /projects/sector/residential     (published: ≥2 tagged projects)
│   ├── /projects/sector/hospitality     (published)
│   ├── /projects/sector/commercial      (appears automatically at ≥2 tagged projects)
│   └── /projects/<slug>                 (11 projects)
└── /blog
    └── /blog/<slug>
```

Rules built into the code:

- **No thin pages.** A sector page is published only with at least 2 projects (`MIN_SECTOR_PROJECTS`). Below that it is not prerendered, nginx returns a real 404, and it is not in the sitemap.
- **Existing URLs are preserved.** All new pages are additions; no URL changed.
- **Filtered views** (`/projects?sector=`) stay canonicalised to `/projects`. The sector pages are the indexable versions.

## 5. Portfolio SEO

Done in code (this branch): related projects by sector, project → sector link, sector pages with ItemList schema, `lastmod` per project, and a CMS checklist that shows editors what each project lacks.

Needed from MSP (content, not code). Per project, in priority order:

1. **Sectors and disciplines** on the 5 untagged projects. This takes a minute per project in Admin → Projects, and it immediately fills the sector pages, related projects and service-page project cards. Tagging Al Ateeq and the commercial-residential compound as *Commercial* (or *Work*) publishes the commercial sector page.
2. **Year** (7 projects).
3. **Two description paragraphs per language:** the brief, the design response, and what MSP delivered. Facts only: no client names without permission, no awards, no areas unless confirmed.
4. **Image alt text** comes from title and location automatically; **real photos** outrank renders for trust. Mark renders as renders if the CMS caption allows.

Do not invent descriptions to close the gap. A short, true page is better than a long, generic one.

## 6. Structured data

| Type | Where | Status |
|---|---|---|
| Organization, WebSite | every page | live |
| BreadcrumbList | every page below home | live |
| Service | service pages | live |
| FAQPage | service pages, `/faq` | `/faq` live; service pages on branch |
| CreativeWork | project pages | live |
| Article | insights | live |
| CollectionPage + ItemList | sector pages | branch |
| ProfessionalService (Riyadh, Cairo) | home, contact | branch; address, phone and map link only |
| Person (CEO) | about | branch; name, title and LinkedIn only |

**Deliberately omitted** (enforced by a test): ratings, reviews, awards, opening hours (the CMS says 9–18, the fallback says 9–17; confirm first), price range, employee count, legal name (the English legal name is unverified), and geo coordinates. Add any of these only once verified.

## 7. Local SEO strategy

**Google Business Profile** is the single most important local asset and needs MSP's access (Maps listings exist: Riyadh cid 14819986877967963984, Cairo cid 7951323106422195141).

1. Claim or verify both listings under an MSP-owned Google account.
2. Use the same name, address and phone as the site: *MSP*; Irqah, Riyadh, +966 11 200 0087; Rayhana Plaza, Zahraa El Maadi, Cairo, +20 106 801 7313.
3. Primary category: *Architect*, or the closest *Engineering consultant* category. Secondary categories only for verified services.
4. Website link: `https://www.msp.sa/` (Riyadh) and `https://www.msp.sa/contact` (Cairo), so that both carry the canonical host.
5. Hours: set only once confirmed (see §6).
6. Photos: real project and office photos; no stock.
7. Reviews: ask real clients after handover. **Never** buy, swap or write reviews, and don't offer incentives (this breaks Google policy).
8. Posts: one per new project or article.

**Citations** (from the directories that appear for broad queries): list MSP with identical name, address and phone, and only where a free, legitimate listing exists:

| Directory | Type | Action |
|---|---|---|
| Saudi Council of Engineers (SCE) member/office registry | Official | Confirm MSP's office entry and website link |
| Balady (MoMRAH) engineering office classification | Official | Confirm the listing shows the correct name and contact |
| Bayut "engineering consultants in Riyadh" style lists | Editorial list | Ask for inclusion (free); no paid placement without management approval |
| albanknote.com office lists | Editorial list | Same |
| ProTenders | B2B / tenders | Free company profile |
| Dun & Bradstreet | Business registry | Check that the existing record is accurate |
| LinkedIn company page | Social | Website link to `www.msp.sa`, the same description as `/about` |

**Never:** fake offices, virtual addresses, duplicate listings, or keyword-stuffed business names.

## 8. Content authority

Plan and topics: `docs/content/MSP-INSIGHTS-EDITORIAL-ROADMAP.md`. Rules:

- **Every article has a named MSP author** (a real architect or engineer) and draws on an MSP project or a verifiable reference (code, standard, published source). No generic AI-written articles.
- **Each article links to one service page and at least one project.** The project links back through its "related insight", where it exists.
- **Unsupported claims are flagged, not published:** "leading", "largest", sustainability ratings, award claims, client names without permission, project counts.
- **Cadence:** one solid article a month beats four thin ones. A pause is fine; low-quality filler is not.

## 9. Internal linking

| From | To | Mechanism |
|---|---|---|
| Home | services, featured projects, contact | sections (live) |
| Service page | 3 related projects (image cards), contact (`?service=`) | branch |
| Project page | its service pages, related projects (same sector), its sector page, contact | branch |
| Sector page | its projects, relevant service pages, contact CTA | branch |
| Projects index | published sector pages | branch |
| Insight | related project, service | live / editorial |
| Every page | breadcrumbs, footer services and contact | live |

All links are plain crawlable `<a href>` in prerendered HTML (verified in `dist`).

## 10. Competitor gap analysis (qualitative)

Source: live result pages (US-based search, not Saudi-localised) plus the competitors' own sites. These findings are not rankings.

**What wins broad queries** ("engineering consultants Riyadh", "مكاتب هندسية بالرياض"): directories and lists (Bayut lists, albanknote, mourjan and haraj classifieds, ProTenders, Dun & Bradstreet, magicpin). Consultancy websites rarely hold the top results for these. msp.sa did not appear even for a brand + domain query, which is consistent with an unverified, young site.

| Tier | Firms | What they have that MSP lacks | MSP's opening |
|---|---|---|---|
| Local (Riyadh offices) | OCE/Otaishan, Albwardi, Dar Al Mashoura, Al Hamdan, Canadian Consultant, Azaz Architects, Omarina | Years of directory presence and backlinks; some have long project lists | Bilingual, fast, structured site; service + sector + project depth is rare at this tier |
| National | Omrania (Egis), Dar Al-Handasah, Saud Consult | Sector pages (Omrania: `/project/type/…`), 11 service pages, insights, large portfolios, strong backlinks | Arabic. Omrania's site has no Arabic version, so Arabic service and sector queries are more open |
| International reference | SOMA, Buro Happold, HOK | Thought leadership, named authors, research pages | Model for insights with named authors (§8); not direct competitors for Riyadh villas and compounds |

**Gaps to close, in order:** (1) Search Console and GBP, so MSP is findable for its own name; (2) project depth (§5); (3) directory citations (§7); (4) named-author insights; (5) a commercial sector page once tagged.

## 11. Organic dashboard

Templates: `docs/analytics/MSP-MONTHLY-REPORT-TEMPLATE.md`, `MSP-LEAD-LOG-TEMPLATE.csv`; setup: `MSP-MEASUREMENT-SETUP.md`.

| Panel | Source | Metric | Available when |
|---|---|---|---|
| Visibility | Search Console | impressions, clicks, CTR, average position; by page, query, country (SA/EG), language folder (`/ar/`) | after TXT verification + ~2 weeks |
| Index health | Search Console | indexed vs submitted (sitemap), coverage errors | after verification |
| Engagement | GA4 (consented users only) | organic sessions, engaged sessions, key pages | after legal approval + ID |
| Lead actions | GA4 events | `generate_lead`, `phone_click`, `email_click`, `whatsapp_click`, by landing page | same |
| **Business outcome** | Lead log (manual) | Inquiries → Qualified Leads → Won Projects, source = organic | now (log every inquiry) |

Engagement is not the goal. The headline metric is **Qualified Leads from organic search**, using the agreed definitions (Inquiry, Qualified Lead, Won Project). GA4 under-counts because of consent; the lead log is the source of truth.

A Looker Studio dashboard (free) can join Search Console and GA4 once both exist. Building it before there is data adds nothing.

## 12. Continuous SEO system

**Built in:**

- Sitemap regenerated on every build from what is actually served; `lastmod` from the CMS.
- Sector pages appear or disappear automatically with CMS tagging (never thin).
- CMS search checklist in the project editor (advice only, never blocks saving).
- Tests guard the structured data (no fabricated ratings or hours), FAQ schema, sector rules and bilingual copy.

**Monthly (≈1 hour, owner: marketing or the web lead):**

1. Search Console: coverage errors, new queries by page, pages with impressions but low CTR (rewrite titles and summaries).
2. Lead log: count Inquiries, Qualified Leads and Won Projects by source; note the landing page.
3. CMS: run down the project checklist for any project edited or added.
4. One insight or one project upgrade published.
5. GBP: one post, reply to new reviews.

**Quarterly:** re-check the keyword map against Search Console queries; check competitor sites for new sector or service pages; review whether a new service page is justified by **verified** projects (e.g. urban planning).

**Before every release:** `npm test`, `npm run build`, check the sitemap count and the prerendered pages for new routes.

---

## 13. 90-day roadmap

| Weeks | MSP actions (need MSP) | Site actions (code; deploy on approval) | Done when |
|---|---|---|---|
| **0–2** | Add the Search Console TXT record; tag sectors and disciplines on 5 projects; grant GBP access; set SMTP variables in Railway; delete test inquiry `58a53607-…` | Approve and deploy `seo-growth`; submit the sitemap in Search Console | Search Console verified, sitemap read, enquiry alerts arrive |
| **3–6** | Years + two description paragraphs for the 5 priority projects (villas compound, Al Munsiyah, Madinah Hotel, serviced apartments, SBC); GBP claimed, both offices; SCE/Balady/LinkedIn entries checked | Commercial sector page goes live automatically when tagged; fix whatever Search Console coverage reports | 5 projects pass the checklist; GBP live |
| **7–10** | First named-author insight (from the editorial roadmap); free directory listings (§7); legal approves privacy/consent → GA4 ID | Add GA4 ID; verify events in DebugView | First organic leads logged with a landing page |
| **11–13** | Remaining 6 projects; first client review requests after handover | First Search Console review: re-rank the keyword map; title and summary rewrites on low-CTR pages | 90-day report with **measured** baseline numbers |

## 14. What this plan will not do

- Publish volumes, rankings or traffic before they are measured.
- Create service pages for services without verified projects.
- Add fake offices, reviews, awards, client names or project figures.
- Deploy without explicit approval.
