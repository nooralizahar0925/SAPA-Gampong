# Design: Backend-First Delivery + Interactive API Dashboard

**Date:** 2026-07-20
**Status:** Approved
**Supersedes:** the phase ordering in `backend/PLAN.md` (task content is retained; sequence changes)

## Problem

`backend/PLAN.md` interleaves admin-dashboard tasks into the middle of backend delivery, and provides no way to exercise the API before that dashboard exists. Two consequences:

1. The API cannot be tested or demonstrated by hand until week 5.
2. The mobile developer — working on a different device — has no live, authoritative reference for the endpoints they must consume. `API-CONTRACT.md` is prose and will drift from the implementation.

## Goals

- Deliver the complete backend before any React work begins.
- Provide an interactive, in-browser dashboard covering every endpoint: a request builder with live "Send", auth handling, and realistic data to exercise.
- Guarantee the dashboard cannot drift from the implemented API.
- Unblock the mobile developer without requiring a deployment.

## Non-Goals

- Deploying to Railway (deferred to the final phase; the mobile developer runs the backend locally).
- Any work in `mobile/` — that plan is unchanged and owned by another device.
- Building a bespoke Postman clone (request-builder UI, saved collections, environment management). Generated OpenAPI docs cover the need at a fraction of the cost.

## Decisions

### D1 — API dashboard = OpenAPI 3.1 generated from Zod, rendered by Scalar

**Chosen over** a hand-written `openapi.yaml` and JSDoc route comments (`swagger-jsdoc`). Both alternatives keep a second, hand-maintained copy of the truth; nothing fails when it is forgotten. With a remote mobile developer treating these docs as their only reference, silent drift is the costliest failure mode.

`@asteasolutions/zod-to-openapi` reuses the Zod schemas already mandated for request validation, so the docs and the validator are the same object.

Known carve-outs, described by hand in the registry: the `multipart/form-data` upload endpoint, and `GET /verify/:token` which serves both HTML and JSON by content negotiation.

Bonus: `openapi.json` imports directly into the real Postman app, and drives `openapi-generator` for a typed Dart client on the mobile side.

### D2 — Docs infrastructure lands in Phase 2, not at the end

Standing up the registry once two routes exist means every subsequent task registers its own routes as it is written. Back-filling ~40 routes in one late sitting is both miserable and low-quality, and it leaves the API untestable by hand for the entire build. From Phase 2 onward, `/api/docs` is the working test surface — this is what makes "backend with no front-end" viable.

**Every task from Phase 2 onward is not done until its routes appear in the generated spec.**

### D3 — Route-coverage test as the drift guard

A test walks the mounted Express router stack, collects every `method + path`, and asserts each appears in the generated document. Without it, D1 degrades into a hand-maintained spec over time. This test is the mechanism that makes the single-source-of-truth claim structural rather than aspirational.

### D4 — Mobile developer clones and runs locally; no early deploy

**Chosen over** deploying a Railway staging environment mid-plan. No hosting cost or mid-plan deploy detour; the trade-off accepted is that the mobile developer needs Docker working and must pull to stay current. Railway deployment moves to the final phase, blocking nobody.

### D5 — Mailpit for email in development

No SMTP credentials exist, and email delivery is the terminal step of the letter loop. Mailpit runs as a compose service with a web inbox at `localhost:8025`, where the generated PDF can be opened and its QR scanned with a phone. Nodemailer targets it via env; switching to real SMTP is a config change.

### D6 — Dev topology: Postgres and Mailpit in Docker, backend on the host

`docker compose up db mailpit` plus `npm run dev` on Windows. Instant reloads, local Chromium for Playwright. The fully containerised compose file is still built in Phase 5 for production parity and for the mobile developer's one-command startup.

## Architecture

Unchanged from `backend/PLAN.md`: Node 20 + TypeScript, Express, Prisma + PostgreSQL, modular monolith with one module per domain, Playwright HTML→PDF, self-hosted QR verification (Path A), JWT + bcrypt auth.

New module:

```
backend/src/openapi/
  registry.ts     # single OpenAPIRegistry instance + extendZodWithOpenApi
  document.ts     # builds the OpenAPI 3.1 doc: info, servers, securitySchemes, tags
  routes.ts       # GET /api/openapi.json, GET /api/docs (Scalar)
  components.ts   # shared responses — the error envelope, referenced by every 4xx/5xx
```

New per-module convention: each domain module gains a `schemas.ts` holding named, module-level Zod objects. These are consumed twice — by the validation middleware and by `registry.registerPath(...)`. Zod schemas are never declared inline in a route handler.

Tags mirror the sections of `API-CONTRACT.md`: Auth, Letter Types, Uploads, Requests, Verify, Content, Feedback.

### Dashboard behaviour

- `GET /api/docs` — Scalar UI (`@scalar/express-api-reference`). Authorize box holds the Bearer JWT and persists it across requests, so admin endpoints are live after one login.
- `GET /api/openapi.json` — the generated document.
- `backend/openapi.json` — written on build and committed, so the spec is importable without booting the server.
- Enabled unconditionally in development; in production gated behind `DOCS_ENABLED` (default `false`), since it documents the full admin surface.

### Demo seed

`npm run seed:demo` populates:

- Village content from brief Appendix A (profile, officials, vision/mission, strengths, mosques, prayer config, demographics).
- Letter requests in every status: `SUBMITTED`, `IN_REVIEW`, `APPROVED`, `GENERATED`, `SENT`, `REJECTED`.
- One fully generated letter, with its `verification_token` printed to console for immediate use against `GET /verify/:token`.

Idempotent; refuses to run against a non-empty production database.

## Sequencing

| Phase | Content | Tasks from `backend/PLAN.md` |
|---|---|---|
| 0 | GitHub remote + push; backend bootstrap; Docker Postgres + Mailpit; Prisma data model | new + 1, 2 |
| 1 | Admin auth + seed admin | 3 |
| 2 | **OpenAPI registry + Scalar `/api/docs` + drift test** | new |
| 3 | Core letter loop: letter-types, uploads, create/track, queue + state machine, nomor surat, QR + `/verify` page, PDF generation, email, all 10 templates | 4–12 |
| 4 | Content APIs, feedback, notifications | 16, 18, 19 |
| 5 | Demo seed, security & privacy pass, Docker, CI | 20, 21 + new |
| 6 | Admin dashboard (React) | 13, 14, 15, 17 |
| 7 | Railway deploy + staging | 22 |

The public `/verify` HTML page ships in Phase 3, not with the dashboard — it is public, unauthenticated, and it is how the QR loop is proven end to end before any React exists.

## Testing

Primary safety net: `vitest` + `supertest` integration tests against a real Postgres. Unit tests for pure services (`state-machine`, `number.service`, `qr.service`, verify masking). TDD per task — test first, observe failure, implement, observe pass, commit.

- **Test database:** `sapa_test` on the same Docker Postgres container; migrated once per run, truncated between tests.
- **Docs tests (Phase 2):** the generated document is valid OpenAPI 3.1; every mounted route appears in it (D3).
- **PDF tests assert structure, not pixels:** a `File` row of type `application/pdf` exists and is non-trivially sized, the merged HTML carries the expected values, and the embedded token verifies. Visual fidelity to the `.docx` templates is reviewed by eye once per template — not snapshot-tested, which would be slow and font-brittle in CI.

## Repository

Task 0, blocking the mobile developer: create a private GitHub remote, push the existing commit, and extend `README.md` with the startup path — clone, `docker compose up`, `npm run seed:demo`, open `localhost:8080/api/docs`.

`.gitignore` already covers `node_modules`, Flutter build artefacts, `.env`, and storage. The git root is `Apps/`, so the business and legal documents in the parent folder (proposal, invoices, Perjanjian Kerjasama — containing bank details and client PII) are outside the repository. **Verify this holds at the moment of the first push**, since exposure is difficult to undo afterwards.

## Open Questions

Carried forward from brief Appendix C; these block Phase 3 sign-off, not Phase 0–2, so work can begin while they are resolved with the village:

- Exact kop surat / letterhead and per-type nomor surat prefixes (C#5).
- Whether a signature image appears alongside the QR, and how much detail the public verify page may reveal (C#7).
- Whether the `NEEDS_INFO` loop is in scope for phase one (C#4).
- Retention policy for uploaded attachments (§16.2).
