import { randomInt } from 'node:crypto';
import { Prisma, type AttachmentKind, type Feedback, type PushPlatform } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { signedUrl } from '../../services/storage.service';
import {
  linkDeviceTokenToFeedback,
  notifyFeedbackReply,
  notifyFeedbackStatusChanged,
} from '../notifications/service';
import type {
  CreateFeedbackBodyType,
  ListFeedbackQueryType,
  ReplyFeedbackBodyType,
  UpdateFeedbackBodyType,
} from './schemas';

const PAGE_SIZE = 20;

/**
 * Crockford-style alphabet: no I/L/O/U, so a code read aloud over the phone or copied
 * off a screen cannot be confused with 1/0.
 */
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function generateReferenceCode() {
  let code = '';
  for (let i = 0; i < 5; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `LPR-${code}`;
}

export async function createPublicFeedback(input: CreateFeedbackBodyType) {
  await validateAttachments(input.attachments);

  const attachments = input.attachments.map((attachment) => ({
    fileId: attachment.file_id,
    kind: attachment.kind as AttachmentKind,
  }));

  // The code is random rather than sequential, so retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await prisma.feedback.create({
        data: {
          referenceCode: generateReferenceCode(),
          name: input.name,
          email: input.email,
          phone: input.phone?.trim() || null,
          body: input.body,
          attachments: { create: attachments },
        },
      });

      if (input.push_token?.trim()) {
        await linkDeviceTokenToFeedback({
          feedbackId: created.id,
          token: input.push_token,
          platform: input.push_platform as PushPlatform,
        });
        await notifyFeedbackStatusChanged({
          feedbackId: created.id,
          referenceCode: created.referenceCode,
          status: 'new',
        });
      }

      return {
        id: created.id,
        reference_code: created.referenceCode,
        status: created.status,
      };
    } catch (error) {
      const isCodeConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!isCodeConflict) throw error;
    }
  }

  throw ApiError.conflict('Gagal membuat kode laporan');
}

export async function listFeedback(input: ListFeedbackQueryType) {
  const where: Prisma.FeedbackWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.q
      ? {
          OR: [
            { referenceCode: { contains: input.q, mode: 'insensitive' } },
            { name: { contains: input.q, mode: 'insensitive' } },
            { email: { contains: input.q, mode: 'insensitive' } },
            { body: { contains: input.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, newCount, items] = await Promise.all([
    prisma.feedback.count({ where }),
    // Deliberately unfiltered: the badge counts every unread report, not just
    // the ones matching the current filter.
    prisma.feedback.count({ where: { status: 'new' } }),
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { attachments: true } } },
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      reference_code: item.referenceCode,
      name: item.name,
      email: item.email,
      phone: item.phone,
      body: item.body,
      status: item.status,
      note: item.note,
      attachment_count: item._count.attachments,
      created_at: item.createdAt.toISOString(),
    })),
    total,
    page: input.page,
    new_count: newCount,
  };
}

export async function getFeedbackDetail(id: string) {
  const found = await prisma.feedback.findUnique({
    where: { id },
    include: { attachments: { include: { file: true } } },
  });

  if (!found) throw ApiError.notFound('Laporan tidak ditemukan');
  return serializeDetail(found);
}

export async function updateFeedback(id: string, input: UpdateFeedbackBodyType) {
  const found = await prisma.feedback.findUnique({ where: { id } });
  if (!found) throw ApiError.notFound('Laporan tidak ditemukan');

  const updated = await prisma.feedback.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      // An empty note clears it; `undefined` leaves it untouched.
      ...(input.note !== undefined ? { note: input.note || null } : {}),
    },
    include: { attachments: { include: { file: true } } },
  });

  if (input.status !== undefined && input.status !== found.status) {
    await notifyFeedbackStatusChanged({
      feedbackId: found.id,
      referenceCode: found.referenceCode,
      status: input.status,
    });
  }

  return serializeDetail(updated);
}

/**
 * Emails the reply to the reporter, then records it. The send happens first on purpose:
 * if the provider rejects it, the report must not be left marked "responded" when
 * nothing ever reached the warga.
 */
export async function replyToFeedback(
  id: string,
  input: ReplyFeedbackBodyType,
  adminUserId: string,
) {
  const found = await prisma.feedback.findUnique({ where: { id } });
  if (!found) throw ApiError.notFound('Laporan tidak ditemukan');

  const reply = input.reply.trim();

  await notifyFeedbackReply({
    reporterEmail: found.email,
    reporterName: found.name,
    referenceCode: found.referenceCode,
    reportedAt: found.createdAt,
    reply,
  });

  const updated = await prisma.feedback.update({
    where: { id },
    data: {
      reply,
      repliedAt: new Date(),
      repliedBy: adminUserId,
      status: 'responded',
      ...(input.note !== undefined ? { note: input.note || null } : {}),
    },
    include: { attachments: { include: { file: true } } },
  });

  try {
    await notifyFeedbackStatusChanged({
      feedbackId: found.id,
      referenceCode: found.referenceCode,
      status: 'responded',
    });
  } catch (error) {
    console.error('Failed to send responded feedback notification', error);
  }

  return serializeDetail(updated);
}

/**
 * Checks the uploaded files exist up front, so a bad `file_id` returns a
 * field-level 400 instead of an opaque foreign-key violation.
 */
async function validateAttachments(attachments: CreateFeedbackBodyType['attachments']) {
  if (attachments.length === 0) return;

  const uniqueFileIds = [...new Set(attachments.map((item) => item.file_id))];
  const files = await prisma.file.findMany({
    where: { id: { in: uniqueFileIds } },
    select: { id: true },
  });
  const existingIds = new Set(files.map((file) => file.id));

  const fields: Record<string, string> = {};
  attachments.forEach((attachment, index) => {
    if (!existingIds.has(attachment.file_id)) {
      fields[`attachments.${index}.file_id`] = 'Berkas lampiran tidak ditemukan';
    }
  });

  if (Object.keys(fields).length > 0) {
    throw ApiError.validation('Data yang dikirim tidak valid', fields);
  }
}

function serializeDetail(
  feedback: Feedback & {
    attachments: Array<{
      kind: AttachmentKind;
      fileId: string;
      file: { id: string; mime: string; size: number; originalName: string | null };
    }>;
  },
) {
  return {
    id: feedback.id,
    reference_code: feedback.referenceCode,
    name: feedback.name,
    email: feedback.email,
    phone: feedback.phone,
    body: feedback.body,
    status: feedback.status,
    note: feedback.note,
    reply: feedback.reply,
    replied_at: feedback.repliedAt?.toISOString() ?? null,
    attachments: feedback.attachments.map((attachment) => ({
      file_id: attachment.fileId,
      kind: attachment.kind,
      mime: attachment.file.mime,
      size: attachment.file.size,
      original_name: attachment.file.originalName,
      url: signedUrl(attachment.file.id),
    })),
    created_at: feedback.createdAt.toISOString(),
  };
}
