# Google Play Phone Screenshots

Capture screenshots from the final production-signed Android app after real-device testing. Do not use staging screenshots because they show a different app identity and backend.

## Required Capture Setup

- Recommended device canvas: 1080 x 2400 pixels, portrait.
- Use one consistent Android device, font size, display scale, and status-bar appearance.
- Use realistic demonstration data with no real NIK, phone number, email address, OTP, or private attachment.
- Confirm every image is sharp, has no debug banner, keyboard, overflow warning, loading spinner, toast, or error state.
- Keep between 4 and 8 final phone screenshots in this folder.

## Recommended Sequence

1. `01-beranda.png`: home screen with banner and main services visible.
2. `02-permohonan-surat.png`: letter catalog showing available services.
3. `03-status-permohonan.png`: resident request history with a safe demonstration reference code.
4. `04-profil-desa.png`: village profile around the regional boundary and social-media section.
5. `05-demografi.png`: demographic cards including the education chart.
6. `06-galeri.png`: gallery grid with representative photo and video items.
7. `07-jadwal-sholat.png`: prayer schedule and location option.
8. `08-pelaporan.png`: report form before any personal data is entered.

## Final Review

- Verify screenshots represent features available in release `1.0.0+1`.
- Avoid promotional claims that are not shown by the app.
- Review all visible village content with the client before uploading to Play Console.
