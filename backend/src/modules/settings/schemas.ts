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

/* -------------------------------------------------------------------------- */
/* Application settings (contact, letterhead, signatory)                      */
/* -------------------------------------------------------------------------- */

export const AppSettingsResponse = registry.register(
  'AppSettingsResponse',
  z.object({
    contact_phone: z.string().nullable(),
    contact_email: z.string().nullable(),
    contact_address: z.string().nullable(),
    letterhead_line1: z.string().nullable(),
    letterhead_line2: z.string().nullable(),
    letterhead_line3: z.string().nullable(),
    keuchik_title: z.string().nullable(),
    keuchik_name: z.string().nullable(),
    secretary_title: z.string().nullable(),
    secretary_name: z.string().nullable(),
    updated_at: z.string().nullable(),
  }),
);

export const UpdateAppSettingsBody = registry.register(
  'UpdateAppSettingsBody',
  z.object({
    contact_phone: z.string().max(40).nullish(),
    contact_email: z.string().email().nullish(),
    contact_address: z.string().max(300).nullish(),
    letterhead_line1: z.string().max(200).nullish(),
    letterhead_line2: z.string().max(200).nullish(),
    letterhead_line3: z.string().max(200).nullish(),
    keuchik_title: z.string().max(200).nullish(),
    keuchik_name: z.string().max(200).nullish(),
    secretary_title: z.string().max(200).nullish(),
    secretary_name: z.string().max(200).nullish(),
  }),
);

/* -------------------------------------------------------------------------- */
/* Public Android app distribution                                             */
/* -------------------------------------------------------------------------- */

export const AppDistributionChannel = registry.register(
  'AppDistributionChannel',
  z.enum(['direct_apk', 'google_play']),
);

export const AppDistributionResponse = registry.register(
  'AppDistributionResponse',
  z.object({
    channel: AppDistributionChannel,
    enabled: z.boolean(),
    apk_url: z.string().nullable(),
    play_store_url: z.string().nullable(),
    version_name: z.string().nullable(),
    release_date: z.string().nullable(),
    file_size: z.string().nullable(),
    sha256: z.string().nullable(),
    notice: z.string().nullable(),
    updated_at: z.string().nullable(),
  }),
);

const publicDownloadUrl = z
  .string()
  .max(2048)
  .refine(
    (value) => value.startsWith('/') || /^https:\/\//i.test(value),
    'URL harus berupa alamat HTTPS atau path yang diawali /',
  );

export const UpdateAppDistributionBody = registry.register(
  'UpdateAppDistributionBody',
  z.object({
    channel: AppDistributionChannel.optional(),
    enabled: z.boolean().optional(),
    apk_url: publicDownloadUrl.nullish(),
    play_store_url: publicDownloadUrl.nullish(),
    version_name: z.string().max(40).nullish(),
    release_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    file_size: z.string().max(40).nullish(),
    sha256: z.string().regex(/^[a-fA-F0-9]{64}$/).nullish(),
    notice: z.string().max(300).nullish(),
  }),
);

/* -------------------------------------------------------------------------- */
/* Letter number counters                                                     */
/* -------------------------------------------------------------------------- */

export const LetterTypeEnum = registry.register(
  'LetterTypeEnum',
  z.enum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10']),
);

export const LetterCounterEntry = registry.register(
  'LetterCounterEntry',
  z.object({
    letter_type: LetterTypeEnum,
    last_number: z.number().int(),
  }),
);

export const LetterCountersResponse = registry.register(
  'LetterCountersResponse',
  z.object({
    year: z.number().int(),
    counters: z.array(LetterCounterEntry),
  }),
);

export const LetterCountersQuery = registry.register(
  'LetterCountersQuery',
  z.object({
    year: z.coerce.number().int().min(2000).max(2200).optional(),
  }),
);

export const UpdateLetterCounterBody = registry.register(
  'UpdateLetterCounterBody',
  z.object({
    letter_type: LetterTypeEnum,
    year: z.number().int().min(2000).max(2200),
    last_number: z.number().int().min(0),
  }),
);
