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
