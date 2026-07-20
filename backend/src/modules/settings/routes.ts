import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import { EmailProviderSettingsResponse, UpdateEmailProviderBody } from './schemas';
import { getEmailProviderSettings, updateEmailProvider } from './service';

export const settingsRouter = Router();

defineRoute(settingsRouter, {
  method: 'get',
  path: '/email-provider',
  fullPath: '/api/settings/email-provider',
  tags: ['Settings'],
  summary: 'Get the current email provider selection and provider readiness',
  auth: 'admin',
  responses: {
    200: {
      description: 'Current email provider settings',
      content: { 'application/json': { schema: EmailProviderSettingsResponse } },
    },
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ res }) => {
    res.json(await getEmailProviderSettings());
  },
});

defineRoute(settingsRouter, {
  method: 'patch',
  path: '/email-provider',
  fullPath: '/api/settings/email-provider',
  tags: ['Settings'],
  summary: 'Update the active email provider',
  auth: 'admin',
  body: UpdateEmailProviderBody,
  responses: {
    200: {
      description: 'Updated email provider settings',
      content: { 'application/json': { schema: EmailProviderSettingsResponse } },
    },
    400: errorResponse('Invalid provider payload'),
    401: errorResponse('Authentication is required'),
    409: errorResponse('Selected provider is not configured'),
  },
  handler: async ({ body, res }) => {
    res.json(await updateEmailProvider(body.provider));
  },
});
