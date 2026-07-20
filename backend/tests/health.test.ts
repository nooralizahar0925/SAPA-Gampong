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
