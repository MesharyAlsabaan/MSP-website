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

## 4. Final pre-deployment verification (2026-10-15)

| # | Check | Result |
|---|---|---|
| 1 | Branch content | 1 commit (`a897264`) on top of `612a39f`. Exactly 15 files, all under `BackEnd/src/`: 2 new, 13 modified. +339 / −71 lines. |
| 2 | Secrets, environment files, migrations, unrelated changes | None. The only secret-like string is the test file's dummy key `'test-secret'`. No `.env`, migration, entity, package, lock, Docker, Railway or nginx file is touched. Every import comes from a package production already has. |
| 3 | Production really runs `origin/main` | GitHub `main` = `612a39f` (checked against the remote). Production's live Swagger route list matches `origin/main`'s controllers **exactly: 52 of 52 routes**, with none missing and none extra. Local `main` would add 38 vendor routes that are not live. The security branch has the same 52 routes. |
| 4 | Doesn't overwrite production changes | The branch is a direct child of production's commit: a fast-forward, no merge, nothing from local `main` or the content branch. |
| 5 | Full regression on the committed branch | **99 / 99 pass**: the 45 suites on the branch, plus a 54-test release-verification suite (not committed). It boots all six public controllers and the auth controller with the real guards and signed tokens. |
| 6 | Same verification suite on unfixed production code | **27 fail, 27 pass.** Every failure is a leak: hidden items listed with the flags, opened by id or slug, a forged Super Admin token, or a non-content role. Every pass is behaviour that must not change: published content, staff preview, and all three authentication tests. |
| 7 | Authentication unchanged | Identical on both versions. Login and refresh stay public, even with a stale token. `/auth/me` returns 401 without a token, with an expired one or with a forged one, and 200 with a valid one. Writes return 401 without a token and 403 for the wrong role, and are allowed for the right role (Editor create; Content Manager delete). |
| 8 | Database | No entity changes, so a restart can't change the schema, whatever `DB_SYNCHRONIZE` is set to. No migration, no data change. |
| 9 | Rollback tested | Reverting `a897264` gives exactly production's tree (checked by tree hash; no commit made). That code passes its own tests (10 / 10) and builds. |
| 10 | Post-deploy script tested against production | `docs/audits/msp-security-verify.sh` (read-only) currently reports **9 exposures**: 2 testimonials, 4 partners, 1 team member, and `includeDrafts` with an invalid token. All 17 checks of content, auth and pages pass. After deployment, all 26 must pass. |

**Not verifiable from here:** a run against a real PostgreSQL database (none on this machine), and the Railway service settings (no Railway CLI or dashboard access). The checks in §5 and §7 cover both.

## 5. Railway pre-deployment checks (dashboard; read-only)

In Railway → MSP project → **backend** service:

1. **Settings → Source:** repository `MesharyAlsabaan/MSP-website`, branch **`main`**, root directory **`/BackEnd`**. Note whether **auto-deploy** is on.
2. **Settings → Deploy → Pre-deploy command: must be empty.** The newer guide recommends `npm run migration:run:prod`, but that script **does not exist** on this code line. If it is set, this deploy would fail. That failure is safe (the old version keeps serving), but clear the command first.
3. **Deployments:** write down the ID of the active deployment and its commit (expected `612a39f`). This is the rollback target.
4. **Frontend service:** check whether it also auto-deploys on pushes to `main`, or whether watch paths are set. If it rebuilds, its code is unchanged at `a897264` (no `FrontEnd/` file differs from `612a39f`). That is a harmless redeploy, but expect it.
5. Run `bash docs/audits/msp-security-verify.sh` once just before deploying, and keep the output as the "before" record.

## 6. Deployment procedure (each step needs explicit approval)

1. **Push:** `git push origin security/public-content-access`. This creates the branch on GitHub; nothing deploys while Railway watches `main`.
2. **Merge into `main`**, either way:
   - **(a) GitHub pull request** `security/public-content-access` → `main`, merged as a **fast-forward or rebase**. This keeps `main` = `a897264`.
   - **(b) Command line:** `git push origin security/public-content-access:main`. This succeeds only as a fast-forward and is refused if `main` has moved.
3. **Deploy:** with auto-deploy on, Railway builds the backend from `main` (`BackEnd/Dockerfile`: `npm ci`, `nest build`, `node dist/main.js`). Otherwise, Deployments → **Deploy** the latest commit. No variables or volumes change.
4. **Watch the build and deploy logs** until the new deployment is Active and the logs show `Nest application successfully started`.
5. **Run the post-deployment verification** (§7) within minutes.

**Don't** push local `main` or `seo-content-transformation` in the same operation.

## 7. Post-deployment verification

```
bash docs/audits/msp-security-verify.sh https://www.msp.sa
```

Expected: `RESULT: ALL CHECKS PASS` (26 checks, exit code 0).

The same checks, written out as individual commands:

```
curl -s "https://www.msp.sa/api/testimonials?pageSize=100&includeDrafts=true" | grep -o '"total":[0-9]*'   # "total":0  (before: 2)
curl -s "https://www.msp.sa/api/partners?pageSize=100&includeInactive=true"    | grep -o '"total":[0-9]*'   # "total":0  (before: 4)
curl -s "https://www.msp.sa/api/team?pageSize=100&includeInactive=true"        | grep -o '"total":[0-9]*'   # "total":31 (before: 32)
curl -s -o /dev/null -w '%{http_code}\n' https://www.msp.sa/api/testimonials/aab74e6a-c609-41a5-a904-e330dbc8be81   # 404 (before: 200)
curl -s -o /dev/null -w '%{http_code}\n' https://www.msp.sa/api/partners/e82249b2-940c-4b24-a75f-6327e4301915       # 404 (before: 200)
curl -s -o /dev/null -w '%{http_code}\n' -H 'Authorization: Bearer invalid' "https://www.msp.sa/api/projects?includeDrafts=true"  # 401
curl -s "https://www.msp.sa/api/projects?pageSize=100" | grep -o '"total":[0-9]*'   # "total":11 (unchanged)
curl -s -o /dev/null -w '%{http_code}\n' https://www.msp.sa/api/projects/slug/madinah-hotel   # 200
curl -s -o /dev/null -w '%{http_code}\n' https://www.msp.sa/api/auth/me                       # 401 (unchanged)
```

**Manual admin check:** sign in at `https://www.msp.sa/admin`. Open Projects, Blog, Services, Testimonials, Partners and Team: each list loads, and the hidden testimonials, partners and the inactive team member are **visible** to staff. Edit and save one item (then undo).

**If any check fails, roll back (§8).**

## 8. Rollback procedure (tested)

The release is code-only, so rollback restores the previous code. There is nothing in the database to undo.

1. **Fastest (Railway):** backend service → Deployments → the previous deployment (commit `612a39f`, recorded in §5.3) → **Redeploy** / **Rollback**. Then run `msp-security-verify.sh`: the content, auth and page checks must pass, and the leak checks will report the exposure again.
2. **Git, so that `main` matches what runs:** `git revert a897264` on `main` and push. Its tree equals `612a39f`'s exactly, and that code builds and passes its tests (verified).
3. Admin preview, published content and authentication behave the same before and after the fix, so a rollback changes nothing for users except reopening the exposure.

## 9. Recommendation

**GO — conditional.** The code is ready: minimal, isolated, verified on production's own code line and fully reversible. Deploy once:

1. the Railway checks in §5 are done (pre-deploy command empty; rollback target recorded); and
2. management gives explicit approval to push, merge and deploy.

Without those two, the status is **NO-GO**.

## 10. Afterwards

- **Delete the fabricated seed records** in the admin (admin actions §2), so they can't be published by mistake.
- **The same fix is the first commit on `seo-content-transformation`**, so the content release includes it. Its test file differs: the development line signs tokens with `StaffTokenService` (issuer/audience) and uses `supertest`. When the development line is later reconciled with `origin/main`, keep the development-line version of `public-content-access.spec.ts`. All other files are identical.
