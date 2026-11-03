# MSP Backend (NestJS)

REST API for the MSP Design website and admin CMS.

## Setup

```bash
npm install
cp .env.example .env     # adjust DB creds / secrets
```

Requires a running PostgreSQL matching `.env`. With Docker:
```bash
docker run --name msp-db -e POSTGRES_USER=msp -e POSTGRES_PASSWORD=msp_password \
  -e POSTGRES_DB=msp_db -p 5432:5432 -d postgres:16-alpine
```

## Commands

| Command | What |
|---|---|
| `npm run start:dev` | Dev server with watch (`http://localhost:3000/api`) |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled build |
| `npm run seed` | Create admin user + demo content (idempotent) |
| `npm test` | Unit tests |

Swagger UI: `http://localhost:3000/api/docs`.

## Architecture

- **Global response envelope** — every success is wrapped as `{ data }`;
  list endpoints return `{ data, total, page, pageSize }` (see
  `common/interceptors/transform.interceptor.ts`).
- **Auth** — `POST /api/auth/login` returns `{ accessToken, refreshToken, user }`.
  Send `Authorization: Bearer <accessToken>`. `POST /api/auth/refresh`, `GET /api/auth/me`.
- **RBAC** — global `JwtAuthGuard` (routes are protected unless `@Public()`),
  plus `RolesGuard` with `@Roles(...)`. Roles: `SUPER_ADMIN`, `CONTENT_MANAGER`,
  `EDITOR` (SuperAdmin bypasses role checks).
- **Bilingual content** — localized fields stored as `jsonb` `{ en, ar }`
  (`common/types/localized.type.ts`), mirroring the frontend `L` type.
- **Uploads** — `POST /api/uploads` (multipart `file`), served at
  `/api/uploads/<filename>`.

## Modules

`auth`, `users`, `projects`, `services`, `team`, `testimonials`, `partners`,
`blog`, `contact` (messages + newsletter), `settings` (site/company info),
`uploads`.

Public reads (GET) are open; create/update/delete require auth + role.
