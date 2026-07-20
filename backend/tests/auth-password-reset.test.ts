import request from 'supertest';
import bcrypt from 'bcryptjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { setEmailTransportForTests } from '../src/services/email.service';
import { testPrisma, truncateAll } from './helpers/db';

const app = createApp();

let sendMailMock = vi.fn();

beforeEach(async () => {
  sendMailMock = vi.fn().mockResolvedValue({ ok: true });
  setEmailTransportForTests({ sendMail: sendMailMock });

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

afterEach(() => {
  setEmailTransportForTests(null);
});

async function login(password: string) {
  return request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@gampongblang.id', password });
}

describe('password reset flow', () => {
  it('emails a reset link and allows the password to be replaced', async () => {
    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'admin@gampongblang.id' });

    expect(forgot.status).toBe(200);
    expect(forgot.body.message).toMatch(/tautan reset kata sandi telah dikirim/i);
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    const html = String(sendMailMock.mock.calls[0][0]?.html ?? '');
    const tokenMatch = html.match(/reset-password\?token=([A-Za-z0-9_-]+)/);
    expect(tokenMatch?.[1]).toBeTruthy();

    const reset = await request(app).post('/api/auth/reset-password').send({
      token: tokenMatch![1],
      password: 'AdminBaru123',
    });

    expect(reset.status).toBe(200);
    expect(reset.body.message).toMatch(/berhasil diperbarui/i);

    expect((await login('admin123')).status).toBe(401);
    expect((await login('AdminBaru123')).status).toBe(200);

    const user = await testPrisma.adminUser.findUnique({
      where: { email: 'admin@gampongblang.id' },
    });
    expect(user?.passwordResetTokenHash).toBeNull();
    expect(user?.passwordResetTokenExpiry).toBeNull();
  });

  it('returns a generic success message for unknown emails and sends nothing', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown@gampongblang.id' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/tautan reset kata sandi telah dikirim/i);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired reset tokens', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({
      token: 'invalid-token',
      password: 'AdminBaru123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty('token');
  });
});
