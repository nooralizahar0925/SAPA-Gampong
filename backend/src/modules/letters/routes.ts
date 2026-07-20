import { Router } from 'express';
import { defineRoute } from '../../openapi/define-route';
import { LetterTypeListResponse } from './schemas';
import { LETTER_DEFINITIONS } from './data';

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
  handler: ({ res }) => {
    res.json(LETTER_DEFINITIONS);
  },
});
