# Aplikasi Desa - Website (Backend API + Admin Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single backend/API + the web admin dashboard that powers everything: it stores requests, lets the village office review/approve letters, generates the official PDF **with a verification QR**, emails it, serves the public `/verify` page, and manages all app content.

**Architecture:** One Node/TypeScript service (Express) over PostgreSQL (Prisma). Modular monolith - one module per domain (`auth`, `requests`, `letters`, `content`, `feedback`, `uploads`, `verify`, `notifications`). Letters are rendered as HTML templates -> PDF via headless Chromium (Playwright) for high fidelity to the village `.docx` layouts, with a QR embedded. A separate React (Vite + TS) dashboard app consumes the same API. Everything runs in Docker; deploy to Railway.

**Tech Stack:** Node 20 + TypeScript, Express, Prisma + PostgreSQL, Zod (validation), JWT + bcrypt (auth), Playwright (HTML->PDF), `qrcode` (QR), Nodemailer (email; provider SMTP/Resend), Multer + sharp (uploads/compression), object storage (Railway volume or S3-compatible) with signed URLs, `express-rate-limit`, Pino (logs). Dashboard: React 18 + Vite + TypeScript, React Query, React Router, a component lib (Ant Design or MUI), react-hook-form + Zod.

## Global Constraints

- **Mobile push decision:** when mobile push is implemented, use **Firebase Cloud Messaging (FCM)** via Firebase Admin SDK on the backend. Keep **Task 11 email-only** and introduce push delivery in **Task 19** so the core letter flow stays isolated.
- **API contract:** `../API-CONTRACT.md` is authoritative for every route, payload, enum, and the error envelope. Change the contract before changing a route.
- **Human approval required:** no letter PDF is generated or sent without an explicit admin `approve` (brief Section 5.1).
- **Authenticity QR = Path A** (self-hosted verification, brief Section 13.1): opaque random `verification_token`, public `/verify/:token` reading from the DB, revocation supported. Design the signing step so a future **Path B (BSrE)** swap is drop-in.
- **PII protection** (brief Section 16.2): KTP/KK and NIK encrypted at rest; attachments served only via signed, expiring URLs to authenticated admins; demographics endpoints expose **aggregate only**.
- **Letters render in Indonesian** with the exact official terminology from the **10** `.docx` templates in `../../Brief/`. Brief Section 6 specifies only L1-L7; L8 (Berkelakuan Baik), L9 (Belum Menikah), L10 (Rekomendasi) are defined in `../API-CONTRACT.md`, derived from their templates.
- **The signatory is per letter type.** L9 is signed by the Sekretaris Gampong a.n. the Keuchik; all others by the Keuchik. Brief Section 6.0's single-signatory assumption is superseded.
- **L10 does not share the identity-block shape** of the other nine - it is an outgoing recommendation letter with an addressee and a narrative body. Do not build the form engine or PDF templates assuming a universal subject-identity block.
- **Nomor surat** assigned at generation from `letter_number_counter` per type per year (brief Section 6.0); never by the resident.
- **Requirements source of truth:** `../../Brief/Aplikasi-Desa-Dev-Brief.md`. Data model = brief Section 14.

---

## File Structure

```text
SAPA-Gampong/                       # repo root (backend/ and dashboard/ are siblings)
  backend/
    src/
      index.ts                    # express bootstrap, route mounting, error handler
      config/env.ts               # typed env (DATABASE_URL, JWT_SECRET, SMTP_*, STORAGE_*)
      db/schema.prisma            # all models (brief Section 14)
      db/seed.ts                  # seed admin user + village profile/officials/demographics (brief Appendix A)
      middleware/auth.ts          # requireAdmin (JWT), requireRole
      middleware/error.ts         # error envelope mapper
      middleware/rateLimit.ts
      lib/validation.ts           # zod helpers -> error envelope
      modules/
        auth/                     # login, me
        requests/                 # create(public), track(public), list/detail/status(admin), state machine
        letters/                  # letter-types schema, templates/, pdf.service, qr.service, number.service
        content/                  # banners, profile, vision-mission, officials, strengths, mosques, prayer-config, demographics
        feedback/                 # create(public), list/patch(admin)
        uploads/                  # multipart upload, sharp compress, signed urls
        verify/                   # public /verify/:token (html + json), revoke(admin)
        notifications/            # email + Firebase push senders (events: SENT, REJECTED, ...)
      services/
        pdf.service.ts            # Playwright html->pdf
        email.service.ts          # Nodemailer
        storage.service.ts        # put/get + signed urls
    templates/letters/            # one HTML template per type: L1.html ... L10.html (+ partials/kop.html, qr.html)
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

## Phase 0 - Repo, DB, Express skeleton (Timeline: Week 1)

### Task 1: Bootstrap backend + Docker Postgres + health check
**Files:** Create `backend/package.json`, `backend/src/index.ts`, `backend/src/config/env.ts`, `backend/db/schema.prisma` (empty datasource), `docker-compose.yml`; Test `backend/tests/health.test.ts`
**Interfaces:** Produces the Express `app` export (for supertest) and `GET /api/health -> { ok: true }`.
- [ ] **Step 1:** Write `health.test.ts`: `supertest(app).get('/api/health')` -> 200 `{ok:true}`.
- [ ] **Step 2:** Run `npm test` - FAIL.
- [ ] **Step 3:** Implement env parsing (Zod), Express app with `/api/health`, error middleware, `docker-compose.yml` with `postgres:16`.
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): express skeleton + health + docker postgres`.

### Task 2: Prisma schema - full data model (brief Section 14) + migration
**Files:** `backend/db/schema.prisma`, generated migration; Test `backend/tests/schema.test.ts`
**Interfaces:** Produces models `LetterRequest, RequestAttachment, File, LetterNumberCounter, Feedback, BannerSlide, VillageProfile, VisionMission, Official, VillageStrength, Mosque, PrayerConfig, DemographicStatBlock, AdminUser` with fields exactly per brief Section 14 - including `LetterRequest.verificationToken @unique`, `pdfHash?`, `qrRevoked` default false, `verifiedCount` default 0, `status` enum, `letterType` enum.
- [ ] **Step 1:** Write test: after `prisma migrate`, a `LetterRequest` can be created with `verificationToken` unique (second insert with same token throws).
- [ ] **Step 2:** Run - FAIL.
- [ ] **Step 3:** Write the schema (all models + enums `LetterType`, `RequestStatus`), run `prisma migrate dev -n init`.
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): prisma data model + init migration`.

---

## Phase 1 - Admin auth (Timeline: Weeks 1-2)

### Task 3: Auth module (login, me, requireAdmin) + seed admin
**Files:** `backend/src/modules/auth/*`, `backend/src/middleware/auth.ts`, `backend/db/seed.ts`; Test `backend/tests/auth.test.ts`
**Interfaces:** Produces `POST /api/auth/login -> {token,user}`, `GET /api/auth/me`, middleware `requireAdmin`. `AdminUser.role in admin|approver`.
- [ ] **Step 1:** Test: seed admin -> login with correct creds returns a JWT; `GET /auth/me` with that token returns the user; wrong password -> 401 error envelope.
- [ ] **Step 2:** Run - FAIL.
- [ ] **Step 3:** Implement bcrypt verify, JWT sign/verify, `requireAdmin`, seed script (admin + village content from brief Appendix A).
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): admin auth + seed`.

---

## Phase 2 - Letter request core + PDF/QR/verify/email (Timeline: Weeks 2-4) - CORE LOOP

Prove L1 end-to-end, then generalize to 7.

### Task 4: Letter-types schema endpoint (the 10 forms as data)
**Files:** `backend/src/modules/letters/letter-types.ts` (static schema from brief Section 6), route in `letters` module; Test `backend/tests/letter-types.test.ts`
**Interfaces:** `GET /api/letter-types` -> array shaped per `../API-CONTRACT.md` Section 1. Encodes fields, `required_attachments`, `subject_is_applicant`, and `signatory` for L1-L10.
- [ ] **Step 1:** Test: response has 7 items; L1 has a `nik`-type field and `required_attachments` includes `KTP`.
- [ ] **Step 2:** Run - FAIL.
- [ ] **Step 3:** Encode all 7 field lists (brief Section 6) as typed constants + serializer.
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): letter-types schema`.

### Task 5: Uploads (multipart, compress, signed URL)
**Files:** `backend/src/modules/uploads/*`, `backend/src/services/storage.service.ts`; Test `backend/tests/uploads.test.ts`
**Interfaces:** `POST /api/uploads` -> `{file_id,url,mime,size}`. `StorageService.signedUrl(fileId, ttl)`. Validates 5 MB cap + mime allowlist.
- [ ] **Step 1:** Test: posting a small PNG returns a `file_id` and a signed `url`; a 6 MB file -> 400 `VALIDATION_ERROR`.
- [ ] **Step 2:** Run - FAIL.
- [ ] **Step 3:** Implement Multer + sharp compression, store to disk (dev)/volume, `File` row, signed URL (HMAC + expiry).
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): uploads + signed urls`.

### Task 6: Create + track request (public) with reference code
**Files:** `backend/src/modules/requests/create.ts`, `track.ts`, `reference.ts`; Test `backend/tests/requests-public.test.ts`
**Interfaces:** `POST /api/requests` (validate against the type's schema via Zod built from Task 4) -> `{id,reference_code,status:"SUBMITTED"}`. `GET /api/requests/track/:ref` -> status + label. `reference.next()` -> `GB-<year>-<seq>`.
- [ ] **Step 1:** Test: create L1 with valid `subject_data` -> 201 with `GB-2026-` prefix; missing `applicant_email` -> 400 with `fields.applicant_email`; track by ref returns `SUBMITTED`/"Menunggu diproses".
- [ ] **Step 2:** Run - FAIL.
- [ ] **Step 3:** Implement dynamic Zod validation per letter type, persistence, reference generator, status labels.
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): create + track request`.

### Task 7: Admin queue + detail + status state machine
**Files:** `backend/src/modules/requests/list.ts`, `detail.ts`, `status.ts`, `state-machine.ts`; Test `backend/tests/requests-admin.test.ts`
**Interfaces:** `GET /api/requests` (filters+paging), `GET /api/requests/:id`, `PATCH /api/requests/:id/status` with `action in approve|reject|in_review|needs_info`. `stateMachine.can(from,action)` enforces legal transitions (brief Section 5.4); `reject` needs `reason`; `approve` sets/auto-assigns `nomor_surat`.
- [ ] **Step 1:** Test: illegal transition `SUBMITTED -> GENERATED` rejected; `SUBMITTED --in_review--> IN_REVIEW --approve--> APPROVED` allowed and persists `nomor_surat`; `reject` without reason -> 400.
- [ ] **Step 2:** Run - FAIL.
- [ ] **Step 3:** Implement pure `state-machine.ts` reducer + admin routes + audit of edits.
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): request queue + state machine`.

### Task 8: Nomor surat counter service
**Files:** `backend/src/modules/letters/number.service.ts`; Test `backend/tests/number.service.test.ts`
**Interfaces:** `NumberService.assign(letterType, year) -> "400.12.2.1/<seq>/<year>"` using `LetterNumberCounter`, atomic increment, prefix per type (brief Section 6 table).
- [ ] **Step 1:** Test: two sequential calls for L1/2026 yield `/1/2026` then `/2/2026`; L5 uses prefix `400.1.4.3`.
- [ ] **Step 2:** Run - FAIL.
- [ ] **Step 3:** Implement transactional upsert-increment + prefix map.
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): nomor surat counter`.

### Task 9: QR + verification token service
**Files:** `backend/src/modules/letters/qr.service.ts`, `backend/src/modules/verify/*`; Test `backend/tests/verify.test.ts`
**Interfaces:** `QrService.newToken() -> opaque 128-bit id`; `QrService.pngDataUrl(verifyUrl)`. `GET /verify/:token` returns JSON (and an HTML page) with masked `perihal` (partial name/NIK, brief Section 13.1.4 privacy); unknown/revoked -> `{valid:false}`. `POST /api/requests/:id/revoke` (admin) sets `qrRevoked`.
- [ ] **Step 1:** Test: a generated letter's token verifies `valid:true` with correct `nomor_surat` and a **masked** name; after revoke -> `valid:false`; a random token -> `valid:false`; `verifiedCount` increments on each scan.
- [ ] **Step 2:** Run - FAIL.
- [ ] **Step 3:** Implement token gen (crypto random), verify lookup + masking + rate limit, revoke.
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): verification token + /verify`.

### Task 10: PDF generation (template merge + QR embed)
**Files:** `backend/src/services/pdf.service.ts`, `backend/templates/letters/L1.html` (+ `partials/kop.html`, `partials/qr.html`), `backend/src/modules/requests/generate.ts`; Test `backend/tests/generate.test.ts`
**Interfaces:** `POST /api/requests/:id/generate` (admin, request must be `APPROVED`) -> merges `subject_data`+system fields into the type's HTML template, embeds QR (verify URL), renders PDF via Playwright, stores it (`File`), sets `verificationToken` + status `GENERATED`. Returns `{pdf_id,pdf_url,verification_token,nomor_surat}`. `PdfService.render(html) -> Buffer`.
- [ ] **Step 1:** Test: generate on an APPROVED L1 -> status becomes `GENERATED`, a `File` (application/pdf) is stored, response carries a `verification_token` that then verifies `valid:true`.
- [ ] **Step 2:** Run - FAIL.
- [ ] **Step 3:** Build the L1 HTML template faithful to `../../Brief/SURAT KETERANGAN BERDOMISILI.docx` (kop surat, body with merge placeholders, signatory block with QR + caption *"Dokumen ini ditandatangani secara elektronik. Pindai QR untuk verifikasi keaslian."*). Implement generate route + Playwright render. Store `pdfHash` (optional integrity).
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): PDF generation with QR (L1)`.

### Task 11: Email delivery (send the letter)
**Files:** `backend/src/services/email.service.ts`, `backend/src/modules/requests/send.ts`, `backend/src/modules/notifications/*`; Test `backend/tests/send.test.ts` (mock transport)
- **Scope lock for this task:** do **not** implement mobile push here. Task 11 proves email delivery only; any push abstraction added now must remain inactive until Task 19.
**Interfaces:** `POST /api/requests/:id/send` (request must be `GENERATED`) -> emails the stored PDF to `applicant_email`, sets status `SENT`, fires the email-side `SENT` notification. `EmailService.send({to,subject,html,attachments})` (mockable transport in tests).
- [ ] **Step 1:** Test: send on a GENERATED request calls the mock transport with the applicant email + PDF attachment and sets status `SENT`; sending on a non-GENERATED request -> 409.
- [ ] **Step 2:** Run - FAIL.
- [ ] **Step 3:** Implement Nodemailer wrapper (SMTP/provider via env), send route, `REJECTED` email hook too.
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): email delivery + notifications`.

### Task 12: Generalize to all 10 letter templates
**Files:** `backend/templates/letters/L2..L7.html`; extend `letter-types.ts`; Test `backend/tests/generate-all.test.ts`
**Interfaces:** Each type generates a faithful PDF from its `.docx` in `../../Brief/`. Handles subject!=applicant types (L3 reporter, L6 child, L7 deceased + ahli waris - brief Section 6).
- [ ] **Step 1:** Test: parametrized over L1-L10 - an APPROVED request of each type generates a PDF and a verifying token; L7 includes death details + survivors.
- [ ] **Step 2:** Run - FAIL.
- [ ] **Step 3:** Author L2-L7 HTML templates against the `.docx` layouts.
- [ ] **Step 4:** Run - PASS.
- [ ] **Step 5:** Commit `feat(api): all 10 letter templates`.

---

## Phase 3 - Admin dashboard (React) (Timeline: Weeks 5-6)

### Task 13: Dashboard scaffold + login + auth guard (A1)
**Files:** `dashboard/*` (Vite+TS), `dashboard/src/api/client.ts`, `pages/Login.tsx`; Test `dashboard/src/__tests__/login.test.tsx` (RTL + MSW)
- [x] Steps: (1) test: submitting valid creds stores token + redirects to queue (MSW mocks `/auth/login`); (2) FAIL; (3) implement API client (error envelope + bearer), login form, React Router guard; (4) PASS; (5) commit `feat(web): dashboard scaffold + login`.

### Task 14: Request queue (A2) + detail/review (A3)
**Files:** `pages/Queue.tsx`, `pages/RequestDetail.tsx`, `components/StatusBadge.tsx`, `AttachmentViewer.tsx`; Test with MSW
- Queue: list + filter by status/type + search + new-`SUBMITTED` badge. Detail: full read-only fields + attachment viewer + Approve/Reject(reason)/Needs-info + editable-normalize with audit + assign nomor surat.
- **Completeness pass (2026-07-21)** — the page was built to the visual mock with several placeholder controls that never worked. Fixed, with `dashboard/src/__tests__/queue.test.tsx` (9 tests) covering the behaviour:
  - **New `GET /api/requests/counts`** (admin) returns `by_status`, `total`, and `pending` (SUBMITTED+IN_REVIEW+NEEDS_INFO), counted with `groupBy` in the database. The stat cards and filter-pill counts previously counted a *page* of results, so every figure silently capped at 20 once the office passed one page. Covered by `tests/requests-admin.test.ts`, including a 25-row case that a client-side count would report as 20.
  - **Paging had no unique tiebreaker.** `orderBy` ended on `createdAt`, which is not unique — rows inserted in one `createMany` share a timestamp to the millisecond, and Postgres may then order equal rows differently per query, so pages overlapped and silently skipped rows (a 51-row set returned only 40 distinct records across 3 pages). Every sort now ends on `id`. Caught by the paging regression test, not by hand.
- **Pagination now works.** "Sebelumnya"/"Berikutnya" and the page chips had no handlers — the chip was a hardcoded `1`. Page state is wired to the query, the chips are windowed for long queues, the footer reports a real `1–20 dari N` range, and the control is hidden entirely when everything fits on one page. Changing any filter resets to page 1, otherwise a narrower filter could strand the admin on an out-of-range empty page.
  - **The header date was hardcoded** to `2026-07-20`, so "permohonan menunggu tindakan hari ini" would have been wrong every day after that. Now `new Date()`.
  - **"Muat ulang" had no `onClick`** — it now invalidates the queue and counts, and disables while fetching.
  - **Removed two fakes rather than fake them further:** the notification bell (no notification surface exists) and the "Juli 2026" chip (styled like a filter, but purely decorative — no date filtering exists in the API). A control that does nothing reads as broken; revisit when there is something real behind them.
  - **Sidebar "Permohonan Surat" badge** was a hardcoded `6`; it now shows the live pending count, matching the Kotak Pelaporan pattern.
  - The "Kode" column was 118px, which wrapped real `GB-YYYY-NNNNNN` codes onto two lines (the old fixtures used short codes, so this only showed with production-format data). Widened to 150px with `white-space: nowrap`.
- **Sorting, search, and period filter (2026-07-21).** `GET /api/requests` gained `sort` + `direction` (allow-listed to `created_at|reference_code|applicant_name|letter_type|status`, so the column can never be attacker-controlled — an unknown value is a 400, not a silent ignore) and `year` + `month`. Non-date sorts break ties on `createdAt`, otherwise paging on a low-cardinality column like `status` lets the DB reorder equal rows between pages. Month bounds are built in **WIB**, not UTC: the office is UTC+7, so a UTC range would file the first seven hours of each month under the wrong month. `GET /api/requests/counts` also returns `periods` (months that actually contain requests, newest first, with counts) so the dropdown only offers months with data.
- Dashboard: column headers are sort buttons carrying `aria-sort`, clicking the active column flips direction while a new column starts at its natural order (dates newest-first, names/codes A–Z); the search box covers kode and pemohon (placeholder updated to say so); the period dropdown replaces the decorative "Juli 2026" chip that was removed earlier.
- Fixed `.table-action.tertiary`: it had a transparent background and no border, so the action on SENT and REJECTED rows rendered as bare text rather than a button — visible in both the desktop table and the mobile card list.
- **Fixed the duplicated table + card list.** The queue renders the rows twice (a desktop `<table>` and a mobile card list) and swaps them at `max-width: 600px`. But `.queue-mobile-list` declared `display: grid` *after* `.mobile-table { display: none }` in the stylesheet; both are single-class selectors, so equal specificity meant source order won and the cards showed at every width. `.queue-mobile-list` now only sets padding/gap — the breakpoint owns `display`. Verified at 1500px, 601px, and 420px that exactly one view renders.
- **Search and filters regrouped.** Status tabs moved into their own card ("which slice of the queue"), with search + jenis surat + periode in one toolbar row above the table ("narrow the selected slice"). The search box previously sat in the page header, far from the other filters and easy to miss. `.queue-panel-head`/`.queue-panel-tools` became dead CSS in the process and were deleted.
- **Audit trail logged statuses, not actions.** `actionTitle` in `RequestDetail.tsx` handled only the four review actions and fell back to the status label for everything else, so every PDF rebuild printed an identical "Surat Dibuat" and a column of regenerations looked like one event logged repeatedly. The backend already distinguishes `generate` / `regenerate` / `send` / `submit`; those cases are now mapped ("Surat dibuat" vs "Surat dibuat ulang" vs "Surat dikirim ke pemohon"). Covered by a test in `generate-send.test.tsx`, verified to fail when the cases are removed.
- **Timeline bullets: two separate defects.** First, the rail sat 4px off the dot centres (`left: 8px` vs a centre of 13px) — fixed by moving the rail. That alignment fix was real but did not resolve the visible problem, because the actual complaint was a *collision*: the gutter was 26px and the dot `left: -30px`… wait, `left: -22px` with an 18px dot left exactly 4px before the text, and the `.now` variant adds a **4px `box-shadow` ring**, so the ring landed on the first letter of the title. The gutter is now 38px with the dot at `left: -30px` and the rail re-centred at 16px. Measured on both branches of `buildTimeline`: offset 0, and a clear gap after the ring (8px on `.now`, 12px on `.done`).
  - Worth remembering: the first measurement pass only checked a multi-entry timeline, where every dot is `.done` and has no ring — so it reported "0px offset" on a case that was never broken. The single-entry fallback renders one `.now` dot, which is what the report showed.
- The sidebar badge counts **work waiting on an admin** (SUBMITTED+IN_REVIEW+NEEDS_INFO), which is deliberately not the same as the "Semua" pill (every request) or the "Baru diajukan" card (SUBMITTED only). All three were verified correct against `/api/requests/counts`; the badge now carries a `title` saying what it counts, since three different numbers on one screen invite exactly this question.
- Verified end-to-end in the browser against seeded data: queue → generate → PDF + verification token → public `/verify` page, which correctly shows the AppConfig signatory ("Sofian — Keuchik Gampong Blang") and masked PII. Sorting, both filters, and both search modes were each exercised against the real API.
- [x] Steps: (1) test: queue renders rows from mocked `/requests`; approve calls `PATCH /requests/:id/status`; (2) FAIL; (3) implement; (4) PASS; (5) commit `feat(web): queue + review`.

**Public verify page (2026-07-21)** — `/verify/:token` was unstyled default-browser HTML (`<h1>` + `<dl>`), which is the single most public surface in the system: it is what warga reach by scanning the QR on a printed letter, often at a bank or school counter while a clerk watches. Rebuilt in `modules/verify/routes.ts`:
- The **verdict is the hero** — an oversized status mark and headline readable at arm's length, with the record below as supporting evidence. Green for verified, red for not.
- Ships as **one self-contained document**: styles inlined, no scripts, no web fonts, no remote assets, because it is opened on mid-range phones over rural signal. A test asserts there is no `<script>`, no stylesheet `<link>`, and no external URL.
- `tanggal_terbit` printed as the raw `2026-07-21`; it now reads "21 Juli 2026".
- The masked identity (`a.n. I*** (NIK 1706********0006)`) previously looked like corrupted data. The page now states that masking is deliberate — it is the privacy guarantee, not a defect. A test asserts the full NIK never appears in the HTML.
- The invalid page said only "Surat tidak valid" and dead-ended. It now explains what to do next (rescan, do not accept the document as official, contact the Keuchik's office), because an unverifiable letter is a potential forgery, not a 404.
- Palette matches `dashboard/src/styles.css` so the letter, dashboard, and this page read as one office. Verified at 390px and 1200px.

### Task 15: Letter generation & send (A4)
**PDF layout fixes (2026-07-21)** — covered by `backend/tests/letter-layout.test.ts`:
- **Page margins were applied twice.** `pdf.service.ts` passes `margin.top: 18mm` to Playwright *and* `.page` added `padding: 24mm`, so the kop surat started ~42mm down the sheet. (`@page { margin: 0 }` in the CSS does not prevent this — Playwright ignores it unless `preferCSSPageSize` is set.) `.page` is now `padding: 0`; the PDF margins are the single source of page padding, tightened to `12mm` top / `14mm` bottom to match the Word reference.
- **The QR + signature block could split across pages.** `.sign-row`/`.sign-block` now carry `break-inside: avoid`, so the date, QR, title, and name stay together — otherwise a name can land on page 2 while the QR that verifies it stays on page 1. `.sign-title`'s 64px wet-ink gap was also cut to 18px: the letter is e-signed (the caption says so), so it needs no room for a pen signature, and the extra height was what pushed the block over the boundary.
- The regression test renders real PDFs for L1/L4/L9 and asserts one page each; it was verified to fail (2 pages) when the tall gap is restored, so it genuinely guards the fix.


**Files:** `pages/Generate.tsx`, `components/PdfPreview.tsx`; Test with MSW
- On Approve -> call generate, preview PDF (embed `pdf_url`), allow regenerate, then Send (email). Show verification token/URL. Optional signature-image overlay toggle (brief Section 11.3).
- [x] Steps: (1) test: clicking Generate then Send transitions the shown status GENERATED->SENT (mocked); (2) FAIL; (3) implement preview + actions; (4) PASS; (5) commit `feat(web): generate & send`.

### Task 15A: Email provider settings UI
**Files:** `dashboard/src/pages/EmailProviderSettings.tsx`, `dashboard/src/components/ProviderStatusCard.tsx`, `dashboard/src/api/client.ts`; Test with MSW
- Purpose: give admins a dedicated dashboard screen to view, configure, test, and switch the active backend email provider without exposing secrets to the browser.
- Depends on backend provider settings endpoints being available first. The dashboard reads provider metadata/readiness, saves non-secret config fields plus secret updates back to the backend, and can trigger a test email send.
- Scope:
  - Show the current active provider.
  - Show 4 provider options: `mailersend`, `mailgun`, `gmail`, `smtp`.
  - Show readiness/status per provider (configured/not configured) from the backend.
  - Save provider-specific configuration dynamically to the database through the backend settings API.
  - Allow sending a test email from each provider card after configuration is saved.
  - Allow changing the active provider.
  - Optionally link to email preview examples, but never expose API keys, SMTP passwords, or secret tokens.
- [x] Steps: (1) test: settings page loads current provider from mocked API and saves a provider switch to `mailersend|mailgun|gmail|smtp`; (2) FAIL; (3) implement a dedicated settings page + route + provider selector UI; (4) PASS; (5) expand it with database-backed provider config forms plus a test-email action; (6) PASS; (7) commit `feat(web): email provider settings`.

---

## Phase 4 - Content management + public content APIs (Timeline: Weeks 6-7)

### Task 16: Content module API (all resources)
**Files:** `backend/src/modules/content/*`; Test `backend/tests/content.test.ts`
**Interfaces:** Public GET + admin write for banners, profile, vision-mission, officials, strengths, mosques, prayer-config, demographics (contract Section 5). Demographics = data-driven stat blocks.
- [x] Steps: (1) test: `PATCH /content/profile` (admin) then `GET /content/profile` (public) reflects the change; reorder banners persists order; (2) FAIL; (3) implement CRUD + Zod; (4) PASS; (5) commit `feat(api): content management`.

### Task 17: Content management hub UI (A5)
**Files:** `dashboard/src/pages/Content.tsx` (tabbed hub) + `dashboard/src/components/content/*Tab.tsx`, `dashboard/src/pages/AppSettings.tsx`; Test `dashboard/src/__tests__/content-management.test.tsx` (RTL + MSW)
- Tabs: Banner (add/reorder/remove + image upload), Profil & perangkat (CRUD officials, strengths, map), Prayer/Mosque (coords + mosque CRUD), Demografi (edit stat blocks), App settings (contact, letterhead, signatory, letter-number counters).
- **Built to an approved visual mock**, which supersedes the earlier "separate pages" attempt. One hub at `/content/:tab` with six tabs (Banner · Profil & Visi Misi · Perangkat · Masjid & Sholat · Demografi · Potensi Desa), a two-column layout (form + contextual aside), and a **single global "Simpan Perubahan"** in the page header with a last-saved timestamp. Tabs register a save handler with the header via `components/content/save-context.tsx`; list CRUD (banner reorder/delete, add perangkat/potensi/masjid) still acts immediately since those are not form state. The five sidebar "Konten Aplikasi" links deep-link into their tab.
- **App settings required backend work first**, done as part of this task: `AppConfig` gained contact/letterhead/signatory columns (migration `20260720175908_add_app_config_contact_letterhead_signatory`) plus `GET|PATCH /api/settings/app` and `GET|PATCH /api/settings/letter-counters`. The mock's Kemukiman / Luas Wilayah / Ketinggian fields needed `VillageProfile` columns too (migration `20260720181716_add_village_profile_kemukiman_area_elevation`).
- **Generated PDFs now use the configured branding.** `modules/letters/rendering.ts` reads the letterhead and signatory from `AppConfig` instead of module constants, and `partials/kop.html` interpolates the three letterhead lines. The letter definition still chooses *which role* signs (Keuchik vs Sekretaris a.n. Keuchik); the dashboard supplies that role's title and name. Every field falls back per-field to the Gampong Blang defaults, so an unconfigured install still prints a correct letter rather than a blank kop. Covered by `backend/tests/letter-branding.test.ts`.
- Not implemented from the mock, and still open: **drag-to-reorder** for demographic blocks (the aside shows grips but reordering is not wired). The mock's **Pratinjau** button was dropped — there is no citizen-app preview to open, and a control that does nothing reads as broken; revisit when a preview surface exists.
- Content editing details settled during review: **Jumlah Penduduk** and **Jenis Kelamin** keep a fixed shape the citizen app depends on (plain inputs, non-editable labels), while the other demographic blocks are open-ended tables whose rows can be added, renamed, or removed. **Block visibility is owned solely by the Profil & Visi Misi tab** — the Demografi tab has no toggles. Perangkat, Masjid, and Potensi Desa are tables with modal add/edit forms. All alerts go through **SweetAlert2** (`dashboard/src/lib/alerts.ts`); `confirmDelete` has a test seam because SweetAlert2 cannot be driven under jsdom.
- Seed data for the whole content module lives in `backend/db/seed-content.ts` and runs from `npm run db:seed`.
- **Prayer times now support both mobile modes.** `PrayerConfig` gained the Aladhan parameters the app sends when online (`aladhanMethod` 99, `fajrAngle` 20, `ishaAngle` 18, `school` 0 — matching `mobile/lib/data/services/prayer_times_service.dart`) plus a five-slot offline fallback schedule (migration `20260720181716…`/`add_prayer_config_aladhan_params_and_fallback`). **Mobile still has to be updated** to read the fallback from `GET /content/prayer-config` instead of the times hardcoded in `PrayerTimes.fallback()`.
- [x] Steps: (1) test: editing a demographics number saves via `PATCH /content/demographics`; (2) FAIL; (3) implement forms; (4) PASS; (5) commit `feat(web): content hub`.

---

## Phase 5 - Feedback + notifications (Timeline: Week 10)

### Task 18: Feedback API + inbox (A6)
**Files:** `backend/src/modules/feedback/*`, `dashboard/src/pages/Feedback.tsx`; Test backend + web
- `POST /feedback` (public), `GET /feedback` + `PATCH /feedback/:id` (admin: read/responded/notes). Inbox badge for new.
- **Done, backend + dashboard** (`backend/tests/feedback.test.ts` 17 tests, `dashboard/src/__tests__/feedback-inbox.test.tsx` 12 tests). Endpoints: public `POST /api/feedback`; admin `GET /api/feedback` (filter by `status`, search `q`, paged 20), `GET /api/feedback/:id`, `PATCH /api/feedback/:id`, `POST /api/feedback/:id/reply`.
- `PATCH` accepts `status` and/or `note` independently, so saving a note does not silently mark a report read; the body is rejected when neither is supplied. Attachments are validated against `File` before insert, so a bad `file_id` returns a field-level 400 rather than an opaque FK violation (same approach as `modules/requests`).
- The list response carries **`new_count`**, counted across the whole inbox rather than the current filter — it drives the sidebar badge, which must not change when the admin filters the view. The sidebar previously showed a hardcoded `3` on a dead link; `DashboardFrame` now fetches the real count and routes to `/feedback`.
- **Built to the approved mock** — a two-pane master/detail view (report list left, detail right), pill filters `Baru · Dibaca · Ditanggapi`, attachment thumbnail cards, and separate "Catatan Internal" (private) and "Balasan ke Pelapor" (emailed) boxes.
- **Three fields were added for the mock** (migration `20260721070000_add_feedback_reference_reply_and_file_original_name`): `Feedback.referenceCode` (`LPR-XXXXX`, Crockford alphabet so a code read aloud can't confuse I/1 or O/0), `Feedback.reply`/`repliedAt`/`repliedBy`, and `File.originalName` so attachment cards show the uploader's filename. `storeUpload` already received `originalName` but was discarding it; it now persists.
- **Replying emails the reporter** via the existing `EmailService` (template `templates/emails/feedback-reply.html`), since feedback has no login and email is the only channel that reaches the warga. The send happens *before* the DB write on purpose: if the provider fails, the report must not be left marked "responded" when nothing arrived. Covered by a test that stubs a failing transport and asserts the status stays `new`.
- **Reply button ignored status.** On an already-answered report it still read "Kirim Balasan & Tandai Ditanggapi" and stayed enabled, promising an action that had already happened ("Tandai Dibaca" was correctly disabled by comparison). It now reads **"Kirim Balasan Susulan"** once `replied_at` is set, and is disabled until the reply text actually changes. Replying again is *not* blocked outright: warga do send follow-ups, the backend overwrites the reply and emails again, and locking it would leave no way to send a correction. A note under the box says a second send updates the reply and emails the reporter again.
- Fixing that surfaced a worse bug: **replying made the report vanish.** The detail pane derived its selection from the filtered list, so answering a report moved it into "Ditanggapi", dropped it out of the current filter, and left the pane empty with no confirmation the reply had landed. An explicit selection is now honoured even after the report leaves the list, and `FeedbackDetail` takes a nullable `fallback` since it fetches by id anyway.
- Deviation from the mock, deliberate: the mock's detail pane has a **subject line** ("Jalan rusak di Dusun Kuini"), but reports have no subject field — the warga only writes a body. Deriving a pseudo-title from the body just repeated the text shown directly beneath it, so the reporter's name heads the pane instead. Add a real subject field if the citizen form ever collects one.
- [x] Steps: (1) backend test: create feedback -> appears in admin list as `new`; mark responded persists; (2) FAIL (11/12 red, routes 404); (3) implement API + inbox page; (4) PASS (119/119 backend, 58/58 dashboard); (5) commit `feat: feedback inbox`.

### Task 19: Notification wiring (email primary, Firebase push) ✅ Done
**Files:** extend `backend/src/modules/notifications/*`, add device-token persistence + registration endpoints as needed; Test `backend/tests/notifications.test.ts`
- **Transport decision:** mobile push uses **Firebase Cloud Messaging (FCM)**. The backend sends through Firebase Admin SDK; the mobile app registers FCM device tokens with this API.
- **Design target:** store device tokens per installed app/device, support token register/unregister, deactivate invalid tokens reported by FCM, and keep the dispatcher transport-agnostic (`email` + `push`).
- Events -> channels (brief Section 15): `SENT` (email+push->resident), `REJECTED` (push+optional email), `NEEDS_INFO` (push+optional email), new `SUBMITTED`/feedback (dashboard badge/internal admin surface, not Firebase). Handle email bounces/logging.
- [x] Steps: (1) test: transitioning to `SENT` enqueues a resident email + push payload; (2) FAIL; (3) implement dispatcher; (4) PASS; (5) commit pending.

> **As-built (2026-07-22):** Added `DeviceToken` + `RequestPushToken`, public `POST/DELETE /api/notifications/device-tokens`, optional `push_token`/`push_platform` on `POST /api/requests`, and Firebase-backed push transport with no-op local/test fallback. `SENT` and `REJECTED` now dispatch resident push payloads to tokens linked to the request, and invalid FCM tokens are deactivated.

> **iOS push caveat (2026-07-23):** backend FCM sending is ready, but iOS delivery will not work until Firebase has an APNs auth key/certificate from a paid Apple Developer Program account. Android delivery can be tested first with the current Firebase service account.

---

## Phase 6 - Hardening, Docker, Railway deploy (Timeline: Weeks 11-13)

### Task 20: Security & privacy pass
- Encrypt NIK/attachment references at rest; enforce signed-URL-only attachment access; rate-limit `/verify` and `POST /requests`; ensure demographics endpoints never return individual rows (brief Section 16.2). Add `helmet`, CORS allowlist.
- [ ] Test: unauthenticated access to `/api/requests` -> 401; direct attachment path without signature -> 403. Commit `chore(api): security hardening`.

### Task 21: Dockerize + docker-compose + CI
- `backend/Dockerfile` (Playwright base image), `dashboard/Dockerfile` (build -> static serve), `docker-compose.yml` (postgres+backend+dashboard). CI: lint + typecheck + `npm test` on push.
- [ ] Test: `docker compose up` -> `GET /api/health` ok and dashboard served. Commit `chore: docker + ci`.

### Task 22: Railway deploy + staging
- Provision Railway Postgres, set env vars, deploy backend + dashboard, run migrations + seed, smoke-test the full loop on staging, wire the public domain for `/verify` links.
- [ ] Test: create->approve->generate->send->scan `/verify` works end-to-end on staging. Commit `chore: railway deploy config`.

---

## Self-Review checklist (run before handing off)
- **Spec coverage:** screens A1-A6 + V1 verify page all have tasks (13,14,14,15,17,18,9). Data model Section 14 = Task 2. QR authenticity Section 13.1 = Tasks 9,10. Notifications Section 15 = Task 19. Content Section 11.4 = Tasks 16,17. Yes.
- **Contract consistency:** every route matches `../API-CONTRACT.md`; enums (`RequestStatus`, `LetterType`) match the schema in Task 2 and the contract.
- **Type consistency:** `NumberService.assign`, `QrService.newToken`, `stateMachine.can`, `PdfService.render`, `EmailService.send` names are used consistently across tasks 7-12.
- **Open questions** (brief Appendix C) to resolve early: exact kop surat/letterhead + per-type nomor prefixes (C#5), signature-image-alongside-QR & verify-page privacy (C#7), NEEDS_INFO loop in Phase 1? (C#4), retention policy for attachments (Section 16.2). Confirm with the village before Phase 2 sign-off.
