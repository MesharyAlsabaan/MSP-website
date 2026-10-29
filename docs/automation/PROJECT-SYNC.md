# Project sync: Google Drive → www.msp.sa

The Google Drive folder **01_PROJECTS** is the single source of truth for project pages. Everything in it is approved by the owner for publication: **the folder is the approval**. Nobody has to approve, fill in a sheet or press a button for routine publishing.

Twice a day, at 08:00 and 19:00 Riyadh time, the backend reads the folder and:

- **publishes every new project folder** as a new project page, in English and Arabic;
- **keeps every page in step with its folder**: new, changed and replaced images, and facts that change in the folder name;
- **keeps the 11 projects that were on the site before** in step with their folders' images, without touching their text;
- rebuilds the website once, checks every changed page live, and emails a detailed report.

Where to find it:

- Code: `BackEnd/src/modules/project-sync/`.
- Admin screen: **Admin → Project sync** (`/admin/project-sync`), for corrections, hold, undo and history.
- API: `/api/project-sync/*`, for content managers and super admins.

## How it works

```
Drive folder ─► detect ─────► read the folder ──────────────► publish ──────────────► one website rebuild ─► live check ─► report
 (01_PROJECTS)   by Drive ID    facts from the folder name      new page, or only         Railway (or a           canonical,    email +
                 + content      images checked, de-duplicated   what changed, keeping     deploy hook)            hreflang,     history
                 hash           text written by the AI          every CMS edit                                    sitemap
```

The sync runs inside the backend service, because uploads live on the backend's disk. It needs no new service and no new database.

### What is published, and where it comes from

| | Comes from | Notes |
|---|---|---|
| Title | The folder name: `17_private-twin-villa-riyadh` → "Private Twin Villa" | Short words without vowels are written as acronyms (`sbc` → "SBC") |
| Location | A city at the end of the folder name: `…-riyadh` → "Riyadh, Saudi Arabia" / "الرياض، المملكة العربية السعودية" | Riyadh, Jeddah, Madinah, Makkah, Dammam, Khobar, Cairo. No city in the name: **no location**, reported as missing. |
| Sector | Words in the folder name (villa → Residential, hotel → Hospitality, plaza → Commercial, office → Work, …) | None recognised: **no sector**, reported as missing |
| Design category | Architecture; Interiors when the name says *interior* or the folder has an `INT`/`Interiors` sub-folder | |
| Arabic title | The AI's Arabic rendering of the English title | Without the AI: the English title is shown on the Arabic page, reported as missing |
| Summary and description, English and Arabic | Written by the AI from the facts above and what the images visibly show | Without the AI: a one-line factual summary (*"Rihana Plaza — an architecture project by MSP in Cairo, Egypt."*), reported as missing |
| Images | Every usable image in the folder, up to 5 sub-folders deep | See *Images* below |

**Nothing is invented.** Year, status, client, area, scope and anything else the folder does not say are left empty and listed under *Missing details* in the report. You can add any of them in the admin; your values then win over the folder name.

**The AI adds no facts.** It only renders the title and location in Arabic and writes the text. Its text is checked before it is kept: any number that is not in the facts, or any claim about an area, award, certification, client, contractor, cost or sustainability, gets the text discarded. The wrong script, or mismatched paragraph counts, do too. The factual summary is then used and the report says why.

**A folder is not published** only when a page cannot exist: the name is not `NN_project-name`, or there is no usable image. It is listed under *Not published yet* and retried every run.

### Images

- JPG, PNG or WebP. The long edge must be at least 1200 px.
- **No duplicates.** Identical files are used once. The same picture saved twice (a smaller export, a PNG beside the JPEG, a copy in another sub-folder) is recognised by its look, not its bytes, and only the largest is used. Renders of the same view in another light (sunset / dusk) or another iteration are different pictures and are kept. An image already on the page (for example uploaded by hand in *Projects*) is never uploaded again.
- **Render passes** (CoronaLight, VRayLight, mask and texture layers) are not used.
- The first 24 usable images make the gallery (`PROJECT_SYNC_MAX_GALLERY`); the rest are listed in the admin.
- The published copy is the same picture, re-encoded to WebP and only downscaled to a 2560 px long edge: no crop, no retouching, no generative edits. Files are named `<slug>-01.webp`, …, with the usual responsive copies.
- **A replaced image** (same file updated in Drive, or a new file with the same name) replaces its old version **in the same position** on the page. The old file stays on disk for *Undo*.
- An image removed from a sync page's folder is taken off that page.

### The projects that were on the site before

Folders that match a project already on the site (by slug, or by its number) are **linked** to it, never duplicated. Today that covers folders 05–15.

- On first sight, the sync only records which folder images are already on the page. It adds nothing, so curated galleries stay as they are. The report says, for each, how many folder images are already on the page.
- From then on, **images added to the folder are added to the page, and replaced images replace their old version**.
- Their **text is never changed**: titles, summaries, descriptions, client names and all other fields stay as written in *Projects*.

## Rules that protect the live site

- **Page URLs never change.** A published folder keeps its URL even if the folder is renamed.
- **Edits made in the CMS are kept, field by field.** The sync remembers what it last wrote. A field someone has since changed in *Projects* (title, summary, …) is left alone, and the report lists it under *Kept CMS edits*. The other fields still follow the folder. Images someone added in the CMS stay; images someone removed are not brought back.
- **Edits made in the admin screen win over the folder name**, and are published at the next run (or at once with *Publish now*).
- **Nothing is deleted.** A folder that disappears from Drive is reported, and its project stays live.
- **No partial publishing.** The project record is written only after every image has been stored. If publishing fails part-way, that attempt's images are removed and the live record stays as it was. Failed publishing is retried on every run, up to 5 times, then waits for *Retry now*.
- **Undo.** Before each update the record is snapshotted; *Undo last update* restores it. The undo stands until the folder changes again.
- **No duplicate projects.** A folder is identified by its Drive ID; the slug is checked again just before a project is created; two folders cannot claim one slug or one existing project.
- **"Published" means verified live.** A project counts as published only when all of these pass: the API record; both prerendered pages (self canonical, en/ar hreflang, no `noindex`); the cover image; the sitemap.

## Using the admin screen

Nothing waits for a decision here. The screen is for checking, correcting, holding and undoing.

**The overview** shows tiles: *Published by the sync*, *With missing details*, *Not publishable yet*, *Existing projects in step*, *Errors*. It also shows the schedule (with *Pause automation*), the last run, and the connections (Google Drive, website rebuild, email report, AI drafting).

- *Run now* runs a sync immediately. *Rehearse* runs one without writing anything.
- Tabs: *Published*, *Missing details*, *Not publishable*, *Errors*, *On hold*, *Existing projects*, *History*. History holds every run's report, exactly as it was emailed.

**A project's page** has:

- **Published automatically** (or what stops it), **Missing details**, and **Notes** (image problems, duplicates, AI notes).
- **Preview** in English or Arabic (right to left).
- **Facts**, each labelled with where it came from: *From the folder name*, *Edited in the admin*, *AI · Arabic rendering*.
- **Text**: summaries (70–170 characters reads best in search results) and descriptions, with a blank line between paragraphs.
- **Gallery**: every source image, with *Use*, *Make cover*, its size, and why an image is not used.

Its buttons:

- **Publish now** / **Publish changes now**: publish at once instead of at the next run.
- **Hold**: keep a project off the site, or stop updating a live page from its folder. **Resume** undoes it.
- **Retry now**, **Rewrite text with AI** (your own text is kept), **Undo last update**.

An existing (linked) project's page shows its folder images only; its text is edited in *Projects*.

## Schedule and locking

- **Times.** Slots are `PROJECT_SYNC_TIMES` (default `08:00,19:00`), in Riyadh time, which is UTC+3 all year. The timer runs in the backend process on Railway, so it works whether or not anyone's computer is on.
- **Each slot runs once.** A run is keyed by its slot (e.g. `2026-10-30T05:00Z`), which is unique in the database. A Postgres advisory lock stops two runs overlapping, so replicas, restarts, or *Run now* during a scheduled run cannot run anything twice.
- **Catch-up.** If the service was down at a slot, it runs that slot after it starts again, as long as the slot is less than 6 hours old.
- **Interrupted runs.** A run still marked *running* after 2 hours (for example, after a redeploy mid-run) is closed as interrupted. The next run picks up the unfinished work.
- **Pausing.** *Pause automation* stops scheduled runs. Each skipped slot is recorded in History. Manual runs still work.

## Configuration (Railway → backend service → Variables)

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | **yes** | Key of the Google Cloud service account: raw JSON, or base64 of it |
| `PROJECT_SYNC_DRIVE_FOLDER_ID` | **yes** | `18NLK-TUscfsuZVtCqD6W_s4HZPlInYDI` (01_PROJECTS) |
| `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_FRONTEND_SERVICE_ID` | recommended | Start the frontend rebuild right after publishing. Without them, new pages work at once through the app but are prerendered (and added to the sitemap) only at the next website deploy; the report says so. |
| `ANTHROPIC_API_KEY` | recommended | Full English and Arabic descriptions and Arabic titles. Without it, pages get the one-line factual summary; once it is set, those pages are upgraded automatically at the next run. Roughly US$0.05–0.10 per project on `claude-opus-5-5` ($4 / $20 per million tokens); pay-as-you-go API billing, separate from any Claude subscription. |
| `PROJECT_SYNC_NOTIFY_TO` | | Report recipients. Defaults to `INQUIRY_NOTIFY_TO`. Uses the existing `SMTP_*` and `MAIL_FROM` settings. |
| `PROJECT_SYNC_PREVIEW_DIR` | | Private folder for admin preview images, outside the uploads folder. Defaults to `./project-sync-previews`. Losing it is harmless: previews are remade on demand. |
| `PROJECT_SYNC_TIMES` | | Default `08:00,19:00` (Riyadh) |
| `PROJECT_SYNC_SCHEDULE` | | `off` stops the timer; manual runs still work |
| `PROJECT_SYNC_MAX_GALLERY` | | Default `24` |
| `PROJECT_SYNC_VERIFY_MINUTES` | | How long a run waits for the rebuilt pages (default 25). Anything still unverified is checked on the next run. |
| `PROJECT_SYNC_AI_MODEL` | | Default `claude-opus-5-5` |
| `PROJECT_SYNC_REBUILD_WEBHOOK` (+ `_SECRET`) | staging | A deploy-hook URL used instead of Railway |
| `PROJECT_SYNC_SITE_ORIGIN` / `PROJECT_SYNC_CANONICAL_ORIGIN` | staging | Where pages are fetched from, and what their canonical should say. Both default to `https://www.msp.sa`. |

No secret is ever written to logs, reports or the admin screen: the Drive label shows only the folder ID and the service account's email.

### Granting Drive access (least privilege, about 10 minutes, once)

1. Go to <https://console.cloud.google.com/> and create a project (e.g. *msp-project-sync*). This needs no billing.
2. Under **APIs & Services → Library**, enable the **Google Drive API**.
3. Under **IAM & Admin → Service accounts**, create a service account (e.g. *msp-project-sync*) and give it no project roles.
4. Open the service account, go to **Keys → Add key → Create new key → JSON**, and download the key.
5. In Google Drive, share **01_PROJECTS** with the service account's email (`…@….iam.gserviceaccount.com`) as **Viewer**.
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
| Unit tests | `cd BackEnd && npm test` | Planner, folder facts, fallback text, AI-output checks, image fingerprints, field and gallery merging, report, schedule |
| PostgreSQL integration | `cd BackEnd && TEST_DB_PORT=5432 TEST_DB_USERNAME=… TEST_DB_PASSWORD=… npm run test:integration` | Creates and drops its own database. Covers: migration up/down/up with a data checksum; automatic publishing of real image folders to a fake site that goes live only after a rebuild; duplicate and near-duplicate images; linking an existing project without changes, then syncing its new and replaced images; updates that keep CMS edits; admin corrections and *Publish now*; hold/resume; undo; failure rollback and retry; folders that cannot be published; AI text arriving later; missing folders; slot uniqueness, the lock, pausing, and interrupted runs. |
| Admin interface | `cd FrontEnd && npx ng test --watch=false` | Overview and project-page component tests. On Node 25+, add `NODE_OPTIONS=--no-experimental-webstorage` (Node's own `localStorage` shadows jsdom's). |
| Rehearse against a folder | `npm run project-sync:dry-run -- "<path to 01_PROJECTS>" --images` | No database or credentials; shows each folder's action and what its name gives |

## Recovery

| Symptom | What to do |
|---|---|
| Run failed with a Drive error | Check that 01_PROJECTS is still shared with the service account and that its key still exists |
| A project is "Awaiting live check" for hours | Without the Railway token, it is checked again after the next website deploy. With it: Railway → frontend → Deployments → latest build log. It is rechecked every run. |
| Wrong content went live | *Undo last update*; correct it in the admin; or *Hold* the folder. Editing it in *Projects* also works: the sync keeps your edit. |
| A folder should not be on the site | *Hold — keep off the site* (before it is published), or unpublish it in *Projects* and *Hold* the folder |
| Publishing failed 5 times | Fix the cause shown, then *Retry now* |
| Everything should stop | *Pause automation* (or set `PROJECT_SYNC_SCHEDULE=off`) |
