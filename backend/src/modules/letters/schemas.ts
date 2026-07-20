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
