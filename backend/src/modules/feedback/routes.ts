import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import {
  CreateFeedbackBody,
  CreateFeedbackResponse,
  FeedbackDetailParams,
  FeedbackDetailResponse,
  ListFeedbackQuery,
  ListFeedbackResponse,
  ReplyFeedbackBody,
  UpdateFeedbackBody,
} from './schemas';
import {
  createPublicFeedback,
  getFeedbackDetail,
  listFeedback,
  replyToFeedback,
  updateFeedback,
} from './service';

export const feedbackRouter = Router();

defineRoute(feedbackRouter, {
  method: 'post',
  path: '/',
  fullPath: '/api/feedback',
  tags: ['Feedback'],
  summary: 'Submit citizen feedback',
  body: CreateFeedbackBody,
  responses: {
    201: {
      description: 'Feedback submitted successfully',
      content: { 'application/json': { schema: CreateFeedbackResponse } },
    },
    400: errorResponse('Invalid feedback payload'),
  },
  handler: async ({ body, res }) => {
    const created = await createPublicFeedback(body);
    res.status(201).json(created);
  },
});

defineRoute(feedbackRouter, {
  method: 'get',
  path: '/',
  fullPath: '/api/feedback',
  tags: ['Feedback'],
  summary: 'List the feedback inbox',
  auth: 'admin',
  query: ListFeedbackQuery,
  responses: {
    200: {
      description: 'Paged feedback inbox',
      content: { 'application/json': { schema: ListFeedbackResponse } },
    },
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ query, res }) => {
    res.json(await listFeedback(query));
  },
});

defineRoute(feedbackRouter, {
  method: 'get',
  path: '/:id',
  fullPath: '/api/feedback/{id}',
  tags: ['Feedback'],
  summary: 'Get one feedback report with its attachments',
  auth: 'admin',
  params: FeedbackDetailParams,
  responses: {
    200: {
      description: 'Feedback detail',
      content: { 'application/json': { schema: FeedbackDetailResponse } },
    },
    401: errorResponse('Authentication is required'),
    404: errorResponse('Feedback not found'),
  },
  handler: async ({ params, res }) => {
    res.json(await getFeedbackDetail(params.id));
  },
});

defineRoute(feedbackRouter, {
  method: 'patch',
  path: '/:id',
  fullPath: '/api/feedback/{id}',
  tags: ['Feedback'],
  summary: 'Mark feedback read/responded or save an internal note',
  auth: 'admin',
  params: FeedbackDetailParams,
  body: UpdateFeedbackBody,
  responses: {
    200: {
      description: 'Updated feedback detail',
      content: { 'application/json': { schema: FeedbackDetailResponse } },
    },
    400: errorResponse('Invalid feedback update payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Feedback not found'),
  },
  handler: async ({ params, body, res }) => {
    res.json(await updateFeedback(params.id, body));
  },
});

defineRoute(feedbackRouter, {
  method: 'post',
  path: '/:id/reply',
  fullPath: '/api/feedback/{id}/reply',
  tags: ['Feedback'],
  summary: 'Email a reply to the reporter and mark the report responded',
  auth: 'admin',
  params: FeedbackDetailParams,
  body: ReplyFeedbackBody,
  responses: {
    200: {
      description: 'Reply sent and feedback marked responded',
      content: { 'application/json': { schema: FeedbackDetailResponse } },
    },
    400: errorResponse('Invalid reply payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Feedback not found'),
    502: errorResponse('Reply email could not be delivered'),
  },
  handler: async ({ params, body, req, res }) => {
    res.json(await replyToFeedback(params.id, body, req.auth!.userId));
  },
});
