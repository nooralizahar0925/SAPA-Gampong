import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import {
  setEmailProviderConfigsForTests,
  setEmailTransportForTests,
} from '../src/services/email.service';
import { testPrisma, truncateAll } from './helpers/db';

const app = createApp();

async function verifiedResidentToken(email = 'warga@example.com') {
  const otpRes = await request(app)
    .post('/api/resident/email/request-otp')
    .send({ email });

  const sessionRes = await request(app)
    .post('/api/resident/email/verify-otp')
    .send({ email, otp: otpRes.body.dev_otp });

  return sessionRes.body.token as string;
}

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
      status_label: 'Diajukan',
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

  it('lets a resident cancel their own request before review starts', async () => {
    const token = await verifiedResidentToken();
    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000003',
        letterType: 'L1',
        status: 'SUBMITTED',
        applicantName: 'Warga',
        applicantEmail: 'warga@example.com',
        applicantPhone: '081234567890',
        subjectData: {},
      },
    });

    const res = await request(app)
      .post(`/api/resident/requests/${created.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      reference_code: 'GB-2026-000003',
      status: 'CANCELED',
      status_label: 'Dibatalkan',
      decision_reason: 'Dibatalkan oleh warga',
    });

    const reloaded = await testPrisma.letterRequest.findUnique({
      where: { id: created.id },
      include: { histories: true },
    });
    expect(reloaded?.status).toBe('CANCELED');
    expect(reloaded?.histories[0]).toMatchObject({
      fromStatus: 'SUBMITTED',
      toStatus: 'CANCELED',
      action: 'cancel',
      actorName: 'Warga',
    });
  });

  it('does not let a resident cancel a request after review starts', async () => {
    const token = await verifiedResidentToken();
    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000004',
        letterType: 'L1',
        status: 'IN_REVIEW',
        applicantName: 'Warga',
        applicantEmail: 'warga@example.com',
        applicantPhone: '081234567890',
        subjectData: {},
      },
    });

    const res = await request(app)
      .post(`/api/resident/requests/${created.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    await expect(
      testPrisma.letterRequest.findUnique({ where: { id: created.id } }),
    ).resolves.toMatchObject({ status: 'IN_REVIEW' });
  });

  it('lets a resident correct and resubmit a request that needs information', async () => {
    const token = await verifiedResidentToken();
    const oldFile = await testPrisma.file.create({
      data: {
        storagePath: 'resident/old-ktp.jpg',
        mime: 'image/jpeg',
        size: 1200,
      },
    });
    const ktpFile = await testPrisma.file.create({
      data: {
        storagePath: 'resident/new-ktp.jpg',
        mime: 'image/jpeg',
        size: 2400,
      },
    });
    const kkFile = await testPrisma.file.create({
      data: {
        storagePath: 'resident/new-kk.jpg',
        mime: 'image/jpeg',
        size: 2600,
      },
    });
    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000005',
        letterType: 'L1',
        status: 'NEEDS_INFO',
        applicantName: 'Warga Lama',
        applicantEmail: 'warga@example.com',
        applicantPhone: '081234567890',
        decisionReason: 'Perbaiki Attachment KTP dan KK',
        subjectData: { nama: 'Warga Lama' },
        attachments: {
          create: [{ kind: 'KTP', fileId: oldFile.id }],
        },
      },
    });

    const res = await request(app)
      .post(`/api/resident/requests/${created.id}/resubmit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        applicant_name: 'Warga Baru',
        applicant_phone: '08129990000',
        keperluan: 'Beasiswa',
        subject_data: { nama: 'Warga Baru', nik: '1607010101010001' },
        attachments: [
          { file_id: ktpFile.id, kind: 'KTP' },
          { file_id: kkFile.id, kind: 'KK' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      reference_code: 'GB-2026-000005',
      status: 'IN_REVIEW',
      status_label: 'Sedang Ditinjau',
      applicant_name: 'Warga Baru',
      decision_reason: null,
    });
    expect(res.body.attachments).toHaveLength(2);

    const reloaded = await testPrisma.letterRequest.findUnique({
      where: { id: created.id },
      include: { attachments: true, histories: true },
    });
    expect(reloaded).toMatchObject({
      status: 'IN_REVIEW',
      applicantName: 'Warga Baru',
      applicantPhone: '08129990000',
      decisionReason: null,
      subjectData: { nama: 'Warga Baru', nik: '1607010101010001' },
    });
    expect(reloaded?.attachments.map((item) => item.fileId).sort()).toEqual(
      [kkFile.id, ktpFile.id].sort(),
    );
    expect(reloaded?.histories[0]).toMatchObject({
      fromStatus: 'NEEDS_INFO',
      toStatus: 'IN_REVIEW',
      action: 'resubmit',
      actorName: 'Warga',
    });
  });
});
