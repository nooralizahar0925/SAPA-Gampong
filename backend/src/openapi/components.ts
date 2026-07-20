import { z } from 'zod';
import { registry } from './registry';
import { ERROR_CODES } from '../lib/errors';

export const ErrorEnvelope = registry.register(
  'ErrorEnvelope',
  z
    .object({
      error: z.object({
        code: z.enum(ERROR_CODES),
        message: z.string(),
        fields: z.record(z.string()).optional(),
      }),
    })
    .openapi({
      description: 'Standard envelope used by every non-2xx error response.',
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
