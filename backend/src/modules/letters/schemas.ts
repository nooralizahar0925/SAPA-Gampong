import { z } from 'zod';
import { registry } from '../../openapi/registry';

export const FieldTypeEnum = z.enum([
  'text',
  'textarea',
  'date',
  'time',
  'year',
  'number',
  'nik',
  'phone',
  'email',
  'enum',
]);

export const LetterFieldSchema = registry.register(
  'LetterField',
  z.object({
    key: z.string(),
    label: z.string(),
    type: FieldTypeEnum,
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  }),
);

export const LetterTypeSchema = registry.register(
  'LetterType',
  z.object({
    code: z.enum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10']),
    name: z.string(),
    description: z.string(),
    subject_is_applicant: z.boolean(),
    required_attachments: z.array(z.string()),
    signatory: z.string(),
    fields: z.array(LetterFieldSchema),
  }),
);

export const LetterTypeListResponse = registry.register(
  'LetterTypeListResponse',
  z.array(LetterTypeSchema),
);

export const AdminLetterTemplateSchema = registry.register(
  'AdminLetterTemplate',
  LetterTypeSchema.extend({
    id: z.string(),
    active: z.boolean(),
    updated_at: z.string().datetime(),
  }),
);

export const AdminLetterTemplateListResponse = registry.register(
  'AdminLetterTemplateListResponse',
  z.array(AdminLetterTemplateSchema),
);

export const LetterTemplateParams = z.object({
  code: z.enum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10']),
});

export const CreateLetterTemplateBody = registry.register(
  'CreateLetterTemplateBody',
  z.object({
    code: z.enum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10']),
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().min(1).max(500).optional(),
    subject_is_applicant: z.boolean().optional(),
    required_attachments: z.array(z.string().trim().min(1).max(40)).optional(),
    signatory: z.string().trim().min(1).max(160).optional(),
    fields: z.array(LetterFieldSchema).optional(),
    active: z.boolean().optional(),
  }),
);

export const UpdateLetterTemplateBody = registry.register(
  'UpdateLetterTemplateBody',
  z.object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().min(1).max(500).optional(),
    subject_is_applicant: z.boolean().optional(),
    required_attachments: z.array(z.string().trim().min(1).max(40)).optional(),
    signatory: z.string().trim().min(1).max(160).optional(),
    fields: z.array(LetterFieldSchema).optional(),
    active: z.boolean().optional(),
  }),
);

export type CreateLetterTemplateBodyType = z.infer<typeof CreateLetterTemplateBody>;
export type UpdateLetterTemplateBodyType = z.infer<typeof UpdateLetterTemplateBody>;
