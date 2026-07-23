import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { AdminRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../lib/errors';
import { EmailService } from '../../services/email.service';
import type { AdminUserPublicType } from './schemas';
import type { UpdateProfileBodyType } from './schemas';

export type TokenPayload = { sub: string; role: AdminRole };
export type ForgotPasswordResult = { previewUrl?: string };

// Keep in sync with the Prisma AdminRole enum. Validated explicitly rather than
// trusted via `as AdminRole`, since the JWT payload is attacker-controlled input
// once it crosses the trust boundary (a malformed/forged token should fail
// closed as 401, not propagate an unvalidated role string).
const AdminRoleSchema = z.enum(['admin', 'operator']);
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

// Valid bcrypt hash (60 chars, correctly formed) used to equalize bcrypt.compare
// timing when no user is found, so response time doesn't leak whether an email
// exists. It is bcrypt.hashSync() of a random throwaway string that no real
// password will ever match. Kept as a stable literal (not regenerated at boot)
// so startup stays cheap and behavior stays deterministic.
const DUMMY_PASSWORD_HASH = '$2a$10$7oMekg9ulYMedEtDQNHgh.UEWsjhqVqT9chuQTRPO/LjSMrszKe0K';

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '12h' });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') throw new Error('unexpected token shape');
    const role = AdminRoleSchema.parse(decoded.role);
    return { sub: String(decoded.sub), role };
  } catch {
    throw ApiError.unauthorized('Token tidak valid atau sudah kedaluwarsa');
  }
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AdminUserPublicType> {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) throw ApiError.unauthorized('Email atau kata sandi salah');
  if (!user.active) throw ApiError.forbidden('Akun pengguna tidak aktif');

  return toPublicUser(user);
}

export async function findUserById(id: string): Promise<AdminUserPublicType> {
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) throw ApiError.unauthorized('Pengguna tidak ditemukan');
  if (!user.active) throw ApiError.forbidden('Akun pengguna tidak aktif');
  return toPublicUser(user);
}

export async function updateOwnProfile(
  id: string,
  input: UpdateProfileBodyType,
): Promise<AdminUserPublicType> {
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) throw ApiError.unauthorized('Pengguna tidak ditemukan');
  if (!user.active) throw ApiError.forbidden('Akun pengguna tidak aktif');

  const data: { name?: string; passwordHash?: string } = {};
  if (input.name !== undefined) data.name = input.name.trim();

  if (input.password) {
    const ok = await bcrypt.compare(input.current_password ?? '', user.passwordHash);
    if (!ok) {
      throw ApiError.validation('Kata sandi saat ini tidak sesuai', {
        current_password: 'Kata sandi saat ini tidak sesuai',
      });
    }
    data.passwordHash = await bcrypt.hash(input.password, 10);
  }

  const updated = await prisma.adminUser.update({ where: { id }, data });
  return toPublicUser(updated);
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResult> {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    return {};
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  const resetUrl = buildPasswordResetUrl(token);

  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiry: expiresAt,
    },
  });

  const emailHtml = renderPasswordResetEmail({
    adminName: user.name,
    resetUrl,
    expiresAt,
  });

  try {
    await EmailService.send({
      to: user.email,
      subject: 'Reset Kata Sandi Gampong Blang Digital',
      html: emailHtml,
    });
    return {};
  } catch (error) {
    if (env.NODE_ENV !== 'production') {
      console.info(`Password reset link for ${user.email}: ${resetUrl}`);
      return { previewUrl: resetUrl };
    }

    throw error;
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const tokenHash = hashPasswordResetToken(token);
  const user = await prisma.adminUser.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw ApiError.validation('Tautan reset kata sandi tidak valid atau sudah kedaluwarsa', {
      token: 'Tautan reset tidak valid atau sudah kedaluwarsa',
    });
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordResetTokenHash: null,
      passwordResetTokenExpiry: null,
    },
  });
}

function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function buildPasswordResetUrl(token: string) {
  const url = new URL('/reset-password', env.DASHBOARD_BASE_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

function renderPasswordResetEmail(input: {
  adminName: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  const expiresAtLabel = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(input.expiresAt);

  return `
    <div style="font-family:Arial,sans-serif;background:#f4f7f5;padding:32px;color:#132018">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dce7df;border-radius:16px;overflow:hidden">
        <div style="background:#0e3b2a;padding:28px 32px;color:#ffffff">
          <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#e0a82e;margin-bottom:10px">
            Gampong Blang Digital
          </div>
          <h1 style="margin:0;font-size:28px;line-height:1.2">Reset Kata Sandi Dashboard</h1>
        </div>
        <div style="padding:32px">
          <p style="margin:0 0 16px">Yth. ${escapeHtml(input.adminName)},</p>
          <p style="margin:0 0 16px;line-height:1.7">
            Kami menerima permintaan untuk mengatur ulang kata sandi akun dashboard Anda.
            Gunakan tombol berikut untuk membuat kata sandi baru.
          </p>
          <p style="margin:24px 0">
            <a
              href="${input.resetUrl}"
              style="display:inline-block;background:#124a34;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:700"
            >
              Atur Ulang Kata Sandi
            </a>
          </p>
          <p style="margin:0 0 16px;line-height:1.7">
            Tautan ini berlaku sampai <strong>${escapeHtml(expiresAtLabel)} WIB</strong>.
            Jika Anda tidak meminta reset kata sandi, abaikan email ini dan akun Anda tetap aman.
          </p>
          <p style="margin:0;color:#5f6c63;line-height:1.7">
            Apabila tombol di atas tidak berfungsi, salin tautan berikut ke browser Anda:
            <br />
            <a href="${input.resetUrl}" style="color:#176b4b">${input.resetUrl}</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
}): AdminUserPublicType {
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active };
}
