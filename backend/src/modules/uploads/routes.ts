import { Router } from 'express';
import multer from 'multer';
import { defineRoute } from '../../openapi/define-route';
import { registry } from '../../openapi/registry';
import { errorResponse } from '../../openapi/components';
import { ApiError } from '../../lib/errors';
import {
  assertSignedUrl,
  readStoredFile,
  storeUpload,
} from '../../services/storage.service';
import {
  BinaryFileResponseSchema,
  SignedUploadParams,
  SignedUploadQuery,
  UploadFieldsBody,
  UploadMultipartBody,
  UploadResponseSchema,
} from './schemas';

const upload = multer({ storage: multer.memoryStorage() });

export const uploadsRouter = Router();

registry.registerPath({
  method: 'post',
  path: '/api/uploads',
  tags: ['Uploads'],
  summary: 'Unggah lampiran gambar atau PDF',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: UploadMultipartBody,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'File berhasil diunggah',
      content: { 'application/json': { schema: UploadResponseSchema } },
    },
    400: errorResponse('Data upload tidak valid'),
  },
});

uploadsRouter.post('/', upload.single('file'), async (req, res, next) => {
  try {
    UploadFieldsBody.parse(req.body);

    if (!req.file) {
      throw ApiError.validation('Data yang dikirim tidak valid', {
        file: 'File wajib diunggah',
      });
    }

    const stored = await storeUpload({
      buffer: req.file.buffer,
      mime: req.file.mimetype,
      originalName: req.file.originalname,
    });

    res.status(201).json({
      file_id: stored.file.id,
      url: stored.url,
      mime: stored.file.mime,
      size: stored.file.size,
    });
  } catch (err) {
    next(err);
  }
});

defineRoute(uploadsRouter, {
  method: 'get',
  path: '/:fileId',
  fullPath: '/api/uploads/{fileId}',
  tags: ['Uploads'],
  summary: 'Ambil file lewat URL bertanda tangan',
  params: SignedUploadParams,
  query: SignedUploadQuery,
  responses: {
    200: {
      description: 'Konten file',
      content: {
        'application/octet-stream': {
          schema: BinaryFileResponseSchema,
        },
      },
    },
    403: errorResponse('URL file tidak valid atau kedaluwarsa'),
    404: errorResponse('File tidak ditemukan'),
  },
  handler: async ({ params, query, res }) => {
    assertSignedUrl(params.fileId, query.exp, query.sig);
    const { file, buffer } = await readStoredFile(params.fileId);
    res.setHeader('Content-Type', file.mime);
    res.send(buffer);
  },
});
