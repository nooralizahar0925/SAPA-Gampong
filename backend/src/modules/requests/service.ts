import { Prisma, type AttachmentKind, type LetterRequest, type LetterType, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { env } from '../../config/env';
import { getLetterDefinition, type LetterField } from '../letters/data';
import { signedUrl } from '../../services/storage.service';
import { assignLetterNumber } from '../letters/number.service';
import type { CreateRequestBodyType, PatchRequestStatusBodyType } from './schemas';
import { canTransition, targetStatusFor } from './state-machine';
import { revokeVerification } from '../verify/service';
import { notifyRequestRejected } from '../notifications/service';

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Menunggu diproses',
  IN_REVIEW: 'Sedang diproses',
  NEEDS_INFO: 'Perlu informasi tambahan',
  APPROVED: 'Disetujui',
  GENERATED: 'Surat selesai dibuat',
  SENT: 'Surat telah dikirim',
  REJECTED: 'Ditolak',
};

export async function createPublicRequest(input: CreateRequestBodyType) {
  const definition = getLetterDefinition(input.letter_type);
  if (!definition) {
    throw ApiError.validation('Data yang dikirim tidak valid', {
      letter_type: 'Jenis surat tidak dikenal',
    });
  }

  const subjectData = buildSubjectSchema(definition.fields).parse(input.subject_data);
  await validateAttachments(definition.required_attachments, input.attachments);

  const attachmentRows = input.attachments.map((attachment) => ({
    fileId: attachment.file_id,
    kind: attachment.kind as AttachmentKind,
  }));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const referenceCode = await nextReferenceCode(tx);

        const created = await tx.letterRequest.create({
          data: {
            referenceCode,
            letterType: input.letter_type as LetterType,
            status: 'SUBMITTED',
            applicantName: input.applicant_name,
            applicantEmail: input.applicant_email,
            applicantPhone: input.applicant_phone?.trim() || null,
            keperluan: input.keperluan?.trim() || null,
            subjectData,
            attachments: {
              create: attachmentRows,
            },
          },
        });

        return {
          id: created.id,
          reference_code: created.referenceCode,
          status: created.status,
        };
      });
    } catch (error) {
      if (isReferenceConflict(error)) continue;
      throw error;
    }
  }

  throw ApiError.conflict('Gagal membuat kode referensi permohonan');
}

export async function trackRequest(referenceCode: string) {
  const found = await prisma.letterRequest.findUnique({
    where: { referenceCode },
  });

  if (!found) throw ApiError.notFound('Permohonan tidak ditemukan');

  return {
    reference_code: found.referenceCode,
    letter_type: found.letterType,
    status: found.status,
    status_label: STATUS_LABELS[found.status] ?? found.status,
    updated_at: found.updatedAt.toISOString(),
  };
}

export async function listAdminRequests(input: {
  status?: LetterRequest['status'];
  letter_type?: string;
  q?: string;
  page: number;
}) {
  const pageSize = 20;
  const where: Prisma.LetterRequestWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.letter_type ? { letterType: input.letter_type as LetterType } : {}),
    ...(input.q
      ? {
          OR: [
            { referenceCode: { contains: input.q, mode: 'insensitive' } },
            { applicantName: { contains: input.q, mode: 'insensitive' } },
            { applicantEmail: { contains: input.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.letterRequest.count({ where }),
    prisma.letterRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      reference_code: item.referenceCode,
      letter_type: item.letterType,
      applicant_name: item.applicantName,
      status: item.status,
      created_at: item.createdAt.toISOString(),
      email: item.applicantEmail,
    })),
    total,
    page: input.page,
  };
}

export async function getAdminRequestDetail(id: string) {
  const found = await prisma.letterRequest.findUnique({
    where: { id },
    include: {
      attachments: {
        include: { file: true },
      },
      histories: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!found) throw ApiError.notFound('Permohonan tidak ditemukan');
  return serializeRequestDetail(found);
}

export async function updateRequestStatus(
  id: string,
  input: PatchRequestStatusBodyType,
  adminUserId: string,
) {
  if (input.action === 'reject' && !input.reason?.trim()) {
    throw ApiError.validation('Data yang dikirim tidak valid', {
      reason: 'Alasan penolakan wajib diisi',
    });
  }

  const found = await prisma.letterRequest.findUnique({ where: { id } });
  if (!found) throw ApiError.notFound('Permohonan tidak ditemukan');
  if (!canTransition(found.status, input.action)) {
    throw ApiError.conflict('Perubahan status tidak diizinkan dari status saat ini');
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: { name: true },
  });

  const subjectData = input.subject_data
    ? validateSubjectData(found.letterType, input.subject_data)
    : (found.subjectData as Record<string, unknown>);

  const result = await prisma.$transaction(async (tx) => {
    const targetStatus = targetStatusFor(input.action);
    const year = new Date().getFullYear();
    const nomorSurat =
      input.action === 'approve'
        ? input.nomor_surat?.trim() || found.nomorSurat || (await assignLetterNumber(tx, found.letterType, year))
        : found.nomorSurat;

    const updated = await tx.letterRequest.update({
      where: { id },
      data: {
        status: targetStatus,
        subjectData,
        nomorSurat,
        decisionReason: input.action === 'reject' || input.action === 'needs_info' ? input.reason?.trim() || null : null,
        decidedBy: adminUserId,
      },
      include: {
        attachments: {
          include: { file: true },
        },
        histories: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    await tx.requestStatusHistory.create({
      data: {
        requestId: found.id,
        fromStatus: found.status,
        toStatus: targetStatus,
        action: input.action,
        reason: input.reason?.trim() || null,
        actorId: adminUserId,
        actorName: admin?.name ?? null,
        subjectData,
        nomorSurat,
      },
    });

    updated.histories.push({
      id: 'pending-response-history',
      requestId: found.id,
      fromStatus: found.status,
      toStatus: targetStatus,
      action: input.action,
      reason: input.reason?.trim() || null,
      actorId: adminUserId,
      actorName: admin?.name ?? null,
      subjectData: null,
      nomorSurat,
      createdAt: new Date(),
    });

    return serializeRequestDetail(updated);
  });

  if (input.action === 'reject' && input.reason?.trim()) {
    await notifyRequestRejected({
      applicantEmail: found.applicantEmail,
      applicantName: found.applicantName,
      referenceCode: found.referenceCode,
      letterType: found.letterType,
      reason: input.reason.trim(),
    });
  }

  return result;
}

export { revokeVerification };

function buildSubjectSchema(fields: readonly LetterField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    shape[field.key] = field.required ? requiredFieldSchema(field) : optionalFieldSchema(field);
  }

  return z.object(shape).strict();
}

function validateSubjectData(letterType: LetterType, subjectData: Record<string, unknown>) {
  const definition = getLetterDefinition(letterType);
  if (!definition) {
    throw ApiError.validation('Data yang dikirim tidak valid', {
      letter_type: 'Jenis surat tidak dikenal',
    });
  }

  return buildSubjectSchema(definition.fields).parse(subjectData);
}

function requiredFieldSchema(field: LetterField) {
  return baseFieldSchema(field, true);
}

function optionalFieldSchema(field: LetterField) {
  return z.union([baseFieldSchema(field, false), z.literal('')]).optional();
}

function baseFieldSchema(field: LetterField, required: boolean) {
  switch (field.type) {
    case 'nik':
      return z.string().regex(/^\d{16}$/, requiredMessage(field));
    case 'date':
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${field.label} must use YYYY-MM-DD`);
    case 'time':
      return z.string().regex(/^\d{2}:\d{2}$/, `${field.label} must use HH:mm`);
    case 'year':
      return z.string().regex(/^\d{4}$/, `${field.label} must be a 4-digit year`);
    case 'number':
      return z.union([
        z.number().int().nonnegative(),
        z.string().regex(/^\d+$/, `${field.label} must be numeric`),
      ]);
    case 'email':
      return z.string().email(`${field.label} must be a valid email address`);
    case 'phone':
      return z.string().regex(/^[+0-9][0-9]{7,15}$/, `${field.label} must be a valid phone number`);
    case 'enum':
      return z.enum([...field.options!] as [string, ...string[]], {
        errorMap: () => ({ message: `${field.label} must be one of the allowed values` }),
      });
    case 'text':
    case 'textarea':
    default:
      return required
        ? z.string().trim().min(1, requiredMessage(field))
        : z.string().trim();
  }
}

function requiredMessage(field: LetterField) {
  return `${field.label} is required`;
}

async function validateAttachments(
  requiredKinds: readonly string[],
  attachments: CreateRequestBodyType['attachments'],
) {
  const fields: Record<string, string> = {};
  const kinds = new Set(attachments.map((item) => item.kind));

  for (const kind of requiredKinds) {
    if (!kinds.has(kind as AttachmentKind)) {
      fields[`attachments.${kind}`] = `Attachment ${kind} is required`;
    }
  }

  const uniqueFileIds = [...new Set(attachments.map((item) => item.file_id))];
  if (uniqueFileIds.length > 0) {
    const files = await prisma.file.findMany({
      where: { id: { in: uniqueFileIds } },
      select: { id: true },
    });
    const existingIds = new Set(files.map((file) => file.id));

    attachments.forEach((attachment, index) => {
      if (!existingIds.has(attachment.file_id)) {
        fields[`attachments.${index}.file_id`] = 'Uploaded file was not found';
      }
    });
  }

  if (Object.keys(fields).length > 0) {
    throw ApiError.validation('Data yang dikirim tidak valid', fields);
  }
}

async function nextReferenceCode(tx: Prisma.TransactionClient | PrismaClient) {
  const year = new Date().getFullYear();
  const prefix = `GB-${year}-`;
  const latest = await tx.letterRequest.findFirst({
    where: { referenceCode: { startsWith: prefix } },
    orderBy: { referenceCode: 'desc' },
    select: { referenceCode: true },
  });

  const nextSequence = latest ? parseSequence(latest.referenceCode) + 1 : 1;
  return `${prefix}${String(nextSequence).padStart(6, '0')}`;
}

function parseSequence(referenceCode: string) {
  const parts = referenceCode.split('-');
  const raw = parts[2];
  const parsed = Number.parseInt(raw ?? '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isReferenceConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function serializeRequestDetail(
  request: LetterRequest & {
    attachments: Array<{
      kind: AttachmentKind;
      fileId: string;
      file: { id: string; mime: string; size: number };
    }>;
    histories?: Array<{
      toStatus: LetterRequest['status'];
      action: string;
      reason: string | null;
      actorName: string | null;
      nomorSurat: string | null;
      createdAt: Date;
    }>;
  },
) {
  return {
    id: request.id,
    reference_code: request.referenceCode,
    letter_type: request.letterType,
    status: request.status,
    applicant_name: request.applicantName,
    applicant_email: request.applicantEmail,
    applicant_phone: request.applicantPhone,
    keperluan: request.keperluan,
    subject_data: request.subjectData,
    attachments: request.attachments.map((attachment) => ({
      file_id: attachment.fileId,
      kind: attachment.kind,
      mime: attachment.file.mime,
      size: attachment.file.size,
      url: signedUrl(attachment.file.id),
    })),
    status_history: (request.histories ?? []).map((history) => ({
      status: history.toStatus,
      at: history.createdAt.toISOString(),
      action: history.action,
      by: history.actorName ?? undefined,
      reason: history.reason ?? undefined,
      nomor_surat: history.nomorSurat ?? undefined,
    })),
    nomor_surat: request.nomorSurat,
    generated_pdf_id: request.generatedPdfId,
    generated_pdf_url: request.generatedPdfId ? signedUrl(request.generatedPdfId) : null,
    verification_token: request.verificationToken,
    verification_url: request.verificationToken ? `${env.PUBLIC_BASE_URL}/verify/${request.verificationToken}` : null,
    decision_reason: request.decisionReason,
    decided_by: request.decidedBy,
    created_at: request.createdAt.toISOString(),
    updated_at: request.updatedAt.toISOString(),
  };
}
