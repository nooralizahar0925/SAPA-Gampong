import { z } from 'zod';
import { registry } from '../../openapi/registry';

export const EmailProviderEnum = registry.register(
  'EmailProviderEnum',
  z.enum(['mailersend', 'mailgun', 'gmail', 'smtp']),
);

export const EmailProviderOption = registry.register(
  'EmailProviderOption',
  z.object({
    id: EmailProviderEnum,
    label: z.string(),
    configured: z.boolean(),
  }),
);

export const EmailProviderSettingsResponse = registry.register(
  'EmailProviderSettingsResponse',
  z.object({
    active_provider: EmailProviderEnum,
    default_provider: EmailProviderEnum,
    providers: z.array(EmailProviderOption),
  }),
);

export const UpdateEmailProviderBody = registry.register(
  'UpdateEmailProviderBody',
  z.object({
    provider: EmailProviderEnum,
  }),
);
