# Gampong Blang Digital — Mobile (Flutter)

Resident-facing app (Android & iOS) for Gampong Blang. See `PLAN.md` for the full build plan and `../API-CONTRACT.md` for the backend contract.

## Stack
Flutter 3.24+ / Dart 3 · Riverpod · go_router · Dio · freezed · Hive · Firebase Messaging · flutter_local_notifications · intl (id_ID).

## Prerequisites
- Flutter SDK 3.24+ (`flutter doctor` all green)
- Android Studio / Xcode for device builds
- The backend running (see `../backend/README.md`) — default dev API `http://localhost:8081/api`

## Getting started
```bash
flutter create . --org id.gampongblang --platforms android,ios   # first time only, in this folder
flutter pub get
dart run build_runner build --delete-conflicting-outputs          # generate freezed/json
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8081/api    # 10.0.2.2 = host from Android emulator
```

## Flavors / environments
Pass the API base url per environment:
```bash
flutter run --flavor production --dart-define=API_BASE_URL=http://10.0.2.2:8081/api
flutter build apk --debug --flavor staging --dart-define=APP_ENV=staging --dart-define=API_BASE_URL=https://gampongblangdigital.web.id/api
flutter build appbundle --release --flavor production --dart-define=APP_ENV=production --dart-define=API_BASE_URL=https://gampongblangdigital.com/api
```
`lib/core/config/env.dart` reads `APP_ENV` and `API_BASE_URL`. Staging builds must use
`--dart-define=APP_ENV=staging` so Firebase and the API stay isolated from production.

The staging APK uses package id `id.gampongblang.sapa_gampong.staging` and label `Gampong Blang Digital Staging`, so testers can install it beside the production app.

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
