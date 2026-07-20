import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { LoginBody } from './schemas';
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
