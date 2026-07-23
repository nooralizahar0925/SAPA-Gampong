# Gampong Blang Digital — Monorepo

**Gampong Blang Digital** — the village app for **Gampong Blang**, Kec. Krueng Sabee, Kab. Aceh Jaya. This is the single monorepo for all code + planning docs.

> Note: the folder/repo is still named `SAPA-Gampong` on disk and on GitHub — only the product name shown to users has changed.

- **Git remote:** `git@github.com:nooralizahar0925/SAPA-Gampong.git`
- **Default branch:** `main`

```
SAPA-Gampong/            (this folder = git root)
├── README.md            ← you are here (overview + how the apps fit together)
├── API-CONTRACT.md      ← the shared HTTP contract both apps agree on (read first)
├── .gitignore
├── mobile/              ← Flutter app for residents (Android & iOS)
│   ├── PLAN.md          ← implementation plan (build order, tasks, tests)
│   └── README.md        ← setup / getting started
├── backend/             ← Express backend/API (serves both clients) + PLAN.md
│   ├── PLAN.md          ← implementation plan for backend AND dashboard
│   └── README.md        ← setup / getting started
└── dashboard/           ← React admin dashboard (scaffolded per backend/PLAN.md Phase 3)
```

## The two systems

| System | Folder | Users | Role |
|---|---|---|---|
| **Resident App** | `mobile/` (Flutter) | Warga (public) | Request letters, read info, submit feedback |
| **Backend API** | `backend/` (Express + PostgreSQL) | — | Single source of truth; serves both clients |
| **Admin Dashboard** | `dashboard/` (React) | Aparatur desa | Review/approve requests, generate & send letters, manage content |

Both clients talk to **one backend / one PostgreSQL database**. The backend (`backend/`) is the single source of truth; the mobile app and the admin dashboard are both HTTP clients of it.

> **Note:** business/legal docs (Proposal, Invoice, Perjanjian, Timeline) and the `Brief/` live **outside this repo** in the parent `Apps Desa/` folder — intentionally kept out of version control (bank details / client PII).

## Source of truth for requirements

The authoritative spec is `../Brief/Aplikasi-Desa-Dev-Brief.md` (v1.1). Section references in the plans (e.g. "§6", "§13.1") point there. The 10 official letter `.docx` templates in `../Brief/` are the canonical letter layouts for the PDF generator. Note that the brief's §6 catalogue documents only 7 of them; `API-CONTRACT.md` carries the reconciled list of 10.

## Recommended build order (prove the core loop first)

1. **Backend skeleton** + data model + admin auth (`backend/` Phase 0–1).
2. **Letter request end-to-end for ONE type (L1)**: mobile form → submit → backend queue → admin approve → PDF **with verification QR** → email → public `/verify` page. (`backend/` Phase 2 + `mobile/` Phase 1.)
3. Generalize to all 10 letter types.
4. Content management + resident read screens (profile, demographics, banner).
5. Prayer schedule + azan alarm.
6. Feedback + notifications.
7. Hardening: privacy/security, offline/perf, QA against templates, deploy to Railway.

## Timeline

3 months, **1 Jul 2026 – 30 Sep 2026**. See `../Timeline - Aplikasi Desa Gampong Blang.xlsx`. Each plan maps its phases to that timeline.

## Team

- **Mobile Developer** → owns `mobile/`.
- **Full Stack Developer** → owns `backend/` + `dashboard/` + DevOps.
- Contract in `API-CONTRACT.md` is the interface between them — agree changes there first.
