import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const DEFAULT_HEADERS = 'Authorization, Content-Type';
const DEFAULT_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';

function getAllowedOrigins() {
  const configured = env.CORS_ORIGINS.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([new URL(env.DASHBOARD_BASE_URL).origin, ...configured]);
}

const allowedOrigins = getAllowedOrigins();

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (!origin) {
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
    return;
  }

  if (!allowedOrigins.has(origin)) {
    if (req.method === 'OPTIONS') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Origin tidak diizinkan mengakses API ini',
        },
      });
      return;
    }

    next();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', DEFAULT_HEADERS);
  res.setHeader('Access-Control-Allow-Methods', DEFAULT_METHODS);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
