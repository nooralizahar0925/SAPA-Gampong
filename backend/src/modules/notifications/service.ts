import type { FeedbackStatus, PushPlatform, RequestStatus } from '@prisma/client';
import type { ServiceAccount } from 'firebase-admin';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getLetterTemplateDefinition } from '../letters/service';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { EmailService } from '../../services/email.service';
import {
  buildEmailLogoAttachment,
  renderFeedbackReplyEmailHtml,
  renderRejectedEmailHtml,
  renderSentEmailHtml,
} from './templates';
import type { DeviceTokenBodyType, DeviceTokenPreferencesBodyType } from './schemas';

export type ResidentPushEvent = RequestStatus | `FEEDBACK_${Uppercase<FeedbackStatus>}`;

export type PushPayload = {
  event: ResidentPushEvent;
  title: string;
  body: string;
  referenceCode: string;
  requestId: string;
};

export type PushSendResult = {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
};

export type PushTransport = {
  sendToTokens(tokens: string[], payload: PushPayload): Promise<PushSendResult>;
};

class NoopPushTransport implements PushTransport {
  async sendToTokens(tokens: string[]): Promise<PushSendResult> {
    return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
  }
}

class FirebasePushTransport implements PushTransport {
  async sendToTokens(tokens: string[], payload: PushPayload): Promise<PushSendResult> {
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    ensureFirebaseApp();

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    for (let start = 0; start < tokens.length; start += 500) {
      const batch = tokens.slice(start, start + 500);
      const response = await getMessaging().sendEachForMulticast({
        tokens: batch,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          event: payload.event,
          reference_code: payload.referenceCode,
          request_id: payload.requestId,
        },
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((item, index) => {
        if (!item.success && isInvalidFirebaseToken(item.error?.code)) {
          invalidTokens.push(batch[index]);
        }
      });
    }

    return { successCount, failureCount, invalidTokens };
  }
}

let pushTransport: PushTransport = createDefaultPushTransport();

export function setPushTransportForTests(transport: PushTransport) {
  const previous = pushTransport;
  pushTransport = transport;
  return () => {
    pushTransport = previous;
  };
}

export async function registerDeviceToken(input: DeviceTokenBodyType) {
  const token = input.token.trim();
  const saved = await prisma.deviceToken.upsert({
    where: { token },
    create: {
      token,
      platform: input.platform as PushPlatform,
      active: true,
    },
    update: {
      platform: input.platform as PushPlatform,
      active: true,
    },
  });

  return serializeDeviceToken(saved);
}

export async function unregisterDeviceToken(token: string) {
  await prisma.deviceToken.updateMany({
    where: { token: token.trim() },
    data: { active: false },
  });
}

export async function updateDeviceTokenPreferences(input: DeviceTokenPreferencesBodyType) {
  const token = input.token.trim();
  const saved = await prisma.deviceToken.upsert({
    where: { token },
    create: {
      token,
      platform: input.platform as PushPlatform,
      active: true,
      ...(input.letter_status_notifications !== undefined
        ? { letterStatusNotifications: input.letter_status_notifications }
        : {}),
      ...(input.feedback_status_notifications !== undefined
        ? { feedbackStatusNotifications: input.feedback_status_notifications }
        : {}),
      ...(input.announcement_notifications !== undefined
        ? { announcementNotifications: input.announcement_notifications }
        : {}),
    },
    update: {
      platform: input.platform as PushPlatform,
      active: true,
      ...(input.letter_status_notifications !== undefined
        ? { letterStatusNotifications: input.letter_status_notifications }
        : {}),
      ...(input.feedback_status_notifications !== undefined
        ? { feedbackStatusNotifications: input.feedback_status_notifications }
        : {}),
      ...(input.announcement_notifications !== undefined
        ? { announcementNotifications: input.announcement_notifications }
        : {}),
    },
  });

  return serializeDeviceToken(saved);
}

export async function linkDeviceTokenToRequest(input: {
  requestId: string;
  token: string;
  platform: PushPlatform;
}) {
  const deviceToken = await registerDeviceToken({
    token: input.token,
    platform: input.platform,
  });

  await prisma.requestPushToken.upsert({
    where: {
      requestId_deviceTokenId: {
        requestId: input.requestId,
        deviceTokenId: deviceToken.id,
      },
    },
    create: {
      requestId: input.requestId,
      deviceTokenId: deviceToken.id,
    },
    update: {},
  });
}

export async function linkDeviceTokenToFeedback(input: {
  feedbackId: string;
  token: string;
  platform: PushPlatform;
}) {
  const deviceToken = await registerDeviceToken({
    token: input.token,
    platform: input.platform,
  });

  await prisma.feedbackPushToken.upsert({
    where: {
      feedbackId_deviceTokenId: {
        feedbackId: input.feedbackId,
        deviceTokenId: deviceToken.id,
      },
    },
    create: {
      feedbackId: input.feedbackId,
      deviceTokenId: deviceToken.id,
    },
    update: {},
  });
}

const STATUS_PUSH_COPY: Record<
  RequestStatus,
  { title: string; body: (letterName: string, referenceCode: string) => string }
> = {
  SUBMITTED: {
    title: 'Permohonan surat diterima',
    body: (letterName, referenceCode) =>
      `${letterName} (${referenceCode}) sudah tercatat dan menunggu diproses.`,
  },
  IN_REVIEW: {
    title: 'Permohonan sedang ditinjau',
    body: (letterName, referenceCode) =>
      `${letterName} (${referenceCode}) sedang ditinjau petugas.`,
  },
  NEEDS_INFO: {
    title: 'Permohonan perlu dilengkapi',
    body: (letterName, referenceCode) =>
      `${letterName} (${referenceCode}) membutuhkan informasi tambahan.`,
  },
  APPROVED: {
    title: 'Permohonan surat disetujui',
    body: (letterName, referenceCode) =>
      `${letterName} (${referenceCode}) sudah disetujui dan akan dibuatkan surat.`,
  },
  GENERATED: {
    title: 'Surat selesai dibuat',
    body: (letterName, referenceCode) =>
      `${letterName} (${referenceCode}) sudah dibuat dan menunggu pengiriman.`,
  },
  SENT: {
    title: 'Surat Anda sudah dikirim',
    body: (letterName, referenceCode) =>
      `${letterName} (${referenceCode}) sudah dikirim ke email Anda.`,
  },
  REJECTED: {
    title: 'Permohonan surat ditolak',
    body: (letterName, referenceCode) =>
      `${letterName} (${referenceCode}) ditolak. Silakan cek alasan penolakan.`,
  },
  CANCELED: {
    title: 'Permohonan dibatalkan',
    body: (letterName, referenceCode) =>
      `${letterName} (${referenceCode}) telah dibatalkan.`,
  },
};

export async function notifyRequestStatusChanged(input: {
  requestId: string;
  referenceCode: string;
  letterType: string;
  status: RequestStatus;
}) {
  const copy = STATUS_PUSH_COPY[input.status];
  const letterName =
    (await getLetterTemplateDefinition(input.letterType, true))?.name ?? input.letterType;

  await dispatchResidentPush(input.requestId, {
    event: input.status,
    title: copy.title,
    body: copy.body(letterName, input.referenceCode),
    referenceCode: input.referenceCode,
    requestId: input.requestId,
  });
}

const FEEDBACK_PUSH_COPY: Record<
  FeedbackStatus,
  { event: ResidentPushEvent; title: string; body: (referenceCode: string) => string }
> = {
  new: {
    event: 'FEEDBACK_NEW',
    title: 'Laporan diterima',
    body: (referenceCode) => `Laporan ${referenceCode} sudah diterima kantor keuchik.`,
  },
  read: {
    event: 'FEEDBACK_READ',
    title: 'Laporan sedang ditinjau',
    body: (referenceCode) => `Laporan ${referenceCode} sedang ditinjau petugas.`,
  },
  responded: {
    event: 'FEEDBACK_RESPONDED',
    title: 'Laporan Anda dibalas',
    body: (referenceCode) => `Laporan ${referenceCode} sudah mendapat balasan.`,
  },
};

export async function notifyFeedbackStatusChanged(input: {
  feedbackId: string;
  referenceCode: string;
  status: FeedbackStatus;
}) {
  const copy = FEEDBACK_PUSH_COPY[input.status];
  await dispatchFeedbackPush(input.feedbackId, {
    event: copy.event,
    title: copy.title,
    body: copy.body(input.referenceCode),
    referenceCode: input.referenceCode,
    requestId: input.feedbackId,
  });
}

export async function notifyRequestSent(input: {
  requestId: string;
  applicantEmail: string;
  applicantName: string;
  referenceCode: string;
  nomorSurat: string;
  letterType: string;
  pdf: Buffer;
}) {
  const letterName =
    (await getLetterTemplateDefinition(input.letterType, true))?.name ?? input.letterType;
  const [html, logoAttachment] = await Promise.all([
    renderSentEmailHtml({
      applicantName: input.applicantName,
      referenceCode: input.referenceCode,
      nomorSurat: input.nomorSurat,
      letterName,
    }),
    buildEmailLogoAttachment(),
  ]);

  await EmailService.send({
    to: input.applicantEmail,
    subject: `Surat Anda Sudah Dikirim - ${input.referenceCode}`,
    html,
    attachments: [
      {
        filename: `${input.referenceCode}.pdf`,
        content: input.pdf,
        contentType: 'application/pdf',
      },
      logoAttachment,
    ],
  });

  await notifyRequestStatusChanged({
    requestId: input.requestId,
    referenceCode: input.referenceCode,
    letterType: input.letterType,
    status: 'SENT',
  });
}

export async function notifyRequestRejected(input: {
  requestId: string;
  applicantEmail: string;
  applicantName: string;
  referenceCode: string;
  letterType: string;
  reason: string;
}) {
  const letterName =
    (await getLetterTemplateDefinition(input.letterType, true))?.name ?? input.letterType;
  const [html, logoAttachment] = await Promise.all([
    renderRejectedEmailHtml({
      applicantName: input.applicantName,
      referenceCode: input.referenceCode,
      letterName,
      reason: input.reason,
    }),
    buildEmailLogoAttachment(),
  ]);

  await EmailService.send({
    to: input.applicantEmail,
    subject: `Permohonan Surat Ditolak - ${input.referenceCode}`,
    html,
    attachments: [logoAttachment],
  });

  await notifyRequestStatusChanged({
    requestId: input.requestId,
    referenceCode: input.referenceCode,
    letterType: input.letterType,
    status: 'REJECTED',
  });
}

export async function notifyFeedbackReply(input: {
  feedbackId?: string;
  reporterEmail: string;
  reporterName: string;
  referenceCode: string;
  reportedAt: Date;
  reply: string;
}) {
  const reportedAt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(input.reportedAt);

  const [html, logoAttachment] = await Promise.all([
    renderFeedbackReplyEmailHtml({
      reporterName: input.reporterName,
      referenceCode: input.referenceCode,
      reportedAt,
      reply: input.reply,
    }),
    buildEmailLogoAttachment(),
  ]);

  await EmailService.send({
    to: input.reporterEmail,
    subject: `Balasan Laporan Anda - ${input.referenceCode}`,
    html,
    attachments: [logoAttachment],
  });

  if (input.feedbackId) {
    await notifyFeedbackStatusChanged({
      feedbackId: input.feedbackId,
      referenceCode: input.referenceCode,
      status: 'responded',
    });
  }
}

async function dispatchResidentPush(requestId: string, payload: PushPayload) {
  const rows = await prisma.requestPushToken.findMany({
    where: {
      requestId,
      deviceToken: { active: true, letterStatusNotifications: true },
    },
    select: {
      deviceToken: { select: { token: true } },
    },
  });

  const tokens = rows.map((row) => row.deviceToken.token);
  if (tokens.length === 0) return;

  const result = await pushTransport.sendToTokens(tokens, payload);
  if (result.invalidTokens.length > 0) {
    await prisma.deviceToken.updateMany({
      where: { token: { in: result.invalidTokens } },
      data: { active: false },
    });
  }
}

async function dispatchFeedbackPush(feedbackId: string, payload: PushPayload) {
  const rows = await prisma.feedbackPushToken.findMany({
    where: {
      feedbackId,
      deviceToken: { active: true, feedbackStatusNotifications: true },
    },
    select: {
      deviceToken: { select: { token: true } },
    },
  });

  const tokens = rows.map((row) => row.deviceToken.token);
  if (tokens.length === 0) return;

  const result = await pushTransport.sendToTokens(tokens, payload);
  if (result.invalidTokens.length > 0) {
    await prisma.deviceToken.updateMany({
      where: { token: { in: result.invalidTokens } },
      data: { active: false },
    });
  }
}

function createDefaultPushTransport(): PushTransport {
  if (env.NODE_ENV === 'test') return new NoopPushTransport();
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON && env.NODE_ENV !== 'production') {
    return new NoopPushTransport();
  }
  return new FirebasePushTransport();
}

function ensureFirebaseApp() {
  if (getApps().length > 0) return;

  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    initializeApp({
      credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as ServiceAccount),
    });
    return;
  }

  initializeApp({ credential: applicationDefault() });
}

function isInvalidFirebaseToken(code?: string) {
  return (
    code === 'messaging/invalid-registration-token' ||
    code === 'messaging/registration-token-not-registered'
  );
}

function serializeDeviceToken(token: {
  id: string;
  token: string;
  platform: PushPlatform;
  active: boolean;
  letterStatusNotifications: boolean;
  feedbackStatusNotifications: boolean;
  announcementNotifications: boolean;
}) {
  return {
    id: token.id,
    token: token.token,
    platform: token.platform,
    active: token.active,
    letter_status_notifications: token.letterStatusNotifications,
    feedback_status_notifications: token.feedbackStatusNotifications,
    announcement_notifications: token.announcementNotifications,
  };
}
