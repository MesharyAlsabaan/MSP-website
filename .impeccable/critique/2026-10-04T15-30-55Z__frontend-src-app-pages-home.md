---
target: msp.sa homepage
total_score: 26
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/Users/mansouralsabaan/Library/CloudStorage/GoogleDrive-msalsabaan@gmail.com/My Drive/24_Web-Sites/01_MSP-Website/FrontEnd/src/app/pages/home"
timestamp: 2026-10-04T15-30-55Z
slug: frontend-src-app-pages-home
---
# Critique: msp.sa homepage (FrontEnd/src/app/pages/home)
Method: dual-agent. Score 26/32 (7, 10 n/a). Good band.
H1 3 · H2 3 · H3 3 · H4 2 · H5 2 · H6 3 · H8 3 · H9 3
Specificity: mostly authored (paper & ink monograph, coordinates, Riyadh clock, real Saudi renders); template residue = numbered eyebrow on all 10 sections, generic studio copy, no drawings/sections/plans as visual language.
Detector: 1 finding (broken-image, shared/ui/lightbox/lightbox.ts:74), false positive (matched "<img>" in a comment).
## Priority issues
- [P1] Dark mode breaks hero showcase/stats/CTA: project-showcase.ts:66 from-ink/85 + text-bg invert in .dark → milky wash, black caption. Fix: fixed --scrim/--on-scrim tokens. harden/colorize
- [P1] Team: 3 of 4 principals as initials. Fix: portraits or typographic list with credentials. clarify
- [P2] Contrast: --muted #837b6e on #f6f4ee ~3.8:1; accent 11px labels ~4.1:1; Arabic Light at 11px. Fix: muted ~#6b6458, accent text ~#9e4a2a, Arabic meta ≥13px. audit/typeset
- [P2] Arabic/RTL: localStorage-only language, SSR always English, no /ar, no hreflang; RTL arrow wrong; ragged LTR numbers in RTL columns; mixed numerals. adapt
- [P2] 10 sections, same chrome, numbering gaps 05→07→09, message repeated 3x; no climax. distill/bolder
## Perf/SEO evidence
No srcset, full-size originals 135–425 KB; 4 imgs fetchpriority=high; images duplicated 3x in DOM; LCP images only after hydration; logo 4176² 163 KB shown at 48px; no og:image; /sitemap.xml returns HTML shell.
