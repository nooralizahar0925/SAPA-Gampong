import { z } from 'zod';
import { registry } from '../../openapi/registry';
import { uploadKindValues } from '../../services/storage.service';

export const UploadKindSchema = z.enum(uploadKindValues);

export const UploadFieldsBody = z.object({
  kind: UploadKindSchema,
});

export const UploadMultipartBody = registry.register(
  'UploadMultipartBody',
  z.object({
    kind: UploadKindSchema,
    file: z.string().openapi({ type: 'string', format: 'binary' }),
  }),
);

export const UploadResponseSchema = registry.register(
  'UploadResponse',
  z.object({
    file_id: z.string(),
    url: z.string().url(),
    mime: z.string(),
    size: z.number().int().nonnegative(),
  }),
);

export const BinaryFileResponseSchema = registry.register(
  'BinaryFileResponse',
  z.string().openapi({ type: 'string', format: 'binary' }),
);

export const SignedUploadParams = z.object({
  fileId: z.string().min(1),
});

export const SignedUploadQuery = z.object({
  exp: z.coerce.number().int().positive(),
  sig: z.string().min(1),
});
