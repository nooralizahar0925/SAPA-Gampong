import { z } from 'zod';
import { registry } from '../../openapi/registry';

export const LoginBody = registry.register(
  'LoginBody',
  z.object({
    email: z.string().email('Format email tidak valid').openapi({ example: 'admin@gampongblang.id' }),
    password: z.string().min(1, 'Kata sandi wajib diisi').openapi({ example: 'admin123' }),
  }),
);

export const AdminUserPublic = registry.register(
  'AdminUserPublic',
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['admin', 'approver']),
  }),
);

export const LoginResponse = registry.register(
  'LoginResponse',
  z.object({
    token: z.string(),
    user: AdminUserPublic,
  }),
);

export type LoginBodyType = z.infer<typeof LoginBody>;
export type AdminUserPublicType = z.infer<typeof AdminUserPublic>;
