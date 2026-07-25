import { z } from 'zod';
import { registry } from '../../openapi/registry';
import { PushPlatformSchema } from '../requests/schemas';

export const DeviceTokenBody = registry.register(
  'DeviceTokenBody',
  z.object({
    token: z.string().trim().min(1, 'Token perangkat wajib diisi'),
    platform: PushPlatformSchema.default('unknown'),
  }),
);

export const DeviceTokenPreferencesBody = registry.register(
  'DeviceTokenPreferencesBody',
  DeviceTokenBody.extend({
    letter_status_notifications: z.boolean().optional(),
    feedback_status_notifications: z.boolean().optional(),
    announcement_notifications: z.boolean().optional(),
  }),
);

export const DeviceTokenResponse = registry.register(
  'DeviceTokenResponse',
  z.object({
    id: z.string(),
    token: z.string(),
    platform: PushPlatformSchema,
    active: z.boolean(),
    letter_status_notifications: z.boolean(),
    feedback_status_notifications: z.boolean(),
    announcement_notifications: z.boolean(),
  }),
);

export const DeviceTokenDeletedResponse = registry.register(
  'DeviceTokenDeletedResponse',
  z.object({
    active: z.literal(false),
  }),
);

export type DeviceTokenBodyType = z.infer<typeof DeviceTokenBody>;
export type DeviceTokenPreferencesBodyType = z.infer<typeof DeviceTokenPreferencesBody>;
