# Aplikasi Desa — Mobile (Flutter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the resident-facing mobile app (Android & iOS) that lets warga request the 10 official letters, track status, read village info (profil, demografi, jadwal sholat), and submit feedback — all in Bahasa Indonesia.

**Architecture:** Feature-first Flutter app. Presentation (widgets) → Riverpod providers/controllers → repositories → Dio API client against the backend in `../backend`. The letter form is **schema-driven**: it renders from the `GET /letter-types` response so the 10 forms are data, not hard-coded screens. Read-content caching is still pending. Prayer times use backend prayer config plus the Aladhan HTTP API, with configured fallback times when offline.

**Tech Stack:** Flutter 3.24+ / Dart 3, `flutter_riverpod` (state), `go_router` (navigation), `dio` (HTTP), `freezed` + `json_serializable` for generated models where already used, plain Dart models for newer small content DTOs, `image_picker` + `file_picker` + `flutter_image_compress` (attachments), `geolocator` + Aladhan HTTP API (prayer times), `audioplayers` (in-app azan alarm), `intl` (id_ID).

**Packages currently in pubspec.yaml (2026-07-22):** `flutter_riverpod`, `go_router`, `dio`, `freezed_annotation`, `json_annotation`, `google_fonts`, `geolocator`, `intl`, `audioplayers`, `image_picker`, `file_picker`, `flutter_image_compress`, `hive`, `hive_flutter`, `firebase_core`, `firebase_messaging`, `flutter_local_notifications`. **Still need to add if required by later hardening:** `cached_network_image`. (Approach decision: skip `adhan` — prayer times already work via Aladhan HTTP API. Skip `fl_chart` — custom chart widgets already built.)

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
  main.dart                     # bootstrap localization and run App
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
    services/                   # UploadService, PrayerTimesService, NotificationService, CacheService
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

## As-Built Status (2026-07-22) — UI-First Implementation + API Wiring

All 21 screens were built UI-first with mock data before backend integration began. The table below records what is done, what needs API wiring, and what is not started. Use this as the integration checklist alongside the task steps below.

> **Integration approach chosen: Approach 2 (by-the-plan).** This means adding Riverpod providers/controllers per screen, building the schema-driven form engine, adding Hive caching, and wiring all screens to real API endpoints before release.

| Task | Description | Status |
|------|-------------|--------|
| Task 1 | Scaffold, theme, routing | ✅ Done |
| Task 2 | Dio client + env + error mapping | ✅ Done |
| Task 3 | Models (LetterType, FieldSpec, LetterRequest, Attachment) | ✅ Done (freezed + json_serializable) |
| Task 4 | Validators (NIK, email, phone, required, forField) | ✅ Done |
| Task 5 | LetterRepository + UploadService | ✅ Done |
| Task 6 | S2 Letter catalog — Riverpod + live `GET /letter-types` | ✅ Done |
| Task 7 | S3 Dynamic form engine (schema-driven) | ✅ Done |
| Task 8 | S4 Attachment upload — `image_picker` + `POST /uploads` | ✅ Done |
| Task 9 | S5 Review & confirm — real submit wiring | ✅ Done |
| Task 10 | S6 Success + S7 Tracking — real `POST /requests` + `GET /track` | ✅ Done |
| Task 11 | E2E integration test (letter flow) | 🔧 Added — needs Android/iOS device run |
| Task 12 | S1 Beranda — `GET /content/banners` + Riverpod | ✅ Done |
| Task 13 | S8 Village profile — `GET /content/profile` + `/officials` + `/strengths` | ✅ Done |
| Task 14 | S10 Demographics — `GET /content/demographics` | ✅ Done |
| Task 15A | Prayer config — `GET /content/prayer-config` as fallback source | ✅ Done |
| Task 16 | S9 Prayer UI + mosque list — `GET /content/mosques` | ✅ Done — live mosque list + in-app adzan alarm |
| Task 17 | S11 Feedback — `POST /feedback` | ✅ Done |
| Task 18 | Push notifications (FCM) | ✅ Done — data handler + token registration |
| Task 19 | Offline cache (Hive) | ✅ Done |
| Task 20 | Security & privacy pass | ☐ Not started |
| Task 21 | Release builds | ☐ Not started |

**Remaining integration files / systems:**
- Native Firebase project files/config still need to be supplied per environment before real devices can receive FCM from production.
- Run `integration_test/letter_flow_test.dart` on an Android/iOS simulator or physical device.

---

## Phase 0 — Project setup (Timeline: Week 1)

### Task 1: Scaffold project, theme, routing shell ✅ Done

**Files:**
- Create: `pubspec.yaml` (deps above), `lib/main.dart`, `lib/app.dart`, `lib/core/theme/app_theme.dart`, `lib/core/router/app_router.dart`, `lib/core/localization/strings_id.dart`
- Test: `test/smoke_test.dart`

**Interfaces:**
- Produces: `AppRouter` (go_router with named routes `home`, `letterCatalog`, `letterForm`, `attachments`, `review`, `success`, `tracking`, `profile`, `prayer`, `demographics`, `feedback`); `AppTheme.light` (ColorScheme seeded green `#1B5E20`, secondary yellow `#F9A825`).

> **As-built (2026-07-21):** All 14 design tokens defined in `app_theme.dart`. All routes including `splash`, `purpose`, `myRequests` added. Plus Jakarta Sans via `google_fonts`. Splash screen (S0) with animated progress bar. All 21 screens built with full mockup fidelity.

- [x] **Step 1: Write the failing test**
- [x] **Step 2: Run** — FAIL
- [x] **Step 3: Implement**
- [x] **Step 4: Run** — PASS
- [x] **Step 5: Commit** `feat(mobile): project scaffold, theme, router`.

### Task 2: Dio client + typed error mapping + env ✅ Done

**Files:** Create `lib/core/config/env.dart`, `lib/core/network/dio_client.dart`, `lib/core/network/api_exception.dart`; Test `test/network/api_exception_test.dart`

**Interfaces:**
- Produces: `DioClient(baseUrl)` exposing `Dio dio`; `ApiException.fromDioError(e)` mapping the error envelope `{error:{code,message,fields}}` → `ApiException(code, message, fields)`.

> **As-built (2026-07-21):** `Env.apiBaseUrl` defaults to `http://localhost:8080/api` via `String.fromEnvironment`. `DioClient` has `_ApiExceptionInterceptor`. `ApiException.fromDioError` parses the error envelope.

- [x] **Step 1:** Write test
- [x] **Step 2:** Run — FAIL
- [x] **Step 3:** Implement
- [x] **Step 4:** Run — PASS
- [x] **Step 5:** Commit `feat(mobile): dio client + error mapping`.

---

## Phase 1 — Letter request core (Timeline: Weeks 2–4) — BUILD THIS FIRST AND MOST ROBUSTLY

This is the reason the app exists (brief §5). Prove the whole loop for **L1** first, then it generalizes for free because forms are schema-driven.

### Task 3: Models — LetterType, FieldSpec, LetterRequest, Attachment ✅ Done

**Files:** Create `lib/data/models/letter_type.dart`, `field_spec.dart`, `letter_request.dart`, `attachment.dart` (freezed + json); Test `test/models/letter_type_test.dart`

**Interfaces:**
- Produces: `LetterType{code,name,description,subjectIsApplicant,requiredAttachments:List<String>,fields:List<FieldSpec>}`; `FieldSpec{key,label,type:FieldType,required,options:List<String>?}` where `FieldType` enum = `text,textarea,date,time,year,number,nik,phone,email,enumT`; `LetterRequest`, `Attachment{fileId,kind}`.

> **As-built (2026-07-22):** All four models exist with freezed + json_serializable. `.freezed.dart` and `.g.dart` generated, and the catalog/form/review flow now parses the live `GET /letter-types` response shape.

- [x] **Step 1–5:** Done.
- [x] **Step 6 (integration check):** Run `LetterType.fromJson` against the actual `GET /letter-types` response and confirm no field mapping errors before Task 5.

### Task 4: Validators (NIK, email, phone, required, enum) ✅ Done

**Files:** Create `lib/core/utils/validators.dart`; Test `test/utils/validators_test.dart`

**Interfaces:**
- Produces: `Validators.nik(v)`, `.email(v)`, `.phone(v)`, `.required(v)`, `.forField(FieldSpec)` → returns `String? Function(String?)` validator.

- [x] **Step 1:** Write tests: NIK `"1607"` → error "NIK harus 16 digit"; NIK of 16 digits → null; bad email → error; `forField` on a required enum with empty value → error.
- [x] **Step 2:** Run — FAIL.
- [x] **Step 3:** Implement validators (regex `^\d{16}$` for NIK, standard email regex, phone `^0\d{8,13}$`).
- [x] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): field validators`.

### Task 5: LetterRepository + UploadService ✅ Done

**Files:** Create `lib/data/repositories/letter_repository.dart`, `lib/data/services/upload_service.dart`; Test `test/repositories/letter_repository_test.dart` (uses `http_mock_adapter`)

**Interfaces:**
- Produces: `LetterRepository{ Future<List<LetterType>> letterTypes(); Future<CreatedRequest> submit(LetterRequestDraft); Future<TrackStatus> track(String refCode); }`; `CreatedRequest{id,referenceCode,status}`; `TrackStatus{referenceCode,letterType,status,statusLabel,updatedAt}`. `UploadService.upload(File, kind) → Attachment`.
- Consumes: `DioClient` (Task 2), models (Task 3).

- [x] **Step 1:** Write test: mock `GET /letter-types` → repo returns types; mock `POST /requests` → `submit` returns an API reference code.
- [x] **Step 2:** Run — FAIL.
- [x] **Step 3:** Implement repository calls per `../API-CONTRACT.md` §1,§3; `UploadService` posts multipart to `/uploads`.
- [x] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): letter repository + upload service`.

### Task 6: S2 Letter type picker ✅ Done

**Files:** Update `lib/features/letters/letter_catalog_screen.dart`; Create `lib/features/letters/letter_catalog_controller.dart`; Test `test/features/letter_catalog_test.dart`

**Interfaces:**
- Consumes: `LetterRepository.letterTypes()`.
- Produces: navigation to `letterForm` with the selected `LetterType`.

> **As-built (2026-07-22):** Screen watches `letterTypesProvider`, loads from `LetterRepository.letterTypes()` (`GET /letter-types`), supports search/filtering, and shows loading/error/empty states.

- [x] **Step 1:** Widget test with a fake provider returning 2 types → both names render; tap one → router receives that `LetterType`.
- [x] **Step 2:** Run — FAIL.
- [x] **Step 3:** Add `letterTypesProvider` calling `LetterRepository.letterTypes()`; update screen to watch provider; add loading/error/empty states; remove mock source.
- [x] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): S2 letter catalog — live API + Riverpod`.

### Task 7: S3 Dynamic form engine + applicant contact block ✅ Done

**Files:** Create `lib/features/letters/form/dynamic_form.dart`, `lib/features/letters/form/field_widget.dart`, `lib/features/letters/form/letter_form_controller.dart`; Update `lib/features/letters/letter_form_screen.dart`; Test `test/features/dynamic_form_test.dart`

**Interfaces:**
- Consumes: `LetterType.fields` (Task 3), `Validators.forField` (Task 4).
- Produces: a `LetterRequestDraft{letterType,applicantName,applicantEmail,applicantPhone,keperluan?,subjectData:Map<String,dynamic>,attachments}` in the controller state, ready for review.

> **As-built (2026-07-22):** `letter_form_screen.dart` renders from `LetterType.fields`, keeps applicant contact fields separate, applies defaults/sample values, validates required fields, and passes a `LetterFlowDraft` through the router.

- [x] **Step 1:** Widget test: given an L1 `LetterType`, form renders one `FieldWidget` per field; NIK field rejects `"123"`; applicant block (name/email/phone) always renders even if absent from `fields`.
- [x] **Step 2:** Run — FAIL.
- [x] **Step 3:** Implement `FieldWidget` switch on `FieldType` (text/textarea/date/time/year/number/nik/phone/email/enum). Prefill defaults/sample data where useful. Keep applicant vs subject separate.
- [x] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): S3 dynamic letter form — schema-driven`.

### Task 8: S4 Attachment upload (KTP/KK + per-type required) ✅ Done

**Files:** Update `lib/features/letters/attachment_screen.dart`; Create `lib/data/services/upload_service.dart`; Test `test/features/attachment_picker_test.dart`

**Interfaces:**
- Consumes: `LetterType.requiredAttachments`, `UploadService.upload`.
- Produces: `List<Attachment>` on the draft; blocks "next" until required kinds present.

> **As-built (2026-07-22):** `attachment_screen.dart` uses `image_picker` / `file_picker`, uploads with `UploadService.upload()` to `POST /uploads`, stores returned attachments on the draft, and blocks next until required attachments are present.

- [x] **Step 1:** Add `image_picker`, `file_picker`, `flutter_image_compress` to `pubspec.yaml`; widget test: required `["KTP","KK"]` → "Lanjut" disabled until both uploaded (fake UploadService).
- [x] **Step 2:** Run — FAIL.
- [x] **Step 3:** Implement `UploadService.upload(File, kind)` calling `POST /uploads`; wire pickers to each tile; store returned `file_id` in the draft.
- [x] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): S4 real attachment upload`.

### Task 9: S5 Review & confirm ✅ Done

**Files:** Update `lib/features/letters/review_screen.dart`; Test `test/features/review_screen_test.dart`

> **As-built (2026-07-22):** Review screen renders the real `LetterFlowDraft`, including applicant data, purpose, schema field values, and uploaded attachments. Submit stays disabled until the confirmation checkbox is checked.

- [x] **Step 1:** Widget test: draft with fields + attachments → all values shown read-only; "Ubah" navigates back; checkbox blocks submit until ticked.
- [x] **Step 2:** Run — FAIL.
- [x] **Step 3:** Wire screen to `LetterFlowDraft`; show real applicant values, field values, and uploaded file states.
- [x] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): S5 review — reads real draft data`.

### Task 10: S6 Submit + success + S7 tracking ✅ Done

**Files:** Update `lib/features/letters/review_screen.dart` (submit action), `lib/features/letters/success_screen.dart`, `lib/features/letters/tracking_screen.dart`; Create tracking controller; Test `test/features/submit_and_track_test.dart`

**Interfaces:**
- Consumes: `LetterRepository.submit`, `.track`.

> **As-built (2026-07-22):** `ReviewScreen` submits `LetterRequestDraft` through `LetterRepository.submit()` (`POST /requests`) and passes the returned reference code to `SuccessScreen`. `TrackingScreen` searches `LetterRepository.track()` (`GET /requests/track/:code`) and renders API status/loading/error states.

- [x] **Step 1:** Widget test: submitting valid draft (fake repo) → success screen shows API-returned reference code; entering a code on tracking → timeline reflects API status.
- [x] **Step 2:** Run — FAIL.
- [x] **Step 3:** Wire review submit button to `LetterRepository.submit(draft)`; pass returned `referenceCode` to success screen via router extra; add reference-code input field to tracking screen + call `LetterRepository.track(code)`.
- [x] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(mobile): S6 + S7 — real submit and tracking`.

### Task 11: End-to-end integration test (L1 happy path)

**Files:** Create `integration_test/letter_flow_test.dart` (mock Dio via `http_mock_adapter`)

- [x] **Step 1:** Write the flow test: Beranda → pick L1 → fill form → add KTP+KK → review → submit → success shows reference code.
- [x] **Step 2:** Add test harness fakes for `LetterRepository`, `UploadService`, and file picking so the flow does not hit real network/native pickers.
- [ ] **Step 3:** Run `flutter test integration_test/letter_flow_test.dart` on Android/iOS. Current workspace only exposes web plus an unconfigured macOS desktop target, so local execution is blocked.
- [ ] **Step 4:** Fix any device-run wiring/navigation issues until green.
- [ ] **Step 5:** Commit `test(mobile): e2e letter flow`.

---

## Phase 2 — Home, banner & village profile (Timeline: Weeks 7–8)

### Task 12: S1 Beranda — live banners from `GET /content/banners` ✅ Done

**Files:** `lib/features/home/home_screen.dart` (ConsumerWidget, `_BannerCarousel` + `_FallbackBanner`), `lib/data/repositories/content_repository.dart`, `lib/data/providers/content_providers.dart` (`bannersProvider`), `lib/data/models/banner_slide.dart` (freezed), `test/features/home_screen_test.dart` (7 tests).

- `HomeScreen` is now a `ConsumerWidget` watching `bannersProvider`.
- Loading/error → `_FallbackBanner` (static fallback with hardcoded announcement).
- Data → `_BannerCarousel` (`PageView` + `Timer.periodic(5s)` + dynamic dots).
- `_BannerCard` accepts a `BannerSlide` and renders `badge` + `title`.

### Task 13: S8 Village profile + officials list ✅ Done

**Files:** `lib/features/profile/profile_screen.dart` (3-tab ConsumerWidget), `lib/data/models/village_profile.dart`, `lib/data/models/vision_mission.dart`, `lib/data/models/official.dart`, `lib/data/models/village_strength.dart` (all freezed), extended `ContentRepository`, added `villageProfileProvider`, `visionMissionProvider`, `officialsProvider`, `strengthsProvider`, `test/features/profile_test.dart` (7 tests).

- Each tab is a `ConsumerWidget` watching its own providers. Seed fallback shown on error/empty.
- Consumes: `GET /content/profile`, `/vision-mission`, `/officials`, `/strengths`.

---

## Phase 3 — Demographics (Timeline: Week 8)

### Task 14: S10 Demographics charts (data-driven stat blocks) ✅ Done

**Files:** Update `lib/features/demographics/demographics_screen.dart`; Create `DemographicBlock` freezed model; extend `ContentRepository`; Test `test/features/demographics_test.dart`

- Consumes: `GET /content/demographics` → `List<StatBlock>` with `type ∈ number|split|bar|pie`.

> **As-built (2026-07-22):** Demographics screen watches `demographicsProvider`, consumes `GET /content/demographics`, preserves dashboard ordering/labels, and keeps the custom chart widgets instead of adding `fl_chart`.

- [x] Steps: (1) widget test: fake `split` block → donut chart renders; fake `bar` block → bars render; (2) FAIL; (3) create `DemographicBlock` model; add `demographicsProvider`; replace hardcoded numbers with provider data while keeping custom chart implementations; (4) PASS; (5) commit pending.

---

## Phase 4 — Prayer schedule + azan alarm (Timeline: Week 9)

### Task 15: PrayerService (on-device times from coordinates)
**Files:** `lib/data/services/prayer_service.dart`; Test `test/services/prayer_service_test.dart`
- Consumes: `GET /content/prayer-config` (lat/lng/method/timezone). Uses `adhan` package.
- Produces: `PrayerService.timesFor(DateTime, PrayerConfig) → {subuh,dhuhur,ashar,maghrib,isya}` as WIB times.
- [ ] Steps: (1) unit test: for fixed coords+date, five times are ordered subuh<dhuhur<ashar<maghrib<isya; (2) FAIL; (3) implement via `adhan` CalculationMethod; (4) PASS; (5) commit `feat(mobile): prayer time service`.

> **As-built correction (2026-07-21):** the shipped `PrayerTimesService` does **not** compute on-device with `adhan`. It calls the Aladhan HTTP API using GPS coordinates from `geolocator`, and falls back to hardcoded times when offline. Task 15A below aligns it with `GET /content/prayer-config`; treat 15A as the current spec where it conflicts with the paragraph above.

### Task 15A: Drive prayer times from `GET /content/prayer-config` (remove hardcoded fallback)
**Files:** `lib/data/services/prayer_times_service.dart`, `lib/data/repositories/content_repository.dart`, `lib/features/prayer/prayer_screen.dart`; Test `test/services/prayer_times_service_test.dart`

**Why:** the offline schedule is currently frozen in `PrayerTimes.fallback()` (`04:58/12:31/15:52/18:38/19:49`) and the Aladhan query params are hardcoded in the service. Admins can now edit both from the dashboard (Konten → Masjid & Sholat), but the app ignores them, so an admin correcting the offline times changes nothing on the handset.

**Contract** (`GET /api/content/prayer-config`, public):
```json
{
  "lat": 4.7, "lng": 95.5, "calc_method": null, "timezone": "Asia/Jakarta",
  "aladhan_method": 99, "fajr_angle": 20, "isha_angle": 18, "school": 0,
  "fallback_times": { "subuh": "04:58", "dhuhur": "12:31", "ashar": "15:52", "maghrib": "18:38", "isya": "19:49" },
  "updated_at": "2026-07-21T02:18:00.000Z"
}
```
**Every field is nullable** on an unconfigured install, and `fallback_times` entries are independently nullable — so the app keeps its current constants as a last-resort default rather than rendering blank rows. `aladhan_method`/`fajr_angle`/`isha_angle` map to the existing `method` / `methodSettings: '<fajr>,null,<isha>'` query params.

**Resolution order** for the displayed schedule: (1) live Aladhan call using config coords/params, (2) Hive-cached config `fallback_times`, (3) the built-in constants. `sourceLabel` must say which one is showing — the screen already surfaces `fromFallback`.

- [x] **Step 1–4:** Done. 6 widget tests pass in `test/features/prayer_screen_test.dart`.
- [ ] **Step 5:** Commit `feat(mobile): drive prayer times from backend config`.

**As-built (2026-07-21):** `PrayerConfig` + `PrayerFallbackTimes` models created (plain Dart, manual `fromJson`). `PrayerTimesService` extended with `fromConfigFallback` factory, `fetchForVillageConfig`, optional params on `fetchForCoordinates`, and `prayerTimesServiceProvider` for test injection. `ContentRepository.prayerConfig()` added. `PrayerScreen` converted to `ConsumerStatefulWidget` — `initState` calls `_loadConfig()` which: (1) reads config, (2) sets config fallback times, (3) auto-fetches from village coords if available. `_loadFromGps()` now reads `prayerTimesServiceProvider`. Source label cascades: "Internet · Koordinat Desa" → "Data Gampong Blang" → "Data contoh Gampong Blang".

### Task 16: S9 Jadwal Sholat — live mosque list + azan alarm ✅ Done

**Files:** `lib/features/prayer/prayer_screen.dart`; `lib/data/models/mosque.dart`; `lib/data/services/notification_service.dart`; `lib/data/repositories/content_repository.dart`; `lib/data/providers/content_providers.dart`; `test/features/prayer_screen_test.dart`

- Consumes: `GET /content/mosques`.

> **As-built (2026-07-22):** Prayer screen has countdown card, 5 prayer rows, GPS/source card, live mosque/meunasah cards from `GET /content/mosques`, and an in-app `NotificationService` that schedules the next azan audio playback using `audioplayers`. Full OS/background notifications are still deferred to Task 18.

- [x] Steps: (1) widget test: five rows render; alarm toggle calls `NotificationService.scheduleDaily`; mosque card shows data from fake provider; (2) FAIL; (3) create `Mosque` model + `ContentRepository.mosques()`; replace hardcoded mosque card with provider-driven list; implement `NotificationService.scheduleDaily` + `cancel`; wire alarm toggle; (4) PASS; (5) commit pending.

---

## Phase 5 — Feedback + notifications (Timeline: Week 10)

### Task 17: S11 Feedback/Pelaporan form ✅ Done

**Files:** `lib/features/feedback/feedback_screen.dart`; `lib/data/models/feedback_model.dart`; `lib/data/repositories/feedback_repository.dart`; `lib/data/providers/feedback_providers.dart`; `test/features/feedback_test.dart`

> **As-built (2026-07-22):** Feedback screen validates the form, submits `FeedbackDraft` to `POST /feedback`, shows loading/error states, and displays the API-returned `reference_code` on success. Attachments remain optional and currently empty from this screen.

- [x] Steps: (1) widget test: valid form (fake `FeedbackRepository`) → success screen shows API-returned reference code; empty email → inline error; (2) FAIL; (3) create `FeedbackRepository.submit()`; wire form submit to `POST /feedback`; add field validation (Validators); show returned `referenceCode` on success screen; (4) PASS; (5) commit pending.

### Task 18: Push notifications (letter SENT / REJECTED) — optional in Phase 1 ✅ Done
**Files:** extend `notification_service.dart`; Test `test/services/notification_service_test.dart`
- Consumes: `firebase_messaging`. On `SENT`/`REJECTED` show a local notification. (If push infra deferred, keep email as primary — brief §15.)
- [x] Steps: (1) unit test handler maps a `SENT` data-message → notification title "Surat Anda sudah dikirim"; (2) FAIL; (3) implement FCM handler; (4) PASS; (5) commit pending.

> **As-built (2026-07-22):** `NotificationService` initializes Firebase Messaging best-effort, registers/refreshes resident FCM tokens with `POST /notifications/device-tokens`, maps `SENT`, `REJECTED`, and `NEEDS_INFO` data messages to local notification copy, and includes the current `push_token`/`push_platform` when submitting `POST /requests`. Browser builds skip Firebase setup unless proper Firebase web options are added, so local web runs do not blank the app.

> **iOS push caveat (2026-07-23):** iOS remote push is intentionally pending because the project does not yet have a paid Apple Developer Program account. Android FCM can be tested now. When Apple Developer access is available, create/upload an APNs auth key in Firebase Console (`Project settings → Cloud Messaging → Apple app configuration`) for bundle id `id.gampongblang.sapaGampong`; no major mobile code rewrite is expected.

---

## Phase 6 — Hardening & release (Timeline: Weeks 11–13)

### Task 19: Offline cache + retry polish ✅ Done
- Cache profile/prayer-config/demographics/banners in Hive; show cached data with a "diperbarui …" note; queue failed submits and retry (brief §16.4).
- [x] Read-content cache: `ContentCacheService` stores raw JSON in Hive and `ContentRepository` falls back to cached responses for banners, profile, vision/mission, officials, strengths, demographics, prayer config, and mosques.
- [x] UI note: profile tab shows `Diperbarui …` when cached/fetched profile content has a cache timestamp.
- [x] Test: with Dio offline, profile repository still renders last-cached content (`test/repositories/content_repository_cache_test.dart`).
- [x] Submit retry queue: failed letter/feedback submissions are saved locally and retried on app startup.

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
