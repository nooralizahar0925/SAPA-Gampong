# SAPA Gampong — Mobile (Flutter)

Resident-facing app (Android & iOS) for Gampong Blang. See `PLAN.md` for the full build plan and `../API-CONTRACT.md` for the backend contract.

## Stack
Flutter 3.24+ / Dart 3 · Riverpod · go_router · Dio · freezed · Hive · fl_chart · adhan · flutter_local_notifications · intl (id_ID).

## Prerequisites
- Flutter SDK 3.24+ (`flutter doctor` all green)
- Android Studio / Xcode for device builds
- The backend running (see `../backend/README.md`) — default dev API `http://localhost:8080/api`

## Getting started
```bash
flutter create . --org id.gampongblang --platforms android,ios   # first time only, in this folder
flutter pub get
dart run build_runner build --delete-conflicting-outputs          # generate freezed/json
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080/api    # 10.0.2.2 = host from Android emulator
```

## Flavors / environments
Pass the API base url per environment:
```bash
flutter run     --dart-define=API_BASE_URL=http://10.0.2.2:8080/api          # dev
flutter build appbundle --dart-define=API_BASE_URL=https://<railway>/api      # staging
```
`lib/core/config/env.dart` reads `API_BASE_URL`.

## Tests
```bash
flutter test                              # unit + widget
flutter test integration_test             # end-to-end letter flow
```

## Project layout
See the **File Structure** section in `PLAN.md`. Feature-first: `lib/features/<feature>` for screens, `lib/data` for models/repositories/services, `lib/core` for cross-cutting infra.

## Definition of done (per screen)
- Bahasa Indonesia strings, no hard-coded English.
- Loading / empty / error states handled.
- Widget test with a fake repository (no real network).
- Matches the layout described in the brief section it implements.
