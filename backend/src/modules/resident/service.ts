import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { env } from '../../config/env';
import { ApiError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { EmailService } from '../../services/email.service';
import { signedUrl } from '../../services/storage.service';
import type { ResidentEmailBodyType, ResidentVerifyOtpBodyType } from './schemas';

const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Menunggu diproses',
  IN_REVIEW: 'Sedang diproses',
  NEEDS_INFO: 'Perlu informasi tambahan',
  APPROVED: 'Disetujui',
  GENERATED: 'Surat selesai dibuat',
  SENT: 'Surat telah dikirim',
  REJECTED: 'Ditolak',
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

export async function listResidentRequests(req: Request) {
  const resident = await requireResidentSession(req);
  const items = await prisma.letterRequest.findMany({
    where: { applicantEmail: resident.email },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      reference_code: item.referenceCode,
      letter_type: item.letterType,
      status: item.status,
      status_label: STATUS_LABELS[item.status] ?? item.status,
      created_at: item.createdAt.toISOString(),
      updated_at: item.updatedAt.toISOString(),
      generated_pdf_url: item.generatedPdfId ? signedUrl(item.generatedPdfId) : null,
      decision_reason: item.decisionReason,
    })),
  };
}

export async function listResidentFeedback(req: Request) {
  const resident = await requireResidentSession(req);
  const items = await prisma.feedback.findMany({
    where: { email: resident.email },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      reference_code: item.referenceCode,
      body: item.body,
      status: item.status,
      reply: item.reply,
      replied_at: item.repliedAt?.toISOString() ?? null,
      created_at: item.createdAt.toISOString(),
    })),
  };
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
