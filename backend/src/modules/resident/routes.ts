import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import {
  ResidentEmailBody,
  ResidentFeedbackResponse,
  ResidentMeResponse,
  ResidentOtpResponse,
  ResidentRequestCorrectionBody,
  ResidentRequestItem,
  ResidentRequestParams,
  ResidentRequestsResponse,
  ResidentSessionResponse,
  ResidentVerifyOtpBody,
} from './schemas';
import {
  cancelResidentRequest,
  getResidentMe,
  listResidentFeedback,
  listResidentRequests,
  requestResidentOtp,
  resubmitResidentRequest,
  verifyResidentOtp,
} from './service';

export const residentRouter = Router();

defineRoute(residentRouter, {
  method: 'post',
  path: '/email/request-otp',
  fullPath: '/api/resident/email/request-otp',
  tags: ['Resident'],
  summary: 'Send an OTP to a resident email address',
  body: ResidentEmailBody,
  responses: {
    200: {
      description: 'OTP email accepted',
      content: { 'application/json': { schema: ResidentOtpResponse } },
    },
    400: errorResponse('Invalid email payload'),
  },
  handler: async ({ body, res }) => {
    res.json(await requestResidentOtp(body));
  },
});

defineRoute(residentRouter, {
  method: 'post',
  path: '/email/verify-otp',
  fullPath: '/api/resident/email/verify-otp',
  tags: ['Resident'],
  summary: 'Verify resident email OTP and create a resident session',
  body: ResidentVerifyOtpBody,
  responses: {
    200: {
      description: 'Resident email verified',
      content: { 'application/json': { schema: ResidentSessionResponse } },
    },
    400: errorResponse('Invalid OTP payload'),
    403: errorResponse('Too many OTP attempts'),
  },
  handler: async ({ body, res }) => {
    res.json(await verifyResidentOtp(body));
  },
});

defineRoute(residentRouter, {
  method: 'get',
  path: '/me',
  fullPath: '/api/resident/me',
  tags: ['Resident'],
  summary: 'Get the current resident email session',
  responses: {
    200: {
      description: 'Resident email session',
      content: { 'application/json': { schema: ResidentMeResponse } },
    },
    401: errorResponse('Resident email verification is required'),
  },
  handler: async ({ req, res }) => {
    res.json(await getResidentMe(req));
  },
});

defineRoute(residentRouter, {
  method: 'get',
  path: '/requests',
  fullPath: '/api/resident/requests',
  tags: ['Resident'],
  summary: 'List letter requests for the verified resident email',
  responses: {
    200: {
      description: 'Resident request history',
      content: { 'application/json': { schema: ResidentRequestsResponse } },
    },
    401: errorResponse('Resident email verification is required'),
  },
  handler: async ({ req, res }) => {
    res.json(await listResidentRequests(req));
  },
});

defineRoute(residentRouter, {
  method: 'post',
  path: '/requests/:id/cancel',
  fullPath: '/api/resident/requests/{id}/cancel',
  tags: ['Resident'],
  summary: 'Cancel a resident letter request before office review starts',
  params: ResidentRequestParams,
  responses: {
    200: {
      description: 'Resident request cancelled',
      content: { 'application/json': { schema: ResidentRequestItem } },
    },
    401: errorResponse('Resident email verification is required'),
    404: errorResponse('Request not found'),
    409: errorResponse('Request can no longer be cancelled'),
  },
  handler: async ({ params, req, res }) => {
    res.json(await cancelResidentRequest(req, params.id));
  },
});

defineRoute(residentRouter, {
  method: 'post',
  path: '/requests/:id/resubmit',
  fullPath: '/api/resident/requests/{id}/resubmit',
  tags: ['Resident'],
  summary: 'Submit corrected data for a resident letter request that needs more information',
  params: ResidentRequestParams,
  body: ResidentRequestCorrectionBody,
  responses: {
    200: {
      description: 'Resident request corrected and returned to office review',
      content: { 'application/json': { schema: ResidentRequestItem } },
    },
    400: errorResponse('Invalid correction payload'),
    401: errorResponse('Resident email verification is required'),
    404: errorResponse('Request not found'),
    409: errorResponse('Request is not waiting for resident correction'),
  },
  handler: async ({ params, body, req, res }) => {
    res.json(await resubmitResidentRequest(req, params.id, body));
  },
});

defineRoute(residentRouter, {
  method: 'get',
  path: '/feedback',
  fullPath: '/api/resident/feedback',
  tags: ['Resident'],
  summary: 'List feedback reports for the verified resident email',
  responses: {
    200: {
      description: 'Resident feedback history',
      content: { 'application/json': { schema: ResidentFeedbackResponse } },
    },
    401: errorResponse('Resident email verification is required'),
  },
  handler: async ({ req, res }) => {
    res.json(await listResidentFeedback(req));
  },
});
