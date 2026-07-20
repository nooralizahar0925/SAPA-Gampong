# Aplikasi Desa — Mobile (Flutter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the resident-facing mobile app (Android & iOS) that lets warga request the 10 official letters, track status, read village info (profil, demografi, jadwal sholat), and submit feedback — all in Bahasa Indonesia.

**Architecture:** Feature-first Flutter app. Presentation (widgets) → Riverpod controllers → repositories → Dio API client against the backend in `../Website`. Models are immutable (freezed). The letter form is **schema-driven**: it renders from the `GET /letter-types` response so the 10 forms are data, not hard-coded screens. Read-content is cached (Hive) for offline viewing. Prayer times are computed **on-device** from village coordinates.

**Tech Stack:** Flutter 3.24+ / Dart 3, `flutter_riverpod` (state), `go_router` (navigation), `dio` (HTTP), `freezed` + `json_serializable` (models), `hive`/`hive_flutter` (cache), `flutter_secure_storage`, `image_picker` + `file_picker` + `flutter_image_compress` (attachments), `fl_chart` (demografi), `adhan` (prayer times), `flutter_local_notifications` (azan alarm), `firebase_messaging` (push, optional), `intl` (id_ID), `cached_network_image`.

## Global Constraints

- **UI language:** Bahasa Indonesia only; externalize all strings (`lib/core/localization`). Locale `id_ID`.
- **Platforms:** Android-first, iOS supported from the same codebase. Min Android SDK 23, iOS 13.
- **No resident login** in Phase 1 — letter tracking is via reference code + email (brief §16.1).
- **API contract:** `../API-CONTRACT.md` is authoritative. Do not invent endpoints — change the contract first.
- **Field validation** (brief §5.5): NIK = 16 numeric digits; email format enforced; enums exactly as in the contract.
- **Attachments:** accept image + PDF, compress images client-side, cap 5 MB/file.
- **Connectivity:** assume weak rural network — retry submits, show pending/offline states, cache read-content.
- **Branding:** village logo throughout; palette dark green + yellow accents (confirm final assets, brief §16.5).
- **Requirements source of truth:** `../../Brief/Aplikasi-Desa-Dev-Brief.md`. Screen ids S1–S11 map to brief §4.3.

---

## File Structure

```
lib/
  main.dart                     # bootstrap: init Hive, localization, run App
  app.dart                      # MaterialApp.router, theme, locale
  core/
    config/env.dart             # API base url per flavor
    network/dio_client.dart     # Dio + interceptors (retry, error mapping)
    network/api_exception.dart  # maps error envelope → typed exception
    router/app_router.dart      # go_router routes for S1–S11
    theme/app_theme.dart        # colors, typography (green + yellow)
    localization/strings_id.dart
    widgets/                    # shared: AppScaffold, PrimaryButton, EmptyState, LoadingView, ErrorView
    utils/validators.dart       # nik, email, phone, required
  data/
    models/                     # freezed: LetterType, FieldSpec, LetterRequest, Attachment,
                                #   VillageProfile, Official, StatBlock, Mosque, PrayerConfig, Feedback
    repositories/               # LetterRepository, ContentRepository, FeedbackRepository
    services/                   # UploadService, PrayerService (adhan), NotificationService, CacheService
  features/
    home/                       # S1 Beranda: banner carousel, primary card, feature grid, bottom nav
    letters/
      catalog/                  # S2 type picker
      form/                     # S3 dynamic form engine (renders FieldSpec list)
      attachments/              # S4 upload
      review/                   # S5 review & confirm
      success/                  # S6 success + reference code
      tracking/                 # S7 status tracking
    profile/                    # S8 village profile + officials list
    prayer/                     # S9 jadwal sholat + azan toggle
    demographics/               # S10 charts
    feedback/                   # S11 pelaporan form
test/                           # unit + widget tests mirror lib/
integration_test/               # end-to-end letter flow
```

**Testing note (read before Task 1):** you may not know Flutter test design well. Rules for this project:
- **Unit-test pure logic** (validators, the form-schema → controller mapping, PrayerService) with `flutter_test` + no widgets.
- **Widget-test screens** with a **fake repository** (in-memory) injected via Riverpod `overrides` — never hit a real network in unit/widget tests.
- **One `integration_test`** drives the whole letter flow against a mock Dio (`http_mock_adapter`).
- Every task below states the exact test to write first.

---

## Phase 0 — Project setup (Timeline: Week 1)

### Task 1: Scaffold project, theme, routing shell

**Files:**
- Create: `pubspec.yaml` (deps above), `lib/main.dart`, `lib/app.dart`, `lib/core/theme/app_theme.dart`, `lib/core/router/app_router.dart`, `lib/core/localization/strings_id.dart`
- Test: `test/smoke_test.dart`

**Interfaces:**
- Produces: `AppRouter` (go_router with named routes `home`, `letterCatalog`, `letterForm`, `attachments`, `review`, `success`, `tracking`, `profile`, `prayer`, `demographics`, `feedback`); `AppTheme.light` (ColorScheme seeded green `#1B5E20`, secondary yellow `#F9A825`).

- [ ] **Step 1: Write the failing test** — `test/smoke_test.dart` pumps `App()` and expects the Beranda title `Beranda` to render.
```dart
testWidgets('app boots to Beranda', (t) async {
  await t.pumpWidget(const ProviderScope(child: App()));
  expect(find.text('Beranda'), findsOneWidget);
});
```
- [ ] **Step 2: Run** `flutter test test/smoke_test.dart` — expect FAIL (no App yet).
- [ ] **Step 3: Implement** `App` (MaterialApp.router + `AppTheme.light` + `supportedLocales:[Locale('id')]`), a placeholder Beranda scaffold, and the router.
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Commit** `feat(mobile): project scaffold, theme, router`.

### Task 2: Dio client + typed error mapping + env

**Files:** Create `lib/core/config/env.dart`, `lib/core/network/dio_client.dart`, `lib/core/network/api_exception.dart`; Test `test/network/api_exception_test.dart`

**Interfaces:**
- Produces: `DioClient(baseUrl)` exposing `Dio dio`; `ApiException.fromDioError(e)` mapping the error envelope `{error:{code,message,fields}}` → `ApiException(code, message, fields)`.

- [ ] **Step 1:** Write test: feeding a `DioException` whose response body is the error envelope yields `ApiException` with `code=="VALIDATION_ERROR"` and `fields["nik"]` set.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement env (`Env.apiBaseUrl`), Dio with retry interceptor + `Accept: application/json`, and `ApiException.fromDioError`.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): dio client + error mapping`.

---

## Phase 1 — Letter request core (Timeline: Weeks 2–4) — BUILD THIS FIRST AND MOST ROBUSTLY

This is the reason the app exists (brief §5). Prove the whole loop for **L1** first, then it generalizes for free because forms are schema-driven.

### Task 3: Models — LetterType, FieldSpec, LetterRequest, Attachment

**Files:** Create `lib/data/models/letter_type.dart`, `field_spec.dart`, `letter_request.dart`, `attachment.dart` (freezed + json); Test `test/models/letter_type_test.dart`

**Interfaces:**
- Produces: `LetterType{code,name,description,subjectIsApplicant,requiredAttachments:List<String>,fields:List<FieldSpec>}`; `FieldSpec{key,label,type:FieldType,required,options:List<String>?}` where `FieldType` enum = `text,textarea,date,time,year,number,nik,phone,email,enumT`; `LetterRequest`, `Attachment{fileId,kind}`.

- [ ] **Step 1:** Write test: `LetterType.fromJson(sample)` (paste the `GET /letter-types` L1 sample from the contract) parses 5 fields, `fields[3].type == FieldType.nik`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement freezed models + `FieldType` JSON mapping (`"nik"→FieldType.nik`, `"enum"→FieldType.enumT`). Run `dart run build_runner build`.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): letter models`.

### Task 4: Validators (NIK, email, phone, required, enum)

**Files:** Create `lib/core/utils/validators.dart`; Test `test/utils/validators_test.dart`

**Interfaces:**
- Produces: `Validators.nik(v)`, `.email(v)`, `.phone(v)`, `.required(v)`, `.forField(FieldSpec)` → returns `String? Function(String?)` validator.

- [ ] **Step 1:** Write tests: NIK `"1607"` → error "NIK harus 16 digit"; NIK of 16 digits → null; bad email → error; `forField` on a required enum with empty value → error.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement validators (regex `^\d{16}$` for NIK, standard email regex, phone `^0\d{8,13}$`).
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): field validators`.

### Task 5: LetterRepository + fake for tests

**Files:** Create `lib/data/repositories/letter_repository.dart`, `lib/data/services/upload_service.dart`; Test `test/repositories/letter_repository_test.dart` (uses `http_mock_adapter`)

**Interfaces:**
- Produces: `LetterRepository{ Future<List<LetterType>> letterTypes(); Future<CreatedRequest> submit(LetterRequestDraft); Future<TrackStatus> track(String refCode); }`; `CreatedRequest{id,referenceCode,status}`; `TrackStatus{referenceCode,letterType,status,statusLabel,updatedAt}`. `UploadService.upload(File, kind) → Attachment`.
- Consumes: `DioClient` (Task 2), models (Task 3).

- [ ] **Step 1:** Write test: mock `GET /letter-types` → repo returns 10 types; mock `POST /requests` → `submit` returns `referenceCode=="GB-2026-000123"`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement repository calls per `../API-CONTRACT.md` §1,§3; `UploadService` posts multipart to `/uploads`.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): letter repository + upload service`.

### Task 6: S2 Letter type picker

**Files:** Create `lib/features/letters/catalog/letter_catalog_screen.dart` + `letter_catalog_controller.dart`; Test `test/features/letter_catalog_test.dart`

**Interfaces:**
- Consumes: `LetterRepository.letterTypes()`.
- Produces: navigation to `letterForm` with the selected `LetterType`.

- [ ] **Step 1:** Widget test with a fake repo returning 2 types → expect both names render; tapping one calls router with that type.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement list (name + one-line description), loading/error/empty states, optional search box.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): S2 letter type picker`.

### Task 7: S3 Dynamic form engine + applicant contact block

**Files:** Create `lib/features/letters/form/dynamic_form.dart`, `field_widget.dart`, `letter_form_controller.dart`; Test `test/features/dynamic_form_test.dart`

**Interfaces:**
- Consumes: `LetterType.fields` (Task 3), `Validators.forField` (Task 4).
- Produces: a `LetterRequestDraft{letterType,applicantName,applicantEmail,applicantPhone,keperluan?,subjectData:Map<String,dynamic>,attachments}` in the controller state, ready for review.

- [ ] **Step 1:** Widget test: given an L1 `LetterType`, the form renders one input per field; a NIK field rejects `"123"`; the **applicant contact block** (name/email/phone, brief §5.3) always renders even if not in `fields`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement `FieldWidget` switch on `FieldType` (text/textarea/date-picker/time/year/number/nik/phone/email/enum-dropdown). Prefill defaults (Agama=Islam; Gampong=Blang, Kecamatan=Krueng Sabee, Kabupaten=Aceh Jaya where present). Keep "who is requesting" (applicant) separate from "who the letter is about" (subject) — for L3/L6/L7 show a note (brief §5.3, §6).
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): S3 dynamic letter form`.

### Task 8: S4 Attachment upload (KTP/KK + per-type required)

**Files:** Create `lib/features/letters/attachments/attachment_picker.dart`; Test `test/features/attachment_picker_test.dart`

**Interfaces:**
- Consumes: `LetterType.requiredAttachments`, `UploadService.upload`.
- Produces: `List<Attachment>` on the draft; blocks "next" until required kinds present.

- [ ] **Step 1:** Widget test: required `["KTP","KK"]` → "Lanjut" disabled until both present (use a fake UploadService returning a stub Attachment).
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement picker (camera/gallery/file), client-side image compression (`flutter_image_compress`), 5 MB cap with friendly error, thumbnails.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): S4 attachment upload`.

### Task 9: S5 Review & confirm

**Files:** Create `lib/features/letters/review/review_screen.dart`; Test `test/features/review_screen_test.dart`

- [ ] **Step 1:** Widget test: draft with 3 fields + 2 attachments → all values shown read-only; "Ubah" navigates back; L3 shows the false-statement confirmation checkbox (brief §6 L3) and blocks submit until ticked.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement summary + attachment thumbnails + edit-back + conditional liability checkbox.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): S5 review & confirm`.

### Task 10: S6 Submit + success + S7 tracking

**Files:** Create `lib/features/letters/success/success_screen.dart`, `lib/features/letters/tracking/tracking_screen.dart` + controller; Test `test/features/submit_and_track_test.dart`

**Interfaces:**
- Consumes: `LetterRepository.submit`, `.track`.

- [ ] **Step 1:** Widget test: submitting a valid draft (fake repo) shows the reference code + the SLA copy *"...akan dikirim ke email anda dalam waktu maksimal 3×24 jam"*; entering a reference code on S7 shows the `status_label`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement submit-with-retry, success screen (reference code, copy the email address back for confirmation), and tracking lookup screen.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): S6 success + S7 tracking`.

### Task 11: End-to-end integration test (L1 happy path)

**Files:** Create `integration_test/letter_flow_test.dart` (mock Dio via `http_mock_adapter`)

- [ ] **Step 1:** Write the flow test: Beranda → pick L1 → fill form → add KTP+KK → review → submit → success shows reference code.
- [ ] **Step 2:** Run `flutter test integration_test/letter_flow_test.dart` — FAIL until wiring complete.
- [ ] **Step 3:** Fix wiring/navigation until green.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `test(mobile): e2e letter flow`.

---

## Phase 2 — Home, banner & village profile (Timeline: Weeks 7–8)

### Task 12: S1 Beranda — banner carousel + primary card + feature grid + bottom nav
**Files:** `lib/features/home/*`, `lib/data/repositories/content_repository.dart`; Test `test/features/home_test.dart`
- Consumes: `GET /content/banners` (contract §5). Bottom nav tabs: `Beranda | Layanan | Berita | Pengaturan` (Berita = empty-state "Belum ada berita", brief §4.1). Primary card = "Permohonan Pembuatan Surat" (dominant). Feature grid → Profil Desa, Demografi, Jadwal Sholat, Pelaporan.
- [ ] Steps: (1) widget test banners render + primary card taps to catalog; (2) FAIL; (3) implement carousel (page dots, tappable), grid, bottom nav; (4) PASS; (5) commit `feat(mobile): S1 beranda`.

### Task 13: S8 Village profile + officials list
**Files:** `lib/features/profile/*`; models `VillageProfile`, `Official`, `StatBlock` reuse; Test `test/features/profile_test.dart`
- Consumes: `GET /content/profile`, `/vision-mission`, `/officials`, `/strengths`. Layout brief §7 (header photo, description, key facts, "Lokasi Kantor Desa" map button, Visi & Misi, leadership cards, "Lihat Semua Perangkat Desa" → officials list, potensi keunggulan cards).
- [ ] Steps: (1) widget test with fake content renders keuchik "Sofian" + officials count; (2) FAIL; (3) implement + Hive cache for offline; (4) PASS; (5) commit `feat(mobile): S8 village profile`.

---

## Phase 3 — Demographics (Timeline: Week 8)

### Task 14: S10 Demographics charts (data-driven stat blocks)
**Files:** `lib/features/demographics/*`; Test `test/features/demographics_test.dart`
- Consumes: `GET /content/demographics` → `List<StatBlock>` with `type ∈ number|split|bar|pie`. Render each block by type with `fl_chart`. Must be **data-driven** (brief §9) — do not hard-code the 4 charts.
- [ ] Steps: (1) widget test: a `split` block renders male/female %, a `bar` block renders bars; (2) FAIL; (3) implement chart renderers per type + big-number + KK count; (4) PASS; (5) commit `feat(mobile): S10 demographics`.

---

## Phase 4 — Prayer schedule + azan alarm (Timeline: Week 9)

### Task 15: PrayerService (on-device times from coordinates)
**Files:** `lib/data/services/prayer_service.dart`; Test `test/services/prayer_service_test.dart`
- Consumes: `GET /content/prayer-config` (lat/lng/method/timezone). Uses `adhan` package.
- Produces: `PrayerService.timesFor(DateTime, PrayerConfig) → {subuh,dhuhur,ashar,maghrib,isya}` as WIB times.
- [ ] Steps: (1) unit test: for fixed coords+date, five times are ordered subuh<dhuhur<ashar<maghrib<isya; (2) FAIL; (3) implement via `adhan` CalculationMethod; (4) PASS; (5) commit `feat(mobile): prayer time service`.

### Task 16: S9 Jadwal Sholat UI + azan alarm scheduling
**Files:** `lib/features/prayer/*`, `lib/data/services/notification_service.dart`; Test `test/features/prayer_screen_test.dart`
- Rows `XX:XX WIB`; "Aktifkan Alarm Suara Azan" toggle → schedule local notifications + bundled azan sound (`flutter_local_notifications`), respect DND. Masjid/meunasah list from `GET /content/mosques`.
- [ ] Steps: (1) widget test: five labeled rows render; toggling alarm calls `NotificationService.scheduleDaily`; (2) FAIL; (3) implement UI + scheduling + mosque cards; (4) PASS; (5) commit `feat(mobile): S9 prayer + azan`.

---

## Phase 5 — Feedback + notifications (Timeline: Week 10)

### Task 17: S11 Feedback/Pelaporan form
**Files:** `lib/features/feedback/*`, `lib/data/repositories/feedback_repository.dart`; Test `test/features/feedback_test.dart`
- Fields (brief §10): Nama, Email, No. HP, Isi Laporan, Lampiran Foto (opt), Lampiran Dokumen (opt). `POST /feedback`. Success screen reuses 3×24h reassurance + "Kembali ke Beranda".
- [ ] Steps: (1) widget test: valid form (fake repo) → success screen; missing email → inline error; (2) FAIL; (3) implement; (4) PASS; (5) commit `feat(mobile): S11 feedback`.

### Task 18: Push notifications (letter SENT / REJECTED) — optional in Phase 1
**Files:** extend `notification_service.dart`; Test `test/services/notification_service_test.dart`
- Consumes: `firebase_messaging`. On `SENT`/`REJECTED` show a local notification. (If push infra deferred, keep email as primary — brief §15.)
- [ ] Steps: (1) unit test handler maps a `SENT` data-message → notification title "Surat Anda sudah dikirim"; (2) FAIL; (3) implement FCM handler; (4) PASS; (5) commit `feat(mobile): push notifications`.

---

## Phase 6 — Hardening & release (Timeline: Weeks 11–13)

### Task 19: Offline cache + retry polish
- Cache profile/prayer-config/demographics/banners in Hive; show cached data with a "diperbarui …" note; queue failed submits and retry (brief §16.4).
- [ ] Test: with Dio offline, profile screen still renders last-cached content. Commit `feat(mobile): offline caching`.

### Task 20: Security & privacy pass
- No PII in logs; secure storage for any tokens; signed attachment URLs only; confirm demographics are aggregate-only (brief §16.2).
- [ ] Test/checklist committed as `docs/security-checklist.md`. Commit `chore(mobile): security pass`.

### Task 21: Release builds + store assets
- App icon/splash with village logo; Android `appBundle`, iOS archive; flavors dev/staging pointing at the correct API base url.
- [ ] Run `flutter build appbundle --flavor staging`; verify launches against staging API. Commit `chore(mobile): release build config`.

---

## Self-Review checklist (run before handing off)
- **Spec coverage:** S1–S11 all have tasks (Task 12,6,7,8,9,10,13,16,14,17). Letter QR/verify is backend-side; mobile only surfaces status + emailed PDF. ✔
- **Contract consistency:** every repository call cites an endpoint in `../API-CONTRACT.md`. If you add a call, add it to the contract first.
- **Enums** match the contract exactly (jenis_kelamin, agama, status_perkawinan, dusun).
- **Open questions** (brief Appendix C) that affect mobile: SLA "3×24 jam" copy (C#3), Berita tab empty-state (C#6), required attachments per type (C#2). Resolve with the village before Phase 1 sign-off.
