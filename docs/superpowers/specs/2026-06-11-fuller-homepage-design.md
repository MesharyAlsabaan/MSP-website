# Fuller Homepage — Design Spec

**Date:** 2026-06-11
**Sub-project:** B (Home page)
**Status:** Approved

## Goal

Replace the placeholder `Home` page with the full 12-section homepage described in
the PRD, using the existing design system (warm-paper/clay luxury aesthetic,
Sora + Inter, theme tokens, shared UI kit). All content is hardcoded placeholder
data until the NestJS backend exists.

## Decisions

- **Scope:** all 12 PRD sections.
- **Imagery:** CSS gradients / geometric shapes (no external assets/requests).
- **Motion:** subtle — scroll-reveal fade/rise + hover transitions, respects
  `prefers-reduced-motion`. No count-up / parallax.
- **Contact form:** UI-only (reactive form) with a local success state; no HTTP.

## Architecture

Each section is a focused standalone component under `pages/home/sections/`.
`home.ts` composes them in order. Each section owns its typed placeholder data
(readonly arrays), swappable for API calls later.

```
pages/home/
  home.ts
  sections/
    hero/ about/ services/ featured-projects/ stats/
    why-us/ testimonials/ team/ partners/ blog-preview/ cta/ contact/
shared/ui/section-heading/section-heading.ts
shared/directives/scroll-reveal.directive.ts
```

### Shared additions

- **`ScrollReveal` directive** (`appScrollReveal`): IntersectionObserver, adds a
  `.is-visible` class when the element enters the viewport. Guarded with
  `isPlatformBrowser` (SSR-safe). Reveal CSS lives in `styles.scss` and is
  neutralized by the existing `prefers-reduced-motion` block.
- **`SectionHeading` component**: eyebrow + heading + optional intro, centered or
  left-aligned, reused across sections.
- **`Section` enhancement**: add a `tone` input (`'default' | 'surface'`) to
  alternate full-width background colors for vertical rhythm.

## Sections

1. **Hero** — eyebrow, large Sora headline, subhead, two CTAs, clay-gradient
   geometric visual, small stat strip.
2. **About** — two-column: "Who we are" + brand paragraphs + capability list.
3. **Services** — 6 cards (Brand Identity, Web Design, UI/UX, Product Design,
   Design Systems, Creative Direction): inline SVG icon, title, blurb.
4. **Featured Projects** — 6 cards: CSS-gradient cover, title, category, "View case".
5. **Statistics** — 4 stats (Projects, Clients, Years, Awards), static numbers.
6. **Why Choose Us** — 4 differentiators: icon + title + text.
7. **Testimonials** — 3 quote cards: initials avatar, name, role/company, quote.
8. **Team** — 4 cards: gradient initials-avatar, name, role, social links.
9. **Partners** — muted wordmark row (styled text placeholders).
10. **Blog Preview** — 3 post cards: gradient thumbnail, category, title, date.
11. **CTA Banner** — full-width clay accent panel, headline + button.
12. **Contact** — two-column: contact info + UI-only reactive form with local
    success state.

## Conventions

- Standalone components, `ChangeDetectionStrategy.OnPush`, signals/`input()`.
- Inline Tailwind templates using existing tokens
  (`bg-bg`/`bg-surface`/`text-ink`/`text-muted`/`text-accent`/`border-border`/
  `font-display`).
- Mobile-first responsive. Header/footer unchanged.
- JSDoc comments matching the existing codebase style.
```
