import type { EmailProvider } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import {
  getDefaultEmailProvider,
  getEmailProviderCatalog,
  isEmailProviderConfigured,
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
    providers: getEmailProviderCatalog(),
  };
}

export async function updateEmailProvider(provider: EmailProvider) {
  if (!isEmailProviderConfigured(provider)) {
    throw ApiError.conflict(`Provider email ${provider} belum dikonfigurasi`);
  }

  await prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    create: { id: APP_CONFIG_ID, activeEmailProvider: provider },
    update: { activeEmailProvider: provider },
  });

  return getEmailProviderSettings();
}
