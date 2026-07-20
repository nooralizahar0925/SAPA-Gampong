import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from '../src/app';
import { buildDocument } from '../src/openapi/document';
import { listRoutes } from './helpers/list-routes';

const app = createApp();

/** Routes that serve the documentation itself are deliberately not documented. */
const UNDOCUMENTED = new Set(['GET /api/docs', 'GET /api/openapi.json']);

/** OpenAPI path items may carry non-operation keys (parameters, summary, $ref, ...). */
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

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

  it('matches the committed openapi.json artifact', () => {
    // `servers` is derived from env.PUBLIC_BASE_URL, which legitimately differs
    // per developer/deployment. This test cares about the API surface (paths,
    // schemas, security, etc.), not deployment config, so `servers` is excluded
    // from both sides of the comparison. The live /api/openapi.json response
    // still returns buildDocument() with the real servers from env, unaffected.
    const generated = JSON.parse(JSON.stringify(buildDocument())) as Record<string, unknown>;
    const committedRaw = readFileSync(join(__dirname, '..', 'openapi.json'), 'utf-8');
    const committed = JSON.parse(committedRaw) as Record<string, unknown>;

    delete generated.servers;
    delete committed.servers;

    expect(
      committed,
      'backend/openapi.json is stale relative to buildDocument() (ignoring `servers`, which is ' +
        'environment-dependent). Run `npm run openapi:write` and commit the result.',
    ).toEqual(generated);
  });
});

describe('drift guard', () => {
  it('documents every route mounted on the app', () => {
    const doc = buildDocument() as any;
    const documented = new Set<string>();
    for (const [path, methods] of Object.entries(doc.paths as Record<string, object>)) {
      for (const method of Object.keys(methods)) {
        if (!HTTP_METHODS.has(method)) continue;
        documented.add(`${method.toUpperCase()} ${path}`);
      }
    }

    const enumerated = listRoutes(app);

    // express-list-endpoints returns [] silently for shapes it doesn't recognize
    // (e.g. after an Express major upgrade removes app._router). If enumeration
    // itself is broken, `missing` below would be vacuously empty and this guard
    // would pass while checking nothing. Assert enumeration actually happened.
    expect(
      enumerated.length,
      'Route enumeration returned zero routes: listRoutes(app)/express-list-endpoints ' +
        'no longer recognizes this Express app shape, so this drift guard is not actually ' +
        "checking anything. This is NOT a missing-route problem — fix route enumeration itself " +
        '(see tests/helpers/list-routes.ts) before trusting this test again.',
    ).toBeGreaterThan(0);

    expect(
      enumerated.length,
      'The number of routes enumerated on the app does not equal the number of documented ' +
        'operations plus the deliberately-undocumented docs routes. Either route enumeration is ' +
        'broken (see tests/helpers/list-routes.ts) or UNDOCUMENTED in this file is out of date.',
    ).toBe(documented.size + UNDOCUMENTED.size);

    const missing = enumerated
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
