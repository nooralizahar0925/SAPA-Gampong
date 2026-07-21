import { z } from 'zod';
import { registry } from '../../openapi/registry';
import { uploadKindValues } from '../../services/storage.service';

export const FeedbackStatusSchema = z.enum(['new', 'read', 'responded']);

export const FeedbackAttachmentInput = z.object({
  file_id: z.string().min(1),
  kind: z.enum(uploadKindValues),
});

export const CreateFeedbackBody = registry.register(
  'CreateFeedbackBody',
  z.object({
    name: z.string().trim().min(1, 'Nama wajib diisi'),
    email: z.string().email('Email tidak valid'),
    phone: z.string().trim().optional(),
    body: z.string().trim().min(1, 'Isi laporan wajib diisi'),
    attachments: z.array(FeedbackAttachmentInput).default([]),
  }),
);

export const CreateFeedbackResponse = registry.register(
  'CreateFeedbackResponse',
  z.object({
    id: z.string(),
    reference_code: z.string(),
    status: z.literal('new'),
  }),
);

export const ListFeedbackQuery = z.object({
  status: FeedbackStatusSchema.optional(),
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
});

export const FeedbackInboxItem = registry.register(
  'FeedbackInboxItem',
  z.object({
    id: z.string(),
    reference_code: z.string(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    body: z.string(),
    status: FeedbackStatusSchema,
    note: z.string().nullable(),
    attachment_count: z.number().int().nonnegative(),
    created_at: z.string().datetime(),
  }),
);

export const ListFeedbackResponse = registry.register(
  'ListFeedbackResponse',
  z.object({
    items: z.array(FeedbackInboxItem),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    /** Unread total across the whole inbox, not just this page — drives the sidebar badge. */
    new_count: z.number().int().nonnegative(),
  }),
);

export const FeedbackDetailParams = z.object({
  id: z.string().min(1),
});

export const FeedbackDetailAttachment = registry.register(
  'FeedbackDetailAttachment',
  z.object({
    file_id: z.string(),
    kind: z.enum(uploadKindValues),
    mime: z.string(),
    size: z.number().int().nonnegative(),
    original_name: z.string().nullable(),
    url: z.string().url(),
  }),
);

export const FeedbackDetailResponse = registry.register(
  'FeedbackDetailResponse',
  z.object({
    id: z.string(),
    reference_code: z.string(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    body: z.string(),
    status: FeedbackStatusSchema,
    note: z.string().nullable(),
    reply: z.string().nullable(),
    replied_at: z.string().datetime().nullable(),
    attachments: z.array(FeedbackDetailAttachment),
    created_at: z.string().datetime(),
  }),
);

export const ReplyFeedbackBody = registry.register(
  'ReplyFeedbackBody',
  z.object({
    reply: z.string().trim().min(1, 'Balasan wajib diisi').max(5000),
    note: z.string().trim().max(2000).optional(),
  }),
);

export const UpdateFeedbackBody = registry.register(
  'UpdateFeedbackBody',
  z
    .object({
      status: FeedbackStatusSchema.optional(),
      note: z.string().trim().max(2000).optional(),
    })
    .refine((value) => value.status !== undefined || value.note !== undefined, {
      message: 'Tidak ada perubahan yang dikirim',
    }),
);

export type CreateFeedbackBodyType = z.infer<typeof CreateFeedbackBody>;
export type ListFeedbackQueryType = z.infer<typeof ListFeedbackQuery>;
export type UpdateFeedbackBodyType = z.infer<typeof UpdateFeedbackBody>;
export type ReplyFeedbackBodyType = z.infer<typeof ReplyFeedbackBody>;
