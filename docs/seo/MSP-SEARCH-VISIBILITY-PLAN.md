# MSP Search Visibility and Client Acquisition Plan

Date: 2026-10-20 · Market: Saudi Arabia (Riyadh first) · Goal: **more Qualified Leads from people looking to hire an engineering office**, not more visits.

## 0. What data exists (checked 2026-10-20)

| Source | Status | What it means |
|---|---|---|
| Google Search Console | **Not accessible.** No verification record on msp.sa (DNS has only the email TXT and SPF), and no Search Console connection is available to this work. No existing property could be found to reuse. | MSP's current Google keywords, clicks, impressions and positions are **unknown**. They cannot be reported yet. |
| GA4 | **Not installed.** The site's measurement ID is empty (waiting on the legal/consent decision). | No traffic or conversion data. |
| Semrush | Subscription active, but the account has **no API units**. | No volumes, difficulty or third-party rankings. |
| Google results from Saudi Arabia | Automated queries were **blocked by Google** (verification page). This was not retried. | Positions can only come from Search Console. |
| Bing (Saudi market) | Returned degraded results to automated requests (furniture shops for "مكتب هندسي"). **Discarded.** | — |
| Web index research | Works, but is not Saudi-localised. | Used **only to identify who the competitors are** and to analyse their pages, never to state positions. |

**Consequence:** this plan reports no rankings, volumes or traffic. Section 6 is the procedure that produces them as soon as Search Console is verified. It includes a report tool that turns MSP's own exports into the monthly numbers.

**One observation (not a ranking):** in the research index, msp.sa came up for an English contract-intent query ("architecture and engineering consultancy Riyadh villa design firm"), described as a multidisciplinary studio from 2010 with a Cairo branch. The content is being read correctly.

## 1. Who MSP is competing with in Saudi search

These are the firms whose pages answer the Arabic and English "hire an office" queries in Riyadh, analysed from their own pages (2026-10-20).

| Group | Firms | How their pages compete | What MSP should take from it |
|---|---|---|---|
| **A. Riyadh offices that win Arabic commercial queries** | Expert Consult (expertconsult.sa), Abak (abak.com.sa), Binan (binan-co.com), GEC (gec.sa), Al-Odaib (aso-eng.com), Qeema Group (qeema-group.com) | H1 is the query itself ("مكتب هندسي بالرياض", "أفضل مكتب تصميم هندسي بالرياض"); 700–1,500 words; phone and WhatsApp on every page; FAQ; heavy focus on **permits (رخص البناء)** and villas. Several self-describe as "the best" and two mark up self-awarded star ratings. | Match the query in the title and H1 (**done**). Keep it factual: no "best" claims and no self-awarded ratings (Google treats self-serving review markup as spam). |
| **B. Design-led architecture firms, closest to MSP's positioning** | Abdullah AlZeer + Partners (abdullahzeerarch.com), Aljeel Architects (aljeel-arch.com), MA Engineering Consultancy (ma.sa), Mahaba (mahabaify.com) | One page per building type (villas, hotels, offices…), 1,800–1,950 words on service pages, project case studies with area and scope (e.g. MA: "Rafadah Villa, ~1,400 m², architecture, landscape, supervision"). Mostly English-first. | MSP's Arabic is an advantage here. The gap is **project facts** (year, area, scope) and **depth on service pages**. |
| **C. Large national consultancies** | Omrania (Egis), Dar Al Mashoura, Saud Consult | Win on brand and landmark portfolios, not on villa or office queries. Omrania's site is English-only. | Not the battle for villa or compound clients. Arabic content is an opening even against them. |

**"أفضل مكتب …" (best office) queries** are answered mostly by **list articles** written by group-A firms about themselves. MSP shouldn't copy that. The legitimate route is to be **included** in independent lists and directories (§5, citations) and to have a Google Business Profile with genuine reviews.

## 2. The 20 commercial target keywords

Contract intent only: someone choosing an office, not someone learning a topic. Machine-readable copy (used by the report tool): `docs/seo/msp-target-keywords.json`. **No volumes are given because none are measured.** Priority reflects MSP's verified work and the commercial value of the client type.

| # | Keyword | Lang | Target page | Priority | Why this page |
|---|---|---|---|---|---|
| 1 | مكتب تصميم معماري بالرياض | AR | `/ar/services/architectural-design` | P1 | Title and H1 now say exactly this |
| 2 | مكتب هندسي بالرياض | AR | `/ar` | P1 | Generic; the home page carries the firm |
| 3 | مكتب استشارات هندسية بالرياض | AR | `/ar` | P1 | Home title already targets it |
| 4 | تصميم فلل بالرياض | AR | `/ar/projects/sector/residential` | P1 | The villa evidence page (H1 now names villas and Riyadh) |
| 5 | مكتب إشراف هندسي بالرياض | AR | `/ar/services/construction-supervision` | P1 | Villa owners hiring a supervising consultant |
| 6 | مكتب تصميم داخلي بالرياض | AR | `/ar/services/interior-design` | P1 | Verified hotel, serviced-apartment and residential interiors |
| 7 | شركة استشارات هندسية ومعمارية | AR | `/ar/about` | P2 | "Company" wording; About carries the firm profile |
| 8 | مكتب تصميم إنشائي بالرياض | AR | `/ar/services/structural-engineering` | P2 | |
| 9 | تصميم كهروميكانيكي | AR | `/ar/services/mep-engineering` | P2 | |
| 10 | تصميم مجمعات سكنية | AR | `/ar/projects/sector/residential` | P2 | Developers (Al Munsiyah, villas compound) |
| 11 | تصميم فنادق | AR | `/ar/projects/sector/hospitality` | P2 | Madinah Hotel |
| 12 | تصميم مباني تجارية بالرياض | AR | `/ar/projects/sector/commercial` | P3 | **Page appears once 2 projects are tagged Commercial** |
| 13 | architectural design firm riyadh | EN | `/services/architectural-design` | P1 | |
| 14 | engineering consultancy riyadh | EN | `/` | P1 | |
| 15 | villa design riyadh | EN | `/projects/sector/residential` | P2 | |
| 16 | interior design consultancy riyadh | EN | `/services/interior-design` | P2 | |
| 17 | construction supervision consultant riyadh | EN | `/services/construction-supervision` | P2 | |
| 18 | structural engineering design riyadh | EN | `/services/structural-engineering` | P3 | |
| 19 | mep design consultant riyadh | EN | `/services/mep-engineering` | P3 | |
| 20 | hotel design saudi arabia | EN | `/projects/sector/hospitality` | P3 | |

Arabic leads (12 of 20) because Saudi clients commissioning villas and compounds mostly search in Arabic. Brand queries (MSP, منصور السبعان) are tracked separately in the report.

**One search need MSP may be able to serve: building permits («استخراج رخصة بناء»).** Group-A competitors build much of their commercial traffic on permits. The site currently says only "coordination of authority submissions". **If MSP issues permits through Balady as part of its services, confirm it**, and it becomes a strong section on the architectural page. If not, leave it alone.

## 3. What changed on the site (branch `seo-visibility`, not deployed)

| Page | Before | After |
|---|---|---|
| 5 service pages: title | «خدمات التصميم المعماري في الرياض» | «مكتب تصميم معماري في الرياض \| MSP» (and «مكتب تصميم داخلي…», «مكتب تصميم إنشائي…», «مكتب إشراف هندسي…»; EN "Architectural Design Firm in Riyadh", "Construction Supervision Consultant in Riyadh") |
| 5 service pages: H1 | «التصميم المعماري» | Same words as the title: service, office, Riyadh. Same font, size and layout. |
| Service descriptions | General | Name the project types MSP has actually designed (villas, compounds, hotels, serviced apartments, commercial) and end with a call to action |
| Service FAQ | 3–4 questions | +1–2 contract questions per page, each answered from a verified fact: one team for architecture, structure, MEP and interiors; work outside Riyadh (Madinah hotel, Cairo office); structural design for villas and compounds; supervision of villas (villas compound) |
| Service → sector links | None | Links to the relevant published sector pages |
| Footer (every page) | No service links | A "Services" column linking all five service pages, in the same style as "Navigate" |
| Residential sector H1 | «المشاريع السكنية» | «مشاريع الفلل والمجمعات السكنية في الرياض» |
| Hospitality sector H1 | «مشاريع الضيافة» | «مشاريع الفنادق والشقق المخدومة» |

Before this change, the home page linked only 3 of the 5 service pages (interior design and supervision weren't in the CMS service list). Now every page links to all five.

**Unchanged:** the home H1 (the brand line), the Project Showcase, the design, and all URLs.

## 4. What the five service pages still need to compete

The remaining gap against groups A and B is **depth and proof**, and both need MSP input:

| Need | Why it matters for a client choosing an office | From MSP |
|---|---|---|
| Real project facts on the related projects (year, area, scope, status) | Clients compare experience; competitor case studies show area and scope | Years for 7 projects, areas where publishable (see `docs/content/MSP-PROJECT-DESCRIPTIONS-READY.md`) |
| A trust strip: Saudi Council of Engineers classification and licence, years active, offices | Group A shows "معتمد" (licensed) prominently | Classification grade and licence number to publish |
| What the client receives at each stage, and what to prepare before the first meeting | Reduces hesitation before contacting | Approve or edit a draft (I can draft it from the approved scope) |
| Permits, if MSP offers it | Strongest commercial theme in Arabic results | Yes/no |
| Six project descriptions | Gives project pages substance | **Not published** until MSP confirms each matches the real project, as instructed |

**Visualisations.** Renders are acceptable on the site but must not look like photos of built work. Project images currently carry no caption either way. Recommended: once MSP confirms per project which images are renders, add «تصوّر معماري / Architectural visualisation» in the project's description or image captions. That's an editorial change in the CMS, not code.

## 5. Beyond the website (where many commercial clicks happen)

1. **Google Business Profile for Riyadh (and Cairo).** For "مكتب هندسي بالرياض", Google shows a map pack above the organic results. Claim and verify both listings with the same name, address and phone as the site. Use the categories *Architect* or *Engineering consultant*, real photos, and **genuine** reviews from clients after handover. No incentives and no fake reviews.
2. **Citations:** Saudi Council of Engineers registry, Balady classification, LinkedIn, and free inclusion requests to independent lists (e.g. Bayut, albanknote). Paid placements need a management decision.
3. **Track every inquiry** in the lead log with its `landing_page` (new column) so organic Qualified Leads can be counted.

## 6. Monthly dashboard: real data only

**Tool:** `tools/seo/monthly-report.mjs` (no API keys, no estimates).

1. Search Console → Performance → Search results → last 28 days (or calendar month) → filter *Country = Saudi Arabia* → **Export → CSV**. Unzip into a folder (`Queries.csv`, `Pages.csv`).
2. Export the lead log as CSV.
3. Run: `node tools/seo/monthly-report.mjs --gsc <folder> --leads <lead-log.csv> --month 2026-11 [--prev <last month's folder>]`

The report gives:
1. Visibility: clicks, impressions, average position, brand vs non-brand.
2. The 20 targets: matching queries, clicks, impressions and position, with the change since last month.
3. **Opportunities:** commercial queries in positions 4–20, ranked by impressions, each with the page to improve. Informational queries ("ما هو…", "what is…") are excluded.
4. Arabic vs English pages.
5. **Leads:** Inquiries → Qualified Leads → Won Projects by channel, and Qualified Leads by landing page.

**Headline metric: Qualified Leads from organic search per month.** Clicks and positions explain it; they don't replace it.

**Acting on opportunities:** for a commercial query at position 4–20, improve the page the report names. Use the query's wording in the title, H1 or first paragraph if it reads naturally, add one internal link with that anchor from a related page, and add a verified fact or FAQ answer the query implies. Don't create a new page unless the query has no matching page **and** MSP has real projects for it.

## 7. 90-day plan (ordered by expected commercial effect)

| When | Action | Owner | Done when |
|---|---|---|---|
| Week 1 | Approve and deploy `seo-visibility` | MSP → deploy | Live titles and H1s verified |
| Week 1 | **Verify Search Console** (Domain property, DNS TXT) and submit `https://www.msp.sa/sitemap.xml` | MSP (DNS) | Search Console shows "Success" |
| Week 1–2 | Claim and verify **Google Business Profile** (Riyadh, then Cairo) | MSP | Listing live with website link |
| Week 2 | Tag Sectors and Disciplines on the 5 untagged projects; confirm the 6 descriptions and publish them | MSP editor | CMS checklist green for those fields; commercial sector page appears |
| Week 2–3 | Confirm: permits yes/no; SCE classification and licence to publish; years of 7 projects | MSP | Answers recorded |
| Week 3–4 | Service-page depth: trust strip + "what you receive" + "what to prepare", drafted from approved scope, approved by MSP | Web + MSP | ~800+ useful words per page, no unverified claims |
| Week 4 | Start the lead log with `landing_page`; GA4 once legal approves | MSP | Every inquiry logged |
| **Week 5–6** | **First Search Console export → first real report.** Record the baseline (positions, impressions, clicks for the 20 targets) | Web | Baseline report filed |
| Week 6–8 | Work the opportunity list: top 5 commercial queries in positions 4–20 | Web | Changes deployed with approval |
| Week 6–10 | Citations (SCE, Balady, LinkedIn, list inclusion requests); first genuine client reviews on GBP | MSP | Listings live |
| Week 8–10 | If permits are confirmed, add the permits section; if Search Console shows demand MSP can serve with no matching page, propose it with evidence | Web + MSP | Approved or declined with reason |
| Week 12–13 | Second and third monthly reports; compare against baseline; re-rank the 20 targets on real data | Web | 90-day report: Qualified Leads from organic, measured |

## 8. What this plan will not do

- Report rankings, volumes or traffic before Search Console provides them.
- Claim "best" or "leading", or add self-awarded star ratings.
- Publish the six project descriptions before MSP confirms them, or change the three flagged projects' location or classification without confirmation.
- Create pages or articles without a measured search need and verified content.
- Deploy without approval.
