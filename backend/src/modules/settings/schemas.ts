import { z } from 'zod';
import { registry } from '../../openapi/registry';

export const EmailProviderEnum = registry.register(
  'EmailProviderEnum',
  z.enum(['mailersend', 'mailgun', 'gmail', 'smtp']),
);

export const EmailProviderConfigSummary = registry.register(
  'EmailProviderConfigSummary',
  z.object({
    from_email: z.string().nullable().optional(),
    from_name: z.string().nullable().optional(),
    api_base_url: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    host: z.string().nullable().optional(),
    port: z.number().int().positive().nullable().optional(),
    secure: z.boolean().nullable().optional(),
    has_api_key: z.boolean().optional(),
    has_app_password: z.boolean().optional(),
    has_password: z.boolean().optional(),
  }),
);

export const EmailProviderOption = registry.register(
  'EmailProviderOption',
  z.object({
    id: EmailProviderEnum,
    label: z.string(),
    configured: z.boolean(),
    config_summary: EmailProviderConfigSummary,
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

export const UpdateEmailProviderConfigBody = registry.register(
  'UpdateEmailProviderConfigBody',
  z.object({
    provider: EmailProviderEnum,
    from_email: z.string().email().optional(),
    from_name: z.string().min(1).max(120).optional(),
    api_key: z.string().min(1).optional(),
    domain: z.string().min(1).max(255).optional(),
    api_base_url: z.string().url().optional(),
    username: z.string().min(1).max(255).optional(),
    app_password: z.string().min(1).optional(),
    host: z.string().min(1).max(255).optional(),
    port: z.number().int().min(1).max(65535).optional(),
    secure: z.boolean().optional(),
    password: z.string().min(1).optional(),
  }),
);

export const TestEmailProviderBody = registry.register(
  'TestEmailProviderBody',
  z.object({
    provider: EmailProviderEnum,
    to_email: z.string().email(),
  }),
);

export const SettingsMessageResponse = registry.register(
  'SettingsMessageResponse',
  z.object({
    message: z.string(),
  }),
);
