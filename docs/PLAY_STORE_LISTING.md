# Google Play Store Listing - Gampong Blang Digital

Use this document when creating the production app in Google Play Console.

## Main Store Listing

**App name (30 characters maximum)**

Gampong Blang Digital

**Short description (80 characters maximum)**

Layanan desa, informasi, galeri, laporan, dan jadwal sholat warga.

**Full description (4,000 characters maximum)**

Gampong Blang Digital adalah aplikasi layanan dan informasi resmi untuk warga Gampong Blang, Kecamatan Krueng Sabee, Kabupaten Aceh Jaya.

Melalui satu aplikasi, warga dapat memperoleh informasi desa dan menggunakan layanan administrasi dengan lebih mudah.

Fitur utama:

- Ajukan surat keterangan sesuai layanan yang tersedia.
- Pantau status permohonan dan buka surat yang telah selesai.
- Verifikasi keaslian surat melalui kode atau QR.
- Sampaikan laporan dan masukan kepada aparatur gampong.
- Lihat profil, demografi, perangkat, potensi, dan media sosial desa.
- Temukan foto dan video kegiatan pada Galeri Desa.
- Lihat jadwal sholat dan aktifkan pengingat azan.
- Terima pemberitahuan perkembangan permohonan surat dan laporan warga.

Pada versi 1.0.0, fitur Berita dan notifikasi pengumuman gampong masih dalam pengembangan dan akan tersedia pada pembaruan berikutnya.

Beberapa layanan memerlukan verifikasi email dengan kode OTP agar riwayat permohonan dan laporan hanya dapat diakses oleh pemilik email. Data yang diberikan digunakan untuk menjalankan layanan desa dan tidak digunakan untuk iklan.

Izin lokasi hanya digunakan saat warga memilih jadwal sholat berdasarkan lokasi. Kamera, foto, atau dokumen hanya diakses ketika warga memilih untuk memindai QR atau mengunggah lampiran.

Gampong Blang Digital membantu warga mengakses pelayanan gampong secara praktis, transparan, dan terhubung.

## Classification

- App or game: App
- Category: Productivity
- Tags to consider: Local services, Government, Community
- Contains ads: No
- Target audience: 18 years and older; the app is intended for residents using village information and administrative services
- Content rating: Complete the IARC questionnaire using the actual app behavior; no violent, sexual, gambling, or controlled-substance content is built into the app

## Contact Details

- Support email: `sapagampong@gmail.com`
- Website: `https://gampongblangdigital.com`
- Privacy policy: `https://gampongblangdigital.com/privacy-policy`

## Version 1.0.0 Release Notes

Rilis pertama Gampong Blang Digital. Warga dapat mengakses informasi desa, mengajukan dan memantau surat, mengirim laporan, melihat galeri kegiatan, memeriksa jadwal sholat, serta menerima pemberitahuan layanan.

## App Access And Reviewer Notes

Most public content can be reviewed without an account: village profile, demographics, gallery, prayer schedule, letter verification, and public service information.

Submitting a letter request or report and viewing personal history requires resident email verification. Ordinary residents use an emailed OTP. Reviewers instead use the reusable `play-review@gampongblangdigital.com` account: enter the email, tap Lanjutkan, then enter the non-expiring reviewer access code supplied securely in Play Console. Reviewers do not need their own mailbox or an OTP. Never store the code in this document or Git.

The administrator dashboard is a separate web application and is not required to review the resident Android app. Contact `sapagampong@gmail.com` if Google Play review requires assistance or specific submission data.

## Permission Explanations

- Precise and approximate location: calculate prayer times only after the user chooses location-based scheduling.
- Camera: scan a letter QR code or capture an attachment after a user action.
- Photos and media: select an optional or service-required image attachment.
- Notifications: deliver letter-request and resident-report status updates when enabled. Village-announcement notifications are not available in version 1.0.0.
- Exact alarm and boot completed: restore user-enabled daily azan reminders at the selected prayer times.
- Internet: load village information, submit services, and synchronize status.

## Graphic Files

- App icon: `docs/play-store-assets/app-icon-512.png`
- Feature graphic: `docs/play-store-assets/feature-graphic-1024x500.png`
- Screenshot instructions: `docs/play-store-assets/SCREENSHOTS.md`
