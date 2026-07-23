import { z } from 'zod';
import { registry } from '../../openapi/registry';

export const UserRoleSchema = z.enum(['admin', 'operator']);

export const AdminUserListItem = registry.register(
  'AdminUserListItem',
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: UserRoleSchema,
    active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
);

export const AdminUserListResponse = registry.register(
  'AdminUserListResponse',
  z.array(AdminUserListItem),
);

export const AdminUserParams = z.object({
  id: z.string().min(1),
});

export const CreateAdminUserBody = registry.register(
  'CreateAdminUserBody',
  z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(120),
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
    active: z.boolean().default(true),
    role: UserRoleSchema.default('operator'),
  }),
);

export const UpdateAdminUserBody = registry.register(
  'UpdateAdminUserBody',
  z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(120).optional(),
    email: z.string().email('Format email tidak valid').optional(),
    password: z.string().min(8, 'Kata sandi minimal 8 karakter').optional(),
    active: z.boolean().optional(),
    role: UserRoleSchema.optional(),
  }),
);

export type AdminUserListItemType = z.infer<typeof AdminUserListItem>;
export type CreateAdminUserBodyType = z.infer<typeof CreateAdminUserBody>;
export type UpdateAdminUserBodyType = z.infer<typeof UpdateAdminUserBody>;
