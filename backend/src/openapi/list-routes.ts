import listEndpoints from 'express-list-endpoints';
import type { Express } from 'express';

export type MountedRoute = { method: string; path: string };

/** Express writes params as ":id"; OpenAPI writes them as "{id}". */
function toOpenApiPath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

export function listRoutes(app: Express): MountedRoute[] {
  const routes: MountedRoute[] = [];

  for (const endpoint of listEndpoints(app)) {
    for (const method of endpoint.methods) {
      if (method === 'HEAD' || method === 'OPTIONS') continue;
      routes.push({ method, path: toOpenApiPath(endpoint.path) });
    }
  }

  return routes;
}
