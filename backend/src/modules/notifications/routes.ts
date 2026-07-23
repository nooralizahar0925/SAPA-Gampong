import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import {
  DeviceTokenBody,
  DeviceTokenDeletedResponse,
  DeviceTokenResponse,
} from './schemas';
import { registerDeviceToken, unregisterDeviceToken } from './service';

export const notificationsRouter = Router();

defineRoute(notificationsRouter, {
  method: 'post',
  path: '/device-tokens',
  fullPath: '/api/notifications/device-tokens',
  tags: ['Notifications'],
  summary: 'Register a resident app push token',
  body: DeviceTokenBody,
  responses: {
    200: {
      description: 'Registered device token',
      content: { 'application/json': { schema: DeviceTokenResponse } },
    },
    400: errorResponse('Invalid token payload'),
  },
  handler: async ({ body, res }) => {
    res.json(await registerDeviceToken(body));
  },
});

defineRoute(notificationsRouter, {
  method: 'delete',
  path: '/device-tokens',
  fullPath: '/api/notifications/device-tokens',
  tags: ['Notifications'],
  summary: 'Deactivate a resident app push token',
  body: DeviceTokenBody,
  responses: {
    200: {
      description: 'Device token deactivated',
      content: { 'application/json': { schema: DeviceTokenDeletedResponse } },
    },
    400: errorResponse('Invalid token payload'),
  },
  handler: async ({ body, res }) => {
    await unregisterDeviceToken(body.token);
    res.json({ active: false });
  },
});
