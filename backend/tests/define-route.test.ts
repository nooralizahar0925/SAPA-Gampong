import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { defineRoute } from '../src/openapi/define-route';
// Imported for its side effect only: it calls extendZodWithOpenApi(z), which every
// registry (singleton or test-local) depends on. Tests below use their own
// `new OpenAPIRegistry()` rather than the app-wide singleton, so this suite cannot
// pollute buildDocument()'s output and does not depend on Vitest's module isolation.
import '../src/openapi/registry';
import { errorHandler } from '../src/middleware/error';

describe('defineRoute', () => {
  it('binds request validation and OpenAPI documentation to the same schema', async () => {
    const testRegistry = new OpenAPIRegistry();
    const TestBody = testRegistry.register(
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
      registry: testRegistry,
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
    const generator = new OpenApiGeneratorV31(testRegistry.definitions);
    const doc = generator.generateDocument({
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
    }) as any;

    const schemaInDoc = doc.paths['/api/test/widgets'].post.requestBody.content['application/json'].schema;
    expect(schemaInDoc.$ref).toBe('#/components/schemas/DefineRouteTestBody');
  });

  it('rejects a fullPath that does not end with path (Finding 1: path/fullPath invariant)', () => {
    const router = Router();

    expect(() =>
      defineRoute(router, {
        method: 'get',
        path: '/login',
        // Deliberately the wrong sibling's fullPath — same shape a copy/paste swap produces.
        fullPath: '/api/auth/me',
        tags: ['Test'],
        summary: 'Rute path yang salah',
        registry: new OpenAPIRegistry(),
        responses: { 200: { description: 'OK', content: {} } },
        handler: ({ res }) => {
          res.json({ ok: true });
        },
      }),
    ).toThrow(/fullPath "\/api\/auth\/me" must end with path "\/login"/);
  });

  it('propagates auth to both the document (security) and enforcement (401 without a token)', async () => {
    const testRegistry = new OpenAPIRegistry();
    const router = Router();
    defineRoute(router, {
      method: 'get',
      path: '/secret',
      fullPath: '/api/test/secret',
      tags: ['Test'],
      summary: 'Rute rahasia',
      auth: 'admin',
      registry: testRegistry,
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
        },
      },
      handler: ({ res }) => {
        res.json({ ok: true });
      },
    });

    // (a) the document records the security requirement.
    const generator = new OpenApiGeneratorV31(testRegistry.definitions);
    const doc = generator.generateDocument({
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
    }) as any;
    expect(doc.paths['/api/test/secret'].get.security).toEqual([{ bearerAuth: [] }]);

    // (b) the route actually enforces it: no token means 401, not a handled 200.
    const app = express();
    app.use(express.json());
    app.use('/api/test', router);
    app.use(errorHandler);

    const res = await request(app).get('/api/test/secret');
    expect(res.status).toBe(401);
  });

  it('reaches both the parser and the document for a params schema (query/params symmetry)', async () => {
    const testRegistry = new OpenAPIRegistry();
    const router = Router();
    const Params = z.object({ id: z.string().regex(/^\d+$/, 'id harus angka') });

    defineRoute(router, {
      method: 'get',
      path: '/items/:id',
      fullPath: '/api/test/items/{id}',
      tags: ['Test'],
      summary: 'Ambil item',
      params: Params,
      registry: testRegistry,
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: z.object({ id: z.string() }) } },
        },
      },
      handler: ({ params, res }) => {
        // `params.id` is typed/parsed from the schema, not raw req.params.
        res.json({ id: params.id });
      },
    });

    const app = express();
    app.use(express.json());
    app.use('/api/test', router);
    app.use(errorHandler);

    // (a) an invalid param is rejected by the same schema.
    const bad = await request(app).get('/api/test/items/not-a-number');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');

    // (b) a valid param reaches the handler as parsed.
    const ok = await request(app).get('/api/test/items/42');
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ id: '42' });

    // (c) the same params schema appears in the document as this route's parameters.
    const generator = new OpenApiGeneratorV31(testRegistry.definitions);
    const doc = generator.generateDocument({
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
    }) as any;
    const parameters = doc.paths['/api/test/items/{id}'].get.parameters;
    expect(parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'id', in: 'path' })]),
    );
  });
});
