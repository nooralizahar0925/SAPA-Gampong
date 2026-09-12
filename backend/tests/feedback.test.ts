import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import {
  setEmailProviderConfigsForTests,
  setEmailTransportForTests,
  type EmailAttachment,
} from '../src/services/email.service';
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

type SentMessage = {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

/** Captures outgoing mail so reply tests never touch a real provider. */
function stubEmailTransport() {
  const sendMail = vi.fn(async (_message: SentMessage) => ({ messageId: 'msg-reply' }));
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

async function login() {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@gampongblang.id',
    password: 'admin123',
  });

  return res.body.token as string;
}

/** Feedback attachments need a real File row because of the fileId FK. */
async function createFile(name: string) {
  return testPrisma.file.create({
    data: {
      storagePath: `feedback/${name}.jpg`,
      originalName: `${name}.jpg`,
      mime: 'image/jpeg',
      size: 4096,
    },
  });
}

async function submitFeedback(overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/feedback')
    .send({
      name: 'Nurul Aini',
      email: 'nurul@example.com',
      phone: '081234567890',
      body: 'Lampu jalan di dusun Meunasah mati sejak seminggu lalu.',
      attachments: [],
      ...overrides,
    });
}

describe('feedback module', () => {
  describe('public submission', () => {
    it('creates feedback that appears in the admin inbox as new', async () => {
      const created = await submitFeedback();

      expect(created.status).toBe(201);
      expect(created.body.id).toBeTruthy();
      expect(created.body.status).toBe('new');
      // Quotable code the reporter can cite when following up.
      expect(created.body.reference_code).toMatch(/^LPR-[0-9A-Z]{5}$/);

      const token = await login();
      const inbox = await request(app)
        .get('/api/feedback')
        .set('Authorization', `Bearer ${token}`);

      expect(inbox.status).toBe(200);
      expect(inbox.body.total).toBe(1);
      expect(inbox.body.items[0]).toMatchObject({
        id: created.body.id,
        name: 'Nurul Aini',
        email: 'nurul@example.com',
        status: 'new',
      });
    });

    it('links a submitted feedback report to the resident push token', async () => {
      const sentPushes: Array<{ tokens: string[]; payload: PushPayload }> = [];
      const restorePush = setPushTransportForTests({
        async sendToTokens(tokens, payload) {
          sentPushes.push({ tokens, payload });
          return { successCount: tokens.length, failureCount: 0, invalidTokens: [] };
        },
      } satisfies PushTransport);

      const created = await submitFeedback({
        push_token: 'feedback-token-1',
        push_platform: 'android',
      });

      restorePush();

      expect(created.status).toBe(201);
      const saved = await testPrisma.feedbackPushToken.findFirst({
        where: { feedbackId: created.body.id },
        include: { deviceToken: true },
      });
      expect(saved?.deviceToken).toMatchObject({
        token: 'feedback-token-1',
        platform: 'android',
        active: true,
      });
      expect(sentPushes).toHaveLength(1);
      expect(sentPushes[0].payload).toMatchObject({
        event: 'FEEDBACK_NEW',
        title: 'Laporan diterima',
        referenceCode: created.body.reference_code,
      });
    });

    it('does not send feedback pushes to tokens with feedback notifications disabled', async () => {
      await testPrisma.deviceToken.create({
        data: {
          token: 'feedback-muted-token',
          platform: 'android',
          feedbackStatusNotifications: false,
        },
      });
      const sentPushes: Array<{ tokens: string[]; payload: PushPayload }> = [];
      const restorePush = setPushTransportForTests({
        async sendToTokens(tokens, payload) {
          sentPushes.push({ tokens, payload });
          return { successCount: tokens.length, failureCount: 0, invalidTokens: [] };
        },
      } satisfies PushTransport);

      const created = await submitFeedback({
        push_token: 'feedback-muted-token',
        push_platform: 'android',
      });

      restorePush();

      expect(created.status).toBe(201);
      expect(sentPushes).toHaveLength(0);
      const saved = await testPrisma.deviceToken.findUnique({
        where: { token: 'feedback-muted-token' },
      });
      expect(saved?.feedbackStatusNotifications).toBe(false);
      expect(saved?.active).toBe(true);
    });

    it('stores attachments and returns them with signed urls', async () => {
      const file = await createFile('lampu-jalan');

      const created = await submitFeedback({
        attachments: [{ file_id: file.id, kind: 'photo' }],
      });

      expect(created.status).toBe(201);

      const token = await login();
      const detail = await request(app)
        .get(`/api/feedback/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(detail.status).toBe(200);
      expect(detail.body.attachments).toHaveLength(1);
      expect(detail.body.attachments[0]).toMatchObject({
        file_id: file.id,
        kind: 'photo',
        mime: 'image/jpeg',
      });
      expect(detail.body.attachments[0].url).toContain(file.id);
    });

    it('rejects an unknown file_id instead of failing on the foreign key', async () => {
      const res = await submitFeedback({
        attachments: [{ file_id: 'does-not-exist', kind: 'photo' }],
      });

      expect(res.status).toBe(400);
      expect(res.body.error.fields).toHaveProperty('attachments.0.file_id');
    });

    it('rejects an invalid email', async () => {
      const res = await submitFeedback({ email: 'bukan-email' });

      expect(res.status).toBe(400);
      expect(res.body.error.fields).toHaveProperty('email');
    });

    it('rejects an empty body', async () => {
      const res = await submitFeedback({ body: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.fields).toHaveProperty('body');
    });
  });

  describe('admin inbox', () => {
    it('requires authentication to list', async () => {
      const res = await request(app).get('/api/feedback');
      expect(res.status).toBe(401);
    });

    it('requires authentication to update', async () => {
      const created = await submitFeedback();
      const res = await request(app)
        .patch(`/api/feedback/${created.body.id}`)
        .send({ status: 'read' });

      expect(res.status).toBe(401);
    });

    it('persists a status change to responded', async () => {
      const created = await submitFeedback();
      const token = await login();

      const patched = await request(app)
        .patch(`/api/feedback/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'responded' });

      expect(patched.status).toBe(200);
      expect(patched.body.status).toBe('responded');

      const detail = await request(app)
        .get(`/api/feedback/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(detail.body.status).toBe('responded');
    });

    it('persists an internal note without changing status', async () => {
      const created = await submitFeedback();
      const token = await login();

      const patched = await request(app)
        .patch(`/api/feedback/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ note: 'Sudah diteruskan ke kaur pembangunan.' });

      expect(patched.status).toBe(200);
      expect(patched.body.note).toBe('Sudah diteruskan ke kaur pembangunan.');
      expect(patched.body.status).toBe('new');
    });

    it('filters the inbox by status', async () => {
      const first = await submitFeedback({ name: 'Nurul Aini' });
      await submitFeedback({ name: 'Zulkifli' });
      const token = await login();

      await request(app)
        .patch(`/api/feedback/${first.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'read' });

      const res = await request(app)
        .get('/api/feedback')
        .query({ status: 'new' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].name).toBe('Zulkifli');
    });

    it('reports the unread count so the sidebar can badge it', async () => {
      await submitFeedback();
      await submitFeedback({ name: 'Zulkifli' });
      const token = await login();

      const res = await request(app)
        .get('/api/feedback')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.new_count).toBe(2);
    });

    it('returns 404 for an unknown id', async () => {
      const token = await login();
      const res = await request(app)
        .patch('/api/feedback/missing-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'read' });

      expect(res.status).toBe(404);
    });

    it('assigns each report a unique reference code', async () => {
      const first = await submitFeedback();
      const second = await submitFeedback({ name: 'Zulkifli' });

      expect(first.body.reference_code).not.toBe(second.body.reference_code);
    });
  });

  describe('replying to the reporter', () => {
    it('emails the reply and marks the report responded', async () => {
      const sendMail = stubEmailTransport();
      const created = await submitFeedback();
      const sentPushes: Array<{ tokens: string[]; payload: PushPayload }> = [];
      let statusAtPush: string | undefined;
      const restorePush = setPushTransportForTests({
        async sendToTokens(tokens, payload) {
          statusAtPush = (
            await testPrisma.feedback.findUnique({
              where: { id: created.body.id },
              select: { status: true },
            })
          )?.status;
          sentPushes.push({ tokens, payload });
          return { successCount: tokens.length, failureCount: 0, invalidTokens: [] };
        },
      } satisfies PushTransport);
      const deviceToken = await testPrisma.deviceToken.create({
        data: { token: 'feedback-reply-token', platform: 'ios' },
      });
      await testPrisma.feedbackPushToken.create({
        data: { feedbackId: created.body.id, deviceTokenId: deviceToken.id },
      });
      const token = await login();

      const res = await request(app)
        .post(`/api/feedback/${created.body.id}/reply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reply: 'Terima kasih, lokasi akan kami tinjau pekan ini.' });

      restorePush();

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('responded');
      expect(res.body.reply).toBe('Terima kasih, lokasi akan kami tinjau pekan ini.');
      expect(res.body.replied_at).toBeTruthy();
      expect(statusAtPush).toBe('responded');

      expect(sendMail).toHaveBeenCalledTimes(1);
      const message = sendMail.mock.calls[0]![0];
      expect(message.to).toBe('nurul@example.com');
      expect(message.subject).toContain(created.body.reference_code);
      expect(message.html).toContain('Terima kasih, lokasi akan kami tinjau pekan ini.');
      expect(message.html).toContain('src="cid:gampong-logo.png"');
      expect(message.attachments).toEqual([
        expect.objectContaining({
          filename: 'gampong-logo.png',
          contentType: 'image/png',
          cid: 'gampong-logo.png',
          disposition: 'inline',
        }),
      ]);
      expect(sentPushes).toHaveLength(1);
      expect(sentPushes[0]).toMatchObject({
        tokens: ['feedback-reply-token'],
        payload: {
          event: 'FEEDBACK_RESPONDED',
          title: 'Laporan Anda dibalas',
          referenceCode: created.body.reference_code,
        },
      });
    });

    it('keeps a saved reply successful when feedback push delivery fails', async () => {
      const sendMail = stubEmailTransport();
      const created = await submitFeedback();
      const restorePush = setPushTransportForTests({
        async sendToTokens() {
          throw new Error('FCM provider down');
        },
      } satisfies PushTransport);
      const deviceToken = await testPrisma.deviceToken.create({
        data: { token: 'feedback-failing-push-token', platform: 'ios' },
      });
      await testPrisma.feedbackPushToken.create({
        data: { feedbackId: created.body.id, deviceTokenId: deviceToken.id },
      });
      const token = await login();

      const res = await request(app)
        .post(`/api/feedback/${created.body.id}/reply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reply: 'Terima kasih, laporan akan kami tindak lanjuti.' });

      restorePush();

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('responded');
      expect(sendMail).toHaveBeenCalledTimes(1);
      const saved = await testPrisma.feedback.findUnique({
        where: { id: created.body.id },
      });
      expect(saved?.status).toBe('responded');
    });

    it('does not mark the report responded when the email fails', async () => {
      const sendMail = vi.fn(async () => {
        throw new Error('provider down');
      });
      setEmailTransportForTests({ sendMail });
      setEmailProviderConfigsForTests({
        mailersend: {
          fromEmail: 'no-reply@gampongblang.id',
          fromName: 'Administrasi Gampong Blang',
          apiKey: 'mailersend-test-key',
        },
      });

      const created = await submitFeedback();
      const token = await login();

      const res = await request(app)
        .post(`/api/feedback/${created.body.id}/reply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reply: 'Balasan yang gagal terkirim.' });

      expect(res.status).toBeGreaterThanOrEqual(400);

      // The warga never got the reply, so the report must still need attention.
      const detail = await request(app)
        .get(`/api/feedback/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(detail.body.status).toBe('new');
      expect(detail.body.reply).toBeNull();
    });

    it('rejects an empty reply', async () => {
      stubEmailTransport();
      const created = await submitFeedback();
      const token = await login();

      const res = await request(app)
        .post(`/api/feedback/${created.body.id}/reply`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reply: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.fields).toHaveProperty('reply');
    });

    it('requires authentication', async () => {
      const created = await submitFeedback();
      const res = await request(app)
        .post(`/api/feedback/${created.body.id}/reply`)
        .send({ reply: 'Halo' });

      expect(res.status).toBe(401);
    });
  });
});
