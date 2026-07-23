import bcrypt from 'bcryptjs';
import type { AdminRole, AdminUser } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import type {
  AdminUserListItemType,
  CreateAdminUserBodyType,
  UpdateAdminUserBodyType,
} from './schemas';

export async function listAdminUsers(): Promise<AdminUserListItemType[]> {
  const users = await prisma.adminUser.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });

  return users.map(toListItem);
}

export async function createAdminUser(input: CreateAdminUserBodyType): Promise<AdminUserListItemType> {
  await assertEmailAvailable(input.email);

  const user = await prisma.adminUser.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: await bcrypt.hash(input.password, 10),
      active: input.active,
      role: input.role,
    },
  });

  return toListItem(user);
}

export async function updateAdminUser(
  id: string,
  actorId: string,
  input: UpdateAdminUserBodyType,
): Promise<AdminUserListItemType> {
  const existing = await prisma.adminUser.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Akun pengguna tidak ditemukan');

  const nextRole = input.role ?? existing.role;
  const nextActive = input.active ?? existing.active;

  if (input.email && input.email.trim().toLowerCase() !== existing.email) {
    await assertEmailAvailable(input.email, id);
  }

  await assertAdminAvailability({
    editedUserId: id,
    actorId,
    currentRole: existing.role,
    nextRole,
    nextActive,
  });

  const user = await prisma.adminUser.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 10) } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
    },
  });

  return toListItem(user);
}

async function assertEmailAvailable(email: string, exceptId?: string) {
  const existing = await prisma.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });

  if (existing && existing.id !== exceptId) {
    throw ApiError.conflict('Email sudah digunakan oleh akun lain');
  }
}

async function assertAdminAvailability(input: {
  editedUserId: string;
  actorId: string;
  currentRole: AdminRole;
  nextRole: AdminRole;
  nextActive: boolean;
}) {
  const removesAdminAccess =
    input.currentRole === 'admin' && (input.nextRole !== 'admin' || !input.nextActive);

  if (!removesAdminAccess) return;

  const activeAdmins = await prisma.adminUser.count({
    where: {
      id: { not: input.editedUserId },
      role: 'admin',
      active: true,
    },
  });

  if (activeAdmins === 0) {
    throw ApiError.validation('Minimal harus ada satu akun Admin aktif', {
      active: 'Minimal harus ada satu akun Admin aktif',
      role: 'Minimal harus ada satu akun Admin aktif',
    });
  }

  if (input.editedUserId === input.actorId) {
    throw ApiError.validation('Admin tidak dapat menonaktifkan akses Sistem miliknya sendiri', {
      active: 'Gunakan akun Admin lain untuk mengubah status akun ini',
      role: 'Gunakan akun Admin lain untuk mengubah role akun ini',
    });
  }
}

function toListItem(user: AdminUser): AdminUserListItemType {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}
