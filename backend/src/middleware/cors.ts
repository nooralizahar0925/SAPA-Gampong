import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const DEFAULT_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const DEFAULT_HEADERS = 'Authorization, Content-Type';

const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

function getAllowedOrigins() {
  const configured = env.CORS_ORIGINS.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([new URL(env.DASHBOARD_BASE_URL).origin, ...configured]);
}

const allowedOrigins = getAllowedOrigins();

function isLocalNetworkHost(hostname: string) {
  return (
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function isAllowedOrigin(origin: string) {
  if (allowedOrigins.has(origin)) return true;

  if (env.NODE_ENV === 'production') return false;

  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return LOCAL_DEV_HOSTS.has(hostname) || isLocalNetworkHost(hostname);
  } catch {
    return false;
  }
}

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

  if (!isAllowedOrigin(origin)) {
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
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] ?? DEFAULT_HEADERS,
  );
  res.setHeader('Access-Control-Allow-Methods', DEFAULT_METHODS);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
