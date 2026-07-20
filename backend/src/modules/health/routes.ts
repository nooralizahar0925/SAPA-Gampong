import { Router } from 'express';
import { z } from 'zod';
import { defineRoute } from '../../openapi/define-route';

export const healthRouter = Router();

defineRoute(healthRouter, {
  method: 'get',
  path: '/',
  fullPath: '/api/health',
  tags: ['Health'],
  summary: 'Service health check',
  responses: {
    200: {
      description: 'Service is running normally',
      content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
    },
  },
  handler: ({ res }) => {
    res.json({ ok: true });
  },
});
