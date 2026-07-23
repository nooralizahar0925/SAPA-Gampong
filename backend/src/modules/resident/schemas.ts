import { z } from 'zod';
import { registry } from '../../openapi/registry';
import { LETTER_TYPE_CODES } from '../letters/data';
import { FeedbackStatusSchema } from '../feedback/schemas';
import { RequestStatusSchema } from '../requests/schemas';

export const ResidentEmailBody = registry.register(
  'ResidentEmailBody',
  z.object({
    email: z.string().trim().email('Email tidak valid'),
  }),
);

export const ResidentVerifyOtpBody = registry.register(
  'ResidentVerifyOtpBody',
  z.object({
    email: z.string().trim().email('Email tidak valid'),
    otp: z.string().trim().regex(/^\d{6}$/, 'Kode OTP harus 6 digit'),
  }),
);

export const ResidentOtpResponse = registry.register(
  'ResidentOtpResponse',
  z.object({
    message: z.string(),
    expires_at: z.string().datetime(),
    dev_otp: z.string().optional(),
  }),
);

export const ResidentSessionResponse = registry.register(
  'ResidentSessionResponse',
  z.object({
    email: z.string().email(),
    token: z.string(),
    expires_at: z.string().datetime(),
  }),
);

export const ResidentMeResponse = registry.register(
  'ResidentMeResponse',
  z.object({
    email: z.string().email(),
    verified_at: z.string().datetime(),
    expires_at: z.string().datetime(),
  }),
);

export const ResidentRequestItem = registry.register(
  'ResidentRequestItem',
  z.object({
    id: z.string(),
    reference_code: z.string(),
    letter_type: z.enum(LETTER_TYPE_CODES),
    status: RequestStatusSchema,
    status_label: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    generated_pdf_url: z.string().url().nullable(),
    decision_reason: z.string().nullable(),
  }),
);

export const ResidentRequestsResponse = registry.register(
  'ResidentRequestsResponse',
  z.object({
    items: z.array(ResidentRequestItem),
  }),
);

export const ResidentFeedbackItem = registry.register(
  'ResidentFeedbackItem',
  z.object({
    id: z.string(),
    reference_code: z.string(),
    body: z.string(),
    status: FeedbackStatusSchema,
    reply: z.string().nullable(),
    replied_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
  }),
);

export const ResidentFeedbackResponse = registry.register(
  'ResidentFeedbackResponse',
  z.object({
    items: z.array(ResidentFeedbackItem),
  }),
);

export type ResidentEmailBodyType = z.infer<typeof ResidentEmailBody>;
export type ResidentVerifyOtpBodyType = z.infer<typeof ResidentVerifyOtpBody>;
