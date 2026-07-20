import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AdminRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../lib/errors';
import type { AdminUserPublicType } from './schemas';

export type TokenPayload = { sub: string; role: AdminRole };

// Valid bcrypt hash (60 chars, correctly formed) used to equalize bcrypt.compare
// timing when no user is found, so response time doesn't leak whether an email
// exists. It is bcrypt.hashSync() of a random throwaway string that no real
// password will ever match. Kept as a stable literal (not regenerated at boot)
// so startup stays cheap and behavior stays deterministic.
const DUMMY_PASSWORD_HASH = '$2a$10$7oMekg9ulYMedEtDQNHgh.UEWsjhqVqT9chuQTRPO/LjSMrszKe0K';

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '12h' });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') throw new Error('unexpected token shape');
    return { sub: String(decoded.sub), role: decoded.role as AdminRole };
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

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function findUserById(id: string): Promise<AdminUserPublicType> {
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) throw ApiError.unauthorized('Pengguna tidak ditemukan');
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
