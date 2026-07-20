import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { env } from '../config/env';

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const FIVE_MB = 5 * 1024 * 1024;

export const storageRoot = resolve(process.cwd(), 'storage', env.NODE_ENV);

export const uploadKindValues = ['KTP', 'KK', 'other', 'photo', 'document'] as const;

type ProcessedUpload = {
  buffer: Buffer;
  mime: string;
  extension: string;
};

type UploadInput = {
  buffer: Buffer;
  mime: string;
  originalName: string;
};

export async function storeUpload(input: UploadInput) {
  validateMime(input.mime);
  validateSize(input.buffer.length);

  const processed = input.mime.startsWith('image/')
    ? await compressImage(input.buffer, input.mime)
    : {
        buffer: input.buffer,
        mime: input.mime,
        extension: normalizeExtension(input.originalName, '.pdf'),
      };

  validateSize(processed.buffer.length);

  const file = await persistStoredFile({
    buffer: processed.buffer,
    mime: processed.mime,
    extension: processed.extension,
  });

  return {
    file,
    url: signedUrl(file.id),
  };
}

export async function storeGeneratedPdf(buffer: Buffer, originalName = 'letter.pdf') {
  validateSize(buffer.length);

  const file = await persistStoredFile({
    buffer,
    mime: 'application/pdf',
    extension: normalizeExtension(originalName, '.pdf'),
  });

  return {
    file,
    url: signedUrl(file.id),
  };
}

export function signedUrl(fileId: string, ttlSeconds = SIGNED_URL_TTL_SECONDS) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = sign(fileId, exp);
  return `${env.PUBLIC_BASE_URL}/api/uploads/${fileId}?exp=${exp}&sig=${sig}`;
}

export function assertSignedUrl(fileId: string, exp: number, sig: string) {
  const now = Math.floor(Date.now() / 1000);
  if (exp < now) {
    throw ApiError.forbidden('URL file tidak valid atau kedaluwarsa');
  }

  const expected = sign(fileId, exp);
  const provided = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);

  if (
    provided.length !== expectedBuffer.length ||
    !timingSafeEqual(provided, expectedBuffer)
  ) {
    throw ApiError.forbidden('URL file tidak valid atau kedaluwarsa');
  }
}

export async function readStoredFile(fileId: string) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw ApiError.notFound('File tidak ditemukan');

  const absolutePath = join(storageRoot, file.storagePath);
  const buffer = await readFile(absolutePath).catch(() => {
    throw ApiError.notFound('File tidak ditemukan');
  });

  return { file, buffer };
}

function sign(fileId: string, exp: number) {
  return createHmac('sha256', env.JWT_SECRET).update(`${fileId}:${exp}`).digest('hex');
}

function validateMime(mime: string) {
  if (mime === 'application/pdf') return;
  if (mime.startsWith('image/')) return;

  throw ApiError.validation('Data yang dikirim tidak valid', {
    file: 'Tipe file harus gambar atau PDF',
  });
}

function validateSize(size: number) {
  if (size <= FIVE_MB) return;

  throw ApiError.validation('Data yang dikirim tidak valid', {
    file: 'Ukuran file maksimal 5 MB',
  });
}

async function compressImage(buffer: Buffer, mime: string): Promise<ProcessedUpload> {
  try {
    const image = sharp(buffer).rotate();
    const metadata = await image.metadata();

    switch (metadata.format) {
      case 'jpeg':
        return {
          buffer: await image.jpeg({ quality: 82 }).toBuffer(),
          mime: 'image/jpeg',
          extension: '.jpg',
        };
      case 'png':
        return {
          buffer: await image.png({ compressionLevel: 9 }).toBuffer(),
          mime: 'image/png',
          extension: '.png',
        };
      case 'webp':
        return {
          buffer: await image.webp({ quality: 82 }).toBuffer(),
          mime: 'image/webp',
          extension: '.webp',
        };
      case 'gif':
        return { buffer, mime, extension: '.gif' };
      default:
        return {
          buffer: await image.jpeg({ quality: 82 }).toBuffer(),
          mime: 'image/jpeg',
          extension: '.jpg',
        };
    }
  } catch {
    return { buffer, mime, extension: extensionFromMime(mime) };
  }
}

async function persistStoredFile(input: { buffer: Buffer; mime: string; extension: string }) {
  const storageName = `${randomUUID()}${input.extension}`;
  const absolutePath = join(storageRoot, storageName);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.buffer);

  return prisma.file.create({
    data: {
      storagePath: storageName,
      mime: input.mime,
      size: input.buffer.length,
    },
  });
}

function normalizeExtension(originalName: string, fallback: string) {
  const originalExtension = extname(originalName).toLowerCase();
  return originalExtension || fallback;
}

function extensionFromMime(mime: string) {
  switch (mime) {
    case 'image/png':
      return '.png';
    case 'image/jpeg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '.bin';
  }
}
