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
  summary: 'Daftar tipe surat dan skema formulir dinamis',
  responses: {
    200: {
      description: 'Daftar tipe surat',
      content: { 'application/json': { schema: LetterTypeListResponse } },
    },
  },
  handler: ({ res }) => {
    res.json(LETTER_DEFINITIONS);
  },
});
