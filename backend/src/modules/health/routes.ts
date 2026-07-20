import { Router } from 'express';
import { z } from 'zod';
import { defineRoute } from '../../openapi/define-route';

export const healthRouter = Router();

defineRoute(healthRouter, {
  method: 'get',
  path: '/',
  fullPath: '/api/health',
  tags: ['Health'],
  summary: 'Cek status layanan',
  responses: {
    200: {
      description: 'Layanan berjalan normal',
      content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
    },
  },
  handler: ({ res }) => {
    res.json({ ok: true });
  },
});
