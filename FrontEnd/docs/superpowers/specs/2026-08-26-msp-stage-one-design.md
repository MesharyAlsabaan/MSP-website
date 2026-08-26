# MSP Stage One Completion Design

## Goal

Complete the first production-readiness pass for the MSP Angular site without changing approved content, visual identity, or unrelated Git changes.

## Approved scope

- Add an accessible mobile navigation menu that supports RTL/LTR and closes on navigation, Escape, and outside click.
- Route the home hero calls to action to `/contact` and `/projects` through Angular Router.
- Add a public `/team` page backed by `PublicContentService.team()` and the existing bilingual team model.
- Remove bundled sample projects from the home experience; show loading and empty states while using only API projects after the request resolves.
- Update stale `SeoService` tests to the production brand `MSP — Architecture + Engineering`.
- Preserve all approved project, team, contact, and copy data except the explicitly approved stage-one corrections.

## Approved data corrections

- Project 06: `Private Residential Compound` / `مجمع سكني خاص`.
- Project 08: `Al Ateeq Real Estate — Commercial Office` / `العتيق العقارية — تجاري مكتبي`, slug `al-ateeq-real-estate-commercial-office`.
- Projects 09–11 use the same public title `Private Residential Villa` / `فيلا سكنية خاصة`; their internal slugs remain unique.
- Unverified project years must not be shown.
- Delete only the empty duplicate `ABDULLAH ALHIBSHI`; keep the populated `Lead Architect` record.
- Team architect role is `Architect` / `معماري`.
- Hide zero-valued or unapproved statistics, testimonials, and partners instead of presenting fabricated content.
- Contact data remains: 2010, +966112000087, +966570327777, +201068017313, info@msp.sa, Riyadh and Cairo addresses/map.

## Constraints

- No personal client names in public project titles, URLs, SEO, or image alt text.
- No invented projects, partners, testimonials, metrics, dates, areas, scopes, or awards.
- Do not redesign the site.
- Do not discard or revert any dirty working-tree changes.
- Do not commit or push.

## Acceptance

- Mobile navigation works at 360px and 390px in Arabic and English.
- `/team` renders real API team members and no 404.
- Home CTAs use Angular Router.
- Home project sections render only API projects and never bundled samples after success or empty success.
- Missing years are omitted from cards and details.
- No duplicate Abdullah Alhibshi.
- `npm test -- --watch=false` and `npm run build` pass.
- Core public and admin routes are manually verified with no console errors or broken images.

