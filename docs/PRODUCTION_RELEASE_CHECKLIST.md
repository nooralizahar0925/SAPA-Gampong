# Production Release Checklist

Use this checklist before publishing the Android app to Google Play and the web stack to production.

## Current Release Status

- Android package id: `id.gampongblang.sapa_gampong`
- Android app label: `Gampong Blang Digital`
- Android compile SDK: `36`
- Android release signing: configured locally with alias `upload`; the private files are ignored by Git. Despite the historical alias, this certificate is the cross-channel **app-signing key** for direct APK and Google Play releases.
- Signed release candidate: `mobile/build/app/outputs/bundle/productionRelease/app-production-release.aab` (`1.0.0+1`).
- App-signing certificate SHA-1: `C8:96:B9:FE:FA:C6:B1:73:D9:D6:5B:27:9C:5F:88:F2:F1:44:9B:6B`.
- App-signing certificate SHA-256: `6A:3D:7F:AC:18:F4:34:4F:E0:B0:98:16:B2:3F:C8:F2:E0:16:93:1B:03:0C:EB:A7:E6:69:73:4B:3D:4F:F6:97`.
- Web deployment: staging and production are live on the VPS with HTTPS and automated deployment.
- Production Firebase Admin: configured for project `sapa-gampong`.
- Privacy policy: available at `https://gampongblangdigital.com/privacy-policy` after the corresponding production deployment.

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
3. Enable Play App Signing and choose the option to provide the existing app-signing key. Do not let Play generate a different app-signing key after distributing the direct APK.
4. Export the existing `upload-keystore.jks` key to Play using the Play Console instructions. The alias name does not determine the key's role.
5. After Play accepts the app-signing key, create and register a separate upload key for future `.aab` uploads. Keep both private keys backed up in separate secure, off-device storage.

For a new upload key, use a different file and alias so it cannot overwrite the app-signing key:

```bash
cd mobile/android
keytool -genkey -v -keystore play-upload-keystore.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias play-upload
```

Do not overwrite the current `key.properties`: it intentionally points at the app-signing key used for direct APKs. Configure the separate Play upload key only for future App Bundle uploads after direct APK distribution has ended, or add a dedicated build configuration that selects the correct key per artifact. Do not commit any signing properties or `.jks` files.

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
- Public privacy policy URL: `https://gampongblangdigital.com/privacy-policy`.
- Support email and website URL.
- Content rating questionnaire.
- Data safety form.
- App access/test account notes if reviewers need login access.
- Permissions declarations where required.

The Android manifest currently requests location, camera, notifications, exact alarm, boot completed, image/media access, dial intent, and WhatsApp/view intents. These need matching explanations in Play Console and the privacy policy.

### Temporary Website Distribution

- Permanent public landing page: `https://gampongblangdigital.com/`.
- The printed QR must point to that landing page, never directly to an APK or Play Store URL.
- Configure the active destination in Dashboard → Pengaturan → Distribusi Aplikasi.
- Keep `Publik nonaktif` while preparing the release; enable it manually on launch day.
- For direct distribution, keep the signed file outside the web root at `backend/storage/production/releases/android/latest.apk` and configure `/api/app-distribution/android.apk` as the APK URL. The backend returns `404` unless direct distribution is active and `Publik aktif` is enabled.
- Generate and upload `metadata.json` beside the APK with `scripts/prepare-production-apk.sh`. The dashboard reads the version from this file and calculates size and SHA-256 directly from the private APK. The client can set a planned release date, including while public distribution is disabled.
- The direct APK is signed with the existing cross-channel app-signing key. During initial Play App Signing setup, provide this same key so direct and Play installs remain update-compatible.
- After the store listing launches, save its URL, select `Google Play`, and enable the public CTA. The QR does not need to change.

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

- Copy the upload keystore backup to secure off-device storage; the current protected backup and passwords are on this Mac.
- Google Play Console access.
- Store listing assets and screenshots.
- Complete the Play Console Data Safety form using `docs/PLAY_CONSOLE_DATA_SAFETY.md`.
- Verify the configured Gmail provider with a production test email.
- Obtain responsible village-official or legal review of the privacy policy.
