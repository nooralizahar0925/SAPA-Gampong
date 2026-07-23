import type { NextFunction, Request, Response } from 'express';
import type { AdminRole } from '@prisma/client';
import { ApiError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../modules/auth/service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string; role: AdminRole };
    }
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Autentikasi diperlukan'));
    return;
  }

  Promise.resolve()
    .then(async () => {
      const payload = verifyToken(header.slice('Bearer '.length).trim());
      const user = await prisma.adminUser.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, active: true },
      });

      if (!user) throw ApiError.unauthorized('Pengguna tidak ditemukan');
      if (!user.active) throw ApiError.forbidden('Akun pengguna tidak aktif');

      req.auth = { userId: user.id, role: user.role };
      next();
    })
    .catch(next);
}

export function requireRole(...roles: AdminRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(ApiError.unauthorized('Autentikasi diperlukan'));
    if (!roles.includes(req.auth.role)) return next(ApiError.forbidden('Akses ditolak'));
    next();
  };
}
