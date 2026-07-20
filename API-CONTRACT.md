# API Contract — Aplikasi Desa Gampong Blang

The HTTP contract shared by the **Mobile app** (consumer) and **Admin dashboard** (consumer), served by the **backend** in `backend/`. Agree changes here **before** implementing on either side.

- Base URL (dev): `http://localhost:8080/api`
- Base URL (staging): `https://<railway-app>.up.railway.app/api`
- All request/response bodies are JSON unless stated (uploads are `multipart/form-data`).
- All UI-facing text is **Bahasa Indonesia**.
- Auth: admin endpoints require `Authorization: Bearer <jwt>`. Resident (public) endpoints require no auth.

## Conventions

**Error envelope** (all non-2xx):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "NIK harus 16 digit", "fields": { "nik": "harus 16 digit" } } }
```
Codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `RATE_LIMITED` (429), `SERVER_ERROR` (500).

**Letter type enum:** `L1`..`L10` — one per `.docx` template in `Brief/`.

| Code | Letter | Nomor prefix | Signatory | Subject = applicant |
|---|---|---|---|---|
| `L1` | Surat Keterangan Berdomisili | `400.12.2.1` | Keuchik | Yes |
| `L2` | Surat Keterangan Domisili Kantor | `400.10.4.4` | Keuchik | No (an office/business) |
| `L3` | Surat Keterangan Kehilangan | `400.10.2.2` | Keuchik | Yes (reporter) |
| `L4` | Surat Keterangan Miskin (SKTM) | `400.10.4.4` | Keuchik | Yes |
| `L5` | Surat Keterangan Usaha | `400.1.4.3` | Keuchik | Yes |
| `L6` | Surat Keterangan Yatim/Piatu | `400.12.2.1` | Keuchik | No (a child) |
| `L7` | Surat Keterangan Kematian | `400.12.2.1` | Keuchik | No (the deceased) |
| `L8` | Surat Keterangan Berkelakuan Baik | `400.10.2.2` | Keuchik | Yes |
| `L9` | Surat Keterangan Belum Menikah | `400.12.2.1` | **Sekretaris Gampong, a.n. Keuchik** | Yes |
| `L10` | Surat Rekomendasi | `400.10.2.2` | Keuchik | Yes (see note) |

Brief §6 specifies only `L1`–`L7`; `L8`–`L10` were derived from their `.docx` templates on 2026-07-20 after the template count was reconciled (10 files, not 7). Two consequences for implementers:

- **The signatory is per-type, not global.** `L9` is signed by the Sekretaris Gampong *on behalf of* the Keuchik. Brief §6.0 assumed one signatory for every letter; the letter chrome and the QR signature block must read the signatory from the letter type.
- **`L10` is not a "surat keterangan".** It is an outgoing recommendation letter with a full kop surat, a `Nomor`/`Lampiran`/`Perihal` header block, an external addressee, and a narrative body referencing an incoming request — it has no identity table. Its field set is `nama_pemohon`, `nomor_surat_permohonan`, `tanggal_permohonan`, `perihal`, `tujuan_jabatan`, `tujuan_instansi`. The mobile form engine must not assume every type shares the identity block.

**Request status enum** (brief §5.4):
`SUBMITTED → IN_REVIEW → (NEEDS_INFO) → APPROVED → GENERATED → SENT` and `REJECTED`. `SENT` and `REJECTED` are terminal.

**Shared field enums** (brief §5.5):
- `jenis_kelamin`: `Laki-laki | Perempuan`
- `agama`: `Islam | Kristen | Katolik | Hindu | Buddha | Konghucu` (default `Islam`)
- `status_perkawinan`: `Belum Kawin | Kawin | Cerai Hidup | Cerai Mati`
- `dusun`: `Kuini | Mangga | Rumbia`

---

## 1. Letter types (public)

### `GET /letter-types`
Returns the 10 types and their **form schema** so the mobile form engine can render dynamically.
```json
[
  {
    "code": "L1",
    "name": "Surat Keterangan Berdomisili",
    "description": "Keterangan domisili warga.",
    "subject_is_applicant": true,
    "required_attachments": ["KTP", "KK"],
    "fields": [
      { "key": "nama", "label": "Nama", "type": "text", "required": true },
      { "key": "ttl_tempat", "label": "Tempat Lahir", "type": "text", "required": true },
      { "key": "ttl_tanggal", "label": "Tanggal Lahir", "type": "date", "required": true },
      { "key": "nik", "label": "NIK", "type": "nik", "required": true },
      { "key": "jenis_kelamin", "label": "Jenis Kelamin", "type": "enum", "required": true, "options": ["Laki-laki","Perempuan"] }
    ]
  }
]
```
`field.type` ∈ `text | textarea | date | time | year | number | nik | phone | email | enum`. `enum` fields carry `options`. Field lists per type come from brief §6.

---

## 2. Attachments (public)

### `POST /uploads` — `multipart/form-data`
Fields: `file` (binary), `kind` (`KTP|KK|other|photo|document`).
- Server compresses/validates. Max 5 MB/file, accept `image/*` + `application/pdf`.
```json
{ "file_id": "f_01H...", "url": "https://.../signed?exp=...", "mime": "image/jpeg", "size": 812345 }
```

---

## 3. Letter requests

### `POST /requests` (public) — create a request
```json
{
  "letter_type": "L1",
  "applicant_name": "Budi",
  "applicant_email": "budi@mail.com",
  "applicant_phone": "0812...",
  "keperluan": "Beasiswa",              // optional
  "subject_data": { "nama": "Budi", "nik": "1607...", "...": "..." },
  "attachments": [ { "file_id": "f_01H...", "kind": "KTP" } ]
}
```
Response `201`:
```json
{ "id": "req_01H...", "reference_code": "GB-2026-000123", "status": "SUBMITTED" }
```

### `GET /requests/track/:reference_code` (public) — resident tracking
```json
{ "reference_code": "GB-2026-000123", "letter_type": "L1", "status": "IN_REVIEW", "status_label": "Sedang diproses", "updated_at": "2026-07-02T03:00:00Z" }
```

### `GET /requests` (admin) — queue
Query: `?status=SUBMITTED&letter_type=L1&q=budi&page=1`. Returns paged list `{ items:[...], total, page }` with summary fields (reference_code, letter_type, applicant_name, status, created_at, email).

### `GET /requests/:id` (admin) — full detail
Full `subject_data`, attachments (signed URLs), status history, nomor_surat, decision info.

### `PATCH /requests/:id/status` (admin) — move the state machine
```json
{ "action": "approve|reject|in_review|needs_info", "reason": "…", "subject_data": { }, "nomor_surat": "400.12.2.1/123/2026" }
```
Rules: `reject` requires `reason`; `approve` may set/confirm `nomor_surat` (else auto-assigned from `letter_number_counter`). Returns updated request.

### `POST /requests/:id/generate` (admin) — produce PDF + QR (brief §13.1)
Merges verified `subject_data` into the letter template, assigns `nomor_surat` if missing, creates opaque `verification_token`, embeds the QR, stores PDF. Sets status `GENERATED`.
```json
{ "pdf_id": "f_...", "pdf_url": "https://.../signed", "verification_token": "vt_9f3...", "nomor_surat": "400.12.2.1/123/2026" }
```

### `POST /requests/:id/send` (admin) — email the PDF
Emails the QR-bearing PDF to `applicant_email`; sets status `SENT`; triggers resident notification. Returns `{ "status": "SENT" }`.

---

## 4. Letter verification (public — no login)

### `GET /verify/:token`  (served as an HTML page **and** JSON)
`Accept: application/json` →
```json
{
  "valid": true,
  "nomor_surat": "400.12.2.1/123/2026",
  "jenis_surat": "Surat Keterangan Berdomisili",
  "tanggal_terbit": "2026-07-02",
  "penandatangan": "Sofian — Keuchik Gampong Blang",
  "perihal": "a.n. B*** (NIK 1607********1234)",
  "revoked": false
}
```
Unknown/revoked token → `{ "valid": false }` (HTTP 200, page shows "Surat tidak valid"). Rate-limited. Increments `verified_count`.

---

## 5. Content (public GET, admin write)

| Resource | Public read | Admin write |
|---|---|---|
| Banner slides | `GET /content/banners` | `POST/PATCH/DELETE /content/banners[/:id]`, `POST /content/banners/reorder` |
| Village profile (singleton) | `GET /content/profile` | `PATCH /content/profile` |
| Vision & mission | `GET /content/vision-mission` | `PATCH /content/vision-mission` |
| Officials (perangkat) | `GET /content/officials` | `POST/PATCH/DELETE /content/officials[/:id]` |
| Village strengths | `GET /content/strengths` | `POST/PATCH/DELETE /content/strengths[/:id]` |
| Mosques/meunasah | `GET /content/mosques` | `POST/PATCH/DELETE /content/mosques[/:id]` |
| Prayer config | `GET /content/prayer-config` | `PATCH /content/prayer-config` |
| Demographics blocks | `GET /content/demographics` | `PATCH /content/demographics` |

`GET /content/prayer-config` → `{ "lat": 4.7, "lng": 95.6, "calc_method": "Kemenag", "timezone": "Asia/Jakarta" }`. The **mobile app computes the 5 daily times locally** from these coordinates (offline-friendly); no per-day server call needed.

`GET /content/demographics` → array of stat blocks: `{ key, label, type: "number|split|bar|pie", data, order, visible }` (brief §9 — data-driven).

---

## 6. Feedback / Pelaporan

### `POST /feedback` (public)
```json
{ "name": "…", "email": "…", "phone": "…", "body": "…", "attachments": [ { "file_id": "f_...", "kind": "photo" } ] }
```
→ `201 { "id": "fb_...", "status": "new" }`

### `GET /feedback` (admin) · `PATCH /feedback/:id` (admin)
List inbox; mark `read|responded`, add internal note.

---

## 7. Auth (admin)

### `POST /auth/login` → `{ "token": "<jwt>", "user": { "name":"…","role":"admin|approver" } }`
### `GET /auth/me` (admin) → current user

---

## Notes for both teams
- Reference codes are user-facing (`GB-<year>-<seq>`); `id`s are opaque internal ids.
- `verification_token` is random/opaque — never sequential (brief §13.1.2).
- Attachment URLs are **signed & expiring**; re-fetch detail to refresh.
- Dates are ISO-8601 UTC on the wire; render in WIB in the UI.
