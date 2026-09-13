# Google Play Phone Screenshots

Capture screenshots from the final production-signed Android app after real-device testing. Do not use staging screenshots because they show a different app identity and backend.

## Required Capture Setup

- Recommended device canvas: 1080 x 2400 pixels, portrait.
- Use one consistent Android device, font size, display scale, and status-bar appearance.
- Use realistic demonstration data with no real NIK, phone number, email address, OTP, or private attachment.
- Confirm every image is sharp, has no debug banner, keyboard, overflow warning, loading spinner, toast, or error state.
- Keep between 4 and 8 final phone screenshots in this folder.

## Captured Production Sequence

1. `01-beranda.png`: home screen with banner and main services visible.
2. `02-permohonan-surat.png`: letter catalog showing available services.
3. `03-profil-desa.png`: village profile showing the configured village officials.
4. `04-demografi.png`: demographic cards including the education chart.
5. `05-jadwal-sholat.png`: prayer schedule and location option.
6. `06-layanan.png`: public services overview.
7. `07-verifikasi-surat.png`: public QR and token verification screen.

All seven screenshots were captured from the production-signed `1.0.0+1`
APK at 1080 x 2400 pixels with a sanitized Android status bar.

## Content Pending

- Replace or supplement the set with a Gallery screenshot after production has
  approved photo/video content. The gallery was empty during capture.
- Capture the social-media section after production links are configured. No
  social links were returned during capture.
- Add a request-status or reporting screenshot only when a dedicated
  demonstration resident account and non-personal sample data are available.

## Final Review

- Verify screenshots represent features available in release `1.0.0+1`.
- Avoid promotional claims that are not shown by the app.
- Review all visible village content with the client before uploading to Play Console.
