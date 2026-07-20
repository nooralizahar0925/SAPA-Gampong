import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import { AdminUserPublic, LoginBody, LoginResponse } from './schemas';
import { findUserById, signToken, verifyCredentials } from './service';

export const authRouter = Router();

defineRoute(authRouter, {
  method: 'post',
  path: '/login',
  fullPath: '/api/auth/login',
  tags: ['Auth'],
  summary: 'Login admin',
  body: LoginBody,
  responses: {
    200: {
      description: 'Login berhasil',
      content: { 'application/json': { schema: LoginResponse } },
    },
    400: errorResponse('Data login tidak valid'),
    401: errorResponse('Email atau kata sandi salah'),
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
  summary: 'Profil admin yang sedang login',
  auth: 'admin',
  responses: {
    200: {
      description: 'Data pengguna',
      content: { 'application/json': { schema: AdminUserPublic } },
    },
    401: errorResponse('Token tidak valid atau tidak dikirim'),
  },
  handler: async ({ req, res }) => {
    res.json(await findUserById(req.auth!.userId));
  },
});
