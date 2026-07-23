import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import {
  AdminLetterTemplateListResponse,
  AdminLetterTemplateSchema,
  CreateLetterTemplateBody,
  LetterTemplateParams,
  LetterTypeListResponse,
  UpdateLetterTemplateBody,
} from './schemas';
import {
  createLetterTemplate,
  deleteLetterTemplate,
  listAdminLetterTemplates,
  listPublicLetterTypes,
  updateLetterTemplate,
} from './service';
import { renderLetterTemplatePreviewPdf } from './preview.service';

export const lettersRouter = Router();

defineRoute(lettersRouter, {
  method: 'get',
  path: '/letter-types',
  fullPath: '/api/letter-types',
  tags: ['Letter Types'],
  summary: 'Available letter types and dynamic form schema',
  responses: {
    200: {
      description: 'List of letter types',
      content: { 'application/json': { schema: LetterTypeListResponse } },
    },
  },
  handler: async ({ res }) => {
    res.json(await listPublicLetterTypes());
  },
});

defineRoute(lettersRouter, {
  method: 'get',
  path: '/settings/letter-templates',
  fullPath: '/api/settings/letter-templates',
  tags: ['Settings'],
  summary: 'List all letter templates for dashboard management',
  auth: { roles: ['admin'] },
  responses: {
    200: {
      description: 'All letter templates, including inactive templates',
      content: { 'application/json': { schema: AdminLetterTemplateListResponse } },
    },
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ res }) => {
    res.json(await listAdminLetterTemplates());
  },
});

defineRoute(lettersRouter, {
  method: 'post',
  path: '/settings/letter-templates',
  fullPath: '/api/settings/letter-templates',
  tags: ['Settings'],
  summary: 'Create a letter template',
  auth: { roles: ['admin'] },
  body: CreateLetterTemplateBody,
  responses: {
    201: {
      description: 'Created letter template',
      content: { 'application/json': { schema: AdminLetterTemplateSchema } },
    },
    400: errorResponse('Invalid letter template payload'),
    401: errorResponse('Authentication is required'),
    409: errorResponse('Template code already exists'),
  },
  handler: async ({ body, res }) => {
    res.status(201).json(await createLetterTemplate(body));
  },
});

defineRoute(lettersRouter, {
  method: 'patch',
  path: '/settings/letter-templates/:code',
  fullPath: '/api/settings/letter-templates/{code}',
  tags: ['Settings'],
  summary: 'Update a letter template',
  auth: { roles: ['admin'] },
  params: LetterTemplateParams,
  body: UpdateLetterTemplateBody,
  responses: {
    200: {
      description: 'Updated letter template',
      content: { 'application/json': { schema: AdminLetterTemplateSchema } },
    },
    400: errorResponse('Invalid letter template payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Template not found'),
  },
  handler: async ({ params, body, res }) => {
    res.json(await updateLetterTemplate(params.code, body));
  },
});

defineRoute(lettersRouter, {
  method: 'get',
  path: '/settings/letter-templates/:code/preview',
  fullPath: '/api/settings/letter-templates/{code}/preview',
  tags: ['Settings'],
  summary: 'Render a PDF preview for a letter template',
  auth: { roles: ['admin'] },
  params: LetterTemplateParams,
  responses: {
    200: {
      description: 'PDF preview for the selected template',
      content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
    },
    401: errorResponse('Authentication is required'),
    404: errorResponse('Template not found'),
  },
  handler: async ({ params, res }) => {
    const pdf = await renderLetterTemplatePreviewPdf(params.code);
    res
      .status(200)
      .type('application/pdf')
      .setHeader('Content-Disposition', `inline; filename=\"template-${params.code}.pdf\"`)
      .send(pdf);
  },
});

defineRoute(lettersRouter, {
  method: 'delete',
  path: '/settings/letter-templates/:code',
  fullPath: '/api/settings/letter-templates/{code}',
  tags: ['Settings'],
  summary: 'Delete a letter template',
  auth: { roles: ['admin'] },
  params: LetterTemplateParams,
  responses: {
    204: { description: 'Deleted letter template' },
    401: errorResponse('Authentication is required'),
    404: errorResponse('Template not found'),
  },
  handler: async ({ params, res }) => {
    await deleteLetterTemplate(params.code);
    res.status(204).send();
  },
});
