import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { env } from '../config/env';

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
    attachments?: EmailAttachment[];
  }): Promise<unknown>;
};

let transportOverride: EmailTransport | null = null;
let cachedTransport: EmailTransport | null = null;

export const EmailService = {
  async send(message: EmailMessage) {
    const transport = getTransport();
    return transport.sendMail({
      from: formatFrom(transportOverride !== null),
      to: message.to,
      subject: message.subject,
      html: message.html,
      attachments: message.attachments,
    });
  },
};

export function setEmailTransportForTests(transport: EmailTransport | null) {
  transportOverride = transport;
  if (transport) return;
  cachedTransport = null;
}

function getTransport() {
  if (transportOverride) return transportOverride;
  if (cachedTransport) return cachedTransport;

  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    throw new Error('SMTP is not configured. Set SMTP_HOST and SMTP_PORT before sending email.');
  }

  const options: SMTPTransport.Options = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
  };

  if (env.SMTP_USER && env.SMTP_PASS) {
    options.auth = {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    };
  }

  const transport = nodemailer.createTransport(options);
  cachedTransport = transport;
  return transport;
}

function formatFrom(allowTestFallback: boolean) {
  const fromEmail = env.SMTP_FROM_EMAIL ?? env.SMTP_USER;
  if (!fromEmail && allowTestFallback) {
    return 'no-reply@example.test';
  }
  if (!fromEmail) {
    throw new Error('SMTP_FROM_EMAIL or SMTP_USER must be configured before sending email.');
  }

  if (!env.SMTP_FROM_NAME) return fromEmail;
  return `"${env.SMTP_FROM_NAME}" <${fromEmail}>`;
}
