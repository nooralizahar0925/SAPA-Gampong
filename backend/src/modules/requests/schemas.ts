import { z } from 'zod';
import { registry } from '../../openapi/registry';
import { LETTER_TYPE_CODES } from '../letters/data';
import { uploadKindValues } from '../../services/storage.service';

export const RequestAttachmentInput = z.object({
  file_id: z.string().min(1),
  kind: z.enum(uploadKindValues),
});

export const CreateRequestBody = registry.register(
  'CreateRequestBody',
  z.object({
    letter_type: z.enum(LETTER_TYPE_CODES),
    applicant_name: z.string().trim().min(1, 'Applicant name is required'),
    applicant_email: z.string().email('Applicant email must be a valid email address'),
    applicant_phone: z.string().trim().optional(),
    keperluan: z.string().trim().optional(),
    subject_data: z.record(z.unknown()),
    attachments: z.array(RequestAttachmentInput),
  }),
);

export const CreateRequestResponse = registry.register(
  'CreateRequestResponse',
  z.object({
    id: z.string(),
    reference_code: z.string(),
    status: z.literal('SUBMITTED'),
  }),
);

export const TrackRequestParams = z.object({
  referenceCode: z.string().min(1),
});

export const TrackRequestResponse = registry.register(
  'TrackRequestResponse',
  z.object({
    reference_code: z.string(),
    letter_type: z.enum(LETTER_TYPE_CODES),
    status: z.enum([
      'SUBMITTED',
      'IN_REVIEW',
      'NEEDS_INFO',
      'APPROVED',
      'GENERATED',
      'SENT',
      'REJECTED',
    ]),
    status_label: z.string(),
    updated_at: z.string().datetime(),
  }),
);

export type CreateRequestBodyType = z.infer<typeof CreateRequestBody>;
