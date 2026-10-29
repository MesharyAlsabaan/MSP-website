# Project sync: Google Drive → www.msp.sa

Twice a day, at 08:00 and 19:00 Riyadh time, the backend reads the projects folder on Google Drive. For each new folder it prepares a ready-to-review draft:

- the images, checked;
- the facts, each marked with where it came from;
- bilingual text.

Projects a person has approved are then published, the website is rebuilt once, the live pages are checked, and a report is emailed.

- Code: `BackEnd/src/modules/project-sync/`.
- Admin screen: **Admin → Project sync** (`/admin/project-sync`).
- API: `/api/project-sync/*`, for content managers and super admins.

## How it works

```
Drive folder ─► detect ─► draft ──────────────────────► review in the admin ─► publish ─► one website rebuild ─► live check ─► report
 (01_PROJECTS)   by Drive    images checked + previewed      edit, confirm,         images to       Railway (or a           canonical,    email +
                 ID + hash   facts with their source         approve / postpone /   uploads, record deploy hook)            hreflang,     history
                             text written by the AI          reject                 in the CMS table                        sitemap
```

The sync runs inside the backend service, because uploads live on the backend's disk. It needs no new service and no new database.

**Facts and text are kept apart.**

| | Where it comes from | Shown as |
|---|---|---|
| Title, location, year, status, sectors, design categories, scope | You (the admin editor), the optional `_REGISTER` sheet, or the existing site record | **Verified** |
| The same facts read from the folder name (e.g. `17_private-twin-villa-riyadh` → "Private Twin Villa", "Riyadh, Saudi Arabia", Residential) or suggested by the AI | Folder name / AI | **Suggested**: must be confirmed at approval |
| Summary and description, English and Arabic | Written by the AI from the facts and what the images visibly show | **AI draft**: published only after approval |
| What the AI saw in the images | AI | Shown to the reviewer, never published |

**The AI never adds facts.** Its text is checked before it is kept: any number that is not in the facts, or any claim about an area, award, certification, client, contractor, cost or sustainability, gets the text discarded. The wrong script or mismatched paragraph counts do too. If that happens, the draft says so, and you write the text or press *Redraft*.

**Nothing is published without approval of the exact draft.** Approving stores a fingerprint of the draft. Any later change, whether yours or new files in Drive, needs a new approval.

Approval comes from either:

- the admin: **Approve & publish now**, or **Approve for next run**; or
- the register's `approved_for_web` = `YES`. This works only when every key fact is verified (written in the sheet or confirmed in the admin).

A project needs all of the following before it can be approved:

- English and Arabic titles;
- English and Arabic locations;
- at least one sector and one design category;
- English and Arabic summaries;
- at least 3 usable images (`PROJECT_SYNC_MIN_IMAGES`).

## Using the admin screen

**The overview** shows the queues as tiles:

- **New projects detected**
- **Pending approval**: new projects plus updates to live pages
- **Ready to approve**
- **Published by the sync**
- **Errors**

It also shows:

- **Schedule**, with *Pause automation* and *Resume automation*;
- **Last run**;
- **Connections**: Google Drive, website rebuild, email report, AI drafting.

*Run now* starts a sync immediately. *Rehearse* runs one without writing anything.

The tabs are *New projects*, *Pending approval*, *Published*, *Errors*, *On hold* (postponed and rejected), *Existing* (folders matched to projects already on the site) and *History*. History holds every run's report, exactly as it was emailed.

**A project's review page** has five parts:

- **To complete before approval**: what blocks it. **Suggested facts to confirm**: what you must confirm. **Notes**: warnings, image problems and AI notes.
- **Preview** in English or Arabic (right to left), the way the page will read.
- **Facts**: each field is labelled *Verified*, *From the register*, *Suggested · folder name* or *Suggested · AI*. Hover over a label to see why the value is what it is. Taxonomy is picked with the same chips as in *Projects*.
- **Text**: the summaries (with a character count; 70–170 characters reads best in search results) and the descriptions, with a blank line between paragraphs.
- **Gallery**: every source image, with *Use*, *Make cover*, its size, and why an image can't be used (too small, unreadable). The first 24 usable images are selected by default (`PROJECT_SYNC_MAX_GALLERY`).

The decision buttons are:

- **Approve & publish now**. Publishing starts at once. The page counts as *Published* once the website has rebuilt and the live check passes, usually 10–20 minutes later.
- **Approve for next run**
- **Postpone** (*Not now*, for an update) and **Reject** (*Discard update*, for an update; the live page stays as it is)
- **Reopen**
- **Retry now**
- **Redraft text with AI**. Your own text is kept.
- **Undo last update**. This puts the live record back to how it was before the sync's last change.

When suggested facts are present, a confirmation tick is needed before approving: *I confirm the facts above are correct … and that these images are cleared for the public website.*

## The register (optional `_REGISTER` Google Sheet in 01_PROJECTS)

The register is a correction and bulk-approval tool, not a second CMS. Only the `folder` column is required, and an empty cell changes nothing. Values in the sheet count as verified and take priority over suggestions, but never over edits made in the admin.

| Column | Notes |
|---|---|
| `folder` | Exact folder name, e.g. `16_rihana-plaza-commercial-building` |
| `approved_for_web` | `YES` approves (text and images cleared for the public site). `LATER` postpones. `REJECT` never publishes. Empty means you decide in the admin. |
| `title_en`, `title_ar`, `location_en`, `location_ar`, `year`, `status_en`, `status_ar` | Corrections |
| `sectors`, `design_categories`, `disciplines` | Taxonomy keys, comma-separated. Sectors: `residential`, `hospitality`, `commercial`, `work`, `culture`, `education`, `space`, `sports`, `health`. Categories: `architecture`, `interiors`, `landscape`, `planning`, `products`. Disciplines: `architectural-design`, `engineering-design`, `interior-design`, `supervision`, `project-management`. |
| `summary_en`, `summary_ar`, `description_en`, `description_ar` | Studio text. It replaces the AI's text; a single language given here is translated. |
| `cover` | Image file name to lead with |
| `exclude` | Image file names to leave out, separated by `;` |
| `site_slug` | Links this folder to a project that is already on the site |

Leave out anything you can't confirm, such as client names, areas, dates, awards or certifications. The sync never adds them.

## Rules that protect the live site

- **Existing projects** are matched by slug, by number or by `site_slug`. They are *linked* and never modified; the CMS stays their owner. Today that covers folders 05–15. New files in their folders are only reported.
- **Edits made in the CMS win.** If someone changes a project in *Projects* after the sync published it, an approved update from Drive is not applied; it is reported under *Needs attention*.
- **Nothing is deleted.** A folder that disappears from Drive is flagged, and its project stays live.
- **No partial publishing.** The project record is written only after every image has been stored. If publishing fails part-way, that attempt's images are removed and the live record stays as it was. Failed publishing is retried on every run, up to 5 times, then waits for *Retry now*.
- **Undo.** Before each update the record is snapshotted, and *Undo last update* restores it.
- **Images.** JPG, PNG or WebP files, found up to 5 sub-folders deep.
  - The long edge must be at least 1200 px.
  - Identical files are used once.
  - The published copy is the same picture, re-encoded to WebP and only downscaled to a 2560 px long edge: no crop, no retouching, no generative edits.
  - Files are named `<slug>-01.webp`, …, with the usual responsive copies.
- **Unapproved images stay private.** Their previews are kept outside the public uploads folder (`PROJECT_SYNC_PREVIEW_DIR`) and are served only to signed-in admins.
- **"Published" means verified live.** A project counts as published only when all of these pass:
  - the API record;
  - both prerendered pages: a self canonical, en/ar hreflang, no `noindex`;
  - the cover image;
  - the sitemap.

## Schedule and locking

- **Times.** Slots are `PROJECT_SYNC_TIMES` (default `08:00,19:00`), in Riyadh time, which is UTC+3 all year. The timer runs in the backend process, so it works whether or not anyone's computer is on.
- **Each slot runs once.** A run is keyed by its slot (e.g. `2026-10-30T05:00Z`), which is unique in the database. A Postgres advisory lock stops two runs overlapping, so replicas, restarts, or *Run now* during a scheduled run cannot run anything twice.
- **Catch-up.** If the service was down at a slot, it runs that slot after it starts again, as long as the slot is less than 6 hours old.
- **Interrupted runs.** A run still marked *running* after 2 hours (for example, after a redeploy mid-run) is closed as interrupted. The next run picks up the unfinished work.
- **Pausing.** *Pause automation* stops scheduled runs. Each skipped slot is recorded in History. Manual runs still work.

## Configuration (Railway → backend service → Variables)

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | yes | Key of the Google Cloud service account: raw JSON, or base64 of it |
| `PROJECT_SYNC_DRIVE_FOLDER_ID` | yes | `18NLK-TUscfsuZVtCqD6W_s4HZPlInYDI` (01_PROJECTS) |
| `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_FRONTEND_SERVICE_ID` | yes | Start the frontend rebuild. The token is a project token for the production environment. |
| `PROJECT_SYNC_NOTIFY_TO` | recommended | Report recipients (defaults to `INQUIRY_NOTIFY_TO`). Uses the existing `SMTP_*` and `MAIL_FROM` settings. |
| `ANTHROPIC_API_KEY` | recommended | Turns on AI drafting: suggestions plus bilingual text. Without it, drafts have folder-name suggestions and empty text. Roughly US$0.05–0.10 per new project on `claude-opus-5-5` ($4 / $20 per million tokens); pay-as-you-go API billing, separate from any Claude subscription. |
| `PROJECT_SYNC_PREVIEW_DIR` | recommended | Private folder for preview images, outside the uploads folder. Defaults to `./project-sync-previews`. Losing it is harmless: previews are remade on demand. |
| `PROJECT_SYNC_TIMES` | | Default `08:00,19:00` (Riyadh) |
| `PROJECT_SYNC_SCHEDULE` | | `off` stops the timer; manual runs still work |
| `PROJECT_SYNC_MIN_IMAGES` / `PROJECT_SYNC_MAX_GALLERY` | | Default `3` / `24` |
| `PROJECT_SYNC_VERIFY_MINUTES` | | How long a run waits for the rebuilt pages (default 25). Anything still unverified is checked on the next run. |
| `PROJECT_SYNC_AI_MODEL` | | Default `claude-opus-5-5` |
| `PROJECT_SYNC_REBUILD_WEBHOOK` (+ `_SECRET`) | staging | A deploy-hook URL used instead of Railway |
| `PROJECT_SYNC_SITE_ORIGIN` / `PROJECT_SYNC_CANONICAL_ORIGIN` | staging | Where pages are fetched from, and what their canonical should say. Both default to `https://www.msp.sa`. |

No secret is ever written to logs, reports or the admin screen: the Drive label shows only the folder ID and the service account's email.

### Granting Drive access (least privilege, about 10 minutes, once)

1. Go to <https://console.cloud.google.com/> and create a project (e.g. *msp-website-sync*). This needs no billing.
2. Under **APIs & Services → Library**, enable the **Google Drive API**.
3. Under **IAM & Admin → Service accounts**, create a service account (e.g. *msp-drive-sync*) and give it no project roles.
4. Open the service account, go to **Keys → Add key → Create new key → JSON**, and download the key.
5. In Google Drive, right-click **01_PROJECTS → Share**, add the service account's email (`…@….iam.gserviceaccount.com`) as **Viewer**, and untick *Notify*.
6. In Railway → backend → Variables:
   - paste the whole key file into `GOOGLE_SERVICE_ACCOUNT_JSON`;
   - set `PROJECT_SYNC_DRIVE_FOLDER_ID` = `18NLK-TUscfsuZVtCqD6W_s4HZPlInYDI`.

The account can read that one folder and nothing else, and it can't change anything. To revoke access, remove it from the folder's sharing, or delete the key.

### Railway rebuild token

1. In Railway, open the project, then **Settings → Tokens**, and create a *project token* for the **production** environment.
2. Set the four `RAILWAY_*` variables on the backend. The IDs are in the dashboard URL: `/project/<projectId>/service/<serviceId>?environmentId=<environmentId>`. Use the **frontend** service's ID.

## Database

The three tables (`project_sync_runs`, `project_sync_items`, `project_sync_control`) are created by the migration `BackEnd/src/database/migrations/1793291187147-ProjectSyncTables.ts`. They are not created by `DB_SYNCHRONIZE`.

- **At startup**, pending migrations run before anything else (`migrationsRun`, each in its own transaction). The migration only creates these three tables; it touches no existing table or row. After it, `synchronize` (if on) finds nothing to change in them.
- **By hand:**
  - `npm run migration:show`
  - `npm run migration:run`
  - `npm run migration:revert`
  - In the production image, use `npm run migration:run:prod` and `npm run migration:revert:prod`.
- **Rollback:** `migration:revert` drops exactly the three sync tables. Do this only after removing or disabling the module, or the next start will create them again. Projects published by the sync are ordinary rows in `projects` and stay.

## Testing

| What | Command | Notes |
|---|---|---|
| Unit tests | `cd BackEnd && npm test` | Planner, drafting rules, AI-output checks, images, report, schedule |
| PostgreSQL integration | `cd BackEnd && TEST_DB_PORT=5432 TEST_DB_USERNAME=… TEST_DB_PASSWORD=… npm run test:integration` | Creates and drops its own database. Covers: migration up/down/up with a data checksum; drafting real image folders; approval rules; publishing to a fake site that goes live only after a rebuild; updates and undo; CMS-edit protection; postpone/reject; failure rollback and retry; missing folders; register approval; slot uniqueness, the lock, pausing, and interrupted runs. |
| Admin interface | `cd FrontEnd && npx ng test --watch=false` | Overview and review-page component tests. On Node 25+, add `NODE_OPTIONS=--no-experimental-webstorage` (Node's own `localStorage` shadows jsdom's). |
| Rehearse against a folder | `npm run project-sync:dry-run -- "<path to 01_PROJECTS>" --images` | No database or credentials; shows each folder's action and starting suggestions |

## Recovery

| Symptom | What to do |
|---|---|
| Run failed with a Drive error | Check that 01_PROJECTS is still shared with the service account and that its key still exists |
| A project is "Awaiting live check" for hours | Railway → frontend → Deployments → latest build log. It is rechecked every run. |
| Wrong content went live | *Undo last update*, or fix the draft and approve again, or edit or unpublish it in *Projects* (the sync then leaves it alone) |
| Publishing failed 5 times | Fix the cause shown, then *Retry now* |
| Everything should stop | *Pause automation* (or set `PROJECT_SYNC_SCHEDULE=off`) |
