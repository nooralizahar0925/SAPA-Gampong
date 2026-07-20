import { z } from 'zod';
import { registry } from '../../openapi/registry';

export const LoginBody = registry.register(
  'LoginBody',
  z.object({
    email: z.string().email('Format email tidak valid').openapi({ example: 'admin@gampongblang.id' }),
    password: z.string().min(1, 'Kata sandi wajib diisi').openapi({ example: 'kata-sandi-anda' }),
  }),
);

export const ForgotPasswordBody = registry.register(
  'ForgotPasswordBody',
  z.object({
    email: z
      .string()
      .email('Format email tidak valid')
      .openapi({ example: 'admin@gampongblang.id' }),
  }),
);

export const ForgotPasswordResponse = registry.register(
  'ForgotPasswordResponse',
  z.object({
    message: z.string(),
    reset_url: z.string().url().optional(),
  }),
);

export const ResetPasswordBody = registry.register(
  'ResetPasswordBody',
  z.object({
    token: z.string().min(1, 'Token reset wajib diisi'),
    password: z
      .string()
      .min(8, 'Kata sandi baru minimal 8 karakter')
      .openapi({ example: 'AdminBaru123' }),
  }),
);

export const MessageResponse = registry.register(
  'MessageResponse',
  z.object({
    message: z.string(),
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
