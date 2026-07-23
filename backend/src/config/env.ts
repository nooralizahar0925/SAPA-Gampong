import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  APP_CONFIG_ENCRYPTION_KEY: z.string().min(8).optional(),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:8080'),
  DASHBOARD_BASE_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  EMAIL_PROVIDER_DEFAULT: z.enum(['mailersend', 'mailgun', 'gmail', 'smtp']).default('mailersend'),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().min(1).optional(),
  MAILERSEND_API_KEY: z.string().min(1).optional(),
  MAILERSEND_FROM_EMAIL: z.string().email().optional(),
  MAILERSEND_FROM_NAME: z.string().min(1).optional(),
  MAILGUN_API_KEY: z.string().min(1).optional(),
  MAILGUN_DOMAIN: z.string().min(1).optional(),
  MAILGUN_BASE_URL: z.string().url().default('https://api.mailgun.net'),
  MAILGUN_FROM_EMAIL: z.string().email().optional(),
  MAILGUN_FROM_NAME: z.string().min(1).optional(),
  GMAIL_USER: z.string().email().optional(),
  GMAIL_APP_PASSWORD: z.string().min(1).optional(),
  GMAIL_FROM_EMAIL: z.string().email().optional(),
  GMAIL_FROM_NAME: z.string().min(1).optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
  DOCS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;
export type Env = typeof env;
