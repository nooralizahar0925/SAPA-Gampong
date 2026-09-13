# Production Release Checklist

Use this checklist before publishing the Android app to Google Play and the web stack to production.

## Current Release Status

- Android package id: `id.gampongblang.sapa_gampong`
- Android app label: `Gampong Blang Digital`
- Android compile SDK: `36`
- Android release signing: prepared through `mobile/android/key.properties`, but the real upload keystore is still required.
- Web deployment: staging VPS automation exists in `scripts/deploy-staging.sh`; production needs real server, domain, database, and secret values.

## Android Play Store

Current Google Play requirements checked on 2026-09-12:

- New apps and updates must target Android 16 / API 36 or higher from 2026-08-31.
- New apps should be uploaded as Android App Bundles (`.aab`).
- Play App Signing is required for new apps.
- Release builds must be signed with a private upload key, not the debug key.

Official references:

- https://support.google.com/googleplay/android-developer/answer/11926878
- https://developer.android.com/studio/publish/upload-bundle
- https://developer.android.com/studio/publish/app-signing

### One-Time Setup

1. Create or confirm the Google Play Console developer account.
2. Create the app with package name `id.gampongblang.sapa_gampong`.
3. Enable Play App Signing.
4. Generate and store the upload keystore securely:

```bash
cd mobile/android
keytool -genkey -v -keystore upload-keystore.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload
cp key.properties.example key.properties
```

Then fill `mobile/android/key.properties` with the real passwords. Do not commit `key.properties` or `.jks` files.

### Build Candidate

```bash
cd mobile
flutter pub get
flutter test
flutter build appbundle --release --flavor production --dart-define=APP_ENV=production --dart-define=API_BASE_URL=https://gampongblangdigital.com/api
```

The artifact will be created at:

```text
mobile/build/app/outputs/bundle/productionRelease/app-production-release.aab
```

### Play Console Content Required

- App name, short description, full description in Bahasa Indonesia.
- App icon `512x512`, feature graphic `1024x500`, and phone screenshots.
- Public privacy policy URL.
- Support email and website URL.
- Content rating questionnaire.
- Data safety form.
- App access/test account notes if reviewers need login access.
- Permissions declarations where required.

The Android manifest currently requests location, camera, notifications, exact alarm, boot completed, image/media access, dial intent, and WhatsApp/view intents. These need matching explanations in Play Console and the privacy policy.

### Staging Tester APK

For client testing before Play Store release, staging may publish a direct-install APK from the dashboard. This APK must stay separate from production: use a staging package id, staging app label, staging signing key, and staging API URL. Do not distribute the production Play Store upload key through this flow.

## Production Web

### Access And Secrets Needed

- Production domain and DNS access.
- Production server or hosting access.
- Production PostgreSQL database URL.
- Production backend environment values:
  - `NODE_ENV=production`
  - `PORT`
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `APP_CONFIG_ENCRYPTION_KEY`
  - `PUBLIC_BASE_URL`
  - `DASHBOARD_BASE_URL`
  - `CORS_ORIGINS`
  - email provider credentials
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
  - `SEED_ADMIN_EMAIL`
  - `SEED_ADMIN_PASSWORD`
- Persistent storage and backup location for uploaded files.
- SSL certificate setup.

### Build And Migration Commands

Backend:

```bash
cd backend
npm ci
npx prisma generate
npm run build
npm run db:deploy
npm run db:seed
```

Dashboard:

```bash
cd dashboard
npm ci
VITE_API_BASE_URL=https://gampongblangdigital.com/api npm run build
```

### Deployment Safety

- Take a production database backup before `npm run db:deploy`.
- Confirm `backend/storage/production` is persistent and not deleted by releases.
- Smoke test these URLs after deployment:
  - `https://gampongblangdigital.com/api/health`
  - `https://gampongblangdigital.com/`
  - `https://gampongblangdigital.com/mobile/` if the mobile web preview is published.

## Release Blockers

- Real Android upload keystore and passwords.
- Google Play Console access.
- Store listing assets and screenshots.
- Public privacy policy URL.
- Production server/domain/database access.
- Production secrets for backend, email, Firebase, and first admin account.
- Production DNS for `gampongblangdigital.com`.
