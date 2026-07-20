import { z } from 'zod';
import { registry } from '../../openapi/registry';

export const VerifyParams = z.object({
  token: z.string().min(1),
});

export const VerifyResponse = registry.register(
  'VerifyResponse',
  z.union([
    z.object({
      valid: z.literal(false),
    }),
    z.object({
      valid: z.literal(true),
      nomor_surat: z.string(),
      jenis_surat: z.string(),
      tanggal_terbit: z.string(),
      penandatangan: z.string(),
      perihal: z.string(),
      revoked: z.literal(false),
    }),
  ]),
);

export const RevokeResponse = registry.register(
  'RevokeResponse',
  z.object({
    revoked: z.literal(true),
  }),
);
