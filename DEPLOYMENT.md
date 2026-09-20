# Deploying the MSP website to production (www.msp.sa)

> **Current production runs on Railway** (backend + frontend services, Railway
> Postgres). The Docker Compose / DigitalOcean walkthrough further down is the
> self-hosted alternative and still works. The migrations section applies to
> both.

## Database migrations (read this before any deploy)

Since 2026-09-20 the schema is owned by TypeORM migrations in
`BackEnd/src/database/migrations/`. `synchronize` is **off** everywhere
(`DB_SYNCHRONIZE` defaults to false; set it to `true` only on a developer
machine). Migrations run as a **separate deploy step** that must succeed before
the app starts — a failed migration never boots the app.

| Command (in `BackEnd/`) | What it does |
|---|---|
| `npm run migration:show` / `:show:prod` | List applied `[X]` and pending `[ ]` migrations |
| `npm run migration:run` / `:run:prod` | Apply pending migrations (`:prod` uses `dist/`) |
| `npm run migration:generate -- src/database/migrations/<Name>` | Diff entities vs database → new migration file |
| `npm run migration:baseline` / `:baseline:prod` | **One-time**: mark `Baseline` as applied on a database that was built by the old auto-sync, without touching its tables |
| `npm run migration:revert` | Roll back the last migration |

### One-time baseline of an existing production database — BEFORE the first start of the new image

The current production database was created by `synchronize: true`; its tables
already exist. The new image must never try to create them. Do this **once**,
with the old version still running, in this order:

1. **Backup and prove it restores.** `pg_dump` the production database, restore
   the dump into a scratch database/schema, and check row counts match. Confirm
   free space for the dump and for at least one more. Do not continue without
   a restore that worked.
2. **Record the baseline** against production (no schema changes are made):
   - Railway: `railway run --service backend npm run migration:baseline:prod`
     (or run it from a one-off shell with the production `DB_*` variables).
   - Compose: `docker compose -f docker-compose.prod.yml run --rm migrate npm run migration:baseline:prod`
   The script refuses to act unless the database looks like an un-baselined
   legacy database (the `users` table exists and no migration is recorded), so
   it cannot be run twice or on an empty database by mistake.
3. **Apply the remaining migrations** (`ReconcileLegacyColumns` is idempotent —
   `ADD COLUMN IF NOT EXISTS` — so it is safe whether or not auto-sync already
   added those columns): `npm run migration:run:prod` in the same way.
4. **Verify no drift**: `npm run migration:generate -- src/database/migrations/DriftCheck`
   must print *No changes in database schema were found*. If a file is
   generated instead, read it, delete it, and stop — the entities and the live
   schema disagree and that difference must be reviewed before going further.
5. Only now deploy the new image. From then on every deploy runs pending
   migrations automatically (below).

This exact sequence was rehearsed locally on a restored copy of
`deploy/msp_db.sql` (see the 2026-09-20 hosting assessment): baseline recorded
→ 5 legacy columns reconciled → no drift → data intact → second baseline
refused.

### Every deploy after that

- **Railway:** set the backend service's **Pre-deploy command** to
  `npm run migration:run:prod`. Railway runs it against the new build before
  swapping traffic; if it fails the deploy is marked failed and the previous
  deployment keeps serving. With several replicas the command still runs once
  per deploy, not once per replica.
- **Compose:** the `migrate` service runs `migration:run:prod` and `backend`
  has `depends_on: migrate: condition: service_completed_successfully`, so
  `docker compose up -d --build` applies migrations first and starts the app
  only on success.

### Rollback

`npm run migration:revert` (one step at a time) then redeploy the previous
image. Migrations that would destroy data (dropping a column with content)
must not be written with a destructive `down()`; `ReconcileLegacyColumns` is
deliberately a no-op on revert.

This puts the site live on the internet so the admin can be updated from any computer.
Stack: Docker Compose → Postgres + NestJS backend + Angular/nginx frontend + Caddy (automatic HTTPS).

---

## 0. What you need before starting
- A DigitalOcean droplet running **Ubuntu 24.04** and its **IP address** (e.g. `164.92.10.20`).
- Access to your **domain DNS** settings (where msp.sa is managed).
- The file `.env.production` from this project (contains the production secrets).

---

## 1. Point the domain at the server (DNS)
In your domain registrar / DNS panel for **msp.sa**, add two records pointing at the droplet IP:

| Type | Name  | Value (your droplet IP) |
|------|-------|--------------------------|
| A    | `www` | `164.92.10.20`           |
| A    | `@`   | `164.92.10.20`           |

> DNS can take a few minutes to a couple of hours to propagate. HTTPS will not
> work until `www.msp.sa` actually resolves to the server, so do this first.

---

## 2. Log into the server
From your PC's terminal:
```bash
ssh root@164.92.10.20
```
Enter the root password you set when creating the droplet.

---

## 3. Install Docker (one time)
Paste this on the server:
```bash
curl -fsSL https://get.docker.com | sh
```

---

## 4. Copy the project up to the server
**Easiest option — clone or upload the project**, then from the project folder copy the
production secrets file into place as `.env`:

```bash
# (inside the project folder on the server)
cp .env.production .env
```

> If you prefer, upload the whole `14_MSP_Website` folder with `scp` or any SFTP
> tool (e.g. WinSCP) into `/root/msp` on the server.

---

## 5. Build and start everything
From the project folder on the server:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
First build takes a few minutes. Check it's running:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 6. Get the content into the database (one time only)

Pick **one** of the two — not both.

### 6a. Move the content you already entered locally (recommended)
The `deploy/` folder in this project holds an export of your local site:
`msp_db.sql` (all records, users and passwords included) and `uploads/` (every
image you uploaded through the admin). Upload that folder to the server next to
`docker-compose.prod.yml`, then:

```bash
# 1. Load the records into the production database
docker compose -f docker-compose.prod.yml exec -T db   psql -U msp -d msp_db < deploy/msp_db.sql

# 2. Copy the uploaded images into the backend's volume
docker compose -f docker-compose.prod.yml cp deploy/uploads/. backend:/app/uploads/

# 3. Confirm — should print the same counts you had locally
docker compose -f docker-compose.prod.yml exec db   psql -U msp -d msp_db -c "select count(*) from team_members;"
```

> Do **not** run the seed afterwards: your export already contains the admin
> account and every user, with their existing passwords.

To refresh the export from your PC later, re-run:
```bash
pg_dump -h localhost -U msp -d msp_db --no-owner --no-privileges -f deploy/msp_db.sql
```

### 6b. Start from the sample content instead
Only if you want a clean site with the starter records:
```bash
docker compose -f docker-compose.prod.yml exec backend node dist/database/seeds/seed.js
```

---

## 7. Done — visit the site
- Public site: **https://www.msp.sa**
- Admin login: **https://www.msp.sa/admin**
  - Email: `admin@msp.sa`
  - Password: the one you already use locally if you followed 6a — or the
    `SEED_ADMIN_PASSWORD` from your `.env` if you seeded (6b).
  - Every other account you created (editors, content managers) comes across
    with 6a and signs in with the same password as before.

Caddy fetches the HTTPS certificate automatically the first time someone visits —
allow a few seconds on the very first load.

---

## Everyday operations

**Update the site after code changes** (re-upload code, then):
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**View logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

**Back up the database:**
```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U msp msp_db > backup_$(date +%F).sql
```

**Stop / start:**
```bash
docker compose -f docker-compose.prod.yml down     # stop
docker compose -f docker-compose.prod.yml up -d     # start
```

---

## Security notes (already handled in the prod config)
- Database and backend are **not** exposed to the internet — only Caddy's ports 80/443 are.
- Strong random DB password, JWT secrets, and admin password are set in `.env`.
- HTTPS is automatic and auto-renews via Caddy/Let's Encrypt.
- **After first login, change the admin password** in the admin UI if you want one you'll remember.
- Keep `.env` private; never commit it to git.
