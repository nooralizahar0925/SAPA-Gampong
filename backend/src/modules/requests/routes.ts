import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import {
  CreateRequestBody,
  CreateRequestResponse,
  GenerateRequestResponse,
  ListRequestsQuery,
  ListRequestsResponse,
  PatchRequestStatusBody,
  RevokeResponse,
  RequestDetailParams,
  RequestDetailResponse,
  TrackRequestParams,
  TrackRequestResponse,
} from './schemas';
import {
  createPublicRequest,
  getAdminRequestDetail,
  listAdminRequests,
  revokeVerification,
  trackRequest,
  updateRequestStatus,
} from './service';
import { generateApprovedRequest } from './generate';

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
  path: '/',
  fullPath: '/api/requests',
  tags: ['Requests'],
  summary: 'List requests in the admin queue',
  auth: 'admin',
  query: ListRequestsQuery,
  responses: {
    200: {
      description: 'Paged request queue',
      content: { 'application/json': { schema: ListRequestsResponse } },
    },
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ query, res }) => {
    res.json(await listAdminRequests(query));
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

defineRoute(requestsRouter, {
  method: 'get',
  path: '/:id',
  fullPath: '/api/requests/{id}',
  tags: ['Requests'],
  summary: 'Get full admin request detail',
  auth: 'admin',
  params: RequestDetailParams,
  responses: {
    200: {
      description: 'Full request detail',
      content: { 'application/json': { schema: RequestDetailResponse } },
    },
    401: errorResponse('Authentication is required'),
    404: errorResponse('Request not found'),
  },
  handler: async ({ params, res }) => {
    res.json(await getAdminRequestDetail(params.id));
  },
});

defineRoute(requestsRouter, {
  method: 'patch',
  path: '/:id/status',
  fullPath: '/api/requests/{id}/status',
  tags: ['Requests'],
  summary: 'Move a request through the state machine',
  auth: 'admin',
  params: RequestDetailParams,
  body: PatchRequestStatusBody,
  responses: {
    200: {
      description: 'Updated request detail',
      content: { 'application/json': { schema: RequestDetailResponse } },
    },
    400: errorResponse('Invalid status update payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Request not found'),
    409: errorResponse('Status transition is not allowed'),
  },
  handler: async ({ params, body, req, res }) => {
    res.json(await updateRequestStatus(params.id, body, req.auth!.userId));
  },
});

defineRoute(requestsRouter, {
  method: 'post',
  path: '/:id/generate',
  fullPath: '/api/requests/{id}/generate',
  tags: ['Requests'],
  summary: 'Generate the PDF and verification token for an approved request',
  auth: 'admin',
  params: RequestDetailParams,
  responses: {
    200: {
      description: 'Generated PDF and verification details',
      content: { 'application/json': { schema: GenerateRequestResponse } },
    },
    401: errorResponse('Authentication is required'),
    404: errorResponse('Request not found'),
    409: errorResponse('Request is not ready for PDF generation'),
  },
  handler: async ({ params, req, res }) => {
    res.json(await generateApprovedRequest(params.id, req.auth!.userId));
  },
});

defineRoute(requestsRouter, {
  method: 'post',
  path: '/:id/revoke',
  fullPath: '/api/requests/{id}/revoke',
  tags: ['Verify'],
  summary: 'Revoke a verification token for a request',
  auth: 'admin',
  params: RequestDetailParams,
  responses: {
    200: {
      description: 'Verification token revoked',
      content: { 'application/json': { schema: RevokeResponse } },
    },
    401: errorResponse('Authentication is required'),
    404: errorResponse('Request not found'),
  },
  handler: async ({ params, res }) => {
    res.json(await revokeVerification(params.id));
  },
});
