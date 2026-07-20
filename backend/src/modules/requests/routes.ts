import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import {
  CreateRequestBody,
  CreateRequestResponse,
  TrackRequestParams,
  TrackRequestResponse,
} from './schemas';
import { createPublicRequest, trackRequest } from './service';

export const requestsRouter = Router();

defineRoute(requestsRouter, {
  method: 'post',
  path: '/',
  fullPath: '/api/requests',
  tags: ['Requests'],
  summary: 'Create a public letter request',
  body: CreateRequestBody,
  responses: {
    201: {
      description: 'Request created successfully',
      content: { 'application/json': { schema: CreateRequestResponse } },
    },
    400: errorResponse('Invalid request payload'),
  },
  handler: async ({ body, res }) => {
    const created = await createPublicRequest(body);
    res.status(201).json(created);
  },
});

defineRoute(requestsRouter, {
  method: 'get',
  path: '/track/:referenceCode',
  fullPath: '/api/requests/track/{referenceCode}',
  tags: ['Requests'],
  summary: 'Track request status by reference code',
  params: TrackRequestParams,
  responses: {
    200: {
      description: 'Tracked request status',
      content: { 'application/json': { schema: TrackRequestResponse } },
    },
    404: errorResponse('Request not found'),
  },
  handler: async ({ params, res }) => {
    res.json(await trackRequest(params.referenceCode));
  },
});
