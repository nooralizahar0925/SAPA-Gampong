import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { setEmailProviderConfigsForTests, setEmailTransportForTests } from '../src/services/email.service';
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
  setEmailTransportForTests(null);
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
      mailersend: { fromEmail: 'no-reply@gampongblang.id', apiKey: 'mailersend-key' },
      mailgun: { fromEmail: 'mailgun@gampongblang.id' },
      gmail: {
        fromEmail: 'admin@gampongblang.id',
        user: 'admin@gampongblang.id',
        appPassword: 'gmail-app-password',
      },
      smtp: {
        fromEmail: 'smtp@gampongblang.id',
        host: 'smtp.example.test',
        port: 587,
      },
    });

    const token = await login();
    const res = await request(app)
      .get('/api/settings/email-provider')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.active_provider).toBe('mailersend');
    expect(res.body.default_provider).toBe('mailersend');
    expect(res.body.providers).toEqual([
      {
        id: 'mailersend',
        label: 'MailerSend',
        configured: true,
        config_summary: expect.objectContaining({
          from_email: 'no-reply@gampongblang.id',
          has_api_key: true,
        }),
      },
      {
        id: 'mailgun',
        label: 'Mailgun',
        configured: false,
        config_summary: expect.objectContaining({
          from_email: 'mailgun@gampongblang.id',
          has_api_key: false,
        }),
      },
      {
        id: 'gmail',
        label: 'Gmail',
        configured: true,
        config_summary: expect.objectContaining({
          from_email: 'admin@gampongblang.id',
          username: 'admin@gampongblang.id',
          has_app_password: true,
        }),
      },
      {
        id: 'smtp',
        label: 'SMTP',
        configured: true,
        config_summary: expect.objectContaining({
          from_email: 'smtp@gampongblang.id',
          host: 'smtp.example.test',
          port: 587,
          has_password: false,
        }),
      },
    ]);
  });

  it('persists a provider switch when the target provider is configured', async () => {
    setEmailProviderConfigsForTests({
      mailersend: { fromEmail: 'no-reply@gampongblang.id', apiKey: 'mailersend-key' },
      mailgun: { fromEmail: 'mailgun@gampongblang.id', apiKey: 'mailgun-key', domain: 'mg.example.test' },
      gmail: { fromEmail: 'admin@gampongblang.id' },
      smtp: { fromEmail: 'smtp@gampongblang.id', host: 'smtp.example.test', port: 587 },
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
      mailersend: { fromEmail: 'no-reply@gampongblang.id', apiKey: 'mailersend-key' },
      mailgun: { fromEmail: 'mailgun@gampongblang.id' },
      gmail: { fromEmail: 'admin@gampongblang.id' },
      smtp: { fromEmail: 'smtp@gampongblang.id' },
    });

    const token = await login();
    const res = await request(app)
      .patch('/api/settings/email-provider')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'gmail' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('saves provider configuration in the database and returns updated readiness', async () => {
    const token = await login();
    const res = await request(app)
      .patch('/api/settings/email-provider/config')
      .set('Authorization', `Bearer ${token}`)
      .send({
        provider: 'mailgun',
        from_email: 'letters@gampongblang.id',
        from_name: 'Administrasi Gampong Blang',
        api_key: 'mailgun-secret-key',
        domain: 'mg.gampongblang.id',
        api_base_url: 'https://api.mailgun.net',
      });

    expect(res.status).toBe(200);
    const provider = res.body.providers.find((item: { id: string }) => item.id === 'mailgun');
    expect(provider).toMatchObject({
      id: 'mailgun',
      configured: true,
      config_summary: {
        from_email: 'letters@gampongblang.id',
        from_name: 'Administrasi Gampong Blang',
        domain: 'mg.gampongblang.id',
        api_base_url: 'https://api.mailgun.net',
        has_api_key: true,
      },
    });

    const config = await testPrisma.appConfig.findUnique({
      where: { id: 'singleton' },
    });

    expect(config?.emailProviderConfigs).toMatchObject({
      mailgun: {
        fromEmail: 'letters@gampongblang.id',
        fromName: 'Administrasi Gampong Blang',
        domain: 'mg.gampongblang.id',
        baseUrl: 'https://api.mailgun.net',
      },
    });
  });

  it('sends a test email using the selected provider configuration', async () => {
    const sendMail = vi.fn(async () => ({ messageId: 'provider-test-1' }));
    setEmailTransportForTests({ sendMail });

    await testPrisma.appConfig.create({
      data: {
        id: 'singleton',
        activeEmailProvider: 'mailersend',
        emailProviderConfigs: {
          smtp: {
            fromEmail: 'smtp@gampongblang.id',
            fromName: 'Dashboard Admin',
            host: 'smtp.example.test',
            port: 587,
          },
        },
      },
    });

    const token = await login();
    const res = await request(app)
      .post('/api/settings/email-provider/test')
      .set('Authorization', `Bearer ${token}`)
      .send({
        provider: 'smtp',
        to_email: 'operator@gampongblang.id',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('SMTP');
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Dashboard Admin" <smtp@gampongblang.id>',
        to: 'operator@gampongblang.id',
        subject: expect.stringContaining('[Test]'),
      }),
    );
  });

  it('returns the provider error message when a test email send fails', async () => {
    const sendMail = vi.fn(async () => {
      throw new Error('MailerSend email request failed with status 401. {"message":"Unauthenticated."}');
    });
    setEmailTransportForTests({ sendMail });

    await testPrisma.appConfig.create({
      data: {
        id: 'singleton',
        activeEmailProvider: 'mailersend',
      },
    });
    setEmailProviderConfigsForTests({
      mailersend: {
        fromEmail: 'letters@gampongblang.id',
        fromName: 'Dashboard Admin',
        apiKey: 'mailersend-key',
      },
    });

    const token = await login();
    const res = await request(app)
      .post('/api/settings/email-provider/test')
      .set('Authorization', `Bearer ${token}`)
      .send({
        provider: 'mailersend',
        to_email: 'operator@gampongblang.id',
      });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('SERVER_ERROR');
    expect(res.body.error.message).toContain('MailerSend test email failed');
    expect(res.body.error.message).toContain('Unauthenticated');
  });
});
