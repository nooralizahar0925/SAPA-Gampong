import type { RequestHandler } from 'express';
import { Router } from 'express';
import { ApiError } from '../../lib/errors';
import { defineRoute } from '../../openapi/define-route';
import { errorResponse } from '../../openapi/components';
import { VerifyParams, VerifyResponse } from './schemas';
import { verifyByToken } from './service';

export const verifyRouter = Router();

const verifyLimiter = createVerifyRateLimit();

defineRoute(verifyRouter, {
  method: 'get',
  path: '/:token',
  fullPath: '/verify/{token}',
  tags: ['Verify'],
  summary: 'Verify a letter token and return public authenticity details',
  params: VerifyParams,
  middleware: [verifyLimiter],
  responses: {
    200: {
      description: 'Verification result as HTML or JSON',
      content: {
        'application/json': { schema: VerifyResponse },
        'text/html': { schema: { type: 'string' } },
      },
    },
    429: errorResponse('Too many verification attempts'),
  },
  handler: async ({ params, req, res }) => {
    const payload = await verifyByToken(params.token);
    if (req.accepts(['html', 'json']) === 'json') {
      res.json(payload);
      return;
    }

    res.type('html').send(renderVerifyHtml(payload));
  },
});

function renderVerifyHtml(
  payload:
    | { valid: false }
    | {
        valid: true;
        nomor_surat: string;
        jenis_surat: string;
        tanggal_terbit: string;
        penandatangan: string;
        perihal: string;
        revoked: false;
      },
) {
  if (!payload.valid) {
    return verifyPage({
      title: 'Surat Tidak Terverifikasi',
      body: `
    <div class="verdict verdict-invalid">
      <div class="verdict-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 8v5" /><path d="M12 16.5v.01" />
          <path d="M10.3 3.9 2.4 17.3A2 2 0 0 0 4.1 20.3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </div>
      <p class="verdict-eyebrow">Hasil Pemeriksaan</p>
      <h1>Tidak Terverifikasi</h1>
      <p class="verdict-lede">
        Kode QR ini tidak dikenali dalam arsip Gampong Blang, atau surat tersebut sudah dicabut.
      </p>
    </div>

    <div class="advice">
      <h2>Yang perlu dilakukan</h2>
      <ul>
        <li>Pastikan seluruh kode QR terpindai dengan jelas, lalu coba sekali lagi.</li>
        <li>Jangan menerima dokumen ini sebagai surat resmi sebelum dipastikan kantor gampong.</li>
        <li>Hubungi Kantor Keuchik Gampong Blang untuk konfirmasi keaslian dokumen.</li>
      </ul>
    </div>`,
    });
  }

  return verifyPage({
    title: 'Surat Terverifikasi',
    body: `
    <div class="verdict verdict-valid">
      <div class="verdict-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="m4.5 12.5 5 5 10-10" />
        </svg>
      </div>
      <p class="verdict-eyebrow">Hasil Pemeriksaan</p>
      <h1>Surat Terverifikasi</h1>
      <p class="verdict-lede">
        Dokumen ini tercatat resmi dan diterbitkan secara sah oleh Pemerintah Gampong Blang.
      </p>
    </div>

    <dl class="record">
      <div class="record-row record-row-lead">
        <dt>Nomor Surat</dt>
        <dd class="record-mono">${escapeHtml(payload.nomor_surat)}</dd>
      </div>
      <div class="record-row">
        <dt>Jenis Surat</dt>
        <dd>${escapeHtml(payload.jenis_surat)}</dd>
      </div>
      <div class="record-row">
        <dt>Tanggal Terbit</dt>
        <dd>${escapeHtml(formatIssuedDate(payload.tanggal_terbit))}</dd>
      </div>
      <div class="record-row">
        <dt>Penandatangan</dt>
        <dd>${escapeHtml(payload.penandatangan)}</dd>
      </div>
      <div class="record-row">
        <dt>Perihal</dt>
        <dd class="record-mono">${escapeHtml(payload.perihal)}</dd>
      </div>
    </dl>

    <p class="privacy">
      Nama dan NIK sengaja disamarkan. Halaman ini hanya membuktikan keaslian surat, tanpa
      menampilkan data pribadi pemiliknya.
    </p>`,
  });
}

/** "2026-07-21" reads as a database value; warga expect "21 Juli 2026". */
function formatIssuedDate(isoDate: string) {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

/**
 * Shared shell for both outcomes. This is the one page warga reach by scanning the QR on
 * a printed letter — often at a bank or school counter, on a mid-range phone over rural
 * signal — so it ships as a single self-contained document: no scripts, no web fonts, no
 * external requests. The verdict is the hero; the record below is supporting evidence.
 */
function verifyPage(input: { title: string; body: string }) {
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${escapeHtml(input.title)} · Gampong Blang Digital</title>
    <style>${VERIFY_STYLES}</style>
  </head>
  <body>
    <main class="sheet">
      <header class="crest">
        <div class="crest-seal" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3 4 6.5v5c0 4.4 3.2 8.4 8 9.5 4.8-1.1 8-5.1 8-9.5v-5L12 3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div class="crest-copy">
          <p class="crest-line">Pemerintah Gampong Blang</p>
          <p class="crest-sub">Kecamatan Krueng Sabee · Kabupaten Aceh Jaya</p>
        </div>
      </header>
${input.body}
      <footer class="foot">
        <p>Verifikasi keaslian surat · Gampong Blang Digital</p>
      </footer>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createVerifyRateLimit() {
  const hits = new Map<string, number[]>();
  const windowMs = 60_000;
  const maxHits = 60;
  const retryAfterSeconds = Math.ceil(windowMs / 1000);

  return ((req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const recentHits = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

    if (recentHits.length >= maxHits) {
      hits.set(key, recentHits);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      next(new ApiError('RATE_LIMITED', 'Too many verification attempts'));
      return;
    }

    recentHits.push(now);
    hits.set(key, recentHits);
    next();
  }) satisfies RequestHandler;
}

/**
 * Inlined so the page is one self-contained request. Palette matches the dashboard
 * (`dashboard/src/styles.css`) so the seal, letter, and this page read as one office.
 */
const VERIFY_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  :root {
    --g50: #eef6f1;
    --g100: #dcede4;
    --g200: #c4e0d2;
    --g600: #1e8a61;
    --g700: #176b4b;
    --g800: #124a34;
    --g900: #0e3b2a;
    --gold500: #e0a82e;
    --ink900: #131a17;
    --ink700: #37423c;
    --ink500: #667069;
    --line: #e2e7e3;
    --dang: #b03a2b;
    --dangbg: #fbe9e6;
  }

  body {
    margin: 0;
    padding: 24px 16px 40px;
    background: #eef1ee;
    color: var(--ink900);
    font-family: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.55;
    -webkit-text-size-adjust: 100%;
  }

  .sheet {
    max-width: 560px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 18px 40px rgba(14, 59, 42, 0.10);
  }

  /* Letterhead: the same crest language as the printed surat, so the page is
     recognisable as coming from the same office. */
  .crest {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 22px;
    background: var(--g800);
    color: #fff;
  }

  .crest-seal {
    flex: none;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }

  .crest-seal svg { width: 24px; height: 24px; }

  .crest-copy { min-width: 0; }

  .crest-line {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .crest-sub {
    margin: 2px 0 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.75);
  }

  /* The verdict is the page. Everything else is supporting evidence. */
  .verdict {
    padding: 34px 24px 30px;
    text-align: center;
    border-bottom: 1px solid var(--line);
  }

  .verdict-mark {
    width: 76px;
    height: 76px;
    margin: 0 auto 18px;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }

  .verdict-mark svg { width: 38px; height: 38px; }

  .verdict-valid .verdict-mark {
    background: var(--g100);
    color: var(--g700);
    box-shadow: 0 0 0 8px var(--g50);
  }

  .verdict-invalid .verdict-mark {
    background: var(--dangbg);
    color: var(--dang);
    box-shadow: 0 0 0 8px #fdf4f2;
  }

  .verdict-eyebrow {
    margin: 0 0 6px;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink500);
  }

  .verdict h1 {
    margin: 0 0 10px;
    font-size: 27px;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .verdict-valid h1 { color: var(--g800); }
  .verdict-invalid h1 { color: var(--dang); }

  .verdict-lede {
    margin: 0 auto;
    max-width: 40ch;
    font-size: 14.5px;
    color: var(--ink700);
  }

  .record { margin: 0; padding: 8px 22px 20px; }

  .record-row {
    display: grid;
    grid-template-columns: 128px minmax(0, 1fr);
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
  }

  .record-row:last-child { border-bottom: 0; }

  .record-row dt {
    font-size: 12.5px;
    color: var(--ink500);
  }

  .record-row dd {
    margin: 0;
    font-size: 14.5px;
    font-weight: 600;
    color: var(--ink900);
    overflow-wrap: anywhere;
  }

  /* The nomor surat is the number a clerk cross-checks against the register. */
  .record-row-lead dd { font-size: 17px; }

  .record-mono {
    font-family: "Cascadia Mono", Consolas, "SF Mono", Menlo, monospace;
    letter-spacing: 0.01em;
  }

  /* Masking is a guarantee, not a shortcoming — state it plainly. */
  .privacy {
    margin: 0;
    padding: 16px 22px 22px;
    border-top: 1px dashed var(--line);
    font-size: 12.5px;
    color: var(--ink500);
  }

  .advice { padding: 20px 22px 24px; }

  .advice h2 {
    margin: 0 0 10px;
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink500);
  }

  .advice ul {
    margin: 0;
    padding-left: 18px;
    font-size: 14px;
    color: var(--ink700);
  }

  .advice li { margin-bottom: 8px; }
  .advice li:last-child { margin-bottom: 0; }

  .foot {
    padding: 14px 22px 18px;
    background: var(--g50);
    border-top: 1px solid var(--line);
  }

  .foot p {
    margin: 0;
    font-size: 11.5px;
    color: var(--ink500);
    text-align: center;
  }

  @media (max-width: 420px) {
    body { padding: 14px 10px 28px; }
    .verdict { padding: 26px 18px 24px; }
    .verdict h1 { font-size: 23px; }
    .record { padding: 6px 16px 16px; }
    .record-row {
      grid-template-columns: minmax(0, 1fr);
      gap: 2px;
    }
    .privacy, .advice { padding-left: 16px; padding-right: 16px; }
  }
`;
