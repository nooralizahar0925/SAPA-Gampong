# Aplikasi Desa — Website (Backend API + Admin Dashboard)

The single backend/API and the web admin dashboard for Gampong Blang. See `PLAN.md` for the full build plan and `../API-CONTRACT.md` for the HTTP contract.

## Stack
Node 20 + TypeScript · Express · Prisma + PostgreSQL · Zod · JWT · Playwright (HTML→PDF) · qrcode · Nodemailer · Multer + sharp · Docker · Railway.
Dashboard: React 18 + Vite + TypeScript · React Query · React Router.

## Layout
```
SAPA-Gampong/  # repo root
  backend/     # Express API + Prisma + letter PDF/QR + /verify  (this folder)
  dashboard/   # React admin (queue, review, generate/send, content, feedback)
  docker-compose.yml
```

## Prerequisites
- Node 20+ and npm
- Docker (for local PostgreSQL, and the Playwright/Chromium runtime)

## Getting started (local dev)
```bash
# 1. Start Postgres (and optionally the whole stack)
docker compose up -d postgres

# 2. Backend
cd backend
cp .env.example .env            # set DATABASE_URL, JWT_SECRET, SMTP_*, STORAGE_*
npm install
npx prisma migrate dev          # create schema
npm run seed                    # admin user + village content (brief Appendix A)
npm run dev                     # http://localhost:8080/api

# 3. Dashboard (separate terminal)
cd ../dashboard
npm install
npm run dev                     # http://localhost:5173  (talks to :8080)
```

## Environment (`backend/.env`)
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/appdesa
JWT_SECRET=change-me
PUBLIC_BASE_URL=http://localhost:8080     # used to build /verify/<token> URLs in the QR
SMTP_URL=smtp://user:pass@host:587        # or provider API key
STORAGE_DIR=./storage                     # dev disk; swap for S3/volume in prod
SIGNED_URL_SECRET=change-me
```

## Tests
```bash
cd backend && npm test         # vitest + supertest (needs test Postgres up)
cd dashboard && npm test       # vitest + React Testing Library + MSW
```

## Deploy (Railway)
Provision a Railway Postgres, set the env vars above (with the Railway `DATABASE_URL` and a public `PUBLIC_BASE_URL` so QR verify links resolve), deploy `backend` and `dashboard` services, then run `prisma migrate deploy` + seed. See `PLAN.md` Task 22.

## Definition of done (per endpoint/page)
- Matches `../API-CONTRACT.md` (route, payload, enums, error envelope).
- Integration test (supertest) or component test (RTL+MSW) green.
- Admin routes gated by `requireAdmin`; public routes rate-limited where noted.
- No letter leaves the system without an explicit admin **approve** (brief §5.1).
