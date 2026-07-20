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
    return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verifikasi Surat</title>
  </head>
  <body>
    <h1>Surat tidak valid</h1>
    <p>QR tidak dapat diverifikasi atau sudah dicabut.</p>
  </body>
</html>`;
  }

  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verifikasi Surat</title>
  </head>
  <body>
    <h1>Surat TERVERIFIKASI</h1>
    <p>Diterbitkan secara sah oleh Pemerintah Gampong Blang.</p>
    <dl>
      <dt>Nomor Surat</dt><dd>${escapeHtml(payload.nomor_surat)}</dd>
      <dt>Jenis Surat</dt><dd>${escapeHtml(payload.jenis_surat)}</dd>
      <dt>Tanggal Terbit</dt><dd>${escapeHtml(payload.tanggal_terbit)}</dd>
      <dt>Penandatangan</dt><dd>${escapeHtml(payload.penandatangan)}</dd>
      <dt>Perihal</dt><dd>${escapeHtml(payload.perihal)}</dd>
    </dl>
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
