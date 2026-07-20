import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app';
import { buildDocument } from '../src/openapi/document';
import { listRoutes } from '../src/openapi/list-routes';

const app = createApp();

/** Routes that serve the documentation itself are deliberately not documented. */
const UNDOCUMENTED = new Set(['GET /api/docs', 'GET /api/openapi.json']);

describe('OpenAPI document', () => {
  it('is a valid OpenAPI 3.1 document with the project identity', () => {
    const doc = buildDocument() as any;
    expect(doc.openapi).toMatch(/^3\.1/);
    expect(doc.info.title).toBe('SAPA Gampong API');
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
  });

  it('documents the login route with its request and response schema', () => {
    const doc = buildDocument() as any;
    const login = doc.paths['/api/auth/login'].post;
    expect(login.requestBody.content['application/json'].schema).toBeTruthy();
    expect(login.responses['200']).toBeTruthy();
    expect(login.responses['401']).toBeTruthy();
  });

  it('marks authenticated routes as requiring the bearer scheme', () => {
    const doc = buildDocument() as any;
    expect(doc.paths['/api/auth/me'].get.security).toEqual([{ bearerAuth: [] }]);
  });
});

describe('drift guard', () => {
  it('documents every route mounted on the app', () => {
    const doc = buildDocument() as any;
    const documented = new Set<string>();
    for (const [path, methods] of Object.entries(doc.paths as Record<string, object>)) {
      for (const method of Object.keys(methods)) {
        documented.add(`${method.toUpperCase()} ${path}`);
      }
    }

    const missing = listRoutes(app)
      .map((r) => `${r.method} ${r.path}`)
      .filter((key) => !UNDOCUMENTED.has(key) && !documented.has(key));

    expect(missing).toEqual([]);
  });
});

describe('docs endpoints', () => {
  it('serves the OpenAPI document as JSON', async () => {
    const res = await request(app).get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\.1/);
  });

  it('serves the Scalar dashboard as HTML pointing at the document', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('/api/openapi.json');
  });
});
