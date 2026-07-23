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

export const DeviceTokenResponse = registry.register(
  'DeviceTokenResponse',
  z.object({
    id: z.string(),
    token: z.string(),
    platform: PushPlatformSchema,
    active: z.boolean(),
  }),
);

export const DeviceTokenDeletedResponse = registry.register(
  'DeviceTokenDeletedResponse',
  z.object({
    active: z.literal(false),
  }),
);

export type DeviceTokenBodyType = z.infer<typeof DeviceTokenBody>;
