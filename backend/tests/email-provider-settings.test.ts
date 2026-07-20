import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { setEmailProviderConfigsForTests } from '../src/services/email.service';
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

afterEach(() => {
  setEmailProviderConfigsForTests(null);
});

async function login() {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@gampongblang.id',
    password: 'admin123',
  });

  return res.body.token as string;
}

describe('email provider settings', () => {
  it('returns the active provider, default provider, and provider readiness', async () => {
    setEmailProviderConfigsForTests({
      mailersend: { configured: true },
      mailgun: { configured: false },
      gmail: { configured: true },
      smtp: { configured: true },
    });

    const token = await login();
    const res = await request(app)
      .get('/api/settings/email-provider')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.active_provider).toBe('mailersend');
    expect(res.body.default_provider).toBe('mailersend');
    expect(res.body.providers).toEqual([
      { id: 'mailersend', label: 'MailerSend', configured: true },
      { id: 'mailgun', label: 'Mailgun', configured: false },
      { id: 'gmail', label: 'Gmail', configured: true },
      { id: 'smtp', label: 'SMTP', configured: true },
    ]);
  });

  it('persists a provider switch when the target provider is configured', async () => {
    setEmailProviderConfigsForTests({
      mailersend: { configured: true },
      mailgun: { configured: true },
      gmail: { configured: false },
      smtp: { configured: true },
    });

    const token = await login();
    const res = await request(app)
      .patch('/api/settings/email-provider')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'mailgun' });

    expect(res.status).toBe(200);
    expect(res.body.active_provider).toBe('mailgun');

    const config = await testPrisma.appConfig.findUnique({
      where: { id: 'singleton' },
    });

    expect(config?.activeEmailProvider).toBe('mailgun');
  });

  it('rejects selecting a provider that is not configured', async () => {
    setEmailProviderConfigsForTests({
      mailersend: { configured: true },
      mailgun: { configured: false },
      gmail: { configured: false },
      smtp: { configured: false },
    });

    const token = await login();
    const res = await request(app)
      .patch('/api/settings/email-provider')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'gmail' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});
