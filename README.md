# MSP Design — Website

Enterprise website for MSP, a Saudi **architecture & engineering** consultancy.
Bilingual (EN/AR, full RTL), premium editorial design, dynamic CMS-backed content.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Angular 21 (SSR), Tailwind v4, signals, standalone components |
| Backend | NestJS 10, TypeORM, PostgreSQL, JWT + RBAC, Swagger |
| DevOps | Docker, Docker Compose, Nginx reverse proxy |

## Repository layout

```
FrontEnd/        Angular app — public site + admin CMS (nginx.conf for serving)
BackEnd/         NestJS REST API (projects, services, team, blog, testimonials,
                 partners, contact, settings, uploads, auth, users)
content/         Client content-collection kit (Excel tracker + image folders)
docker-compose.yml
prd.md           Product requirements
```

## Run the whole stack (recommended)

Requires Docker Desktop.

```bash
cp .env.example .env          # then edit secrets
docker compose up --build     # builds db + backend + frontend (nginx)
```

> The `frontend` container is nginx: it serves the static Angular build and
> reverse-proxies `/api` to the backend, so the whole site is on port 80.

Then, once the containers are healthy, seed the database with demo content:

```bash
docker compose exec backend node dist/database/seeds/seed.js
```

Open:
- **Site:** http://localhost
- **Admin CMS:** http://localhost/admin (redirects to login)
- **API:** http://localhost/api
- **Swagger docs:** http://localhost/api/docs

Admin login: the seed creates `admin@msp.sa` with the password from `SEED_ADMIN_PASSWORD` (required in production). Change it in the panel after first login.

## Run services individually (development)

**Backend** (needs a local PostgreSQL — see `BackEnd/.env`):
```bash
cd BackEnd
npm install
npm run seed        # create admin + demo content
npm run start:dev   # http://localhost:3000/api  (Swagger at /api/docs)
```

**Frontend:**
```bash
cd FrontEnd
npm install
npm start           # http://localhost:4200
```

## Status

- [x] **A. Frontend foundation** — Angular SSR, theming, i18n, guards, services.
- [x] **B. Public website** — all pages, bilingual + RTL, premium design.
- [x] **C. Admin CMS** — login, dashboard, and management screens for projects,
  services, team, testimonials, partners, blog, messages, settings, users.
- [x] **D. Backend API** — NestJS, 11 modules, JWT+RBAC, Swagger, uploads, seed.
- [x] **E. DevOps** — Dockerfiles, Compose, nginx static serving + API proxy.

> Verified offline: backend `npm run build` + 8 unit tests pass; frontend
> `npm run build` succeeds (admin CMS compiles, 18 routes prerendered). Full
> end-to-end runtime needs PostgreSQL — use the Docker stack above (no local
> Postgres/Docker was available in the build environment to run it live).
