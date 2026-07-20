import type { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import type { AnyZodObject, ZodTypeAny, z } from 'zod';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** `undefined` schemas parse to `undefined`, not `unknown` — keeps handler ctx honest. */
type Infer<T extends ZodTypeAny | undefined> = T extends ZodTypeAny ? z.infer<T> : undefined;

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
  security?: RouteConfig['security'];
  /** Route-specific middleware (auth guards, etc.), run before body/query/params parsing. */
  middleware?: RequestHandler[];
  body?: B;
  query?: Q;
  params?: P;
  responses: RouteConfig['responses'];
  handler: (ctx: RouteContext<B, Q, P>) => void | Promise<void>;
}

/**
 * Defines one route from a single set of schema objects: the same `body`/`query`/`params`
 * schemas are used to (1) validate the incoming request and (2) document the route in the
 * OpenAPI registry. A route physically cannot validate one schema while documenting another,
 * because there is only one place to pass a schema in.
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
    security,
    middleware = [],
    body,
    query,
    params,
    responses,
    handler,
  } = options;

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
    ...(security ? { security } : {}),
    ...(request ? { request } : {}),
    responses,
  });

  router[method](path, ...middleware, (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve()
      .then(() => {
        const parsedBody = body ? (body.parse(req.body) as Infer<B>) : (undefined as Infer<B>);
        const parsedQuery = query ? (query.parse(req.query) as Infer<Q>) : (undefined as Infer<Q>);
        const parsedParams = params ? (params.parse(req.params) as Infer<P>) : (undefined as Infer<P>);

        return handler({ body: parsedBody, query: parsedQuery, params: parsedParams, req, res });
      })
      .catch(next);
  });
}
