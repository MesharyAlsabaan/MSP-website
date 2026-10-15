# MSP — Backend Security Release Plan (public content exposure)

Date: 2026-10-15 · Severity: **production security issue** · Status: **prepared and verified, not pushed or deployed.** Explicit approval is needed to deploy.

## 1. The issue

The public API (`https://www.msp.sa/api/...`) returned unpublished website content to anyone:

- `?includeDrafts=true` (projects, blog, services, testimonials) and `?includeInactive=true` (team, partners) were honoured for anonymous requests.
- Lookups by slug or id (`/projects/slug/:slug`, `/projects/:id`, …) returned items whatever their status.

**Confirmed on production on 2026-10-15** with read-only requests. Anyone could fetch:

- two unpublished testimonials attributed to NEOM and Qiddiya (seed data, never real);
- four inactive "partners": NEOM, Qiddiya, Diriyah Gate, Red Sea Global;
- one inactive team member.

No draft projects or articles existed at the time, but any future draft would have been exposed the same way.

## 2. The release

| | |
|---|---|
| Branch | `security/public-content-access` (local, not pushed) |
| Commit | `a897264` "Security: public content endpoints return only published items" |
| Based on | `origin/main` `612a39f` — **the code running in production**. Local `main` and the content branch are deliberately not used. |
| Scope | 15 files, all under `BackEnd/src/`. No frontend change, no dependency change, no database migration, no environment variable, no configuration change. |
| Fast-forward | Yes: the commit's only parent is `origin/main`. |

**Files:**

- `common/guards/jwt-auth.guard.ts` — public routes accept an optional bearer token. A missing or invalid token is treated as anonymous, with one exception: a request that sends a token **and** asks for drafts gets a 401 when the token is expired or invalid, so the admin refreshes its session.
- `common/auth/content-preview.ts` (new) — `canPreviewContent()`: only Super Admin, Content Manager or Editor.
- `{projects,blog,services,testimonials,team,partners}.service.ts` — the preview flags are honoured only for content staff. Lookups by slug or id filter by status unless previewing. The internal update path still loads drafts, so editing is unchanged.
- `{…}.controller.ts` (6) — pass `canPreviewContent(user)` to the service.
- `modules/public-content-access.spec.ts` (new) — tests over HTTP using the built-in `fetch`, so no new test dependencies.

## 3. Verification (on the production code base)

All checks ran on a clean extract of `origin/main` plus the commit. The final run used the committed tree itself.

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | Pass |
| All backend test suites on this base | **45 / 45 pass** (4 suites; 35 new tests) |
| Production build (`nest build`) | Pass, `dist/main.js` produced |
| Same 35 tests on **unfixed** production code | **18 fail, 17 pass.** Every leak case fails; every normal-behaviour case passes. The fix closes the leak and changes nothing else. |

**No-regression matrix (what management asked to protect):**

| Area | Evidence |
|---|---|
| **Admin content previews** | Tests: Editor, Content Manager and Super Admin list drafts with `includeDrafts=true` and open drafts by slug and by id. Production's admin uses these flags on exactly six list screens (projects, blog, services, testimonials, team, partners), always with the staff token. It also has the 401 → refresh → retry interceptor that the expired-session case relies on (checked in `origin/main` source). |
| **Authentication** | Login and refresh endpoints are unchanged (no file in the auth module touched). Protected routes take the unchanged code path; test: a write without a token is still 401. Non-content roles get no preview (test). |
| **Vendor portal** | Not part of production (`origin/main` has no vendor modules). On the development line it runs as a separate service with its own `VendorServiceAuthGuard`, which this change does not touch. |
| **Existing published content** | Tests: published items are listed, and opened by slug or id, exactly as before, for visitors, staff and stale tokens alike. |
| **Public website** | Production's frontend calls only the list endpoints without preview flags, plus slug lookups of published items (checked in `origin/main` source). Both behave identically. A visitor whose browser holds a stale staff token still gets normal pages (test). |

**Not verified here:** a run against a real PostgreSQL database. The tests use an in-memory repository that mimics the query filters. The post-deploy checks in §5 close this gap on the live system.

## 4. Deployment steps (each needs explicit approval)

1. **Review** the commit: `git show a897264` (15 files, about 370 lines, a third of them tests).
2. **Publish the branch.** Either push `security/public-content-access` and open a pull request into `main`, or fast-forward `origin/main` to `a897264`, which is the method used for earlier hotfixes. *Not done; needs approval.*
3. **Deploy the backend service only** on Railway. The frontend does not need to be redeployed.
4. **Do not** deploy local `main` or `seo-content-transformation` as part of this release.

## 5. Post-deployment checks (read-only)

| Request | Expected after the fix |
|---|---|
| `GET https://www.msp.sa/api/testimonials?includeDrafts=true` | `"total": 0` (before: 2) |
| `GET https://www.msp.sa/api/partners?includeInactive=true` | `"total": 0` (before: 4) |
| `GET https://www.msp.sa/api/team?includeInactive=true` | Same total as `/api/team` (before: one more) |
| `GET https://www.msp.sa/api/projects` | 11 published projects, unchanged |
| `GET https://www.msp.sa/api/projects/slug/madinah-hotel` | 200, unchanged |
| `GET https://www.msp.sa/api/projects?includeDrafts=true` with an invalid `Authorization: Bearer x` header | 401 |
| Admin: log in → Projects, Blog, Testimonials, Partners, Team | Lists load. Drafts and inactive items are visible to staff. Editing and saving work. |
| Public site: `/`, `/projects`, a project page, `/ar` | Unchanged |

## 6. Rollback

The change is code-only. To roll back, redeploy `612a39f`, or revert `a897264`. No data to restore.

## 7. Afterwards

- **Delete the fabricated seed records** in the admin (admin actions §2), so they can't be published by mistake.
- **The same fix is the first commit on `seo-content-transformation`**, so the content release includes it. Its test file differs: the development line signs tokens with `StaffTokenService` (issuer/audience) and uses `supertest`. When the development line is later reconciled with `origin/main`, keep the development-line version of `public-content-access.spec.ts`. All other files are identical.
