import type { EmailProvider } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import {
  EmailService,
  getDefaultEmailProvider,
  getEmailProviderCatalog,
  getEmailProviderLabel,
  isEmailProviderConfigured,
  saveEmailProviderConfig,
  type UpdateEmailProviderConfigInput,
} from '../../services/email.service';

const APP_CONFIG_ID = 'singleton';

export async function getEmailProviderSettings() {
  const config = await prisma.appConfig.findUnique({
    where: { id: APP_CONFIG_ID },
    select: { activeEmailProvider: true },
  });

  return {
    active_provider: config?.activeEmailProvider ?? getDefaultEmailProvider(),
    default_provider: getDefaultEmailProvider(),
    providers: await getEmailProviderCatalog(),
  };
}

export async function updateEmailProvider(provider: EmailProvider) {
  if (!(await isEmailProviderConfigured(provider))) {
    throw ApiError.conflict(`Email provider ${provider} is not configured yet.`);
  }

  await prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    create: { id: APP_CONFIG_ID, activeEmailProvider: provider },
    update: { activeEmailProvider: provider },
  });

  return getEmailProviderSettings();
}

export async function updateEmailProviderConfig(input: UpdateEmailProviderConfigInput) {
  await saveEmailProviderConfig(input);
  return getEmailProviderSettings();
}

/* -------------------------------------------------------------------------- */
/* Application settings (contact, letterhead, signatory)                      */
/* -------------------------------------------------------------------------- */

type AppSettingsInput = {
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_address?: string | null;
  letterhead_line1?: string | null;
  letterhead_line2?: string | null;
  letterhead_line3?: string | null;
  keuchik_title?: string | null;
  keuchik_name?: string | null;
  secretary_title?: string | null;
  secretary_name?: string | null;
};

/** Drops keys whose value is `undefined` so Prisma leaves those columns untouched. */
function definedOnly<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * Deliberately hand-picks fields rather than spreading the row: AppConfig also holds
 * `emailProviderConfigs`, which contains API keys and SMTP passwords that must never
 * reach the browser.
 */
export async function getAppSettings() {
  const config = await prisma.appConfig.findUnique({ where: { id: APP_CONFIG_ID } });

  return {
    contact_phone: config?.contactPhone ?? null,
    contact_email: config?.contactEmail ?? null,
    contact_address: config?.contactAddress ?? null,
    letterhead_line1: config?.letterheadLine1 ?? null,
    letterhead_line2: config?.letterheadLine2 ?? null,
    letterhead_line3: config?.letterheadLine3 ?? null,
    keuchik_title: config?.keuchikTitle ?? null,
    keuchik_name: config?.keuchikName ?? null,
    secretary_title: config?.secretaryTitle ?? null,
    secretary_name: config?.secretaryName ?? null,
    updated_at: config ? config.updatedAt.toISOString() : null,
  };
}

export async function updateAppSettings(input: AppSettingsInput) {
  const data = definedOnly({
    contactPhone: input.contact_phone,
    contactEmail: input.contact_email,
    contactAddress: input.contact_address,
    letterheadLine1: input.letterhead_line1,
    letterheadLine2: input.letterhead_line2,
    letterheadLine3: input.letterhead_line3,
    keuchikTitle: input.keuchik_title,
    keuchikName: input.keuchik_name,
    secretaryTitle: input.secretary_title,
    secretaryName: input.secretary_name,
  });

  await prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    create: { id: APP_CONFIG_ID, ...data },
    update: data,
  });

  return getAppSettings();
}

/* -------------------------------------------------------------------------- */
/* Letter number counters                                                     */
/* -------------------------------------------------------------------------- */

const LETTER_TYPES = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'] as const;

type LetterTypeCode = (typeof LETTER_TYPES)[number];

/**
 * Returns all ten letter types, not just the ones with rows, so the dashboard can show
 * a complete table. Types never used yet report 0.
 */
export async function getLetterCounters(year: number) {
  const rows = await prisma.letterNumberCounter.findMany({ where: { year } });
  const byType = new Map(rows.map((row) => [row.letterType, row.lastNumber]));

  return {
    year,
    counters: LETTER_TYPES.map((letterType) => ({
      letter_type: letterType,
      last_number: byType.get(letterType) ?? 0,
    })),
  };
}

export async function updateLetterCounter(input: {
  letter_type: LetterTypeCode;
  year: number;
  last_number: number;
}) {
  await prisma.letterNumberCounter.upsert({
    where: { letterType_year: { letterType: input.letter_type, year: input.year } },
    create: {
      letterType: input.letter_type,
      year: input.year,
      lastNumber: input.last_number,
    },
    update: { lastNumber: input.last_number },
  });

  return getLetterCounters(input.year);
}

export async function sendEmailProviderTestEmail(provider: EmailProvider, toEmail: string) {
  if (!(await isEmailProviderConfigured(provider))) {
    throw ApiError.conflict(`Email provider ${provider} is not configured yet.`);
  }

  try {
    await EmailService.sendWithProvider(provider, {
      to: toEmail,
      subject: `[Test] ${getEmailProviderLabel(provider)} configuration`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#173527;">
          <h2 style="margin:0 0 16px;">Test email delivered successfully</h2>
          <p style="margin:0 0 12px;">
            This message confirms that the <strong>${getEmailProviderLabel(provider)}</strong> provider
            can send email from the administration system.
          </p>
          <p style="margin:0;">
            Sent on July 20, 2026 from the dashboard email provider settings screen.
          </p>
        </div>
      `.trim(),
    });
  } catch (error) {
    throw new ApiError(
      'SERVER_ERROR',
      `${getEmailProviderLabel(provider)} test email failed: ${formatProviderSendError(error)}`,
    );
  }

  return {
    message: `Test email sent via ${getEmailProviderLabel(provider)} to ${toEmail}.`,
  };
}

function formatProviderSendError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'The email provider returned an unknown error.';
  }

  const message = error.message.trim();
  if (!message) {
    return 'The email provider returned an empty error message.';
  }

  return message;
}
