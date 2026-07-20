# Backend Foundation & API Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the SAPA Gampong backend — Express + Prisma + Postgres with admin authentication — and an interactive OpenAPI dashboard at `/api/docs` that every later endpoint registers into automatically.

**Architecture:** One Node/TypeScript Express service over PostgreSQL via Prisma, structured as a modular monolith (one folder per domain under `src/modules/`). Request validation uses Zod; the *same* Zod schemas are registered with `@asteasolutions/zod-to-openapi` to generate an OpenAPI 3.1 document, rendered by Scalar. A route-coverage test asserts every mounted Express route appears in that document, so the docs cannot drift from the implementation.

**Tech Stack:** Node 20, TypeScript 5 (CommonJS), Express 4, Prisma 5 + PostgreSQL 16, Zod 3, `@asteasolutions/zod-to-openapi` 7, `jsonwebtoken`, `bcryptjs`, `pino` + `pino-http`, Vitest + Supertest, Docker Compose (Postgres + Mailpit).

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-20-backend-first-api-dashboard-design.md` is authoritative for scope and sequencing.
- **API contract:** `API-CONTRACT.md` is authoritative for every route, payload, enum, and the error envelope. Change the contract before changing a route.
- **Error envelope** — every non-2xx response body is exactly: `{ "error": { "code": "...", "message": "...", "fields": { } } }`. Codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `SERVER_ERROR` (500).
- **All user-facing message text is Bahasa Indonesia.** Code identifiers, comments, and commit messages are English.
- **Zod schemas are declared at module level in a `schemas.ts` file and exported by name — never inline in a route handler.** They are consumed twice: by validation and by the OpenAPI registry.
- **From Task 4 onward, a task is not complete until its routes appear in the generated OpenAPI document.** The route-coverage test enforces this.
- **CommonJS, not ESM** (`"module": "commonjs"`). Avoids `.js`-extension import friction on Windows.
- **`bcryptjs`, not `bcrypt`** — pure JS, no native toolchain needed on Windows.
- Node 20 LTS. Prisma schema lives at `backend/db/schema.prisma` (non-default path — configured in `package.json`).
- Working directory for all `npm` commands is `Apps/backend/`. The git root is `Apps/`.

---

## File Structure

```
Apps/
  docker-compose.yml              # postgres:16 + mailpit (dev infra only; app runs on host)
  backend/
    package.json                  # scripts, deps, prisma schema path
    tsconfig.json
    vitest.config.ts
    .env.example                  # committed template
    .env                          # gitignored, real dev values
    .env.test                     # gitignored, points at sapa_test database
    db/
      schema.prisma               # full data model (brief §14)
      seed.ts                     # admin user only (content seed comes in a later plan)
    src/
      index.ts                    # process entrypoint: listen()
      app.ts                      # createApp() — builds the Express app (exported for supertest)
      config/env.ts               # typed, validated environment
      lib/
        errors.ts                 # ApiError + the error-code table
        prisma.ts                 # shared PrismaClient singleton
      middleware/
        error.ts                  # maps thrown errors to the error envelope
        auth.ts                   # requireAdmin, requireRole
      modules/
        auth/
          schemas.ts              # LoginBody, LoginResponse, MeResponse (Zod)
          service.ts              # verifyCredentials, signToken, verifyToken
          routes.ts               # POST /auth/login, GET /auth/me + OpenAPI registration
      openapi/
        registry.ts               # the single OpenAPIRegistry instance
        components.ts             # shared error-envelope response, bearer security scheme
        document.ts               # buildDocument() -> OpenAPI 3.1 object
        routes.ts                 # GET /api/openapi.json, GET /api/docs
        list-routes.ts            # mounted-route enumeration, for the drift test
    tests/
      helpers/db.ts               # test PrismaClient + truncateAll()
      helpers/global-setup.ts     # applies migrations to sapa_test once per run
      health.test.ts
      schema.test.ts
      auth.test.ts
      openapi.test.ts
```

**Responsibility boundaries:** `app.ts` only wires middleware and mounts routers — no business logic, so `createApp()` stays cheap to call per test. Each module owns its own schemas/service/routes triple and is mounted by path in `app.ts`. The `openapi/` module knows about the registry but never about individual domains; domains push themselves into the registry from their own `routes.ts`. This is what keeps registration local to the task that adds a route.

---

## Task 0: Publish the monorepo to GitHub

**Files:**
- Modify: `Apps/README.md`
- No source code

**Interfaces:**
- Produces: a private GitHub remote named `origin` on the `Apps/` repository, and a documented quickstart the mobile developer follows.

> **This task pushes code to a remote and needs your explicit go-ahead before Step 4.** The parent folder holds invoices and the Perjanjian Kerjasama (bank details, client PII); Step 3 exists to prove those are outside the repository before anything leaves the machine.

- [ ] **Step 1: Confirm the GitHub CLI is authenticated**

Run: `gh auth status`
Expected: `Logged in to github.com as <username>`. If it fails, run `gh auth login` in your own terminal (type `! gh auth login` in this session) and retry.

- [ ] **Step 2: Add the quickstart to `Apps/README.md`**

Append this section:

````markdown
## Menjalankan backend secara lokal (untuk developer mobile)

Prasyarat: Node 20+, Docker Desktop, Git.

```bash
git clone <repo-url> sapa-gampong
cd sapa-gampong
docker compose up -d          # PostgreSQL + Mailpit
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed               # admin: admin@gampongblang.id / admin123
npm run dev
```

- API: <http://localhost:8080/api>
- **Dokumentasi API interaktif: <http://localhost:8080/api/docs>** — semua endpoint bisa dicoba langsung dari browser. Login lewat `POST /auth/login`, salin `token`, tempel di tombol **Authorize**.
- Spesifikasi OpenAPI: <http://localhost:8080/api/openapi.json> (bisa di-import ke Postman)
- Inbox email dev (Mailpit): <http://localhost:8025>
````

- [ ] **Step 3: Verify no business or legal documents are tracked**

Run: `cd "Apps" && git ls-files | grep -iE "invoice|perjanjian|proposal|\.docx|\.pdf|\.xlsx"`
Expected: **no output**. Any output means a confidential file is staged for publication — stop and remove it from the repository before continuing.

- [ ] **Step 4: Create the private remote and push**

```bash
cd "Apps"
git add README.md
git commit -m "docs: add local backend quickstart for the mobile developer"
gh repo create sapa-gampong --private --source=. --remote=origin --push
```

Expected: `gh` prints the new repository URL and the push succeeds.

- [ ] **Step 5: Verify the published tree**

Run: `gh repo view --web` (or `gh api repos/:owner/sapa-gampong/contents --jq '.[].name'`)
Expected: only `API-CONTRACT.md`, `README.md`, `backend/`, `dashboard/`, `docs/`, `mobile/`, `.gitignore`.

---

## Task 1: Express skeleton, error envelope, and dev infrastructure

**Files:**
- Create: `Apps/docker-compose.yml`
- Create: `Apps/backend/package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `.env`
- Create: `Apps/backend/src/config/env.ts`, `src/lib/errors.ts`, `src/middleware/error.ts`, `src/app.ts`, `src/index.ts`
- Test: `Apps/backend/tests/health.test.ts`

**Interfaces:**
- Produces: `createApp(): express.Express` (exported from `src/app.ts`, used by every integration test).
- Produces: `class ApiError extends Error` with constructor `(code: ErrorCode, message: string, fields?: Record<string, string>)` and a `status: number` derived from `code`. Static helpers: `ApiError.notFound(message)`, `ApiError.unauthorized(message)`, `ApiError.validation(message, fields)`, `ApiError.conflict(message)`.
- Produces: `type ErrorCode = 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED' | 'SERVER_ERROR'`.
- Produces: `env` object from `src/config/env.ts` with `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_BASE_URL`, `DOCS_ENABLED`.
- Produces: `GET /api/health` → `200 { ok: true }`.

- [ ] **Step 1: Write the failing test**

Create `Apps/backend/tests/health.test.ts`:

```ts
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app';

describe('GET /api/health', () => {
  it('reports the service is up', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('error envelope', () => {
  it('returns NOT_FOUND in the envelope shape for an unknown route', async () => {
    const res = await request(createApp()).get('/api/tidak-ada');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Apps/backend && npm test`
Expected: FAIL — `Cannot find module '../src/app'` (or npm itself fails because `package.json` does not exist yet; that also counts as the expected failure).

- [ ] **Step 3: Create `Apps/docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: sapa
      POSTGRES_PASSWORD: sapa
      POSTGRES_DB: sapa
    ports:
      - '5432:5432'
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U sapa']
      interval: 5s
      timeout: 5s
      retries: 10

  mailpit:
    image: axllent/mailpit:latest
    restart: unless-stopped
    ports:
      - '1025:1025'   # SMTP
      - '8025:8025'   # web inbox

volumes:
  db_data:
```

- [ ] **Step 4: Create `Apps/backend/package.json`**

```json
{
  "name": "sapa-gampong-backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "tsx db/seed.ts",
    "db:studio": "prisma studio"
  },
  "prisma": {
    "schema": "db/schema.prisma"
  },
  "dependencies": {
    "@asteasolutions/zod-to-openapi": "^7.3.0",
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.5",
    "express": "^4.21.1",
    "jsonwebtoken": "^9.0.2",
    "pino": "^9.5.0",
    "pino-http": "^10.3.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^20.17.6",
    "@types/supertest": "^6.0.2",
    "express-list-endpoints": "^7.1.0",
    "prisma": "^5.22.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 5: Create `Apps/backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "db/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 6: Create `Apps/backend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
```

`fileParallelism: false` matters: test files share one Postgres database and truncate between tests, so they must not run concurrently.

- [ ] **Step 7: Create the env files**

`Apps/backend/.env.example` (committed):

```
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://sapa:sapa@localhost:5432/sapa
JWT_SECRET=change-me-in-production
PUBLIC_BASE_URL=http://localhost:8080
DOCS_ENABLED=true
```

Then create the working copy: `cd Apps/backend && cp .env.example .env`

Confirm `.env` is gitignored: `cd Apps && git check-ignore -v backend/.env` — expected: a line naming the matching `.gitignore` rule. If there is no output, add `.env` to `Apps/.gitignore` before continuing.

- [ ] **Step 8: Create `Apps/backend/src/config/env.ts`**

```ts
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:8080'),
  DOCS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;
export type Env = typeof env;
```

- [ ] **Step 9: Create `Apps/backend/src/lib/errors.ts`**

```ts
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fields = fields;
  }

  static validation(message: string, fields?: Record<string, string>) {
    return new ApiError('VALIDATION_ERROR', message, fields);
  }
  static unauthorized(message = 'Autentikasi diperlukan') {
    return new ApiError('UNAUTHORIZED', message);
  }
  static forbidden(message = 'Akses ditolak') {
    return new ApiError('FORBIDDEN', message);
  }
  static notFound(message = 'Data tidak ditemukan') {
    return new ApiError('NOT_FOUND', message);
  }
  static conflict(message: string) {
    return new ApiError('CONFLICT', message);
  }
}
```

- [ ] **Step 10: Create `Apps/backend/src/middleware/error.ts`**

```ts
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors';
import { env } from '../config/env';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound('Endpoint tidak ditemukan'));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) fields[issue.path.join('.')] = issue.message;
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Data yang dikirim tidak valid', fields },
    });
    return;
  }

  if (err instanceof ApiError) {
    const body: Record<string, unknown> = { code: err.code, message: err.message };
    if (err.fields) body.fields = err.fields;
    res.status(err.status).json({ error: body });
    return;
  }

  if (env.NODE_ENV !== 'test') console.error(err);
  res.status(500).json({
    error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan pada server' },
  });
}
```

- [ ] **Step 11: Create `Apps/backend/src/app.ts`**

```ts
import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/error';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

- [ ] **Step 12: Create `Apps/backend/src/index.ts`**

```ts
import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`SAPA Gampong API listening on http://localhost:${env.PORT}/api`);
});
```

- [ ] **Step 13: Install dependencies and start the infrastructure**

```bash
cd Apps && docker compose up -d
cd backend && npm install
```

Expected: `docker compose ps` shows `db` and `mailpit` running; `npm install` completes without errors.

- [ ] **Step 14: Run the test to verify it passes**

Run: `cd Apps/backend && npm test`
Expected: PASS — 2 tests in `tests/health.test.ts`.

- [ ] **Step 15: Commit**

```bash
cd Apps
git add docker-compose.yml backend/
git commit -m "feat(api): express skeleton, error envelope, docker dev infra"
```

---

## Task 2: Prisma data model and initial migration

**Files:**
- Create: `Apps/backend/db/schema.prisma`
- Create: `Apps/backend/src/lib/prisma.ts`
- Create: `Apps/backend/tests/helpers/db.ts`, `tests/helpers/global-setup.ts`
- Create: `Apps/backend/.env.test`
- Modify: `Apps/backend/vitest.config.ts` (register the global setup)
- Test: `Apps/backend/tests/schema.test.ts`

**Interfaces:**
- Produces: `prisma` — a shared `PrismaClient` singleton exported from `src/lib/prisma.ts`.
- Produces: `truncateAll(): Promise<void>` and `testPrisma: PrismaClient` from `tests/helpers/db.ts`.
- Produces: Prisma models `File`, `LetterRequest`, `RequestAttachment`, `LetterNumberCounter`, `Feedback`, `FeedbackAttachment`, `BannerSlide`, `VillageProfile`, `VisionMission`, `Official`, `VillageStrength`, `Mosque`, `PrayerConfig`, `DemographicStatBlock`, `AdminUser`; enums `LetterType`, `RequestStatus`, `AttachmentKind`, `FeedbackStatus`, `AdminRole`, `DemographicBlockType`.
- Key guarantee later tasks rely on: `LetterRequest.verificationToken` is `String? @unique`.

- [ ] **Step 1: Write the failing test**

Create `Apps/backend/tests/schema.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { testPrisma, truncateAll } from './helpers/db';

beforeEach(async () => {
  await truncateAll();
});

describe('LetterRequest schema', () => {
  it('persists a request with the brief §14 fields', async () => {
    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000001',
        letterType: 'L1',
        status: 'SUBMITTED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
        applicantPhone: '081234567890',
        subjectData: { nama: 'Budi', nik: '1607010101010001' },
      },
    });

    expect(created.id).toBeTruthy();
    expect(created.status).toBe('SUBMITTED');
    expect(created.qrRevoked).toBe(false);
    expect(created.verifiedCount).toBe(0);
    expect(created.verificationToken).toBeNull();
  });

  it('rejects a duplicate verification token', async () => {
    const base = {
      letterType: 'L1' as const,
      status: 'GENERATED' as const,
      applicantName: 'Budi',
      applicantEmail: 'budi@mail.com',
      subjectData: {},
      verificationToken: 'vt_duplicate',
    };

    await testPrisma.letterRequest.create({
      data: { ...base, referenceCode: 'GB-2026-000002' },
    });

    await expect(
      testPrisma.letterRequest.create({
        data: { ...base, referenceCode: 'GB-2026-000003' },
      }),
    ).rejects.toThrow();
  });
});

describe('AdminUser schema', () => {
  it('enforces a unique email', async () => {
    await testPrisma.adminUser.create({
      data: { name: 'A', email: 'dup@gampongblang.id', passwordHash: 'x', role: 'admin' },
    });

    await expect(
      testPrisma.adminUser.create({
        data: { name: 'B', email: 'dup@gampongblang.id', passwordHash: 'y', role: 'admin' },
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Apps/backend && npm test -- tests/schema.test.ts`
Expected: FAIL — `Cannot find module './helpers/db'`.

- [ ] **Step 3: Create `Apps/backend/db/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum LetterType {
  L1
  L2
  L3
  L4
  L5
  L6
  L7
}

enum RequestStatus {
  SUBMITTED
  IN_REVIEW
  NEEDS_INFO
  APPROVED
  GENERATED
  SENT
  REJECTED
}

enum AttachmentKind {
  KTP
  KK
  other
  photo
  document
}

enum FeedbackStatus {
  new
  read
  responded
}

enum AdminRole {
  admin
  approver
}

enum DemographicBlockType {
  number
  split
  bar
  pie
}

model File {
  id          String   @id @default(cuid())
  storagePath String
  mime        String
  size        Int
  createdAt   DateTime @default(now())

  requestAttachments  RequestAttachment[]
  feedbackAttachments FeedbackAttachment[]
  generatedFor        LetterRequest[]      @relation("GeneratedPdf")
  bannerSlides        BannerSlide[]
  villageProfiles     VillageProfile[]
  officials           Official[]
  villageStrengths    VillageStrength[]
  mosques             Mosque[]
}

model LetterRequest {
  id             String        @id @default(cuid())
  referenceCode  String        @unique
  letterType     LetterType
  status         RequestStatus @default(SUBMITTED)
  applicantName  String
  applicantEmail String
  applicantPhone String?
  keperluan      String?
  subjectData    Json
  nomorSurat     String?
  decidedBy      String?
  decisionReason String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  generatedPdfId String?
  generatedPdf   File?   @relation("GeneratedPdf", fields: [generatedPdfId], references: [id])

  verificationToken String? @unique
  pdfHash           String?
  qrRevoked         Boolean @default(false)
  verifiedCount     Int     @default(0)

  attachments RequestAttachment[]

  @@index([status])
  @@index([letterType])
  @@index([createdAt])
}

model RequestAttachment {
  id        String         @id @default(cuid())
  requestId String
  request   LetterRequest  @relation(fields: [requestId], references: [id], onDelete: Cascade)
  kind      AttachmentKind
  fileId    String
  file      File           @relation(fields: [fileId], references: [id])

  @@index([requestId])
}

model LetterNumberCounter {
  letterType LetterType
  year       Int
  lastNumber Int        @default(0)

  @@id([letterType, year])
}

model Feedback {
  id        String         @id @default(cuid())
  name      String
  email     String
  phone     String?
  body      String
  status    FeedbackStatus @default(new)
  note      String?
  createdAt DateTime       @default(now())

  attachments FeedbackAttachment[]

  @@index([status])
}

model FeedbackAttachment {
  id         String         @id @default(cuid())
  feedbackId String
  feedback   Feedback       @relation(fields: [feedbackId], references: [id], onDelete: Cascade)
  kind       AttachmentKind
  fileId     String
  file       File           @relation(fields: [fileId], references: [id])

  @@index([feedbackId])
}

model BannerSlide {
  id          String    @id @default(cuid())
  imageFileId String
  image       File      @relation(fields: [imageFileId], references: [id])
  linkUrl     String?
  order       Int       @default(0)
  active      Boolean   @default(true)
  startAt     DateTime?
  endAt       DateTime?
}

model VillageProfile {
  id           String   @id @default("singleton")
  name         String
  foundedDate  String?
  kecamatan    String
  kabupaten    String
  contactPhone String?
  email        String?
  mapLat       Float?
  mapLng       Float?
  description  String?
  photoFileId  String?
  photo        File?    @relation(fields: [photoFileId], references: [id])
  updatedAt    DateTime @updatedAt
}

model VisionMission {
  id        String   @id @default("singleton")
  vision    String
  missions  Json
  updatedAt DateTime @updatedAt
}

model Official {
  id                   String  @id @default(cuid())
  name                 String
  role                 String
  photoFileId          String?
  photo                File?   @relation(fields: [photoFileId], references: [id])
  order                Int     @default(0)
  isLeadershipHighlight Boolean @default(false)
}

model VillageStrength {
  id          String  @id @default(cuid())
  title       String
  body        String
  photoFileId String?
  photo       File?   @relation(fields: [photoFileId], references: [id])
  order       Int     @default(0)
}

model Mosque {
  id          String  @id @default(cuid())
  name        String
  address     String
  landmark    String?
  photoFileId String?
  photo       File?   @relation(fields: [photoFileId], references: [id])
}

model PrayerConfig {
  id         String   @id @default("singleton")
  lat        Float
  lng        Float
  calcMethod String
  timezone   String   @default("Asia/Jakarta")
  updatedAt  DateTime @updatedAt
}

model DemographicStatBlock {
  key     String               @id
  label   String
  type    DemographicBlockType
  data    Json
  order   Int                  @default(0)
  visible Boolean              @default(true)
}

model AdminUser {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  role         AdminRole @default(admin)
  createdAt    DateTime  @default(now())
}
```

- [ ] **Step 4: Create `Apps/backend/src/lib/prisma.ts`**

```ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

- [ ] **Step 5: Create the test database and `.env.test`**

```bash
cd Apps
docker compose exec -T db psql -U sapa -d sapa -c "CREATE DATABASE sapa_test;"
```

Expected: `CREATE DATABASE`. If it prints `already exists`, that is fine — continue.

Create `Apps/backend/.env.test`:

```
NODE_ENV=test
DATABASE_URL=postgresql://sapa:sapa@localhost:5432/sapa_test
JWT_SECRET=test-secret-value
PUBLIC_BASE_URL=http://localhost:8080
DOCS_ENABLED=true
```

Confirm it is ignored: `cd Apps && git check-ignore -v backend/.env.test` — expected: a matching rule. If there is no output, add `.env.test` to `Apps/.gitignore`.

- [ ] **Step 6: Create `Apps/backend/tests/helpers/global-setup.ts`**

```ts
import { execSync } from 'node:child_process';
import { config } from 'dotenv';

export default function setup() {
  config({ path: '.env.test', override: true });
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
}
```

- [ ] **Step 7: Create `Apps/backend/tests/helpers/db.ts`**

```ts
import { PrismaClient } from '@prisma/client';

export const testPrisma = new PrismaClient();

const TABLES = [
  'RequestAttachment',
  'FeedbackAttachment',
  'LetterRequest',
  'Feedback',
  'BannerSlide',
  'Official',
  'VillageStrength',
  'Mosque',
  'DemographicStatBlock',
  'VillageProfile',
  'VisionMission',
  'PrayerConfig',
  'LetterNumberCounter',
  'AdminUser',
  'File',
];

export async function truncateAll() {
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}
```

`TRUNCATE ... CASCADE` in one statement means foreign-key order does not matter, so this list never needs re-sorting as the model grows — only appending.

- [ ] **Step 8: Register the setup in `Apps/backend/vitest.config.ts`**

Replace the file with:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/helpers/global-setup.ts'],
    setupFiles: ['tests/helpers/load-test-env.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
```

Create `Apps/backend/tests/helpers/load-test-env.ts`:

```ts
import { config } from 'dotenv';

config({ path: '.env.test', override: true });
```

This runs before any test module is imported, so `src/config/env.ts` reads the test database URL rather than the development one.

- [ ] **Step 9: Generate the client and run the migration**

```bash
cd Apps/backend
npx prisma generate
npx prisma migrate dev --name init
```

Expected: `Your database is now in sync with your schema` and a new folder `db/migrations/<timestamp>_init/`.

- [ ] **Step 10: Run the tests to verify they pass**

Run: `cd Apps/backend && npm test`
Expected: PASS — 3 tests in `schema.test.ts`, plus the 2 from `health.test.ts`.

- [ ] **Step 11: Commit**

```bash
cd Apps
git add backend/db backend/src/lib/prisma.ts backend/tests backend/vitest.config.ts
git commit -m "feat(api): prisma data model + init migration + test database harness"
```

---

## Task 3: Admin authentication and admin seed

**Files:**
- Create: `Apps/backend/src/modules/auth/schemas.ts`, `service.ts`, `routes.ts`
- Create: `Apps/backend/src/middleware/auth.ts`
- Create: `Apps/backend/db/seed.ts`
- Modify: `Apps/backend/src/app.ts` (mount the auth router)
- Test: `Apps/backend/tests/auth.test.ts`

**Interfaces:**
- Consumes: `createApp()` (Task 1), `ApiError` (Task 1), `prisma` (Task 2), `truncateAll` / `testPrisma` (Task 2).
- Produces: `POST /api/auth/login` → `200 { token: string, user: { id, name, email, role } }`; wrong credentials → `401 UNAUTHORIZED`.
- Produces: `GET /api/auth/me` → `200 { id, name, email, role }`; missing/invalid token → `401 UNAUTHORIZED`.
- Produces: `signToken(payload: { sub: string; role: AdminRole }): string` and `verifyToken(token: string): { sub: string; role: AdminRole }` from `modules/auth/service.ts`.
- Produces: `requireAdmin` — Express middleware that sets `req.auth = { userId, role }`; and `requireRole(...roles: AdminRole[])`.
- Produces: exported Zod schemas `LoginBody`, `LoginResponse`, `AdminUserPublic` from `modules/auth/schemas.ts` — Task 4 registers these in the OpenAPI document.
- Produces: `seedAdmin(): Promise<void>` from `db/seed.ts`, creating `admin@gampongblang.id` / `admin123` with role `admin` (idempotent).

- [ ] **Step 1: Write the failing test**

Create `Apps/backend/tests/auth.test.ts`:

```ts
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app';
import { testPrisma, truncateAll } from './helpers/db';

const app = createApp();

beforeEach(async () => {
  await truncateAll();
  await testPrisma.adminUser.create({
    data: {
      name: 'Admin Gampong',
      email: 'admin@gampongblang.id',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'admin',
    },
  });
});

async function login(password: string) {
  return request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@gampongblang.id', password });
}

describe('POST /api/auth/login', () => {
  it('returns a token and the user for correct credentials', async () => {
    const res = await login('admin123');
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({
      email: 'admin@gampongblang.id',
      name: 'Admin Gampong',
      role: 'admin',
    });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a wrong password with the error envelope', async () => {
    const res = await login('salah');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed body with field-level detail', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bukan-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty('password');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const token = (await login('admin123')).body.token;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@gampongblang.id');
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a garbage token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Apps/backend && npm test -- tests/auth.test.ts`
Expected: FAIL — all six assertions fail with 404 `NOT_FOUND`, because no auth routes are mounted.

- [ ] **Step 3: Create `Apps/backend/src/modules/auth/schemas.ts`**

```ts
import { z } from 'zod';

export const LoginBody = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export const AdminUserPublic = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'approver']),
});

export const LoginResponse = z.object({
  token: z.string(),
  user: AdminUserPublic,
});

export type LoginBodyType = z.infer<typeof LoginBody>;
export type AdminUserPublicType = z.infer<typeof AdminUserPublic>;
```

- [ ] **Step 4: Create `Apps/backend/src/modules/auth/service.ts`**

```ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AdminRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../lib/errors';
import type { AdminUserPublicType } from './schemas';

export type TokenPayload = { sub: string; role: AdminRole };

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '12h' });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string') throw new Error('unexpected token shape');
    return { sub: String(decoded.sub), role: decoded.role as AdminRole };
  } catch {
    throw ApiError.unauthorized('Token tidak valid atau sudah kedaluwarsa');
  }
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AdminUserPublicType> {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) throw ApiError.unauthorized('Email atau kata sandi salah');

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function findUserById(id: string): Promise<AdminUserPublicType> {
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) throw ApiError.unauthorized('Pengguna tidak ditemukan');
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
```

The dummy hash makes a missing user cost the same time as a wrong password, so response timing does not reveal which emails exist.

- [ ] **Step 5: Create `Apps/backend/src/middleware/auth.ts`**

```ts
import type { NextFunction, Request, Response } from 'express';
import type { AdminRole } from '@prisma/client';
import { ApiError } from '../lib/errors';
import { verifyToken } from '../modules/auth/service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string; role: AdminRole };
    }
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Autentikasi diperlukan'));
    return;
  }

  try {
    const payload = verifyToken(header.slice('Bearer '.length).trim());
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: AdminRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(ApiError.unauthorized('Autentikasi diperlukan'));
    if (!roles.includes(req.auth.role)) return next(ApiError.forbidden('Akses ditolak'));
    next();
  };
}
```

- [ ] **Step 6: Create `Apps/backend/src/modules/auth/routes.ts`**

```ts
import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { LoginBody } from './schemas';
import { findUserById, signToken, verifyCredentials } from './service';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginBody.parse(req.body);
    const user = await verifyCredentials(email, password);
    res.json({ token: signToken({ sub: user.id, role: user.role }), user });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAdmin, async (req, res, next) => {
  try {
    res.json(await findUserById(req.auth!.userId));
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 7: Mount the router in `Apps/backend/src/app.ts`**

Add the import at the top:

```ts
import { authRouter } from './modules/auth/routes';
```

and insert this line immediately after the `/api/health` handler, before `app.use(notFoundHandler)`:

```ts
  app.use('/api/auth', authRouter);
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd Apps/backend && npm test -- tests/auth.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 9: Create `Apps/backend/db/seed.ts`**

```ts
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

export async function seedAdmin() {
  const email = 'admin@gampongblang.id';
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Admin Gampong Blang',
      email,
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'admin',
    },
  });
  console.log(`Seeded admin: ${email} / admin123`);
}

if (require.main === module) {
  seedAdmin()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
```

- [ ] **Step 10: Verify the seed works against the dev database**

```bash
cd Apps/backend && npm run db:seed
```

Expected: `Seeded admin: admin@gampongblang.id / admin123`. Run it a second time — it must succeed identically (idempotent).

- [ ] **Step 11: Commit**

```bash
cd Apps
git add backend/src backend/db/seed.ts backend/tests/auth.test.ts
git commit -m "feat(api): admin auth (login, me, requireAdmin) + admin seed"
```

---

## Task 4: OpenAPI document, Scalar dashboard, and the drift guard

**Files:**
- Create: `Apps/backend/src/openapi/registry.ts`, `components.ts`, `document.ts`, `routes.ts`, `list-routes.ts`
- Create: `Apps/backend/scripts/write-openapi.ts`
- Modify: `Apps/backend/src/modules/auth/schemas.ts` (extend Zod with OpenAPI metadata)
- Modify: `Apps/backend/src/modules/auth/routes.ts` (register both routes)
- Modify: `Apps/backend/src/app.ts` (mount the docs router, register `/api/health`)
- Modify: `Apps/backend/package.json` (add the `openapi:write` script)
- Test: `Apps/backend/tests/openapi.test.ts`

**Interfaces:**
- Consumes: `createApp()` (Task 1), `LoginBody` / `LoginResponse` / `AdminUserPublic` (Task 3).
- Produces: `registry` — the single `OpenAPIRegistry` instance, imported by every module that has routes.
- Produces: `buildDocument(): object` from `src/openapi/document.ts` — a complete OpenAPI 3.1 document.
- Produces: `errorResponse(description: string)` from `src/openapi/components.ts` — a ready-made response object referencing the shared error envelope, used by every registered route.
- Produces: `listRoutes(app): Array<{ method: string; path: string }>` from `src/openapi/list-routes.ts`, with paths already in OpenAPI form (`/api/requests/{id}`).
- Produces: `GET /api/openapi.json` → the document; `GET /api/docs` → the Scalar HTML page.
- Produces: `npm run openapi:write` → writes `backend/openapi.json`.

**Convention this task establishes — every later task follows it:** a module's `routes.ts` calls `registry.registerPath({...})` for each route it adds, next to the handler.

- [ ] **Step 1: Write the failing test**

Create `Apps/backend/tests/openapi.test.ts`:

```ts
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app';
import { buildDocument } from '../src/openapi/document';
import { listRoutes } from '../src/openapi/list-routes';

const app = createApp();

/** Routes that serve the documentation itself are deliberately not documented. */
const UNDOCUMENTED = new Set(['GET /api/docs', 'GET /api/openapi.json']);

describe('OpenAPI document', () => {
  it('is a valid OpenAPI 3.1 document with the project identity', () => {
    const doc = buildDocument() as any;
    expect(doc.openapi).toMatch(/^3\.1/);
    expect(doc.info.title).toBe('SAPA Gampong API');
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
  });

  it('documents the login route with its request and response schema', () => {
    const doc = buildDocument() as any;
    const login = doc.paths['/api/auth/login'].post;
    expect(login.requestBody.content['application/json'].schema).toBeTruthy();
    expect(login.responses['200']).toBeTruthy();
    expect(login.responses['401']).toBeTruthy();
  });

  it('marks authenticated routes as requiring the bearer scheme', () => {
    const doc = buildDocument() as any;
    expect(doc.paths['/api/auth/me'].get.security).toEqual([{ bearerAuth: [] }]);
  });
});

describe('drift guard', () => {
  it('documents every route mounted on the app', () => {
    const doc = buildDocument() as any;
    const documented = new Set<string>();
    for (const [path, methods] of Object.entries(doc.paths as Record<string, object>)) {
      for (const method of Object.keys(methods)) {
        documented.add(`${method.toUpperCase()} ${path}`);
      }
    }

    const missing = listRoutes(app)
      .map((r) => `${r.method} ${r.path}`)
      .filter((key) => !UNDOCUMENTED.has(key) && !documented.has(key));

    expect(missing).toEqual([]);
  });
});

describe('docs endpoints', () => {
  it('serves the OpenAPI document as JSON', async () => {
    const res = await request(app).get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\.1/);
  });

  it('serves the Scalar dashboard as HTML pointing at the document', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('/api/openapi.json');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Apps/backend && npm test -- tests/openapi.test.ts`
Expected: FAIL — `Cannot find module '../src/openapi/document'`.

- [ ] **Step 3: Create `Apps/backend/src/openapi/registry.ts`**

```ts
import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/**
 * The single registry for the whole API. Every module's routes.ts imports this
 * and calls registry.registerPath() next to the route it defines.
 */
export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});
```

`extendZodWithOpenApi(z)` must run before any schema calls `.openapi(...)`, which is why it lives here and every module imports the registry.

- [ ] **Step 4: Create `Apps/backend/src/openapi/components.ts`**

```ts
import { z } from 'zod';
import { registry } from './registry';

export const ErrorEnvelope = registry.register(
  'ErrorEnvelope',
  z
    .object({
      error: z.object({
        code: z.enum([
          'VALIDATION_ERROR',
          'UNAUTHORIZED',
          'FORBIDDEN',
          'NOT_FOUND',
          'CONFLICT',
          'RATE_LIMITED',
          'SERVER_ERROR',
        ]),
        message: z.string(),
        fields: z.record(z.string()).optional(),
      }),
    })
    .openapi({
      description: 'Bentuk baku seluruh respons error.',
      example: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data yang dikirim tidak valid',
          fields: { nik: 'harus 16 digit' },
        },
      },
    }),
);

/** Ready-made error response, referenced by every registered route. */
export function errorResponse(description: string) {
  return {
    description,
    content: { 'application/json': { schema: ErrorEnvelope } },
  };
}
```

- [ ] **Step 5: Create `Apps/backend/src/openapi/document.ts`**

```ts
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';
import { env } from '../config/env';

// Importing every module that registers routes is what populates the registry.
// Add a line here whenever a new module with routes is created.
import '../modules/auth/routes';
import './health-doc';

export function buildDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'SAPA Gampong API',
      version: '0.1.0',
      description:
        'API layanan Gampong Blang: pengajuan surat, verifikasi keaslian, konten desa, dan pelaporan warga. ' +
        'Login lewat POST /api/auth/login, salin `token`, lalu tekan tombol Authorize untuk mencoba endpoint admin.',
    },
    servers: [{ url: env.PUBLIC_BASE_URL, description: 'Server aktif' }],
    tags: [
      { name: 'Health', description: 'Status layanan' },
      { name: 'Auth', description: 'Autentikasi admin' },
    ],
  });
}
```

- [ ] **Step 6: Create `Apps/backend/src/openapi/health-doc.ts`**

`/api/health` is defined inline in `app.ts` rather than in a module, so its registration lives here:

```ts
import { z } from 'zod';
import { registry } from './registry';

registry.registerPath({
  method: 'get',
  path: '/api/health',
  tags: ['Health'],
  summary: 'Cek status layanan',
  responses: {
    200: {
      description: 'Layanan berjalan normal',
      content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
    },
  },
});
```

- [ ] **Step 7: Create `Apps/backend/src/openapi/list-routes.ts`**

```ts
import listEndpoints from 'express-list-endpoints';
import type { Express } from 'express';

export type MountedRoute = { method: string; path: string };

/** Express writes params as ":id"; OpenAPI writes them as "{id}". */
function toOpenApiPath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

export function listRoutes(app: Express): MountedRoute[] {
  const routes: MountedRoute[] = [];

  for (const endpoint of listEndpoints(app)) {
    for (const method of endpoint.methods) {
      if (method === 'HEAD' || method === 'OPTIONS') continue;
      routes.push({ method, path: toOpenApiPath(endpoint.path) });
    }
  }

  return routes;
}
```

- [ ] **Step 8: Create `Apps/backend/src/openapi/routes.ts`**

```ts
import { Router } from 'express';
import { buildDocument } from './document';

export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(buildDocument());
});

docsRouter.get('/docs', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html>
  <head>
    <title>SAPA Gampong API</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
});
```

Scalar is loaded from its CDN rather than the `@scalar/express-api-reference` package: the package is ESM-only (this project is CommonJS) and its options have churned across releases, while this embed is stable. The cost is that the docs page needs an internet connection to render — acceptable for a development tool. If offline docs are ever needed, vendor the script into `src/openapi/assets/` and serve it statically; nothing else changes.

- [ ] **Step 9: Register the auth routes**

In `Apps/backend/src/modules/auth/schemas.ts`, add the registry import at the top so `.openapi()` is available, and give the schemas names:

```ts
import { z } from 'zod';
import { registry } from '../../openapi/registry';

export const LoginBody = registry.register(
  'LoginBody',
  z.object({
    email: z.string().email('Format email tidak valid').openapi({ example: 'admin@gampongblang.id' }),
    password: z.string().min(1, 'Kata sandi wajib diisi').openapi({ example: 'admin123' }),
  }),
);

export const AdminUserPublic = registry.register(
  'AdminUserPublic',
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['admin', 'approver']),
  }),
);

export const LoginResponse = registry.register(
  'LoginResponse',
  z.object({
    token: z.string(),
    user: AdminUserPublic,
  }),
);

export type LoginBodyType = z.infer<typeof LoginBody>;
export type AdminUserPublicType = z.infer<typeof AdminUserPublic>;
```

In `Apps/backend/src/modules/auth/routes.ts`, add these imports:

```ts
import { registry } from '../../openapi/registry';
import { errorResponse } from '../../openapi/components';
import { AdminUserPublic, LoginBody, LoginResponse } from './schemas';
```

(replacing the existing `import { LoginBody } from './schemas';`), and append these two registrations at the end of the file:

```ts
registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Auth'],
  summary: 'Login admin',
  request: {
    body: { content: { 'application/json': { schema: LoginBody } } },
  },
  responses: {
    200: {
      description: 'Login berhasil',
      content: { 'application/json': { schema: LoginResponse } },
    },
    400: errorResponse('Data login tidak valid'),
    401: errorResponse('Email atau kata sandi salah'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags: ['Auth'],
  summary: 'Profil admin yang sedang login',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Data pengguna',
      content: { 'application/json': { schema: AdminUserPublic } },
    },
    401: errorResponse('Token tidak valid atau tidak dikirim'),
  },
});
```

- [ ] **Step 10: Mount the docs router in `Apps/backend/src/app.ts`**

Add the import:

```ts
import { docsRouter } from './openapi/routes';
```

and mount it after the auth router, before `notFoundHandler`:

```ts
  if (env.DOCS_ENABLED || env.NODE_ENV !== 'production') {
    app.use('/api', docsRouter);
  }
```

This also needs `import { env } from './config/env';` at the top of `app.ts` if it is not already there.

- [ ] **Step 11: Run the tests to verify they pass**

Run: `cd Apps/backend && npm test`
Expected: PASS — all tests across `health`, `schema`, `auth`, and `openapi` test files.

If the drift guard reports a missing route, that is the test doing its job: add a `registry.registerPath` for the named route.

- [ ] **Step 12: Add the spec-writing script**

Create `Apps/backend/scripts/write-openapi.ts`:

```ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDocument } from '../src/openapi/document';

const target = join(__dirname, '..', 'openapi.json');
writeFileSync(target, JSON.stringify(buildDocument(), null, 2) + '\n');
console.log(`Wrote ${target}`);
```

Add to the `scripts` block in `Apps/backend/package.json`:

```json
    "openapi:write": "tsx scripts/write-openapi.ts",
```

Run: `cd Apps/backend && npm run openapi:write`
Expected: `Wrote .../backend/openapi.json`.

- [ ] **Step 13: Verify the dashboard by hand**

```bash
cd Apps/backend && npm run dev
```

Open <http://localhost:8080/api/docs>. Confirm:
1. The sidebar lists **Health** and **Auth**.
2. `POST /api/auth/login` sends successfully with the pre-filled example and returns a token.
3. Pasting that token into **Authorize** makes `GET /api/auth/me` return the admin user.
4. Logging in with a wrong password returns the error envelope with `UNAUTHORIZED`.

Stop the server with Ctrl+C.

- [ ] **Step 14: Commit**

```bash
cd Apps
git add backend/src backend/scripts backend/openapi.json backend/package.json backend/tests/openapi.test.ts
git commit -m "feat(api): OpenAPI 3.1 document + Scalar dashboard + route drift guard"
```

---

## Tasks 5–7 — added after the whole-branch review (2026-07-20)

The final review of Tasks 1–4 found that this plan stated invariants without naming the artifact that enforces them, and omitted cross-cutting middleware from the foundation phase. The project owner approved three additional tasks. They are sequential — each touches files the previous one changes.

### Task 5: `defineRoute()` — bind validation and documentation to one object

**Problem:** the spec promised each Zod schema is "consumed twice — by the validation middleware and by the registry", but no such middleware exists. Handlers hand-call `Schema.parse()` while a separate `registerPath` block re-states the schema by hand. Nothing binds them, so a route can validate schema A and document schema B; the drift guard compares only `method + path` and would pass.

**Files:**
- Create: `backend/src/openapi/define-route.ts`
- Modify: `backend/src/modules/auth/routes.ts` (migrate both routes), `backend/src/openapi/health-doc.ts` (fold into `app.ts` via the helper, or keep and document why not)
- Test: `backend/tests/define-route.test.ts`

**Interfaces:**
- Produces `defineRoute(router, { method, path, fullPath, tags, summary, security?, body?, query?, params?, responses, handler })`. It calls `registry.registerPath(...)` from the same schema objects it installs validation for, and mounts the handler on the router. Validation failures throw `ZodError`, which the existing `errorHandler` already maps to the 400 envelope — do not re-implement that.
- `handler` receives the parsed, typed values, not the raw `req.body`, so a route physically cannot read an unvalidated field.

- [ ] **Step 1:** Write `define-route.test.ts`: a route defined with a body schema (a) rejects a body failing that schema with 400 and per-field detail, and (b) appears in `buildDocument()` with a `requestBody` referencing that same schema. Assert both from one `defineRoute` call — that pairing is the whole point.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement `define-route.ts`. Keep it small; it is a wrapper, not a framework.
- [ ] **Step 4:** Migrate `POST /api/auth/login` and `GET /api/auth/me` to it. The generated `openapi.json` must be byte-identical afterward apart from ordering — if it changes, the helper is not faithful.
- [ ] **Step 5:** Run full suite — PASS. Run `npm run openapi:write`, diff, commit `feat(api): defineRoute binds validation to documentation`.

### Task 6: Cross-cutting HTTP middleware

**Problem:** `helmet`, `cors`, `express-rate-limit` and `pino-http` are named in the stack; none are wired. `pino` is installed and unused, `RATE_LIMITED` is a documented error code with no producer, and `POST /auth/login` is unthrottled.

**Files:**
- Create: `backend/src/middleware/rate-limit.ts`, `backend/src/lib/logger.ts`
- Modify: `backend/src/app.ts`, `backend/src/middleware/error.ts` (log through pino, not `console.error`), `backend/src/config/env.ts` (add `CORS_ORIGINS`), `backend/.env.example`
- Test: `backend/tests/middleware.test.ts`

**Interfaces:**
- `helmet()` and `cors({ origin: env.CORS_ORIGINS })` — a comma-separated allowlist, not `*`, since admin endpoints are credentialed.
- `pino-http` with a request id on every log line; `errorHandler` logs 500s through it with the request id, route, and method. Test output must stay pristine — silence the logger when `NODE_ENV === 'test'`.
- `loginRateLimit` — `express-rate-limit` on `POST /api/auth/login`, returning the envelope with code `RATE_LIMITED` (429), not the library's default body.
- `app.set('trust proxy', 1)` so rate limiting and client IPs are correct behind Railway's proxy.

- [ ] **Step 1:** Test: exceeding the login limit returns 429 with `error.code === 'RATE_LIMITED'`; a response carries helmet's headers; a disallowed origin is refused.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement. Register the 429 response on the login route so the drift guard and docs stay accurate.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): helmet, cors, request logging, login rate limit`.

### Task 7: Schema pass — PII at rest, file metadata, enum casing

**Problem:** three schema-shaped decisions that get categorically more expensive once rows exist. Doing them now costs one migration against an empty database.

**Files:**
- Modify: `backend/db/schema.prisma` + migration, `backend/src/lib/crypto.ts` (new), `API-CONTRACT.md`, `backend/tests/schema.test.ts`
- Test: `backend/tests/crypto.test.ts`

**7a — PII at rest.** `subjectData` is plain JSONB and a test writes a plaintext NIK into it. Implement envelope encryption: an app-level key from `env.ENCRYPTION_KEY`, a `keyVersion` column on `LetterRequest` so keys can be rotated without a rewrite, and a **blind index** (HMAC of the normalized NIK, stored in an indexed column) so admins can still search by NIK without decrypting every row. `crypto.ts` exposes `encryptJson`/`decryptJson`/`blindIndex`. Use Node's built-in `crypto` with AES-256-GCM — no new dependency.

**7b — File model.** Add `originalName`, `checksum` (SHA-256, which also serves the `pdfHash` integrity story), `uploadedBy`, and `retainUntil` (the spec lists attachment retention as an open question — this is the column that will answer it). Add `@@unique([requestId, kind])` on `RequestAttachment` so a request cannot carry three KTPs. Fix the orphan-on-delete problem: deleting a `LetterRequest` cascades `RequestAttachment` but the `File` FK is `RESTRICT`, leaving orphaned `File` rows — a storage leak and a PII-retention violation. Decide explicitly: either cascade to `File`, or add a sweep that deletes unreferenced files past `retainUntil`.

**7c — Enum casing.** Standardise every Prisma enum on SCREAMING_SNAKE_CASE, matching `RequestStatus`, which already uses it:
- `AttachmentKind`: `KTP`, `KK`, `OTHER`, `PHOTO`, `DOCUMENT`
- `FeedbackStatus`: `NEW`, `READ`, `RESPONDED`
- `AdminRole`: `ADMIN`, `APPROVER`
- `DemographicBlockType`: `NUMBER`, `SPLIT`, `BAR`, `PIE`
- `LetterType` unchanged (`L1`…`L10`)

Update `API-CONTRACT.md` to match — it currently documents `role: "admin|approver"` and feedback `status: "new"`. **Do not touch the value enums inside `subject_data`** (`jenis_kelamin`, `agama`, `status_perkawinan`, `dusun`) — those are Indonesian-language data values shown to residents, not protocol enums.

- [ ] **Step 1:** Tests: a round-trip through `encryptJson`/`decryptJson` recovers the original and the stored ciphertext contains no plaintext NIK; two different NIKs produce different blind indexes and the same NIK produces a stable one; the `@@unique([requestId, kind])` constraint rejects a duplicate KTP.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement `crypto.ts`, amend the schema, migrate, update the contract and the auth code that references `AdminRole` values.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `feat(api): PII envelope encryption, file metadata, enum casing`.

---

## Adding routes after this plan

Every later task adds routes the same way. The checklist, once:

1. Declare the Zod schemas in the module's `schemas.ts`, wrapped in `registry.register('Name', schema)`.
2. Use those same schemas in the handler for validation (`Schema.parse(req.body)`).
3. Call `registry.registerPath({...})` at the bottom of the module's `routes.ts`, using `errorResponse(...)` for the failure cases and `security: [{ bearerAuth: [] }]` on admin routes.
4. Add `import '../modules/<name>/routes';` to `src/openapi/document.ts` if the module is new.
5. Run `npm test` — the drift guard fails if a route was missed.
6. Run `npm run openapi:write` and commit the updated `openapi.json`.

---

## Self-Review

**Spec coverage.** D1 (Zod→OpenAPI via Scalar) → Task 4. D2 (docs infrastructure in Phase 2, registration as definition-of-done) → Task 4 plus the "Adding routes" section. D3 (route-coverage drift guard) → Task 4 Step 1 `drift guard` block and Step 7. D4 (mobile developer clones and runs locally; no early deploy) → Task 0 Step 2 quickstart; no deploy task is present. D5 (Mailpit) → Task 1 Step 3 compose service and Task 0's documented inbox URL; Nodemailer wiring belongs to the letter plan, where email is first sent. D6 (Postgres/Mailpit in Docker, backend on host) → Task 1 Steps 3 and 13. Data model (brief §14) → Task 2 Step 3. Production docs gating via `DOCS_ENABLED` → Task 1 Step 8 and Task 4 Step 10. Test database as `sapa_test` with truncation → Task 2 Steps 5–8.

Deliberately **not** in this plan, and tracked in the later plans named in the spec's sequencing table: the demo seed (Phase 5 — it needs requests and content that do not exist yet), the security and privacy pass including NIK encryption (Phase 5), PDF tests (Phase 3), and the containerised app image (Phase 5).

**Placeholder scan.** No `TBD`, `TODO`, "similar to Task N", or "add appropriate error handling" instructions. Every code step contains complete, runnable content.

**Type consistency.** `ApiError` (Task 1) is constructed via the same static helpers in Tasks 3 and 4. `prisma` (Task 2) is imported by `service.ts` in Task 3. `LoginBody` / `LoginResponse` / `AdminUserPublic` are defined in Task 3 Step 3 and re-exported unchanged in name by Task 4 Step 9, which only wraps them in `registry.register`. `registry` is created once in Task 4 Step 3 and imported by `components.ts`, `document.ts`, `health-doc.ts`, and both auth files. `listRoutes(app)` returns `{ method, path }` and is consumed in exactly that shape by the drift test. `truncateAll` / `testPrisma` are defined in Task 2 Step 7 and used in Tasks 2 and 3.

One ordering consequence worth stating: Task 4 Step 9 modifies a file created in Task 3, so Task 3 must be complete before Task 4 begins. Tasks 1 → 2 → 3 → 4 are strictly sequential. Task 0 is independent and can run at any point, but running it first is what unblocks the mobile developer soonest.
