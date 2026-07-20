import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import {
  AppSettingsResponse,
  EmailProviderSettingsResponse,
  LetterCountersQuery,
  LetterCountersResponse,
  SettingsMessageResponse,
  TestEmailProviderBody,
  UpdateAppSettingsBody,
  UpdateEmailProviderBody,
  UpdateEmailProviderConfigBody,
  UpdateLetterCounterBody,
} from './schemas';
import {
  getAppSettings,
  getEmailProviderSettings,
  getLetterCounters,
  sendEmailProviderTestEmail,
  updateAppSettings,
  updateEmailProvider,
  updateEmailProviderConfig,
  updateLetterCounter,
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

defineRoute(settingsRouter, {
  method: 'get',
  path: '/app',
  fullPath: '/api/settings/app',
  tags: ['Settings'],
  summary: 'Get contact, letterhead, and signatory settings',
  auth: 'admin',
  responses: {
    200: {
      description: 'Current application settings',
      content: { 'application/json': { schema: AppSettingsResponse } },
    },
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ res }) => {
    res.json(await getAppSettings());
  },
});

defineRoute(settingsRouter, {
  method: 'patch',
  path: '/app',
  fullPath: '/api/settings/app',
  tags: ['Settings'],
  summary: 'Update contact, letterhead, and signatory settings',
  auth: 'admin',
  body: UpdateAppSettingsBody,
  responses: {
    200: {
      description: 'Updated application settings',
      content: { 'application/json': { schema: AppSettingsResponse } },
    },
    400: errorResponse('Invalid application settings payload'),
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ body, res }) => {
    res.json(await updateAppSettings(body));
  },
});

defineRoute(settingsRouter, {
  method: 'get',
  path: '/letter-counters',
  fullPath: '/api/settings/letter-counters',
  tags: ['Settings'],
  summary: 'List letter-number counters for a year',
  auth: 'admin',
  query: LetterCountersQuery,
  responses: {
    200: {
      description: 'Counters for every letter type in the requested year',
      content: { 'application/json': { schema: LetterCountersResponse } },
    },
    400: errorResponse('Invalid year'),
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ query, res }) => {
    res.json(await getLetterCounters(query.year ?? new Date().getFullYear()));
  },
});

defineRoute(settingsRouter, {
  method: 'patch',
  path: '/letter-counters',
  fullPath: '/api/settings/letter-counters',
  tags: ['Settings'],
  summary: 'Set the last used number for a letter type and year',
  auth: 'admin',
  body: UpdateLetterCounterBody,
  responses: {
    200: {
      description: 'Counters after the update',
      content: { 'application/json': { schema: LetterCountersResponse } },
    },
    400: errorResponse('Invalid counter payload'),
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ body, res }) => {
    res.json(await updateLetterCounter(body));
  },
});
