import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { defineRoute } from '../src/openapi/define-route';
import { registry } from '../src/openapi/registry';
import { errorHandler } from '../src/middleware/error';

describe('defineRoute', () => {
  it('binds request validation and OpenAPI documentation to the same schema', async () => {
    const TestBody = registry.register(
      'DefineRouteTestBody',
      z.object({ name: z.string().min(1, 'Nama wajib diisi') }),
    );

    const router = Router();
    defineRoute(router, {
      method: 'post',
      path: '/widgets',
      fullPath: '/api/test/widgets',
      tags: ['Test'],
      summary: 'Buat widget percobaan',
      body: TestBody,
      responses: {
        200: {
          description: 'Widget dibuat',
          content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
        },
      },
      handler: ({ body, res }) => {
        // `body` is parsed and typed from TestBody here, not raw req.body.
        res.json({ ok: true, receivedName: body.name });
      },
    });

    const app = express();
    app.use(express.json());
    app.use('/api/test', router);
    app.use(errorHandler);

    // (a) a body violating the schema is rejected with 400 and per-field detail.
    const res = await request(app).post('/api/test/widgets').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty('name');

    // (b) the SAME schema object appears in the generated document as this route's requestBody.
    const generator = new OpenApiGeneratorV31(registry.definitions);
    const doc = generator.generateDocument({
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
    }) as any;

    const schemaInDoc = doc.paths['/api/test/widgets'].post.requestBody.content['application/json'].schema;
    expect(schemaInDoc.$ref).toBe('#/components/schemas/DefineRouteTestBody');
  });
});
