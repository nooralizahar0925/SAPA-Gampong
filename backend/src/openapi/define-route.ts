import type { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import type { AnyZodObject, ZodTypeAny, z } from 'zod';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { AdminRole } from '@prisma/client';
import { registry as defaultRegistry } from './registry';
import { requireAdmin, requireRole } from '../middleware/auth';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** `undefined` schemas parse to `undefined`, not `unknown` — keeps handler ctx honest. */
type Infer<T extends ZodTypeAny | undefined> = T extends ZodTypeAny ? z.infer<T> : undefined;

/**
 * Declarative auth for a route. `'admin'` requires a valid bearer token (any admin
 * role). `{ roles }` additionally restricts to the given roles. Either form emits
 * `security: [{ bearerAuth: [] }]` into the OpenAPI document AND pushes the matching
 * enforcement middleware onto the route — there is only one input, so a route cannot
 * document authentication it does not enforce, or enforce it without documenting it.
 */
export type AuthRequirement = 'admin' | { roles: AdminRole[] };

export interface RouteContext<
  B extends ZodTypeAny | undefined,
  Q extends AnyZodObject | undefined,
  P extends AnyZodObject | undefined,
> {
  body: Infer<B>;
  query: Infer<Q>;
  params: Infer<P>;
  req: Request;
  res: Response;
}

export interface DefineRouteOptions<
  B extends ZodTypeAny | undefined = undefined,
  Q extends AnyZodObject | undefined = undefined,
  P extends AnyZodObject | undefined = undefined,
> {
  method: Method;
  /** Path relative to the router's mount point, e.g. `/login`. Used for `router[method](...)`. */
  path: string;
  /** Full path as seen by clients, e.g. `/api/auth/login`. Used for `registry.registerPath(...)`. */
  fullPath: string;
  tags: string[];
  summary: string;
  /** Declarative auth: documents `security` AND enforces it via middleware. See `AuthRequirement`. */
  auth?: AuthRequirement;
  /** Non-auth middleware (auth must be expressed via `auth`, not here), run before body/query/params parsing. */
  middleware?: RequestHandler[];
  body?: B;
  query?: Q;
  params?: P;
  responses: RouteConfig['responses'];
  handler: (ctx: RouteContext<B, Q, P>) => void | Promise<void>;
  /** OpenAPI registry to register this path into. Defaults to the app-wide singleton; tests can inject their own. */
  registry?: OpenAPIRegistry;
}

/**
 * `fullPath` must end with `path` (treating `path === '/'` as contributing nothing to
 * the suffix). This is what makes a permutation of `fullPath`/`path` across two routes
 * on the same router impossible to sneak past the drift guard: swapped siblings differ
 * in their suffix, so at least one of them fails this check immediately at module load.
 */
function assertPathInvariant(method: Method, path: string, fullPath: string): void {
  // Express writes params as ":id"; OpenAPI/fullPath writes them as "{id}" — normalize
  // before comparing so a route with path params isn't flagged as mismatched.
  const normalized = path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  const suffix = normalized === '/' ? '' : normalized;
  if (!fullPath.endsWith(suffix)) {
    throw new Error(
      `defineRoute: fullPath "${fullPath}" must end with path "${path}" (method ${method.toUpperCase()}). ` +
        'This usually means fullPath/path were swapped or mistyped between two routes on the same router.',
    );
  }
}

function resolveAuthMiddleware(auth: AuthRequirement | undefined): RequestHandler[] {
  if (!auth) return [];
  if (auth === 'admin') return [requireAdmin];
  return [requireAdmin, requireRole(...auth.roles)];
}

/**
 * Defines one route from a single set of schema objects: the same `body`/`query`/`params`
 * schemas are used to (1) validate the incoming request and (2) document the route in the
 * OpenAPI registry. A route physically cannot validate one schema while documenting another,
 * because there is only one place to pass a schema in. The same is true of `auth`: it is the
 * only way to express authentication, and it both documents and enforces it.
 *
 * Validation failures throw `ZodError`, which the existing `errorHandler` maps to the 400
 * `VALIDATION_ERROR` envelope — this helper does not catch or reformat them itself.
 */
export function defineRoute<
  B extends ZodTypeAny | undefined = undefined,
  Q extends AnyZodObject | undefined = undefined,
  P extends AnyZodObject | undefined = undefined,
>(router: Router, options: DefineRouteOptions<B, Q, P>): void {
  const {
    method,
    path,
    fullPath,
    tags,
    summary,
    auth,
    middleware = [],
    body,
    query,
    params,
    responses,
    handler,
    registry = defaultRegistry,
  } = options;

  assertPathInvariant(method, path, fullPath);

  const request =
    body || query || params
      ? {
          ...(body ? { body: { content: { 'application/json': { schema: body } } } } : {}),
          ...(query ? { query } : {}),
          ...(params ? { params } : {}),
        }
      : undefined;

  registry.registerPath({
    method,
    path: fullPath,
    tags,
    summary,
    ...(auth ? { security: [{ bearerAuth: [] }] } : {}),
    ...(request ? { request } : {}),
    responses,
  });

  router[method](
    path,
    ...resolveAuthMiddleware(auth),
    ...middleware,
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve()
        .then(() => {
          const parsedBody = body ? (body.parse(req.body) as Infer<B>) : (undefined as Infer<B>);
          const parsedQuery = query ? (query.parse(req.query) as Infer<Q>) : (undefined as Infer<Q>);
          const parsedParams = params ? (params.parse(req.params) as Infer<P>) : (undefined as Infer<P>);

          return handler({ body: parsedBody, query: parsedQuery, params: parsedParams, req, res });
        })
        .catch(next);
    },
  );
}
