import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import {
  EmailProviderSettingsResponse,
  SettingsMessageResponse,
  TestEmailProviderBody,
  UpdateEmailProviderBody,
  UpdateEmailProviderConfigBody,
} from './schemas';
import {
  getEmailProviderSettings,
  sendEmailProviderTestEmail,
  updateEmailProvider,
  updateEmailProviderConfig,
} from './service';

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

defineRoute(settingsRouter, {
  method: 'patch',
  path: '/email-provider/config',
  fullPath: '/api/settings/email-provider/config',
  tags: ['Settings'],
  summary: 'Save email provider configuration values',
  auth: 'admin',
  body: UpdateEmailProviderConfigBody,
  responses: {
    200: {
      description: 'Updated email provider settings',
      content: { 'application/json': { schema: EmailProviderSettingsResponse } },
    },
    400: errorResponse('Invalid provider configuration payload'),
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ body, res }) => {
    res.json(await updateEmailProviderConfig(body));
  },
});

defineRoute(settingsRouter, {
  method: 'post',
  path: '/email-provider/test',
  fullPath: '/api/settings/email-provider/test',
  tags: ['Settings'],
  summary: 'Send a test email using the selected provider',
  auth: 'admin',
  body: TestEmailProviderBody,
  responses: {
    200: {
      description: 'Test email sent successfully',
      content: { 'application/json': { schema: SettingsMessageResponse } },
    },
    400: errorResponse('Invalid test email payload'),
    401: errorResponse('Authentication is required'),
    409: errorResponse('Selected provider is not configured'),
  },
  handler: async ({ body, res }) => {
    res.json(await sendEmailProviderTestEmail(body.provider, body.to_email));
  },
});
