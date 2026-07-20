import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { registry } from '../../openapi/registry';
import { errorResponse } from '../../openapi/components';
import { AdminUserPublic, LoginBody, LoginResponse } from './schemas';
import { findUserById, signToken, verifyCredentials } from './service';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginBody.parse(req.body);
    const user = await verifyCredentials(email, password);
    res.json({ token: signToken({ sub: user.id, role: user.role }), user });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAdmin, async (req, res, next) => {
  try {
    res.json(await findUserById(req.auth!.userId));
  } catch (err) {
    next(err);
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Auth'],
  summary: 'Login admin',
  request: {
    body: { content: { 'application/json': { schema: LoginBody } } },
  },
  responses: {
    200: {
      description: 'Login berhasil',
      content: { 'application/json': { schema: LoginResponse } },
    },
    400: errorResponse('Data login tidak valid'),
    401: errorResponse('Email atau kata sandi salah'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags: ['Auth'],
  summary: 'Profil admin yang sedang login',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Data pengguna',
      content: { 'application/json': { schema: AdminUserPublic } },
    },
    401: errorResponse('Token tidak valid atau tidak dikirim'),
  },
});
