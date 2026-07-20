import type { EmailProvider } from '@prisma/client';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

const APP_CONFIG_ID = 'singleton';

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
};

type EmailProviderCatalogItem = {
  id: EmailProvider;
  label: string;
  configured: boolean;
};

type EmailProviderConfigOverrides = Partial<Record<EmailProvider, Partial<ResolvedEmailProviderConfig>>>;

let transportOverride: EmailTransport | null = null;
let cachedGmailTransport: EmailTransport | null = null;
let cachedSmtpTransport: EmailTransport | null = null;
let providerConfigOverrides: EmailProviderConfigOverrides | null = null;

export const EmailService = {
  async send(message: EmailMessage) {
    if (transportOverride) {
      return transportOverride.sendMail({
        from: formatFrom(env.SMTP_FROM_EMAIL ?? env.GMAIL_USER, env.SMTP_FROM_NAME ?? env.GMAIL_FROM_NAME, true),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: htmlToText(message.html),
        attachments: message.attachments,
      });
    }

    const provider = await resolveActiveEmailProvider();
    const config = resolveProviderConfigs()[provider];

    if (!config.configured) {
      throw new Error(`Email provider "${provider}" is not configured.`);
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
  },
};

export function getDefaultEmailProvider(): EmailProvider {
  return env.EMAIL_PROVIDER_DEFAULT;
}

export function getEmailProviderCatalog(): EmailProviderCatalogItem[] {
  const configs = resolveProviderConfigs();
  return (Object.keys(EMAIL_PROVIDER_LABELS) as EmailProvider[]).map((provider) => ({
    id: provider,
    label: configs[provider].label,
    configured: configs[provider].configured,
  }));
}

export function isEmailProviderConfigured(provider: EmailProvider): boolean {
  return resolveProviderConfigs()[provider].configured;
}

export function setEmailTransportForTests(transport: EmailTransport | null) {
  transportOverride = transport;
  if (transport) return;
  cachedGmailTransport = null;
  cachedSmtpTransport = null;
}

export function setEmailProviderConfigsForTests(overrides: EmailProviderConfigOverrides | null) {
  providerConfigOverrides = overrides;
  cachedGmailTransport = null;
  cachedSmtpTransport = null;
}

async function resolveActiveEmailProvider(): Promise<EmailProvider> {
  const config = await prisma.appConfig.findUnique({
    where: { id: APP_CONFIG_ID },
    select: { activeEmailProvider: true },
  });

  return config?.activeEmailProvider ?? getDefaultEmailProvider();
}

function resolveProviderConfigs(): Record<EmailProvider, ResolvedEmailProviderConfig> {
  const base: Record<EmailProvider, ResolvedEmailProviderConfig> = {
    mailersend: buildMailerSendConfig(),
    mailgun: buildMailgunConfig(),
    gmail: buildGmailConfig(),
    smtp: buildSmtpConfig(),
  };

  if (!providerConfigOverrides) {
    return base;
  }

  return {
    mailersend: mergeProviderConfig(base.mailersend, providerConfigOverrides.mailersend),
    mailgun: mergeProviderConfig(base.mailgun, providerConfigOverrides.mailgun),
    gmail: mergeProviderConfig(base.gmail, providerConfigOverrides.gmail),
    smtp: mergeProviderConfig(base.smtp, providerConfigOverrides.smtp),
  };
}

function buildMailerSendConfig(): ResolvedEmailProviderConfig {
  const fromEmail = env.MAILERSEND_FROM_EMAIL ?? env.SMTP_FROM_EMAIL;
  const fromName = env.MAILERSEND_FROM_NAME ?? env.SMTP_FROM_NAME;
  const apiKey = env.MAILERSEND_API_KEY;

  return {
    id: 'mailersend',
    label: EMAIL_PROVIDER_LABELS.mailersend,
    configured: Boolean(apiKey && fromEmail),
    fromEmail,
    fromName,
    apiKey,
  };
}

function buildMailgunConfig(): ResolvedEmailProviderConfig {
  const fromEmail = env.MAILGUN_FROM_EMAIL ?? env.SMTP_FROM_EMAIL;
  const fromName = env.MAILGUN_FROM_NAME ?? env.SMTP_FROM_NAME;
  const apiKey = env.MAILGUN_API_KEY;
  const domain = env.MAILGUN_DOMAIN;

  return {
    id: 'mailgun',
    label: EMAIL_PROVIDER_LABELS.mailgun,
    configured: Boolean(apiKey && domain && fromEmail),
    fromEmail,
    fromName,
    apiKey,
    domain,
    baseUrl: env.MAILGUN_BASE_URL,
  };
}

function buildGmailConfig(): ResolvedEmailProviderConfig {
  const user = env.GMAIL_USER ?? env.SMTP_USER;
  const appPassword = env.GMAIL_APP_PASSWORD ?? env.SMTP_PASS;
  const fromEmail = env.GMAIL_FROM_EMAIL ?? env.SMTP_FROM_EMAIL ?? user;
  const fromName = env.GMAIL_FROM_NAME ?? env.SMTP_FROM_NAME;

  return {
    id: 'gmail',
    label: EMAIL_PROVIDER_LABELS.gmail,
    configured: Boolean(user && appPassword && fromEmail),
    fromEmail,
    fromName,
    user,
    appPassword,
  };
}

function buildSmtpConfig(): ResolvedEmailProviderConfig {
  const fromEmail = env.SMTP_FROM_EMAIL ?? env.SMTP_USER;
  const fromName = env.SMTP_FROM_NAME;

  return {
    id: 'smtp',
    label: EMAIL_PROVIDER_LABELS.smtp,
    configured: Boolean(env.SMTP_HOST && env.SMTP_PORT && fromEmail),
    fromEmail,
    fromName,
    user: env.SMTP_USER,
    appPassword: env.SMTP_PASS,
  };
}

function mergeProviderConfig(
  base: ResolvedEmailProviderConfig,
  override: Partial<ResolvedEmailProviderConfig> | undefined,
): ResolvedEmailProviderConfig {
  if (!override) return base;
  return { ...base, ...override };
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
        disposition: 'attachment',
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
      'attachment',
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
  const transport = getGmailTransport(config);
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
  const transport = getSmtpTransport(config);
  return transport.sendMail({
    from: formatFrom(config.fromEmail, config.fromName),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: htmlToText(message.html),
    attachments: message.attachments,
  });
}

function getGmailTransport(config: ResolvedEmailProviderConfig): EmailTransport {
  if (cachedGmailTransport) {
    return cachedGmailTransport;
  }

  const options: SMTPTransport.Options = {
    service: 'gmail',
    auth: {
      user: requireValue(config.user, 'GMAIL_USER', 'gmail'),
      pass: requireValue(config.appPassword, 'GMAIL_APP_PASSWORD', 'gmail'),
    },
  };

  cachedGmailTransport = nodemailer.createTransport(options);
  return cachedGmailTransport;
}

function getSmtpTransport(config: ResolvedEmailProviderConfig): EmailTransport {
  if (cachedSmtpTransport) {
    return cachedSmtpTransport;
  }

  const options: SMTPTransport.Options = {
    host: requireValue(env.SMTP_HOST, 'SMTP_HOST', 'smtp'),
    port: requireNumberValue(env.SMTP_PORT, 'SMTP_PORT', 'smtp'),
    secure: env.SMTP_SECURE,
  };

  if (config.user && config.appPassword) {
    options.auth = {
      user: config.user,
      pass: config.appPassword,
    };
  }

  cachedSmtpTransport = nodemailer.createTransport(options);
  return cachedSmtpTransport;
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
