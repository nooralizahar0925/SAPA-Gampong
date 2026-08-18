import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { Prisma, type AttachmentKind } from '@prisma/client';
import { env } from '../../config/env';
import { ApiError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { EmailService } from '../../services/email.service';
import { signedUrl } from '../../services/storage.service';
import { getLetterTemplateDefinition } from '../letters/service';
import {
  notifyRequestStatusChanged,
  registerDeviceToken,
} from '../notifications/service';
import type {
  ResidentDeviceLinkBodyType,
  ResidentEmailBodyType,
  ResidentRequestCorrectionBodyType,
  ResidentVerifyOtpBodyType,
} from './schemas';

const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Diajukan',
  IN_REVIEW: 'Sedang Ditinjau',
  NEEDS_INFO: 'Perlu Perbaikan',
  APPROVED: 'Disetujui',
  GENERATED: 'Surat Dibuat',
  SENT: 'Terkirim',
  REJECTED: 'Ditolak',
  CANCELED: 'Dibatalkan',
};

export async function requestResidentOtp(input: ResidentEmailBodyType) {
  const email = normalizeEmail(input.email);
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.residentEmailSession.upsert({
    where: { email },
    create: {
      email,
      otpHash: hashSecret(otp),
      otpExpiresAt: expiresAt,
      otpAttempts: 0,
      sessionTokenHash: null,
      sessionExpiresAt: null,
      verifiedAt: null,
    },
    update: {
      otpHash: hashSecret(otp),
      otpExpiresAt: expiresAt,
      otpAttempts: 0,
    },
  });

  try {
    await EmailService.send({
      to: email,
      subject: 'Kode verifikasi Gampong Blang Digital',
      html: renderOtpEmail(otp),
    });
  } catch (error) {
    if (env.NODE_ENV === 'production') {
      throw new ApiError('SERVER_ERROR', 'Kode OTP belum bisa dikirim ke email.');
    }
    console.info(`Resident OTP for ${email}: ${otp}`);
  }

  return {
    message: 'Kode OTP telah dikirim ke email.',
    expires_at: expiresAt.toISOString(),
    ...(env.NODE_ENV === 'production' ? {} : { dev_otp: otp }),
  };
}

export async function verifyResidentOtp(input: ResidentVerifyOtpBodyType) {
  const email = normalizeEmail(input.email);
  const found = await prisma.residentEmailSession.findUnique({ where: { email } });

  if (!found?.otpHash || !found.otpExpiresAt || found.otpExpiresAt.getTime() < Date.now()) {
    throw ApiError.validation('Kode OTP tidak valid atau sudah kedaluwarsa', {
      otp: 'Minta kode baru',
    });
  }

  if (found.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw ApiError.forbidden('Terlalu banyak percobaan OTP. Minta kode baru.');
  }

  if (!safeEqual(found.otpHash, hashSecret(input.otp))) {
    await prisma.residentEmailSession.update({
      where: { email },
      data: { otpAttempts: { increment: 1 } },
    });
    throw ApiError.validation('Kode OTP tidak valid', { otp: 'Kode salah' });
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.residentEmailSession.update({
    where: { email },
    data: {
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      sessionTokenHash: hashSecret(token),
      sessionExpiresAt: expiresAt,
      verifiedAt: new Date(),
    },
  });

  return {
    email,
    token,
    expires_at: expiresAt.toISOString(),
  };
}

export async function requireResidentSession(req: Request) {
  const token = bearerToken(req);
  if (!token) throw ApiError.unauthorized('Verifikasi email diperlukan');

  const found = await prisma.residentEmailSession.findFirst({
    where: {
      sessionTokenHash: hashSecret(token),
      sessionExpiresAt: { gt: new Date() },
      verifiedAt: { not: null },
    },
  });

  if (!found?.verifiedAt || !found.sessionExpiresAt) {
    throw ApiError.unauthorized('Sesi email tidak valid atau sudah kedaluwarsa');
  }

  return {
    email: found.email,
    verified_at: found.verifiedAt.toISOString(),
    expires_at: found.sessionExpiresAt.toISOString(),
  };
}

export async function getResidentMe(req: Request) {
  return requireResidentSession(req);
}

export async function linkResidentDevice(req: Request, input: ResidentDeviceLinkBodyType) {
  const resident = await requireResidentSession(req);
  const deviceToken = await registerDeviceToken(input);
  const [requests, feedback] = await Promise.all([
    prisma.letterRequest.findMany({
      where: { applicantEmail: resident.email },
      select: { id: true },
    }),
    prisma.feedback.findMany({
      where: { email: resident.email },
      select: { id: true },
    }),
  ]);

  await prisma.$transaction([
    prisma.requestPushToken.createMany({
      data: requests.map((item) => ({
        requestId: item.id,
        deviceTokenId: deviceToken.id,
      })),
      skipDuplicates: true,
    }),
    prisma.feedbackPushToken.createMany({
      data: feedback.map((item) => ({
        feedbackId: item.id,
        deviceTokenId: deviceToken.id,
      })),
      skipDuplicates: true,
    }),
  ]);

  return {
    linked_requests: requests.length,
    linked_feedback: feedback.length,
  };
}

export async function listResidentRequests(req: Request) {
  const resident = await requireResidentSession(req);
  const items = await prisma.letterRequest.findMany({
    where: { applicantEmail: resident.email },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
    include: { attachments: { include: { file: true } } },
  });

  return {
    items: items.map(serializeResidentRequestItem),
  };
}

export async function cancelResidentRequest(req: Request, id: string) {
  const resident = await requireResidentSession(req);
  const found = await prisma.letterRequest.findUnique({
    where: { id },
    include: { histories: { orderBy: { createdAt: 'asc' } } },
  });

  if (!found || found.applicantEmail !== resident.email) {
    throw ApiError.notFound('Permohonan tidak ditemukan');
  }

  if (found.status !== 'SUBMITTED') {
    throw ApiError.conflict('Permohonan tidak dapat dibatalkan setelah ditinjau petugas');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.letterRequest.update({
      where: { id },
      data: {
        status: 'CANCELED',
        decisionReason: 'Dibatalkan oleh warga',
      },
    });

    await tx.requestStatusHistory.create({
      data: {
        requestId: found.id,
        fromStatus: found.status,
        toStatus: 'CANCELED',
        action: 'cancel',
        reason: 'Dibatalkan oleh warga',
        actorName: 'Warga',
      },
    });

    return request;
  });

  await notifyRequestStatusChanged({
    requestId: found.id,
    referenceCode: found.referenceCode,
    letterType: found.letterType,
    status: 'CANCELED',
  });

  return serializeResidentRequestItem(updated);
}

export async function resubmitResidentRequest(
  req: Request,
  id: string,
  input: ResidentRequestCorrectionBodyType,
) {
  const resident = await requireResidentSession(req);
  const found = await prisma.letterRequest.findUnique({
    where: { id },
    include: { attachments: { include: { file: true } } },
  });

  if (!found || found.applicantEmail !== resident.email) {
    throw ApiError.notFound('Permohonan tidak ditemukan');
  }

  if (found.status !== 'NEEDS_INFO') {
    throw ApiError.conflict('Perbaikan data hanya tersedia saat kantor meminta informasi tambahan');
  }

  const definition = await getLetterTemplateDefinition(found.letterType, true);
  if (!definition) {
    throw ApiError.validation('Data yang dikirim tidak valid', {
      letter_type: 'Jenis surat tidak dikenal',
    });
  }

  await validateResidentCorrectionAttachments(
    definition.required_attachments,
    input.attachments,
  );

  const subjectData = input.subject_data as Prisma.InputJsonObject;
  const attachmentRows = input.attachments.map((attachment) => ({
    fileId: attachment.file_id,
    kind: attachment.kind as AttachmentKind,
  }));

  const updated = await prisma.$transaction(async (tx) => {
    await tx.requestAttachment.deleteMany({ where: { requestId: found.id } });
    const request = await tx.letterRequest.update({
      where: { id: found.id },
      data: {
        status: 'IN_REVIEW',
        applicantName: input.applicant_name,
        applicantPhone: input.applicant_phone?.trim() || null,
        keperluan: input.keperluan?.trim() || null,
        subjectData,
        decisionReason: null,
        attachments: {
          create: attachmentRows,
        },
      },
      include: { attachments: { include: { file: true } } },
    });

    await tx.requestStatusHistory.create({
      data: {
        requestId: found.id,
        fromStatus: found.status,
        toStatus: 'IN_REVIEW',
        action: 'resubmit',
        actorName: 'Warga',
        subjectData,
      },
    });

    return request;
  });

  await notifyRequestStatusChanged({
    requestId: found.id,
    referenceCode: found.referenceCode,
    letterType: found.letterType,
    status: 'IN_REVIEW',
  });

  return serializeResidentRequestItem(updated);
}

export async function listResidentFeedback(req: Request) {
  const resident = await requireResidentSession(req);
  const items = await prisma.feedback.findMany({
    where: { email: resident.email },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
    include: { attachments: { include: { file: true } } },
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      reference_code: item.referenceCode,
      name: item.name,
      email: item.email,
      phone: item.phone,
      body: item.body,
      status: item.status,
      reply: item.reply,
      replied_at: item.repliedAt?.toISOString() ?? null,
      attachments: item.attachments.map((attachment) => ({
        file_id: attachment.fileId,
        kind: attachment.kind,
        mime: attachment.file.mime,
        size: attachment.file.size,
        original_name: attachment.file.originalName,
        url: signedUrl(attachment.file.id),
      })),
      created_at: item.createdAt.toISOString(),
    })),
  };
}

function serializeResidentRequestItem(item: {
  id: string;
  referenceCode: string;
  letterType: string;
  status: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string | null;
  keperluan: string | null;
  subjectData: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  generatedPdfId: string | null;
  decisionReason: string | null;
  attachments?: Array<{
    kind: AttachmentKind;
    fileId: string;
    file: { id: string; mime: string; size: number };
  }>;
}) {
  return {
    id: item.id,
    reference_code: item.referenceCode,
    letter_type: item.letterType,
    status: item.status,
    status_label: STATUS_LABELS[item.status] ?? item.status,
    applicant_name: item.applicantName,
    applicant_email: item.applicantEmail,
    applicant_phone: item.applicantPhone,
    keperluan: item.keperluan,
    subject_data: item.subjectData,
    attachments: (item.attachments ?? []).map((attachment) => ({
      file_id: attachment.fileId,
      kind: attachment.kind,
      mime: attachment.file.mime,
      size: attachment.file.size,
      url: signedUrl(attachment.file.id),
    })),
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString(),
    generated_pdf_url: item.generatedPdfId ? signedUrl(item.generatedPdfId) : null,
    decision_reason: item.decisionReason,
  };
}

async function validateResidentCorrectionAttachments(
  requiredKinds: readonly string[],
  attachments: ResidentRequestCorrectionBodyType['attachments'],
) {
  const kinds = new Set(attachments.map((item) => item.kind));
  const fields: Record<string, string> = {};

  for (const kind of requiredKinds) {
    if (!kinds.has(kind as AttachmentKind)) {
      fields[`attachments.${kind}`] = `Attachment ${kind} is required`;
    }
  }

  const uniqueFileIds = [...new Set(attachments.map((item) => item.file_id))];
  if (uniqueFileIds.length > 0) {
    const files = await prisma.file.findMany({
      where: { id: { in: uniqueFileIds } },
      select: { id: true },
    });
    const existingIds = new Set(files.map((file) => file.id));

    attachments.forEach((attachment, index) => {
      if (!existingIds.has(attachment.file_id)) {
        fields[`attachments.${index}.file_id`] = 'Uploaded file was not found';
      }
    });
  }

  if (Object.keys(fields).length > 0) {
    throw ApiError.validation('Data yang dikirim tidak valid', fields);
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashSecret(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function bearerToken(req: Request) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

function renderOtpEmail(otp: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#17211d;">
      <h2 style="margin:0 0 12px;">Kode verifikasi email</h2>
      <p style="line-height:1.6;margin:0 0 18px;">
        Masukkan kode berikut di aplikasi Gampong Blang Digital untuk menyimpan email warga.
      </p>
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#eef7f1;border-radius:12px;padding:18px 22px;text-align:center;color:#0f5132;">
        ${otp}
      </div>
      <p style="font-size:13px;color:#5d6962;margin:18px 0 0;">
        Kode berlaku selama 10 menit. Abaikan email ini jika Anda tidak meminta kode.
      </p>
    </div>
  `;
}
