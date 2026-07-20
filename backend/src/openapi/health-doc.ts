import { z } from 'zod';
import { registry } from './registry';

registry.registerPath({
  method: 'get',
  path: '/api/health',
  tags: ['Health'],
  summary: 'Cek status layanan',
  responses: {
    200: {
      description: 'Layanan berjalan normal',
      content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
    },
  },
});
