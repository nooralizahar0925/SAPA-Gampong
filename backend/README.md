# Aplikasi Desa — Website (Backend API + Admin Dashboard)

The single backend/API and the web admin dashboard for Gampong Blang. See `PLAN.md` for the full build plan and `../API-CONTRACT.md` for the HTTP contract.

## Stack
Node 20 + TypeScript (CommonJS) · Express 4 · Prisma 5 + PostgreSQL · Zod · JWT · Vitest + Supertest.
Dashboard: React 18 + Vite + TypeScript · React Query · React Router.

## Layout
```
Apps/            # repo root
  backend/       # Express API + Prisma  (this folder)
  dashboard/     # React admin
  docker-compose.yml
```

## Prerequisites
- Node 20+ and npm
- Docker (for local PostgreSQL and Mailpit)

## Getting started (local dev)
```bash
# 1. Start Postgres + Mailpit (from the repo root, Apps/)
docker compose up -d db mailpit

# 2. Backend
cd backend
cp .env.example .env            # adjust DATABASE_URL / JWT_SECRET if needed
npm install
npx prisma migrate dev          # create schema
npm run db:seed                 # admin user (see "Seed admin credentials" below)
npm run dev                     # http://localhost:8080/api

# 3. Dashboard (separate terminal)
cd ../dashboard
npm install
npm run dev                     # http://localhost:5173  (talks to :8080)
```

## Environment (`backend/.env`)
Copy `backend/.env.example` and adjust as needed:
```
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://sapa:sapa@localhost:5432/sapa
JWT_SECRET=change-me-in-production
PUBLIC_BASE_URL=http://localhost:8080     # used to build the `servers` entry in the OpenAPI document
DOCS_ENABLED=true                         # exposes /api/docs and /api/openapi.json

# Development-only — see "Seed admin credentials" below
SEED_ADMIN_EMAIL=admin@gampongblang.id
SEED_ADMIN_PASSWORD=admin123
```

The Docker Compose service names are `db` (PostgreSQL 16, database `sapa`, user/password `sapa`) and `mailpit`. There is no `postgres` service and no `appdesa` database — those names are stale leftovers from an earlier draft of this file.

## Email providers
The backend supports 4 outbound email providers:
- `mailersend`
- `mailgun`
- `gmail`
- `smtp`

`EMAIL_PROVIDER_DEFAULT=mailersend` is the fallback when no admin override has been saved yet. Admins can inspect and switch the active provider through `GET /api/settings/email-provider` and `PATCH /api/settings/email-provider`.

Provider readiness rules:
- `mailersend` requires `MAILERSEND_API_KEY` and `MAILERSEND_FROM_EMAIL`.
- `mailgun` requires `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAILGUN_FROM_EMAIL`.
- `gmail` requires `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and a sender email (`GMAIL_FROM_EMAIL`, or it falls back to `GMAIL_USER`).
- `smtp` requires `SMTP_HOST`, `SMTP_PORT`, and a sender email (`SMTP_FROM_EMAIL`, or it falls back to `SMTP_USER`).

See `backend/.env.example` for the full provider variable list.

## Seed admin credentials
`npm run db:seed` creates (or updates) one admin user:
- In development/test, it uses `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from the environment if set, otherwise falls back to the dev defaults above (`admin@gampongblang.id` / `admin123`).
- In production (`NODE_ENV=production`), both variables are **required**. Seeding throws rather than create a known default admin password.

## API documentation
With `DOCS_ENABLED=true` (or outside production), the running API serves:
- `GET /api/docs` — interactive Scalar dashboard, generated from the project's Zod schemas. This is the reference for mobile/dashboard integration.
- `GET /api/openapi.json` — the same document as raw OpenAPI 3.1 JSON.

The committed `backend/openapi.json` is the artifact under test (`tests/openapi.test.ts` checks it isn't stale). After changing any route/schema, regenerate it:
```bash
npm run openapi:write
```

## Mailpit (local email inbox)
If you select `smtp` as the active provider and point `SMTP_HOST` / `SMTP_PORT` at Mailpit, outgoing email in dev is caught locally instead of being sent to a real mailbox:
- SMTP: `localhost:1025`
- Web inbox: `http://localhost:8025`

## Tests
Tests need their own Postgres database (never point them at your dev database — `tests/helpers/assert-test-db.ts` refuses to run if `DATABASE_URL`'s database name doesn't end in `_test`).

```bash
cd backend
cp .env.test.example .env.test   # first time only; DATABASE_URL must name a database ending in "_test"
npm test                         # vitest + supertest; applies migrations, then runs
```

`.env.test` is gitignored (like `.env`); `.env.test.example` is the committed template — copy it, don't edit the template in place. `npm test` hard-throws on startup if `.env.test` is missing.

The default `docker-compose.override.yml` maps the same `db` container to both `5432` (dev) and `5433` (test), so `docker compose up -d db` is enough to satisfy both `.env` and `.env.test`.

```bash
cd dashboard && npm test       # vitest + React Testing Library + MSW
```

## Deploy (Railway)
Provision a Railway Postgres, set the env vars above (with the Railway `DATABASE_URL`, a public `PUBLIC_BASE_URL`, and `NODE_ENV=production` + real `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`), deploy `backend` and `dashboard` services, then run `npm run db:deploy` (`prisma migrate deploy`) + `npm run db:seed`. See `PLAN.md` Task 22.

## Definition of done (per endpoint/page)
- Matches `../API-CONTRACT.md` (route, payload, enums, error envelope).
- Integration test (supertest) or component test (RTL+MSW) green.
- Admin routes gated by `requireAdmin`; public routes rate-limited where noted.
- No letter leaves the system without an explicit admin **approve** (brief §5.1).
