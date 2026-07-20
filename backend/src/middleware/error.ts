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

  // Express's built-in body parser (body-parser) throws plain errors carrying a
  // numeric `status`/`statusCode` for malformed or oversize request bodies —
  // these are client errors and must not fall through to the 500 branch below.
  const httpStatus = getHttpStatus(err);
  if (httpStatus !== undefined && httpStatus >= 400 && httpStatus < 500) {
    if (httpStatus === 413) {
      res.status(httpStatus).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Data yang dikirim terlalu besar' },
      });
      return;
    }
    res.status(httpStatus).json({
      error: { code: 'VALIDATION_ERROR', message: 'Data yang dikirim tidak valid' },
    });
    return;
  }

  if (env.NODE_ENV !== 'test') console.error(err);
  res.status(500).json({
    error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan pada server' },
  });
}

/**
 * body-parser (used internally by express.json()) throws plain Error objects
 * with a `status` (or, on older versions, `statusCode`) property rather than
 * our own ApiError/ZodError types — e.g. SyntaxError{status:400} for malformed
 * JSON and PayloadTooLargeError{status:413} for oversize bodies. Extract that
 * status defensively, without assuming any particular error class.
 */
function getHttpStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const candidate = err as { status?: unknown; statusCode?: unknown };
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === 'number' ? status : undefined;
}
