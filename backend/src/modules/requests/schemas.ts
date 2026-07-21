import { z } from 'zod';
import { registry } from '../../openapi/registry';
import { LETTER_TYPE_CODES } from '../letters/data';
import { uploadKindValues } from '../../services/storage.service';
import { RevokeResponse as VerifyRevokeResponse } from '../verify/schemas';

export const RequestStatusSchema = z.enum([
  'SUBMITTED',
  'IN_REVIEW',
  'NEEDS_INFO',
  'APPROVED',
  'GENERATED',
  'SENT',
  'REJECTED',
]);

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
    status: RequestStatusSchema,
    status_label: z.string(),
    updated_at: z.string().datetime(),
  }),
);

/** Allow-list, so a sort column can never be attacker-controlled SQL. */
export const RequestSortSchema = z.enum([
  'created_at',
  'reference_code',
  'applicant_name',
  'letter_type',
  'status',
]);

export const ListRequestsQuery = z.object({
  status: RequestStatusSchema.optional(),
  letter_type: z.enum(LETTER_TYPE_CODES).optional(),
  q: z.string().trim().min(1).optional(),
  sort: RequestSortSchema.default('created_at'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  year: z.coerce.number().int().min(2000).max(2200).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  page: z.coerce.number().int().positive().default(1),
});

export const RequestQueueItem = registry.register(
  'RequestQueueItem',
  z.object({
    id: z.string(),
    reference_code: z.string(),
    letter_type: z.enum(LETTER_TYPE_CODES),
    applicant_name: z.string(),
    status: RequestStatusSchema,
    created_at: z.string().datetime(),
    email: z.string().email(),
  }),
);

export const ListRequestsResponse = registry.register(
  'ListRequestsResponse',
  z.object({
    items: z.array(RequestQueueItem),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
  }),
);

export const RequestPeriod = registry.register(
  'RequestPeriod',
  z.object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    count: z.number().int().nonnegative(),
  }),
);

export const RequestCountsResponse = registry.register(
  'RequestCountsResponse',
  z.object({
    by_status: z.record(RequestStatusSchema, z.number().int().nonnegative()),
    total: z.number().int().nonnegative(),
    /** SUBMITTED + IN_REVIEW + NEEDS_INFO — the work waiting on an admin. */
    pending: z.number().int().nonnegative(),
    /** Months that actually contain requests, newest first — drives the period filter. */
    periods: z.array(RequestPeriod),
  }),
);

export const RequestDetailParams = z.object({
  id: z.string().min(1),
});

export const RequestDetailAttachment = registry.register(
  'RequestDetailAttachment',
  z.object({
    file_id: z.string(),
    kind: z.enum(uploadKindValues),
    mime: z.string(),
    size: z.number().int().nonnegative(),
    url: z.string().url(),
  }),
);

export const RequestStatusHistoryItem = registry.register(
  'RequestStatusHistoryItem',
  z.object({
    status: RequestStatusSchema,
    at: z.string().datetime(),
    action: z.string().optional(),
    by: z.string().optional(),
    reason: z.string().optional(),
    nomor_surat: z.string().optional(),
  }),
);

export const RequestDetailResponse = registry.register(
  'RequestDetailResponse',
  z.object({
    id: z.string(),
    reference_code: z.string(),
    letter_type: z.enum(LETTER_TYPE_CODES),
    status: RequestStatusSchema,
    applicant_name: z.string(),
    applicant_email: z.string().email(),
    applicant_phone: z.string().nullable(),
    keperluan: z.string().nullable(),
    subject_data: z.record(z.unknown()),
    attachments: z.array(RequestDetailAttachment),
    status_history: z.array(RequestStatusHistoryItem),
    nomor_surat: z.string().nullable(),
    generated_pdf_id: z.string().nullable().optional(),
    generated_pdf_url: z.string().url().nullable().optional(),
    verification_token: z.string().nullable().optional(),
    verification_url: z.string().url().nullable().optional(),
    decision_reason: z.string().nullable(),
    decided_by: z.string().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  }),
);

export const PatchRequestStatusBody = registry.register(
  'PatchRequestStatusBody',
  z.object({
    action: z.enum(['approve', 'reject', 'in_review', 'needs_info']),
    reason: z.string().trim().optional(),
    subject_data: z.record(z.unknown()).optional(),
    nomor_surat: z.string().trim().min(1).optional(),
  }),
);

export const GenerateRequestResponse = registry.register(
  'GenerateRequestResponse',
  z.object({
    pdf_id: z.string(),
    pdf_url: z.string().url(),
    verification_token: z.string(),
    nomor_surat: z.string(),
  }),
);

export const SendRequestResponse = registry.register(
  'SendRequestResponse',
  z.object({
    status: z.literal('SENT'),
  }),
);

export type CreateRequestBodyType = z.infer<typeof CreateRequestBody>;
export type PatchRequestStatusBodyType = z.infer<typeof PatchRequestStatusBody>;
export const RevokeResponse = VerifyRevokeResponse;
