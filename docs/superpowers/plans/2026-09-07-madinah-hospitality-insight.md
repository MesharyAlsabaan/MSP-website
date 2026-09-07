# Madinah Hospitality Insight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a professional bilingual article experience and publish-ready Madinah Hotel hospitality content with an internal image gallery and SEO fields.

**Architecture:** Extend the existing blog record with a backwards-compatible `gallery: string[]`, expose existing SEO fields in the frontend model/admin, and add a lazy-loaded detail route. A small pure parser converts plain CMS body text with `##` headings and blank-line paragraphs into safe display blocks; no HTML is stored or injected.

**Tech Stack:** Angular 21, NestJS 10, TypeORM/PostgreSQL, Vitest, Jest, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-07-madinah-hospitality-insight.md`

## Global Constraints

- Preserve all existing project, team, contact, taxonomy, and hero content.
- Do not invent hotel facts that the user has not confirmed.
- Restaurant imagery is part of the Madinah Hotel article, not a separate project.
- Keep all existing blog records compatible when new fields are missing.
- Push code only to GitHub; do not operate Railway manually.

---

### Task 1: Blog media contract

**Files:**
- Modify: `BackEnd/src/modules/blog/entities/blog-post.entity.ts`
- Modify: `BackEnd/src/modules/blog/dto/create-blog-post.dto.ts`
- Modify: `FrontEnd/src/app/core/models/content.model.ts`
- Modify: `FrontEnd/src/app/pages/admin/blog/blog-admin.ts`
- Test: `BackEnd/src/modules/blog/dto/create-blog-post.dto.spec.ts`

**Interfaces:**
- Produces: optional-compatible `gallery: string[]` and editable localized SEO fields.

- [ ] Write a DTO validation test proving a gallery accepts strings and rejects non-strings.
- [ ] Run the test and confirm it fails because gallery is not validated.
- [ ] Add the `jsonb` gallery column, DTO validation, frontend fields, and repeating admin upload rows.
- [ ] Run backend tests and confirm they pass.

### Task 2: Safe article body rendering and route

**Files:**
- Create: `FrontEnd/src/app/pages/blog/article-body.ts`
- Create: `FrontEnd/src/app/pages/blog/article-body.spec.ts`
- Create: `FrontEnd/src/app/pages/blog/blog-detail.ts`
- Modify: `FrontEnd/src/app/app.routes.ts`
- Modify: `FrontEnd/src/app/app.routes.spec.ts`
- Modify: `FrontEnd/src/app/pages/blog/blog-page.ts`

**Interfaces:**
- Produces: `parseArticleBody(body: string): ArticleBlock[]` and public route `/blog/:slug`.

- [ ] Write parser tests for `##` headings, paragraphs, blank input, and literal HTML text.
- [ ] Write a route test proving `blog/:slug` precedes the wildcard.
- [ ] Run the targeted tests and confirm the missing parser/route failures.
- [ ] Implement the parser, detail page, route, card navigation, SEO updates, and gallery/lightbox.
- [ ] Run targeted frontend tests and confirm they pass.

### Task 3: Publish-ready article seed and verification

**Files:**
- Modify: `BackEnd/src/database/seeds/seed.ts`

**Interfaces:**
- Produces: bilingual Madinah Hotel article copy that can be seeded without overwriting unrelated records.

- [ ] Add the approved Arabic and English article, excerpt, body, SEO title, and SEO description without unconfirmed facts.
- [ ] Run all frontend and backend tests.
- [ ] Run production builds for frontend and backend.
- [ ] Review the diff for scope, commit the isolated branch, integrate that commit into `main`, and push GitHub only.

