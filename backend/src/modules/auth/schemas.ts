import { z } from 'zod';

export const LoginBody = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export const AdminUserPublic = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'approver']),
});

export const LoginResponse = z.object({
  token: z.string(),
  user: AdminUserPublic,
});

export type LoginBodyType = z.infer<typeof LoginBody>;
export type AdminUserPublicType = z.infer<typeof AdminUserPublic>;
