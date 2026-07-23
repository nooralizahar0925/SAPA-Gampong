import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import {
  AdminUserPublic,
  ForgotPasswordBody,
  ForgotPasswordResponse,
  LoginBody,
  LoginResponse,
  MessageResponse,
  ResetPasswordBody,
  UpdateProfileBody,
} from './schemas';
import {
  findUserById,
  requestPasswordReset,
  resetPassword,
  signToken,
  updateOwnProfile,
  verifyCredentials,
} from './service';

export const authRouter = Router();

defineRoute(authRouter, {
  method: 'post',
  path: '/login',
  fullPath: '/api/auth/login',
  tags: ['Auth'],
  summary: 'Admin login',
  body: LoginBody,
  responses: {
    200: {
      description: 'Login succeeded',
      content: { 'application/json': { schema: LoginResponse } },
    },
    400: errorResponse('Invalid login payload'),
    401: errorResponse('Incorrect email or password'),
  },
  handler: async ({ body, res }) => {
    const user = await verifyCredentials(body.email, body.password);
    res.json({ token: signToken({ sub: user.id, role: user.role }), user });
  },
});

defineRoute(authRouter, {
  method: 'get',
  path: '/me',
  fullPath: '/api/auth/me',
  tags: ['Auth'],
  summary: 'Current admin profile',
  auth: 'admin',
  responses: {
    200: {
      description: 'Current user',
      content: { 'application/json': { schema: AdminUserPublic } },
    },
    401: errorResponse('Token is invalid or missing'),
  },
  handler: async ({ req, res }) => {
    res.json(await findUserById(req.auth!.userId));
  },
});

defineRoute(authRouter, {
  method: 'patch',
  path: '/me',
  fullPath: '/api/auth/me',
  tags: ['Auth'],
  summary: 'Update the current admin profile',
  auth: 'admin',
  body: UpdateProfileBody,
  responses: {
    200: {
      description: 'Updated current user',
      content: { 'application/json': { schema: AdminUserPublic } },
    },
    400: errorResponse('Invalid profile payload'),
    401: errorResponse('Token is invalid or missing'),
  },
  handler: async ({ req, body, res }) => {
    res.json(await updateOwnProfile(req.auth!.userId, body));
  },
});

defineRoute(authRouter, {
  method: 'post',
  path: '/forgot-password',
  fullPath: '/api/auth/forgot-password',
  tags: ['Auth'],
  summary: 'Send a password reset link',
  body: ForgotPasswordBody,
  responses: {
    200: {
      description: 'Password reset email request accepted',
      content: { 'application/json': { schema: ForgotPasswordResponse } },
    },
    400: errorResponse('Invalid password reset payload'),
  },
  handler: async ({ body, res }) => {
    const result = await requestPasswordReset(body.email);
    res.json({
      message: 'Jika email terdaftar, tautan reset kata sandi telah dikirim.',
      ...(result.previewUrl ? { reset_url: result.previewUrl } : {}),
    });
  },
});

defineRoute(authRouter, {
  method: 'post',
  path: '/reset-password',
  fullPath: '/api/auth/reset-password',
  tags: ['Auth'],
  summary: 'Reset a password with a valid token',
  body: ResetPasswordBody,
  responses: {
    200: {
      description: 'Password reset succeeded',
      content: { 'application/json': { schema: MessageResponse } },
    },
    400: errorResponse('Reset token is invalid or expired'),
  },
  handler: async ({ body, res }) => {
    await resetPassword(body.token, body.password);
    res.json({ message: 'Kata sandi berhasil diperbarui. Silakan login kembali.' });
  },
});
