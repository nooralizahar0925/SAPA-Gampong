import express from 'express';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { docsRouter } from './openapi/routes';
import { authRouter } from './modules/auth/routes';
import { healthRouter } from './modules/health/routes';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRouter);

  app.use('/api/auth', authRouter);

  if (env.DOCS_ENABLED || env.NODE_ENV !== 'production') {
    app.use('/api', docsRouter);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
