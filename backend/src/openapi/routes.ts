import { Router } from 'express';
import { buildDocument } from './document';

export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(buildDocument());
});

docsRouter.get('/docs', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html>
  <head>
    <title>Gampong Blang Digital API</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.62.9"></script>
  </body>
</html>`);
});
