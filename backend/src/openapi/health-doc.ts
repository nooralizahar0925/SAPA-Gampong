import { z } from 'zod';
import { registry } from './registry';

// GET /api/health is defined inline in app.ts (no request body/query/params, no
// per-route middleware) rather than as a module with a Router, so there is no
// Router for defineRoute() to mount a handler on here. It stays a direct
// registry.registerPath() call; the drift guard still catches path/method
// mismatches against app.ts even without the schema-binding defineRoute gives.
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
