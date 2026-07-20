# Aplikasi Desa — Website (Backend API + Admin Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single backend/API + the web admin dashboard that powers everything: it stores requests, lets the village office review/approve letters, generates the official PDF **with a verification QR**, emails it, serves the public `/verify` page, and manages all app content.

**Architecture:** One Node/TypeScript service (Express) over PostgreSQL (Prisma). Modular monolith — one module per domain (`auth`, `requests`, `letters`, `content`, `feedback`, `uploads`, `verify`, `notifications`). Letters are rendered as HTML templates → PDF via headless Chromium (Playwright) for high fidelity to the village `.docx` layouts, with a QR embedded. A separate React (Vite + TS) dashboard app consumes the same API. Everything runs in Docker; deploy to Railway.

**Tech Stack:** Node 20 + TypeScript, Express, Prisma + PostgreSQL, Zod (validation), JWT + bcrypt (auth), Playwright (HTML→PDF), `qrcode` (QR), Nodemailer (email; provider SMTP/Resend), Multer + sharp (uploads/compression), object storage (Railway volume or S3-compatible) with signed URLs, `express-rate-limit`, Pino (logs). Dashboard: React 18 + Vite + TypeScript, React Query, React Router, a component lib (Ant Design or MUI), react-hook-form + Zod.

## Global Constraints

- **API contract:** `../API-CONTRACT.md` is authoritative for every route, payload, enum, and the error envelope. Change the contract before changing a route.
- **Human approval required:** no letter PDF is generated or sent without an explicit admin `approve` (brief §5.1).
- **Authenticity QR = Path A** (self-hosted verification, brief §13.1): opaque random `verification_token`, public `/verify/:token` reading from the DB, revocation supported. Design the signing step so a future **Path B (BSrE)** swap is drop-in.
- **PII protection** (brief §16.2): KTP/KK and NIK encrypted at rest; attachments served only via signed, expiring URLs to authenticated admins; demographics endpoints expose **aggregate only**.
- **Letters render in Indonesian** with the exact official terminology from the **10** `.docx` templates in `../../Brief/`. Brief §6 specifies only L1–L7; L8 (Berkelakuan Baik), L9 (Belum Menikah), L10 (Rekomendasi) are defined in `../API-CONTRACT.md`, derived from their templates.
- **The signatory is per letter type.** L9 is signed by the Sekretaris Gampong a.n. the Keuchik; all others by the Keuchik. Brief §6.0's single-signatory assumption is superseded.
- **L10 does not share the identity-block shape** of the other nine — it is an outgoing recommendation letter with an addressee and a narrative body. Do not build the form engine or PDF templates assuming a universal subject-identity block.
- **Nomor surat** assigned at generation from `letter_number_counter` per type per year (brief §6.0); never by the resident.
- **Requirements source of truth:** `../../Brief/Aplikasi-Desa-Dev-Brief.md`. Data model = brief §14.

---

## File Structure

```
SAPA-Gampong/                       # repo root (backend/ and dashboard/ are siblings)
  backend/
    src/
      index.ts                    # express bootstrap, route mounting, error handler
      config/env.ts               # typed env (DATABASE_URL, JWT_SECRET, SMTP_*, STORAGE_*)
      db/schema.prisma            # all models (brief §14)
      db/seed.ts                  # seed admin user + village profile/officials/demographics (brief Appendix A)
      middleware/auth.ts          # requireAdmin (JWT), requireRole
      middleware/error.ts         # error envelope mapper
      middleware/rateLimit.ts
      lib/validation.ts           # zod helpers → error envelope
      modules/
        auth/                     # login, me
        requests/                 # create(public), track(public), list/detail/status(admin), state machine
        letters/                  # letter-types schema, templates/, pdf.service, qr.service, number.service
        content/                  # banners, profile, vision-mission, officials, strengths, mosques, prayer-config, demographics
        feedback/                 # create(public), list/patch(admin)
        uploads/                  # multipart upload, sharp compress, signed urls
        verify/                   # public /verify/:token (html + json), revoke(admin)
        notifications/            # email + push senders (events: SENT, REJECTED, ...)
      services/
        pdf.service.ts            # Playwright html→pdf
        email.service.ts          # Nodemailer
        storage.service.ts        # put/get + signed urls
    templates/letters/            # one HTML template per type: L1.html … L10.html (+ partials/kop.html, qr.html)
    tests/                        # vitest + supertest (integration), unit tests per service
    Dockerfile
  dashboard/
    src/
      main.tsx, routes.tsx
      api/client.ts               # fetch wrapper + auth header + error envelope
      pages/ Login, Queue(A2), RequestDetail(A3), Generate(A4), Content(A5), Feedback(A6)
      components/                 # Table, StatusBadge, AttachmentViewer, PdfPreview, forms
    Dockerfile
  docker-compose.yml              # postgres + backend + dashboard for local dev
  README.md
```

**Testing note (read before Task 1):**
- **Integration-test HTTP** with `supertest` against the Express app + a **test PostgreSQL** (docker) with migrations applied and truncated between tests. This is the primary safety net.
- **Unit-test services** (`number.service`, `qr.service`, the state-machine reducer, `verify` masking) in isolation.
- Each task states the exact test to write first (TDD).

---

## Phase 0 — Repo, DB, Express skeleton (Timeline: Week 1)

### Task 1: Bootstrap backend + Docker Postgres + health check
**Files:** Create `backend/package.json`, `backend/src/index.ts`, `backend/src/config/env.ts`, `backend/db/schema.prisma` (empty datasource), `docker-compose.yml`; Test `backend/tests/health.test.ts`
**Interfaces:** Produces the Express `app` export (for supertest) and `GET /api/health → { ok: true }`.
- [ ] **Step 1:** Write `health.test.ts`: `supertest(app).get('/api/health')` → 200 `{ok:true}`.
- [ ] **Step 2:** Run `npm test` — FAIL.
- [ ] **Step 3:** Implement env parsing (Zod), Express app with `/api/health`, error middleware, `docker-compose.yml` with `postgres:16`.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): express skeleton + health + docker postgres`.

### Task 2: Prisma schema — full data model (brief §14) + migration
**Files:** `backend/db/schema.prisma`, generated migration; Test `backend/tests/schema.test.ts`
**Interfaces:** Produces models `LetterRequest, RequestAttachment, File, LetterNumberCounter, Feedback, BannerSlide, VillageProfile, VisionMission, Official, VillageStrength, Mosque, PrayerConfig, DemographicStatBlock, AdminUser` with fields exactly per brief §14 — including `LetterRequest.verificationToken @unique`, `pdfHash?`, `qrRevoked` default false, `verifiedCount` default 0, `status` enum, `letterType` enum.
- [ ] **Step 1:** Write test: after `prisma migrate`, a `LetterRequest` can be created with `verificationToken` unique (second insert with same token throws).
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Write the schema (all models + enums `LetterType`, `RequestStatus`), run `prisma migrate dev -n init`.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): prisma data model + init migration`.

---

## Phase 1 — Admin auth (Timeline: Weeks 1–2)

### Task 3: Auth module (login, me, requireAdmin) + seed admin
**Files:** `backend/src/modules/auth/*`, `backend/src/middleware/auth.ts`, `backend/db/seed.ts`; Test `backend/tests/auth.test.ts`
**Interfaces:** Produces `POST /api/auth/login → {token,user}`, `GET /api/auth/me`, middleware `requireAdmin`. `AdminUser.role ∈ admin|approver`.
- [ ] **Step 1:** Test: seed admin → login with correct creds returns a JWT; `GET /auth/me` with that token returns the user; wrong password → 401 error envelope.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement bcrypt verify, JWT sign/verify, `requireAdmin`, seed script (admin + village content from brief Appendix A).
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): admin auth + seed`.

---

## Phase 2 — Letter request core + PDF/QR/verify/email (Timeline: Weeks 2–4) — CORE LOOP

Prove L1 end-to-end, then generalize to 7.

### Task 4: Letter-types schema endpoint (the 10 forms as data)
**Files:** `backend/src/modules/letters/letter-types.ts` (static schema from brief §6), route in `letters` module; Test `backend/tests/letter-types.test.ts`
**Interfaces:** `GET /api/letter-types` → array shaped per `../API-CONTRACT.md` §1. Encodes fields, `required_attachments`, `subject_is_applicant`, and `signatory` for L1–L10.
- [ ] **Step 1:** Test: response has 7 items; L1 has a `nik`-type field and `required_attachments` includes `KTP`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Encode all 7 field lists (brief §6) as typed constants + serializer.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): letter-types schema`.

### Task 5: Uploads (multipart, compress, signed URL)
**Files:** `backend/src/modules/uploads/*`, `backend/src/services/storage.service.ts`; Test `backend/tests/uploads.test.ts`
**Interfaces:** `POST /api/uploads` → `{file_id,url,mime,size}`. `StorageService.signedUrl(fileId, ttl)`. Validates 5 MB cap + mime allowlist.
- [ ] **Step 1:** Test: posting a small PNG returns a `file_id` and a signed `url`; a 6 MB file → 400 `VALIDATION_ERROR`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement Multer + sharp compression, store to disk (dev)/volume, `File` row, signed URL (HMAC + expiry).
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): uploads + signed urls`.

### Task 6: Create + track request (public) with reference code
**Files:** `backend/src/modules/requests/create.ts`, `track.ts`, `reference.ts`; Test `backend/tests/requests-public.test.ts`
**Interfaces:** `POST /api/requests` (validate against the type's schema via Zod built from Task 4) → `{id,reference_code,status:"SUBMITTED"}`. `GET /api/requests/track/:ref` → status + label. `reference.next()` → `GB-<year>-<seq>`.
- [ ] **Step 1:** Test: create L1 with valid `subject_data` → 201 with `GB-2026-` prefix; missing `applicant_email` → 400 with `fields.applicant_email`; track by ref returns `SUBMITTED`/"Menunggu diproses".
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement dynamic Zod validation per letter type, persistence, reference generator, status labels.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): create + track request`.

### Task 7: Admin queue + detail + status state machine
**Files:** `backend/src/modules/requests/list.ts`, `detail.ts`, `status.ts`, `state-machine.ts`; Test `backend/tests/requests-admin.test.ts`
**Interfaces:** `GET /api/requests` (filters+paging), `GET /api/requests/:id`, `PATCH /api/requests/:id/status` with `action ∈ approve|reject|in_review|needs_info`. `stateMachine.can(from,action)` enforces legal transitions (brief §5.4); `reject` needs `reason`; `approve` sets/auto-assigns `nomor_surat`.
- [ ] **Step 1:** Test: illegal transition `SUBMITTED → GENERATED` rejected; `SUBMITTED --in_review--> IN_REVIEW --approve--> APPROVED` allowed and persists `nomor_surat`; `reject` without reason → 400.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement pure `state-machine.ts` reducer + admin routes + audit of edits.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): request queue + state machine`.

### Task 8: Nomor surat counter service
**Files:** `backend/src/modules/letters/number.service.ts`; Test `backend/tests/number.service.test.ts`
**Interfaces:** `NumberService.assign(letterType, year) → "400.12.2.1/<seq>/<year>"` using `LetterNumberCounter`, atomic increment, prefix per type (brief §6 table).
- [ ] **Step 1:** Test: two sequential calls for L1/2026 yield `/1/2026` then `/2/2026`; L5 uses prefix `400.1.4.3`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement transactional upsert-increment + prefix map.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): nomor surat counter`.

### Task 9: QR + verification token service
**Files:** `backend/src/modules/letters/qr.service.ts`, `backend/src/modules/verify/*`; Test `backend/tests/verify.test.ts`
**Interfaces:** `QrService.newToken() → opaque 128-bit id`; `QrService.pngDataUrl(verifyUrl)`. `GET /verify/:token` returns JSON (and an HTML page) with masked `perihal` (partial name/NIK, brief §13.1.4 privacy); unknown/revoked → `{valid:false}`. `POST /api/requests/:id/revoke` (admin) sets `qrRevoked`.
- [ ] **Step 1:** Test: a generated letter's token verifies `valid:true` with correct `nomor_surat` and a **masked** name; after revoke → `valid:false`; a random token → `valid:false`; `verifiedCount` increments on each scan.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement token gen (crypto random), verify lookup + masking + rate limit, revoke.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): verification token + /verify`.

### Task 10: PDF generation (template merge + QR embed)
**Files:** `backend/src/services/pdf.service.ts`, `backend/templates/letters/L1.html` (+ `partials/kop.html`, `partials/qr.html`), `backend/src/modules/requests/generate.ts`; Test `backend/tests/generate.test.ts`
**Interfaces:** `POST /api/requests/:id/generate` (admin, request must be `APPROVED`) → merges `subject_data`+system fields into the type's HTML template, embeds QR (verify URL), renders PDF via Playwright, stores it (`File`), sets `verificationToken` + status `GENERATED`. Returns `{pdf_id,pdf_url,verification_token,nomor_surat}`. `PdfService.render(html) → Buffer`.
- [ ] **Step 1:** Test: generate on an APPROVED L1 → status becomes `GENERATED`, a `File` (application/pdf) is stored, response carries a `verification_token` that then verifies `valid:true`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Build the L1 HTML template faithful to `../../Brief/SURAT KETERANGAN BERDOMISILI.docx` (kop surat, body with merge placeholders, signatory block with QR + caption *"Dokumen ini ditandatangani secara elektronik. Pindai QR untuk verifikasi keaslian."*). Implement generate route + Playwright render. Store `pdfHash` (optional integrity).
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): PDF generation with QR (L1)`.

### Task 11: Email delivery (send the letter)
**Files:** `backend/src/services/email.service.ts`, `backend/src/modules/requests/send.ts`, `backend/src/modules/notifications/*`; Test `backend/tests/send.test.ts` (mock transport)
**Interfaces:** `POST /api/requests/:id/send` (request must be `GENERATED`) → emails the stored PDF to `applicant_email`, sets status `SENT`, fires `SENT` notification. `EmailService.send({to,subject,html,attachments})` (mockable transport in tests).
- [ ] **Step 1:** Test: send on a GENERATED request calls the mock transport with the applicant email + PDF attachment and sets status `SENT`; sending on a non-GENERATED request → 409.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement Nodemailer wrapper (SMTP/provider via env), send route, `REJECTED` email hook too.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): email delivery + notifications`.

### Task 12: Generalize to all 10 letter templates
**Files:** `backend/templates/letters/L2..L7.html`; extend `letter-types.ts`; Test `backend/tests/generate-all.test.ts`
**Interfaces:** Each type generates a faithful PDF from its `.docx` in `../../Brief/`. Handles subject≠applicant types (L3 reporter, L6 child, L7 deceased + ahli waris — brief §6).
- [ ] **Step 1:** Test: parametrized over L1–L10 — an APPROVED request of each type generates a PDF and a verifying token; L7 includes death details + survivors.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Author L2–L7 HTML templates against the `.docx` layouts.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): all 10 letter templates`.

---

## Phase 3 — Admin dashboard (React) (Timeline: Weeks 5–6)

### Task 13: Dashboard scaffold + login + auth guard (A1)
**Files:** `dashboard/*` (Vite+TS), `dashboard/src/api/client.ts`, `pages/Login.tsx`; Test `dashboard/src/__tests__/login.test.tsx` (RTL + MSW)
- [ ] Steps: (1) test: submitting valid creds stores token + redirects to queue (MSW mocks `/auth/login`); (2) FAIL; (3) implement API client (error envelope + bearer), login form, React Router guard; (4) PASS; (5) commit `feat(web): dashboard scaffold + login`.

### Task 14: Request queue (A2) + detail/review (A3)
**Files:** `pages/Queue.tsx`, `pages/RequestDetail.tsx`, `components/StatusBadge.tsx`, `AttachmentViewer.tsx`; Test with MSW
- Queue: list + filter by status/type + search + new-`SUBMITTED` badge. Detail: full read-only fields + attachment viewer + Approve/Reject(reason)/Needs-info + editable-normalize with audit + assign nomor surat.
- [ ] Steps: (1) test: queue renders rows from mocked `/requests`; approve calls `PATCH /requests/:id/status`; (2) FAIL; (3) implement; (4) PASS; (5) commit `feat(web): queue + review`.

### Task 15: Letter generation & send (A4)
**Files:** `pages/Generate.tsx`, `components/PdfPreview.tsx`; Test with MSW
- On Approve → call generate, preview PDF (embed `pdf_url`), allow regenerate, then Send (email). Show verification token/URL. Optional signature-image overlay toggle (brief §11.3).
- [ ] Steps: (1) test: clicking Generate then Send transitions the shown status GENERATED→SENT (mocked); (2) FAIL; (3) implement preview + actions; (4) PASS; (5) commit `feat(web): generate & send`.

---

## Phase 4 — Content management + public content APIs (Timeline: Weeks 6–7)

### Task 16: Content module API (all resources)
**Files:** `backend/src/modules/content/*`; Test `backend/tests/content.test.ts`
**Interfaces:** Public GET + admin write for banners, profile, vision-mission, officials, strengths, mosques, prayer-config, demographics (contract §5). Demographics = data-driven stat blocks.
- [ ] Steps: (1) test: `PATCH /content/profile` (admin) then `GET /content/profile` (public) reflects the change; reorder banners persists order; (2) FAIL; (3) implement CRUD + Zod; (4) PASS; (5) commit `feat(api): content management`.

### Task 17: Content management hub UI (A5)
**Files:** `dashboard/src/pages/Content.tsx` + sub-forms; Test with MSW
- Tabs: Banner (add/reorder/remove + image upload), Profil & perangkat (CRUD officials, strengths, map), Prayer/Mosque (coords + mosque CRUD), Demografi (edit stat blocks), App settings (contact, letterhead, signatory, letter-number counters).
- [ ] Steps: (1) test: editing a demographics number saves via `PATCH /content/demographics`; (2) FAIL; (3) implement forms; (4) PASS; (5) commit `feat(web): content hub`.

---

## Phase 5 — Feedback + notifications (Timeline: Week 10)

### Task 18: Feedback API + inbox (A6)
**Files:** `backend/src/modules/feedback/*`, `dashboard/src/pages/Feedback.tsx`; Test backend + web
- `POST /feedback` (public), `GET /feedback` + `PATCH /feedback/:id` (admin: read/responded/notes). Inbox badge for new.
- [ ] Steps: (1) backend test: create feedback → appears in admin list as `new`; mark responded persists; (2) FAIL; (3) implement API + inbox page; (4) PASS; (5) commit `feat: feedback inbox`.

### Task 19: Notification wiring (email primary, push optional)
**Files:** extend `backend/src/modules/notifications/*`; Test `backend/tests/notifications.test.ts`
- Events → channels (brief §15): `SENT` (email+push→resident), `REJECTED` (push+opt email), new `SUBMITTED`/feedback (dashboard badge). Handle email bounces/logging.
- [ ] Steps: (1) test: transitioning to `SENT` enqueues a resident email + push payload; (2) FAIL; (3) implement dispatcher; (4) PASS; (5) commit `feat(api): notification dispatcher`.

---

## Phase 6 — Hardening, Docker, Railway deploy (Timeline: Weeks 11–13)

### Task 20: Security & privacy pass
- Encrypt NIK/attachment references at rest; enforce signed-URL-only attachment access; rate-limit `/verify` and `POST /requests`; ensure demographics endpoints never return individual rows (brief §16.2). Add `helmet`, CORS allowlist.
- [ ] Test: unauthenticated access to `/api/requests` → 401; direct attachment path without signature → 403. Commit `chore(api): security hardening`.

### Task 21: Dockerize + docker-compose + CI
- `backend/Dockerfile` (Playwright base image), `dashboard/Dockerfile` (build → static serve), `docker-compose.yml` (postgres+backend+dashboard). CI: lint + typecheck + `npm test` on push.
- [ ] Test: `docker compose up` → `GET /api/health` ok and dashboard served. Commit `chore: docker + ci`.

### Task 22: Railway deploy + staging
- Provision Railway Postgres, set env vars, deploy backend + dashboard, run migrations + seed, smoke-test the full loop on staging, wire the public domain for `/verify` links.
- [ ] Test: create→approve→generate→send→scan `/verify` works end-to-end on staging. Commit `chore: railway deploy config`.

---

## Self-Review checklist (run before handing off)
- **Spec coverage:** screens A1–A6 + V1 verify page all have tasks (13,14,14,15,17,18,9). Data model §14 = Task 2. QR authenticity §13.1 = Tasks 9,10. Notifications §15 = Task 19. Content §11.4 = Tasks 16,17. ✔
- **Contract consistency:** every route matches `../API-CONTRACT.md`; enums (`RequestStatus`, `LetterType`) match the schema in Task 2 and the contract.
- **Type consistency:** `NumberService.assign`, `QrService.newToken`, `stateMachine.can`, `PdfService.render`, `EmailService.send` names are used consistently across tasks 7–12.
- **Open questions** (brief Appendix C) to resolve early: exact kop surat/letterhead + per-type nomor prefixes (C#5), signature-image-alongside-QR & verify-page privacy (C#7), NEEDS_INFO loop in Phase 1? (C#4), retention policy for attachments (§16.2). Confirm with the village before Phase 2 sign-off.
