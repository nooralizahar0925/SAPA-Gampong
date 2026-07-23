import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import {
  setEmailProviderConfigsForTests,
  setEmailTransportForTests,
} from '../src/services/email.service';
import { testPrisma, truncateAll } from './helpers/db';

const app = createApp();

beforeEach(async () => {
  await truncateAll();
  setEmailProviderConfigsForTests({
    mailersend: {
      fromEmail: 'no-reply@gampongblang.id',
      fromName: 'Gampong Blang Digital',
      apiKey: 'test-key',
    },
  });
});

afterEach(() => {
  setEmailTransportForTests(null);
  setEmailProviderConfigsForTests(null);
});

describe('resident email session', () => {
  it('sends OTP, verifies it, and lists resident requests and feedback by email', async () => {
    const sendMail = vi.fn(async () => ({ messageId: 'resident-otp' }));
    setEmailTransportForTests({ sendMail });

    const otpRes = await request(app)
      .post('/api/resident/email/request-otp')
      .send({ email: 'WARGA@EXAMPLE.COM' });

    expect(otpRes.status).toBe(200);
    expect(otpRes.body.dev_otp).toMatch(/^\d{6}$/);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const sessionRes = await request(app)
      .post('/api/resident/email/verify-otp')
      .send({ email: 'warga@example.com', otp: otpRes.body.dev_otp });

    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body).toMatchObject({ email: 'warga@example.com' });
    expect(sessionRes.body.token).toEqual(expect.any(String));

    await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000001',
        letterType: 'L1',
        status: 'SUBMITTED',
        applicantName: 'Warga',
        applicantEmail: 'warga@example.com',
        applicantPhone: '081234567890',
        subjectData: {},
      },
    });
    await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000002',
        letterType: 'L1',
        status: 'SUBMITTED',
        applicantName: 'Lain',
        applicantEmail: 'lain@example.com',
        subjectData: {},
      },
    });
    await testPrisma.feedback.create({
      data: {
        referenceCode: 'LPR-ABCDE',
        name: 'Warga',
        email: 'warga@example.com',
        body: 'Lampu jalan mati.',
      },
    });

    const auth = `Bearer ${sessionRes.body.token}`;
    const requestsRes = await request(app)
      .get('/api/resident/requests')
      .set('Authorization', auth);
    const feedbackRes = await request(app)
      .get('/api/resident/feedback')
      .set('Authorization', auth);

    expect(requestsRes.status).toBe(200);
    expect(requestsRes.body.items).toHaveLength(1);
    expect(requestsRes.body.items[0]).toMatchObject({
      reference_code: 'GB-2026-000001',
      status_label: 'Menunggu diproses',
    });

    expect(feedbackRes.status).toBe(200);
    expect(feedbackRes.body.items).toHaveLength(1);
    expect(feedbackRes.body.items[0]).toMatchObject({
      reference_code: 'LPR-ABCDE',
      body: 'Lampu jalan mati.',
    });
  });

  it('rejects resident history without a verified email token', async () => {
    const res = await request(app).get('/api/resident/requests');
    expect(res.status).toBe(401);
  });
});
