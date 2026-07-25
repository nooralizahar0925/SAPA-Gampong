import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import {
  setEmailProviderConfigsForTests,
  setEmailTransportForTests,
} from '../src/services/email.service';
import { storageRoot } from '../src/services/storage.service';
import {
  setPushTransportForTests,
  type PushPayload,
  type PushTransport,
} from '../src/modules/notifications/service';
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
  setEmailTransportForTests(null);
  setEmailProviderConfigsForTests(null);
});

async function login() {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@gampongblang.id',
    password: 'admin123',
  });

  return res.body.token as string;
}

function stubEmailTransport() {
  const sendMail = vi.fn(async () => ({ messageId: 'msg-push-test' }));
  setEmailTransportForTests({ sendMail });
  setEmailProviderConfigsForTests({
    mailersend: {
      fromEmail: 'no-reply@gampongblang.id',
      fromName: 'Administrasi Gampong Blang',
      apiKey: 'mailersend-test-key',
    },
  });
  return sendMail;
}

async function createStoredPdf(storagePath: string) {
  const content = Buffer.from('%PDF-1.4\n%%EOF');
  const absolutePath = join(storageRoot, storagePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);

  return testPrisma.file.create({
    data: {
      storagePath,
      mime: 'application/pdf',
      size: content.length,
    },
  });
}

describe('notification push wiring', () => {
  it('registers and unregisters a resident device token', async () => {
    const created = await request(app)
      .post('/api/notifications/device-tokens')
      .send({ token: 'fcm-token-1', platform: 'android' });

    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({
      token: 'fcm-token-1',
      platform: 'android',
      active: true,
      letter_status_notifications: true,
      feedback_status_notifications: true,
      announcement_notifications: false,
    });

    const removed = await request(app)
      .delete('/api/notifications/device-tokens')
      .send({ token: 'fcm-token-1', platform: 'android' });

    expect(removed.status).toBe(200);
    expect(removed.body).toEqual({ active: false });

    const saved = await testPrisma.deviceToken.findUnique({
      where: { token: 'fcm-token-1' },
    });
    expect(saved?.active).toBe(false);
  });

  it('updates device notification preferences', async () => {
    const updated = await request(app)
      .patch('/api/notifications/device-tokens/preferences')
      .send({
        token: 'fcm-token-preferences',
        platform: 'android',
        letter_status_notifications: false,
        feedback_status_notifications: false,
        announcement_notifications: true,
      });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      token: 'fcm-token-preferences',
      platform: 'android',
      active: true,
      letter_status_notifications: false,
      feedback_status_notifications: false,
      announcement_notifications: true,
    });

    const saved = await testPrisma.deviceToken.findUnique({
      where: { token: 'fcm-token-preferences' },
    });
    expect(saved).toMatchObject({
      letterStatusNotifications: false,
      feedbackStatusNotifications: false,
      announcementNotifications: true,
    });
  });

  it('links a public request to the submitted push token', async () => {
    const uploadedFile = await testPrisma.file.create({
      data: {
        storagePath: 'test/ktp.png',
        mime: 'image/png',
        size: 1234,
      },
    });

    const createRes = await request(app).post('/api/requests').send({
      letter_type: 'L1',
      applicant_name: 'Budi',
      applicant_email: 'budi@mail.com',
      applicant_phone: '081234567890',
      subject_data: {
        nama: 'Budi',
        ttl_tempat: 'Calang',
        ttl_tanggal: '1999-10-22',
        nik: '1607010101010001',
        jenis_kelamin: 'Laki-laki',
        agama: 'Islam',
        status_perkawinan: 'Belum Kawin',
        pekerjaan: 'Pelajar',
        alamat: 'Dusun Kuini, Gampong Blang',
        dusun: 'Kuini',
        gampong: 'Blang',
        kecamatan: 'Krueng Sabee',
        kabupaten: 'Aceh Jaya',
      },
      attachments: [
        { file_id: uploadedFile.id, kind: 'KTP' },
        { file_id: uploadedFile.id, kind: 'KK' },
      ],
      push_token: 'fcm-token-request',
      push_platform: 'ios',
    });

    expect(createRes.status).toBe(201);

    const saved = await testPrisma.requestPushToken.findFirst({
      where: { requestId: createRes.body.id },
      include: { deviceToken: true },
    });

    expect(saved?.deviceToken).toMatchObject({
      token: 'fcm-token-request',
      platform: 'ios',
      active: true,
    });
  });

  it('sends resident push updates for request process status changes', async () => {
    const sentPushes: Array<{ tokens: string[]; payload: PushPayload }> = [];
    const restorePush = setPushTransportForTests({
      async sendToTokens(tokens, payload) {
        sentPushes.push({ tokens, payload });
        return {
          successCount: tokens.length,
          failureCount: 0,
          invalidTokens: [],
        };
      },
    } satisfies PushTransport);

    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-001850',
        letterType: 'L1',
        status: 'SUBMITTED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
        subjectData: { nama: 'Budi', nik: '1607010101010001' },
      },
    });
    const deviceToken = await testPrisma.deviceToken.create({
      data: { token: 'resident-process-token', platform: 'android' },
    });
    await testPrisma.requestPushToken.create({
      data: { requestId: created.id, deviceTokenId: deviceToken.id },
    });

    const token = await login();
    const inReview = await request(app)
      .patch(`/api/requests/${created.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'in_review' });
    const approved = await request(app)
      .patch(`/api/requests/${created.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    restorePush();

    expect(inReview.status).toBe(200);
    expect(approved.status).toBe(200);
    expect(sentPushes).toHaveLength(2);
    expect(sentPushes.map((item) => item.payload.event)).toEqual(['IN_REVIEW', 'APPROVED']);
    expect(sentPushes[0]).toMatchObject({
      tokens: ['resident-process-token'],
      payload: {
        title: 'Permohonan sedang ditinjau',
        referenceCode: 'GB-2026-001850',
        requestId: created.id,
      },
    });
    expect(sentPushes[1].payload).toMatchObject({
      title: 'Permohonan surat disetujui',
      referenceCode: 'GB-2026-001850',
      requestId: created.id,
    });
  });

  it('does not send request pushes to tokens with letter notifications disabled', async () => {
    const sentPushes: Array<{ tokens: string[]; payload: PushPayload }> = [];
    const restorePush = setPushTransportForTests({
      async sendToTokens(tokens, payload) {
        sentPushes.push({ tokens, payload });
        return {
          successCount: tokens.length,
          failureCount: 0,
          invalidTokens: [],
        };
      },
    } satisfies PushTransport);

    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-001851',
        letterType: 'L1',
        status: 'SUBMITTED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
        subjectData: { nama: 'Budi', nik: '1607010101010001' },
      },
    });
    const enabledToken = await testPrisma.deviceToken.create({
      data: { token: 'resident-enabled-token', platform: 'android' },
    });
    const mutedToken = await testPrisma.deviceToken.create({
      data: {
        token: 'resident-muted-token',
        platform: 'android',
        letterStatusNotifications: false,
      },
    });
    await testPrisma.requestPushToken.createMany({
      data: [
        { requestId: created.id, deviceTokenId: enabledToken.id },
        { requestId: created.id, deviceTokenId: mutedToken.id },
      ],
    });

    const token = await login();
    const res = await request(app)
      .patch(`/api/requests/${created.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'in_review' });

    restorePush();

    expect(res.status).toBe(200);
    expect(sentPushes).toHaveLength(1);
    expect(sentPushes[0].tokens).toEqual(['resident-enabled-token']);
  });

  it('sends resident email and push when a generated letter is sent', async () => {
    const sendMail = stubEmailTransport();
    const sentPushes: Array<{ tokens: string[]; payload: PushPayload }> = [];
    const restorePush = setPushTransportForTests({
      async sendToTokens(tokens, payload) {
        sentPushes.push({ tokens, payload });
        return {
          successCount: 1,
          failureCount: 1,
          invalidTokens: ['stale-token'],
        };
      },
    } satisfies PushTransport);

    const pdfFile = await createStoredPdf('tests/generated-letter-push.pdf');
    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-001900',
        letterType: 'L1',
        status: 'GENERATED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
        subjectData: { nama: 'Budi', nik: '1607010101010001' },
        nomorSurat: '400.12.2.1/90/2026',
        verificationToken: 'push1234567890abcdef1234567890abcd',
        generatedPdfId: pdfFile.id,
      },
    });
    const activeToken = await testPrisma.deviceToken.create({
      data: { token: 'active-token', platform: 'android' },
    });
    const staleToken = await testPrisma.deviceToken.create({
      data: { token: 'stale-token', platform: 'android' },
    });
    await testPrisma.requestPushToken.createMany({
      data: [
        { requestId: created.id, deviceTokenId: activeToken.id },
        { requestId: created.id, deviceTokenId: staleToken.id },
      ],
    });

    const token = await login();
    const res = await request(app)
      .post(`/api/requests/${created.id}/send`)
      .set('Authorization', `Bearer ${token}`);

    restorePush();

    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sentPushes).toHaveLength(1);
    expect(sentPushes[0].tokens).toEqual(['active-token', 'stale-token']);
    expect(sentPushes[0].payload).toMatchObject({
      event: 'SENT',
      title: 'Surat Anda sudah dikirim',
      referenceCode: 'GB-2026-001900',
      requestId: created.id,
    });

    const reloadedStale = await testPrisma.deviceToken.findUnique({
      where: { token: 'stale-token' },
    });
    expect(reloadedStale?.active).toBe(false);
  });
});
