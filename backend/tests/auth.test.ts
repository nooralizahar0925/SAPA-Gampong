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
