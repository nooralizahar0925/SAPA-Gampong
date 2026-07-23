import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app';

describe('GET /api/health', () => {
  it('reports the service is up', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('allows local mobile web origins during development', async () => {
    const res = await request(createApp())
      .options('/api/health')
      .set('Origin', 'http://127.0.0.1:8092')
      .set('Access-Control-Request-Headers', 'content-type,x-client-version');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:8092');
    expect(res.headers['access-control-allow-headers']).toBe('content-type,x-client-version');
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

  it('returns VALIDATION_ERROR in the envelope shape for malformed JSON', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ this is not valid json');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Data yang dikirim tidak valid' },
    });
  });

  it('returns PAYLOAD_TOO_LARGE in the envelope shape for a body over the 1mb limit', async () => {
    const oversizeBody = { padding: 'x'.repeat(2 * 1024 * 1024) };
    const res = await request(createApp())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(oversizeBody));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Data yang dikirim terlalu besar' },
    });
  });
});
