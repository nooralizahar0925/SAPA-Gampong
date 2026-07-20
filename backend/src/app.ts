import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './modules/auth/routes';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
