import { rm } from 'node:fs/promises';
import { URL } from 'node:url';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { storageRoot } from '../src/services/storage.service';
import { testPrisma, truncateAll } from './helpers/db';

const app = createApp();

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9pZ1tc8AAAAASUVORK5CYII=',
  'base64',
);

beforeEach(async () => {
  await truncateAll();
  await rm(storageRoot, { recursive: true, force: true });
});

describe('POST /api/uploads', () => {
  it('stores a small PNG, returns a signed URL, and serves the uploaded file back', async () => {
    const res = await request(app)
      .post('/api/uploads')
      .field('kind', 'KTP')
      .attach('file', tinyPng, { filename: 'ktp.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.file_id).toEqual(expect.any(String));
    expect(res.body.mime).toMatch(/^image\//);
    expect(res.body.size).toBeGreaterThan(0);
    expect(res.body.url).toContain(`/api/uploads/${res.body.file_id}?`);

    const saved = await testPrisma.file.findUnique({ where: { id: res.body.file_id } });
    expect(saved).toBeTruthy();
    expect(saved?.mime).toBe(res.body.mime);
    expect(saved?.size).toBe(res.body.size);

    const url = new URL(res.body.url);
    const fetch = await request(app).get(`${url.pathname}${url.search}`);
    expect(fetch.status).toBe(200);
    expect(fetch.headers['content-type']).toContain(res.body.mime);
    expect(fetch.body.length).toBeGreaterThan(0);
  });

  it('rejects a file over 5 MB with the standard validation envelope', async () => {
    const oversize = Buffer.alloc(6 * 1024 * 1024, 1);

    const res = await request(app)
      .post('/api/uploads')
      .field('kind', 'KTP')
      .attach('file', oversize, { filename: 'too-large.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Data yang dikirim tidak valid',
        fields: { file: 'Ukuran file maksimal 5 MB' },
      },
    });
  });

  it('rejects a disallowed mime type', async () => {
    const res = await request(app)
      .post('/api/uploads')
      .field('kind', 'other')
      .attach('file', Buffer.from('plain text'), { filename: 'notes.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Data yang dikirim tidak valid',
        fields: { file: 'Tipe file harus gambar atau PDF' },
      },
    });
  });
});
