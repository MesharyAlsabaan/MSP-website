# MSP Organic Growth Program — Progress Log

Purpose: let work continue across sessions. Update this file with every commit on the program branch.

- **Branch:** `seo-growth` (from `main` 7dbcf0e).
- **Not deployed.** Production deploys only on explicit approval. Merging into `main` triggers Railway.

## Data availability (checked 2026-10-19)

| Source | Status | Consequence |
|---|---|---|
| Google Search Console | Not verified (no TXT record on msp.sa) | No impressions, clicks or rankings. **The baseline is pending.** |
| GA4 | No measurement ID; legal and consent review pending | No traffic or conversion data. |
| Semrush | No API units; management decided not to buy | No volumes or difficulty. |
| Live search observation | Web search tool (US-based results, not Saudi-localized) | Qualitative only: who ranks and which page types win. |

**Rule:** no search volume, ranking, traffic or conversion figure appears in any document until it is measured.

## Phase status

| # | Phase | Status | Notes / commit |
|---|---|---|---|
| 1 | SEO audit | Done (Oct 15), refreshed here | `docs/audits/MSP-WEBSITE-BASELINE-AUDIT.md`; gap update in `MSP-SEO-GROWTH-PLAN.md` |
| 2 | Keyword research | Qualitative map exists; topic clusters added | `docs/seo/MSP-KEYWORD-MAP.md` + plan §2 |
| 3 | Site architecture | 5 service pages live; FAQ, project images and sector pages on this branch | see commits below |
| 4 | Portfolio SEO | Related projects on project pages (branch); facts need MSP input | `docs/content/MSP-PROJECT-INFORMATION-REQUEST.md` |
| 5 | Technical SEO | Prerender, canonical, hreflang, sitemap live; sitemap `lastmod` on branch | |
| 6 | Structured data | Org/WebSite/Service/CreativeWork/Article/FAQ live; ProfessionalService, Person and service FAQPage on branch | |
| 7 | Local SEO | Strategy and citation list | plan §7 (needs GBP access) |
| 8 | Content authority | Roadmap exists; no articles published without MSP authorship | `docs/content/MSP-INSIGHTS-EDITORIAL-ROADMAP.md` |
| 9 | Internal linking | Live, extended on branch (sector pages, related projects) | |
| 10 | Competitor analysis | Qualitative (non-local results) | plan §10 |
| 11 | Dashboard | Specification + templates; needs GSC and GA4 | `docs/analytics/*` + plan §11 |
| 12 | Continuous system | CMS SEO checklist in admin (branch) + maintenance calendar | plan §12 |

## Commits on `seo-growth`

(Appended as work lands.)

## Open items needing MSP

1. Search Console verification (TXT record): instructions in `docs/analytics/MSP-MEASUREMENT-SETUP.md` §1.
2. GA4 ID after legal and privacy approval: same file §2 and §4.
3. CMS: set **Sectors** on the 5 projects without one (3 private villas, 2 mixed-use). This automatically fills the sector pages.
4. Google Business Profile access: plan §7.
5. Approval to deploy this branch.
