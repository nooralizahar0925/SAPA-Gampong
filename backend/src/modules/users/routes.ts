import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import {
  AdminUserListItem,
  AdminUserListResponse,
  AdminUserParams,
  CreateAdminUserBody,
  UpdateAdminUserBody,
} from './schemas';
import { createAdminUser, listAdminUsers, updateAdminUser } from './service';

export const usersRouter = Router();

defineRoute(usersRouter, {
  method: 'get',
  path: '/',
  fullPath: '/api/settings/users',
  tags: ['Settings'],
  summary: 'List dashboard user accounts',
  auth: { roles: ['admin'] },
  responses: {
    200: {
      description: 'Dashboard user accounts',
      content: { 'application/json': { schema: AdminUserListResponse } },
    },
    401: errorResponse('Authentication is required'),
    403: errorResponse('Admin role is required'),
  },
  handler: async ({ res }) => {
    res.json(await listAdminUsers());
  },
});

defineRoute(usersRouter, {
  method: 'post',
  path: '/',
  fullPath: '/api/settings/users',
  tags: ['Settings'],
  summary: 'Create a dashboard user account',
  auth: { roles: ['admin'] },
  body: CreateAdminUserBody,
  responses: {
    201: {
      description: 'Created dashboard user account',
      content: { 'application/json': { schema: AdminUserListItem } },
    },
    400: errorResponse('Invalid user payload'),
    401: errorResponse('Authentication is required'),
    403: errorResponse('Admin role is required'),
    409: errorResponse('Email already exists'),
  },
  handler: async ({ body, res }) => {
    res.status(201).json(await createAdminUser(body));
  },
});

defineRoute(usersRouter, {
  method: 'patch',
  path: '/:id',
  fullPath: '/api/settings/users/{id}',
  tags: ['Settings'],
  summary: 'Update a dashboard user account',
  auth: { roles: ['admin'] },
  params: AdminUserParams,
  body: UpdateAdminUserBody,
  responses: {
    200: {
      description: 'Updated dashboard user account',
      content: { 'application/json': { schema: AdminUserListItem } },
    },
    400: errorResponse('Invalid user payload'),
    401: errorResponse('Authentication is required'),
    403: errorResponse('Admin role is required'),
    404: errorResponse('User not found'),
    409: errorResponse('Email already exists'),
  },
  handler: async ({ params, body, req, res }) => {
    res.json(await updateAdminUser(params.id, req.auth!.userId, body));
  },
});
