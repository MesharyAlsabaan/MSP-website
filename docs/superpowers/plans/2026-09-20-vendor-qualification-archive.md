# Vendor Qualification + Office Archive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A vendor registers on msp.sa, the team reviews/approves in the admin, and an office-side agent archives the approved snapshot into the company network folders and Excel registers — automatically, idempotently, resumably.

**Architecture:** New `vendors` NestJS module (entities + migrations + public/admin/archive controllers) with a swappable `DocumentStorage` and a `MailService`; new Angular pages (public register/resume, admin vendors); new `ArchiveAgent/` Node service that pulls leased jobs over HTTPS, verifies files, lays out folders, writes Excel, and acknowledges completion.

**Tech Stack:** NestJS 10, TypeORM 0.3 (migrations, `synchronize=false`), Postgres 16, multer, nodemailer, Angular 20, Node 22 + TypeScript, exceljs, jest.

**Spec:** `docs/superpowers/specs/2026-09-20-vendor-qualification-archive-design.md`

## Global Constraints

- `synchronize` is off everywhere; every schema change is a migration in `BackEnd/src/database/migrations/`.
- No vendor data or documents in git: `vendor-docs/`, `mail-outbox/`, `ArchiveAgent/test-archive/`, `ArchiveAgent/state/` are gitignored.
- Vendor documents are never served by `useStaticAssets`; only authenticated/keyed endpoints stream them.
- Vendor review/approval: `SUPER_ADMIN` and `VENDOR_REVIEWER` only.
- Numbers: `SUP-000123` (vendor), `REQ-2026-0042` (application, fixed across revisions v1/v2/…).
- Approval = one DB transaction that also inserts the archive job.
- Archive agent never deletes; previous approved versions are moved to `_إصدارات سابقة/`.
- Local testing only: test schema in local Postgres, local archive folder, file mail transport.

---

### Task 0: Migrations baseline (supporting work, already approved)
**Files:** `BackEnd/src/database/migrations/*-Baseline.ts`, `BackEnd/package.json` (scripts), `BackEnd/Dockerfile`, `docker-compose*.yml`, `BackEnd/src/database/seeds/seed.ts`, `DEPLOYMENT.md`, `BackEnd/.env.example`.
**Interfaces:** Produces `npm run migration:{generate,run,revert,show}` (ts-node) and `migration:run:prod` (dist). A `migrate` compose service that must succeed before `backend` starts.
- [ ] Generate baseline from an empty schema (`DB_SCHEMA=baseline_gen`), verify `migration:generate` against a restored copy of `deploy/msp_db.sql` reports no changes, `migration:show` lists only Baseline, then `--fake`.
- [ ] Data source honours `DB_SCHEMA` (default `public`) so isolated test schemas work without CREATEDB.
- [ ] Document the production baseline step (backup → verify restore → `migration:run --fake` BEFORE the first start of the new image).

### Task 1: Vendor domain — entities, enums, migration, seed data
**Files:** `BackEnd/src/modules/vendors/entities/*.entity.ts` (vendor, application, revision, stored-file, revision-document, review-event, archive-job, completion-token, category, document-requirement, archive-agent-key), `BackEnd/src/modules/vendors/vendor.enums.ts`, `BackEnd/src/common/enums/role.enum.ts` (+`VendorReviewer`), migration `*-Vendors.ts`, `BackEnd/src/database/seeds/vendor-categories.seed.ts`.
**Interfaces:** Produces enums `QualificationStatus`, `ArchiveStatus`, `ReviewAction`, `RevisionDecision`; entities as in spec §3.
- [ ] Write entities, generate migration, run on test schema, run seed (8 categories with requirements).

### Task 2: Numbering + state machine (pure logic, TDD)
**Files:** `vendors/numbering.service.ts` (+spec), `vendors/qualification.rules.ts` (+spec).
**Interfaces:** `NumberingService.nextVendorNumber(qr) → 'SUP-000123'`, `nextRequestNumber(qr, year) → 'REQ-2026-0042'`; `assertTransition(current, action)`; `canVendorResubmit(status)`.
- [ ] Tests: format/padding, per-year counter, transitions allowed/denied (approved & rejected are terminal for the vendor path; only `needs_completion` allows resubmission).

### Task 3: Storage layer + file validation (TDD)
**Files:** `vendors/storage/document-storage.ts` (interface + token), `vendors/storage/local-disk.storage.ts` (+spec), `vendors/file-validation.ts` (+spec: magic bytes for pdf/png/jpg/zip-based docx/xlsx, size limits), `configuration.ts` (`vendorDocs.dir`, limits).
**Interfaces:** `DocumentStorage.put(key, buffer|stream) / get(key) / stat(key) / exists(key)`; `validateUpload(file, limits) → { ok, mime } | throws`.
- [ ] Content-addressed key = `sha256[0..2]/sha256[2..4]/sha256` ; putting the same bytes twice keeps one file.

### Task 4: Mail service
**Files:** `BackEnd/src/modules/mail/mail.module.ts`, `mail.service.ts` (+spec), templates in `mail/templates/*.ts`.
**Interfaces:** `MailService.send({to, subject, text, html})`; `notifyTeamNewSubmission(app)`, `sendCompletionRequest(app, link, missing)`, `sendDecision(app, decision)`. File transport when `SMTP_HOST` unset → `mail-outbox/<ts>-<subject>.eml`.

### Task 5: Public vendor API
**Files:** `vendors/public/vendors-public.controller.ts`, `vendors/vendors.service.ts`, DTOs (`submit-application.dto.ts`, `resume-application.dto.ts`), `vendors/completion-token.service.ts` (+spec), throttle override.
**Interfaces:** `POST /vendors/applications` multipart(fields JSON in `data`, files `documents[]` + `documentTypes[]`), `GET/POST /vendors/applications/resume/:token`, `GET /vendors/categories`.
- [ ] Integration test (supertest) on test schema: submit → 201 `{requestNumber, vendorNumber}`; required-doc missing → 400; oversized → 413; resume with used token → 410.

### Task 6: Review (admin) API
**Files:** `vendors/admin/vendors-admin.controller.ts`, `vendors/review.service.ts` (+spec), DTOs.
**Interfaces:** list/detail/document download; `request-completion`, `approve`, `reject`; categories & requirements CRUD; archive keys CRUD; archive status + retry.
- [ ] Approve runs in `dataSource.transaction`; test that a forced failure inserting the job rolls back the decision.

### Task 7: Archive API (service key)
**Files:** `vendors/archive/archive-key.guard.ts` (+spec), `vendors/archive/archive.controller.ts`, `vendors/archive/archive-jobs.service.ts` (+spec).
**Interfaces:** per spec §9; lease returns `{ leaseToken, expiresAt, manifest }`; ordering rule tested (older pending job for same vendor blocks lease).

### Task 8: Frontend — public pages
**Files:** `FrontEnd/src/app/pages/vendors/register/…`, `pages/vendors/resume/…`, `core/services/vendors.service.ts`, routes, translations (ar/en).
- [ ] Reactive form, category → required docs list, per-doc file inputs, size/type checks client-side, success screen with numbers.

### Task 9: Frontend — admin vendors
**Files:** `pages/admin/vendors/list`, `pages/admin/vendors/detail`, `core/data/admin-nav.ts`, `core/services/admin-api.service.ts`.
- [ ] Detail: data, documents (download), revisions, event log, decision buttons with note/missing-items, archive status panel + retry.

### Task 10: ArchiveAgent
**Files:** `ArchiveAgent/package.json`, `tsconfig.json`, `src/config.ts`, `src/api-client.ts`, `src/lock.ts` (+spec), `src/state.ts` (+spec), `src/naming.ts` (+spec), `src/layout.ts` (+spec), `src/download.ts` (+spec), `src/excel/register.ts` (+spec), `src/excel/vendor-file.ts`, `src/shortcuts.ts`, `src/archiver.ts` (+spec, step machine), `src/main.ts`, `config.example.json`, `README.md`.
**Interfaces:** `runOnce(ctx)` processes all leasable jobs; `processJob(ctx, job)` resumes from `state.jobs[jobId].lastStep`.
- [ ] Tests with a temp archive root and a mocked API: full run; crash after `downloaded` then resume; register locked (EBUSY) → job stays at `register`, retried, no duplicate rows; same job twice → no changes; newer revision → previous moved to `_إصدارات سابقة`.

### Task 11: End-to-end local journey + SMB checks
**Files:** `BackEnd/test/e2e/vendor-journey.e2e-spec.ts`, `scripts/demo-journey.ps1`.
- [ ] Register → completion → resubmit → approve → agent run → folder + Excel verified; disconnect/resume; duplicate run; re-approval v2.
- [ ] Rename/replace + `.url` shortcut test on `\\Server\...\14_Portal MSP\99_Archive\_smb-test`.

### Task 12: Docs
**Files:** `ArchiveAgent/README.md` (install as Windows service, config, monitoring, rollback), `docs/vendor-portal-operations.md` (Railway env vars, keys, deploy/rollback), spec §13 questions list.
