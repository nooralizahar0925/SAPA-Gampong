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
