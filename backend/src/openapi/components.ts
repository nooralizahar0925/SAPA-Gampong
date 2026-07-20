import { z } from 'zod';
import { registry } from './registry';

export const ErrorEnvelope = registry.register(
  'ErrorEnvelope',
  z
    .object({
      error: z.object({
        code: z.enum([
          'VALIDATION_ERROR',
          'UNAUTHORIZED',
          'FORBIDDEN',
          'NOT_FOUND',
          'CONFLICT',
          'RATE_LIMITED',
          'SERVER_ERROR',
        ]),
        message: z.string(),
        fields: z.record(z.string()).optional(),
      }),
    })
    .openapi({
      description: 'Bentuk baku seluruh respons error.',
      example: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data yang dikirim tidak valid',
          fields: { nik: 'harus 16 digit' },
        },
      },
    }),
);

/** Ready-made error response, referenced by every registered route. */
export function errorResponse(description: string) {
  return {
    description,
    content: { 'application/json': { schema: ErrorEnvelope } },
  };
}
