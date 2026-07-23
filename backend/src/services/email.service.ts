import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { EmailProvider, Prisma } from '@prisma/client';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

const APP_CONFIG_ID = 'singleton';
const ENCRYPTION_PREFIX = 'enc:v1';

const EMAIL_PROVIDER_LABELS: Record<EmailProvider, string> = {
  mailersend: 'MailerSend',
  mailgun: 'Mailgun',
  gmail: 'Gmail',
  smtp: 'SMTP',
};

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
  cid?: string;
  disposition?: 'attachment' | 'inline';
};

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

export type EmailTransport = {
  sendMail(options: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
  }): Promise<unknown>;
};

type ResolvedEmailProviderConfig = {
  id: EmailProvider;
  label: string;
  configured: boolean;
  fromEmail?: string;
  fromName?: string;
  apiKey?: string;
  baseUrl?: string;
  domain?: string;
  user?: string;
  appPassword?: string;
  host?: string;
  port?: number;
  secure?: boolean;
};

export type EmailProviderConfigSummary = {
  from_email?: string | null;
  from_name?: string | null;
  api_base_url?: string | null;
  domain?: string | null;
  username?: string | null;
  host?: string | null;
  port?: number | null;
  secure?: boolean | null;
  has_api_key?: boolean;
  has_app_password?: boolean;
  has_password?: boolean;
};

export type EmailProviderCatalogItem = {
  id: EmailProvider;
  label: string;
  configured: boolean;
  config_summary: EmailProviderConfigSummary;
};

export type UpdateEmailProviderConfigInput =
  | {
      provider: 'mailersend';
      from_email?: string;
      from_name?: string;
      api_key?: string;
    }
  | {
      provider: 'mailgun';
      from_email?: string;
      from_name?: string;
      api_key?: string;
      domain?: string;
      api_base_url?: string;
    }
  | {
      provider: 'gmail';
      from_email?: string;
      from_name?: string;
      username?: string;
      app_password?: string;
    }
  | {
      provider: 'smtp';
      from_email?: string;
      from_name?: string;
      host?: string;
      port?: number;
      secure?: boolean;
      username?: string;
      password?: string;
    };

type PersistedMailerSendConfig = {
  fromEmail?: string;
  fromName?: string;
  apiKeyEncrypted?: string;
};

type PersistedMailgunConfig = {
  fromEmail?: string;
  fromName?: string;
  apiKeyEncrypted?: string;
  domain?: string;
  baseUrl?: string;
};

type PersistedGmailConfig = {
  fromEmail?: string;
  fromName?: string;
  user?: string;
  appPasswordEncrypted?: string;
};

type PersistedSmtpConfig = {
  fromEmail?: string;
  fromName?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  passwordEncrypted?: string;
};

type PersistedEmailProviderConfigs = {
  mailersend?: PersistedMailerSendConfig;
  mailgun?: PersistedMailgunConfig;
  gmail?: PersistedGmailConfig;
  smtp?: PersistedSmtpConfig;
};

type EmailProviderConfigOverrides = Partial<Record<EmailProvider, Partial<ResolvedEmailProviderConfig>>>;

const PersistedEmailProviderConfigsSchema: z.ZodType<PersistedEmailProviderConfigs> = z
  .object({
    mailersend: z
      .object({
        fromEmail: z.string().optional(),
        fromName: z.string().optional(),
        apiKeyEncrypted: z.string().optional(),
      })
      .partial()
      .optional(),
    mailgun: z
      .object({
        fromEmail: z.string().optional(),
        fromName: z.string().optional(),
        apiKeyEncrypted: z.string().optional(),
        domain: z.string().optional(),
        baseUrl: z.string().optional(),
      })
      .partial()
      .optional(),
    gmail: z
      .object({
        fromEmail: z.string().optional(),
        fromName: z.string().optional(),
        user: z.string().optional(),
        appPasswordEncrypted: z.string().optional(),
      })
      .partial()
      .optional(),
    smtp: z
      .object({
        fromEmail: z.string().optional(),
        fromName: z.string().optional(),
        host: z.string().optional(),
        port: z.number().int().positive().optional(),
        secure: z.boolean().optional(),
        user: z.string().optional(),
        passwordEncrypted: z.string().optional(),
      })
      .partial()
      .optional(),
  })
  .partial();

let transportOverride: EmailTransport | null = null;
let providerConfigOverrides: EmailProviderConfigOverrides | null = null;

export const EmailService = {
  async send(message: EmailMessage) {
    const provider = await resolveActiveEmailProvider();
    return sendWithResolvedProvider(provider, message);
  },

  async sendWithProvider(provider: EmailProvider, message: EmailMessage) {
    return sendWithResolvedProvider(provider, message);
  },
};

export function getDefaultEmailProvider(): EmailProvider {
  return env.EMAIL_PROVIDER_DEFAULT;
}

export function getEmailProviderLabel(provider: EmailProvider) {
  return EMAIL_PROVIDER_LABELS[provider];
}

export async function getEmailProviderCatalog(): Promise<EmailProviderCatalogItem[]> {
  const configs = await resolveProviderConfigs();

  return (Object.keys(EMAIL_PROVIDER_LABELS) as EmailProvider[]).map((provider) => ({
    id: provider,
    label: configs[provider].label,
    configured: configs[provider].configured,
    config_summary: summarizeProviderConfig(configs[provider]),
  }));
}

export async function isEmailProviderConfigured(provider: EmailProvider): Promise<boolean> {
  return (await resolveProviderConfigs())[provider].configured;
}

export async function saveEmailProviderConfig(input: UpdateEmailProviderConfigInput) {
  const current = await prisma.appConfig.findUnique({
    where: { id: APP_CONFIG_ID },
    select: {
      activeEmailProvider: true,
      emailProviderConfigs: true,
    },
  });

  const nextConfigs = buildNextPersistedConfigs(parsePersistedProviderConfigs(current?.emailProviderConfigs), input);

  await prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    create: {
      id: APP_CONFIG_ID,
      activeEmailProvider: current?.activeEmailProvider ?? getDefaultEmailProvider(),
      emailProviderConfigs: nextConfigs as Prisma.InputJsonValue,
    },
    update: {
      emailProviderConfigs: nextConfigs as Prisma.InputJsonValue,
    },
  });
}

export function setEmailTransportForTests(transport: EmailTransport | null) {
  transportOverride = transport;
}

export function setEmailProviderConfigsForTests(overrides: EmailProviderConfigOverrides | null) {
  providerConfigOverrides = overrides;
}

async function sendWithResolvedProvider(provider: EmailProvider, message: EmailMessage) {
  const config = (await resolveProviderConfigs())[provider];

  if (!config.configured) {
    throw new Error(`Email provider "${provider}" is not configured.`);
  }

  if (transportOverride) {
    return transportOverride.sendMail({
      from: formatFrom(config.fromEmail, config.fromName, true),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: htmlToText(message.html),
      attachments: message.attachments,
    });
  }

  switch (provider) {
    case 'mailersend':
      return sendWithMailerSend(config, message);
    case 'mailgun':
      return sendWithMailgun(config, message);
    case 'gmail':
      return sendWithGmail(config, message);
    case 'smtp':
      return sendWithSmtp(config, message);
  }
}

async function resolveActiveEmailProvider(): Promise<EmailProvider> {
  const config = await prisma.appConfig.findUnique({
    where: { id: APP_CONFIG_ID },
    select: { activeEmailProvider: true },
  });

  return config?.activeEmailProvider ?? getDefaultEmailProvider();
}

async function resolveProviderConfigs(): Promise<Record<EmailProvider, ResolvedEmailProviderConfig>> {
  const base: Record<EmailProvider, ResolvedEmailProviderConfig> = {
    mailersend: buildMailerSendConfig(),
    mailgun: buildMailgunConfig(),
    gmail: buildGmailConfig(),
    smtp: buildSmtpConfig(),
  };

  const persisted = await loadPersistedProviderConfigs();
  const mergedWithDb = {
    mailersend: mergePersistedProviderConfig(base.mailersend, persisted.mailersend),
    mailgun: mergePersistedProviderConfig(base.mailgun, persisted.mailgun),
    gmail: mergePersistedProviderConfig(base.gmail, persisted.gmail),
    smtp: mergePersistedProviderConfig(base.smtp, persisted.smtp),
  };

  if (!providerConfigOverrides) {
    return mergedWithDb;
  }

  return {
    mailersend: mergeProviderConfig(mergedWithDb.mailersend, providerConfigOverrides.mailersend),
    mailgun: mergeProviderConfig(mergedWithDb.mailgun, providerConfigOverrides.mailgun),
    gmail: mergeProviderConfig(mergedWithDb.gmail, providerConfigOverrides.gmail),
    smtp: mergeProviderConfig(mergedWithDb.smtp, providerConfigOverrides.smtp),
  };
}

async function loadPersistedProviderConfigs(): Promise<PersistedEmailProviderConfigs> {
  const config = await prisma.appConfig.findUnique({
    where: { id: APP_CONFIG_ID },
    select: { emailProviderConfigs: true },
  });

  return parsePersistedProviderConfigs(config?.emailProviderConfigs);
}

function parsePersistedProviderConfigs(raw: unknown): PersistedEmailProviderConfigs {
  const parsed = PersistedEmailProviderConfigsSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

function buildMailerSendConfig(): ResolvedEmailProviderConfig {
  return finalizeProviderConfig('mailersend', {
    id: 'mailersend',
    label: EMAIL_PROVIDER_LABELS.mailersend,
    fromEmail: env.MAILERSEND_FROM_EMAIL ?? env.SMTP_FROM_EMAIL,
    fromName: env.MAILERSEND_FROM_NAME ?? env.SMTP_FROM_NAME,
    apiKey: env.MAILERSEND_API_KEY,
  });
}

function buildMailgunConfig(): ResolvedEmailProviderConfig {
  return finalizeProviderConfig('mailgun', {
    id: 'mailgun',
    label: EMAIL_PROVIDER_LABELS.mailgun,
    fromEmail: env.MAILGUN_FROM_EMAIL ?? env.SMTP_FROM_EMAIL,
    fromName: env.MAILGUN_FROM_NAME ?? env.SMTP_FROM_NAME,
    apiKey: env.MAILGUN_API_KEY,
    domain: env.MAILGUN_DOMAIN,
    baseUrl: env.MAILGUN_BASE_URL,
  });
}

function buildGmailConfig(): ResolvedEmailProviderConfig {
  const user = env.GMAIL_USER ?? env.SMTP_USER;

  return finalizeProviderConfig('gmail', {
    id: 'gmail',
    label: EMAIL_PROVIDER_LABELS.gmail,
    fromEmail: env.GMAIL_FROM_EMAIL ?? env.SMTP_FROM_EMAIL ?? user,
    fromName: env.GMAIL_FROM_NAME ?? env.SMTP_FROM_NAME,
    user,
    appPassword: env.GMAIL_APP_PASSWORD ?? env.SMTP_PASS,
  });
}

function buildSmtpConfig(): ResolvedEmailProviderConfig {
  return finalizeProviderConfig('smtp', {
    id: 'smtp',
    label: EMAIL_PROVIDER_LABELS.smtp,
    fromEmail: env.SMTP_FROM_EMAIL ?? env.SMTP_USER,
    fromName: env.SMTP_FROM_NAME,
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    appPassword: env.SMTP_PASS,
  });
}

function mergePersistedProviderConfig(
  base: ResolvedEmailProviderConfig,
  persisted:
    | PersistedMailerSendConfig
    | PersistedMailgunConfig
    | PersistedGmailConfig
    | PersistedSmtpConfig
    | undefined,
) {
  if (!persisted) {
    return base;
  }

  const withPersisted: ResolvedEmailProviderConfig = {
    ...base,
    fromEmail: persisted.fromEmail ?? base.fromEmail,
    fromName: persisted.fromName ?? base.fromName,
  };

  if ('baseUrl' in persisted) {
    withPersisted.baseUrl = persisted.baseUrl ?? base.baseUrl;
  }

  if ('domain' in persisted) {
    withPersisted.domain = persisted.domain ?? base.domain;
  }

  if ('user' in persisted) {
    withPersisted.user = persisted.user ?? base.user;
  }

  if ('host' in persisted) {
    withPersisted.host = persisted.host ?? base.host;
  }

  if ('port' in persisted) {
    withPersisted.port = persisted.port ?? base.port;
  }

  if ('secure' in persisted) {
    withPersisted.secure = persisted.secure ?? base.secure;
  }

  if ('apiKeyEncrypted' in persisted && persisted.apiKeyEncrypted) {
    withPersisted.apiKey = decryptConfigSecret(persisted.apiKeyEncrypted);
  }

  if ('appPasswordEncrypted' in persisted && persisted.appPasswordEncrypted) {
    withPersisted.appPassword = decryptConfigSecret(persisted.appPasswordEncrypted);
  }

  if ('passwordEncrypted' in persisted && persisted.passwordEncrypted) {
    withPersisted.appPassword = decryptConfigSecret(persisted.passwordEncrypted);
  }

  return finalizeProviderConfig(base.id, withPersisted);
}

function mergeProviderConfig(
  base: ResolvedEmailProviderConfig,
  override: Partial<ResolvedEmailProviderConfig> | undefined,
): ResolvedEmailProviderConfig {
  if (!override) return base;
  return finalizeProviderConfig(base.id, { ...base, ...override });
}

function finalizeProviderConfig(
  provider: EmailProvider,
  config: Omit<ResolvedEmailProviderConfig, 'configured'> & Partial<Pick<ResolvedEmailProviderConfig, 'configured'>>,
): ResolvedEmailProviderConfig {
  return {
    ...config,
    configured: isResolvedProviderConfigured(provider, config),
  };
}

function isResolvedProviderConfigured(
  provider: EmailProvider,
  config: Partial<Omit<ResolvedEmailProviderConfig, 'configured'>>,
) {
  switch (provider) {
    case 'mailersend':
      return Boolean(config.apiKey && config.fromEmail);
    case 'mailgun':
      return Boolean(config.apiKey && config.domain && config.fromEmail);
    case 'gmail':
      return Boolean(config.user && config.appPassword && config.fromEmail);
    case 'smtp':
      return Boolean(config.host && config.port && config.fromEmail);
  }
}

function summarizeProviderConfig(config: ResolvedEmailProviderConfig): EmailProviderConfigSummary {
  return {
    from_email: config.fromEmail ?? null,
    from_name: config.fromName ?? null,
    api_base_url: config.baseUrl ?? null,
    domain: config.domain ?? null,
    username: config.user ?? null,
    host: config.host ?? null,
    port: config.port ?? null,
    secure: typeof config.secure === 'boolean' ? config.secure : null,
    has_api_key: config.id === 'mailersend' || config.id === 'mailgun' ? Boolean(config.apiKey) : undefined,
    has_app_password: config.id === 'gmail' ? Boolean(config.appPassword) : undefined,
    has_password: config.id === 'smtp' ? Boolean(config.appPassword) : undefined,
  };
}

function buildNextPersistedConfigs(
  current: PersistedEmailProviderConfigs,
  input: UpdateEmailProviderConfigInput,
): PersistedEmailProviderConfigs {
  const next: PersistedEmailProviderConfigs = {
    ...current,
    ...(current.mailersend ? { mailersend: { ...current.mailersend } } : {}),
    ...(current.mailgun ? { mailgun: { ...current.mailgun } } : {}),
    ...(current.gmail ? { gmail: { ...current.gmail } } : {}),
    ...(current.smtp ? { smtp: { ...current.smtp } } : {}),
  };

  switch (input.provider) {
    case 'mailersend': {
      const provider = { ...(next.mailersend ?? {}) };
      assignNormalizedString(provider, 'fromEmail', input.from_email);
      assignNormalizedString(provider, 'fromName', input.from_name);
      if (typeof input.api_key === 'string' && input.api_key.trim()) {
        provider.apiKeyEncrypted = encryptConfigSecret(input.api_key.trim());
      }
      next.mailersend = provider;
      break;
    }
    case 'mailgun': {
      const provider = { ...(next.mailgun ?? {}) };
      assignNormalizedString(provider, 'fromEmail', input.from_email);
      assignNormalizedString(provider, 'fromName', input.from_name);
      assignNormalizedString(provider, 'domain', input.domain);
      assignNormalizedString(provider, 'baseUrl', input.api_base_url);
      if (typeof input.api_key === 'string' && input.api_key.trim()) {
        provider.apiKeyEncrypted = encryptConfigSecret(input.api_key.trim());
      }
      next.mailgun = provider;
      break;
    }
    case 'gmail': {
      const provider = { ...(next.gmail ?? {}) };
      assignNormalizedString(provider, 'fromEmail', input.from_email);
      assignNormalizedString(provider, 'fromName', input.from_name);
      assignNormalizedString(provider, 'user', input.username);
      if (typeof input.app_password === 'string' && input.app_password.trim()) {
        provider.appPasswordEncrypted = encryptConfigSecret(input.app_password.trim());
      }
      next.gmail = provider;
      break;
    }
    case 'smtp': {
      const provider = { ...(next.smtp ?? {}) };
      assignNormalizedString(provider, 'fromEmail', input.from_email);
      assignNormalizedString(provider, 'fromName', input.from_name);
      assignNormalizedString(provider, 'host', input.host);
      assignNormalizedString(provider, 'user', input.username);
      if (typeof input.port === 'number') {
        provider.port = input.port;
      }
      if (typeof input.secure === 'boolean') {
        provider.secure = input.secure;
      }
      if (typeof input.password === 'string' && input.password.trim()) {
        provider.passwordEncrypted = encryptConfigSecret(input.password.trim());
      }
      next.smtp = provider;
      break;
    }
  }

  return next;
}

function assignNormalizedString(target: Record<string, unknown>, key: string, value: string | undefined) {
  if (typeof value !== 'string') {
    return;
  }

  const normalized = value.trim();
  if (normalized) {
    target[key] = normalized;
  } else {
    delete target[key];
  }
}

function encryptConfigSecret(value: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptConfigSecret(value: string) {
  if (!value.startsWith(`${ENCRYPTION_PREFIX}:`)) {
    return value;
  }

  const [, , ivHex, tagHex, dataHex] = value.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Encrypted email provider config is malformed.');
  }

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

function getEncryptionKey() {
  return createHash('sha256').update(env.APP_CONFIG_ENCRYPTION_KEY ?? env.JWT_SECRET).digest();
}

async function sendWithMailerSend(config: ResolvedEmailProviderConfig, message: EmailMessage) {
  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireValue(config.apiKey, 'MAILERSEND_API_KEY', 'mailersend')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: {
        email: requireValue(config.fromEmail, 'MAILERSEND_FROM_EMAIL', 'mailersend'),
        ...(config.fromName ? { name: config.fromName } : {}),
      },
      to: [{ email: message.to }],
      subject: message.subject,
      html: message.html,
      text: htmlToText(message.html),
      attachments: (message.attachments ?? []).map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content.toString('base64'),
        disposition: attachment.disposition ?? (attachment.cid ? 'inline' : 'attachment'),
        ...(attachment.cid ? { id: attachment.cid } : {}),
      })),
    }),
  });

  await assertSuccessfulProviderResponse(response, 'MailerSend');

  return {
    provider: 'mailersend' as const,
    status: response.status,
  };
}

async function sendWithMailgun(config: ResolvedEmailProviderConfig, message: EmailMessage) {
  const form = new FormData();
  form.append('from', formatFrom(config.fromEmail, config.fromName));
  form.append('to', message.to);
  form.append('subject', message.subject);
  form.append('html', message.html);
  form.append('text', htmlToText(message.html));

  for (const attachment of message.attachments ?? []) {
    form.append(
      attachment.disposition === 'inline' || attachment.cid ? 'inline' : 'attachment',
      new Blob([attachment.content], { type: attachment.contentType }),
      attachment.filename,
    );
  }

  const response = await fetch(
    `${trimTrailingSlashes(requireValue(config.baseUrl, 'MAILGUN_BASE_URL', 'mailgun'))}/v3/${requireValue(
      config.domain,
      'MAILGUN_DOMAIN',
      'mailgun',
    )}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${requireValue(config.apiKey, 'MAILGUN_API_KEY', 'mailgun')}`).toString('base64')}`,
      },
      body: form,
    },
  );

  await assertSuccessfulProviderResponse(response, 'Mailgun');

  return {
    provider: 'mailgun' as const,
    status: response.status,
  };
}

async function sendWithGmail(config: ResolvedEmailProviderConfig, message: EmailMessage) {
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: requireValue(config.user, 'GMAIL_USER', 'gmail'),
      pass: requireValue(config.appPassword, 'GMAIL_APP_PASSWORD', 'gmail'),
    },
  });

  return transport.sendMail({
    from: formatFrom(config.fromEmail, config.fromName),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: htmlToText(message.html),
    attachments: message.attachments,
  });
}

async function sendWithSmtp(config: ResolvedEmailProviderConfig, message: EmailMessage) {
  const options: SMTPTransport.Options = {
    host: requireValue(config.host, 'SMTP_HOST', 'smtp'),
    port: requireNumberValue(config.port, 'SMTP_PORT', 'smtp'),
    secure: Boolean(config.secure),
  };

  if (config.user && config.appPassword) {
    options.auth = {
      user: config.user,
      pass: config.appPassword,
    };
  }

  const transport = nodemailer.createTransport(options);

  return transport.sendMail({
    from: formatFrom(config.fromEmail, config.fromName),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: htmlToText(message.html),
    attachments: message.attachments,
  });
}

function formatFrom(fromEmail: string | undefined, fromName: string | undefined, allowTestFallback = false) {
  if (!fromEmail) {
    if (allowTestFallback) {
      return 'no-reply@example.test';
    }
    throw new Error('A sender email address must be configured before sending email.');
  }

  if (!fromName) return fromEmail;
  const escapedName = fromName.replace(/"/g, '\\"');
  return `"${escapedName}" <${fromEmail}>`;
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function assertSuccessfulProviderResponse(response: Response, providerLabel: string) {
  if (response.ok) {
    return;
  }

  const body = await response.text();
  const suffix = body ? ` ${body}` : '';
  throw new Error(`${providerLabel} email request failed with status ${response.status}.${suffix}`.trim());
}

function requireValue(value: string | undefined, field: string, provider: EmailProvider) {
  if (value) return value;
  throw new Error(`Email provider "${provider}" is missing required config ${field}.`);
}

function requireNumberValue(value: number | undefined, field: string, provider: EmailProvider) {
  if (typeof value === 'number') return value;
  throw new Error(`Email provider "${provider}" is missing required config ${field}.`);
}

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '');
}
