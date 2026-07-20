import type { NextFunction, Request, Response } from 'express';
import type { AdminRole } from '@prisma/client';
import { ApiError } from '../lib/errors';
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

  try {
    const payload = verifyToken(header.slice('Bearer '.length).trim());
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: AdminRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(ApiError.unauthorized('Autentikasi diperlukan'));
    if (!roles.includes(req.auth.role)) return next(ApiError.forbidden('Akses ditolak'));
    next();
  };
}
