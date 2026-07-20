import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors';
import { env } from '../config/env';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound('Endpoint tidak ditemukan'));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) fields[issue.path.join('.')] = issue.message;
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Data yang dikirim tidak valid', fields },
    });
    return;
  }

  if (err instanceof ApiError) {
    const body: Record<string, unknown> = { code: err.code, message: err.message };
    if (err.fields) body.fields = err.fields;
    res.status(err.status).json({ error: body });
    return;
  }

  if (env.NODE_ENV !== 'test') console.error(err);
  res.status(500).json({
    error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan pada server' },
  });
}
