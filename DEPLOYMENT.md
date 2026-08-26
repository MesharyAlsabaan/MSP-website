# Deploying the MSP website to production (www.msp.sa)

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
