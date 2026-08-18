import type { LetterTemplate, LetterType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import {
  LETTER_DEFINITIONS,
  LETTER_TYPE_CODES,
  type LetterDefinition,
  type LetterField,
} from './data';
import type { CreateLetterTemplateBodyType, UpdateLetterTemplateBodyType } from './schemas';

type SerializableLetterTemplate = LetterDefinition & {
  id: string;
  active: boolean;
  updated_at: string;
};

const TEMPLATE_CODE_SET = new Set<string>(LETTER_TYPE_CODES);

function withoutLegacyKk(attachments: readonly string[]) {
  return attachments.filter((kind) => kind !== 'KK');
}

function assertSupportedCode(code: string): asserts code is LetterType {
  if (!TEMPLATE_CODE_SET.has(code)) {
    throw ApiError.validation('Data yang dikirim tidak valid', {
      code: 'Kode surat harus salah satu dari L1 sampai L10.',
    });
  }
}

function defaultTemplateRows() {
  return LETTER_DEFINITIONS.map((definition) => ({
    code: definition.code as LetterType,
    name: definition.name,
    description: definition.description,
    subjectIsApplicant: definition.subject_is_applicant,
    requiredAttachments: withoutLegacyKk(definition.required_attachments),
    signatory: definition.signatory,
    fields: JSON.parse(JSON.stringify(definition.fields)),
    active: true,
  }));
}

/**
 * Existing installs already have hard-coded definitions. The first catalog request
 * materializes those definitions into the database so admins can edit the copy after
 * migration without running a separate seed command.
 */
export async function ensureLetterTemplatesSeeded() {
  const marker = await prisma.appConfig.findUnique({
    where: { id: 'singleton' },
    select: { letterTemplatesSeeded: true },
  });
  if (marker?.letterTemplatesSeeded) return;

  await prisma.$transaction([
    prisma.letterTemplate.createMany({ data: defaultTemplateRows(), skipDuplicates: true }),
    prisma.appConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', letterTemplatesSeeded: true },
      update: { letterTemplatesSeeded: true },
    }),
  ]);
}

function serializeTemplate(row: LetterTemplate): SerializableLetterTemplate {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    subject_is_applicant: row.subjectIsApplicant,
    required_attachments: withoutLegacyKk(row.requiredAttachments),
    signatory: row.signatory,
    fields: (row.fields ?? []) as unknown as LetterField[],
    active: row.active,
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function listPublicLetterTypes() {
  await ensureLetterTemplatesSeeded();
  const rows = await prisma.letterTemplate.findMany({
    where: { active: true },
    orderBy: { code: 'asc' },
  });

  return rows.map(serializeTemplate).map(({ id: _id, active: _active, updated_at: _updatedAt, ...item }) => item);
}

export async function listAdminLetterTemplates() {
  await ensureLetterTemplatesSeeded();
  const rows = await prisma.letterTemplate.findMany({ orderBy: { code: 'asc' } });
  return rows.map(serializeTemplate);
}

export async function getLetterTemplateDefinition(code: string, includeInactive = false) {
  assertSupportedCode(code);
  await ensureLetterTemplatesSeeded();

  const row = await prisma.letterTemplate.findUnique({ where: { code } });
  if (!row) return undefined;
  if (!includeInactive && !row.active) return undefined;

  const { id: _id, active: _active, updated_at: _updatedAt, ...definition } =
    serializeTemplate(row);
  return definition;
}

export async function createLetterTemplate(input: CreateLetterTemplateBodyType) {
  assertSupportedCode(input.code);
  await ensureLetterTemplatesSeeded();
  const fallback = LETTER_DEFINITIONS.find((definition) => definition.code === input.code);
  if (!fallback) throw ApiError.notFound('Template surat tidak ditemukan');

  try {
    const created = await prisma.letterTemplate.create({
      data: {
        code: input.code,
        name: input.name ?? fallback.name,
        description: input.description ?? fallback.description,
        subjectIsApplicant: input.subject_is_applicant ?? fallback.subject_is_applicant,
        requiredAttachments: withoutLegacyKk(
          input.required_attachments ?? fallback.required_attachments,
        ),
        signatory: input.signatory ?? fallback.signatory,
        fields: input.fields ?? JSON.parse(JSON.stringify(fallback.fields)),
        active: input.active ?? true,
      },
    });

    return serializeTemplate(created);
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw ApiError.conflict(`Template ${input.code} sudah ada.`);
    }
    throw error;
  }
}

export async function updateLetterTemplate(code: string, input: UpdateLetterTemplateBodyType) {
  assertSupportedCode(code);
  await ensureLetterTemplatesSeeded();

  try {
    const updated = await prisma.letterTemplate.update({
      where: { code },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.subject_is_applicant !== undefined
          ? { subjectIsApplicant: input.subject_is_applicant }
          : {}),
        ...(input.required_attachments !== undefined
          ? { requiredAttachments: withoutLegacyKk(input.required_attachments) }
          : {}),
        ...(input.signatory !== undefined ? { signatory: input.signatory } : {}),
        ...(input.fields !== undefined ? { fields: input.fields } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });

    return serializeTemplate(updated);
  } catch (error) {
    if (isNotFoundConstraint(error)) throw ApiError.notFound('Template surat tidak ditemukan');
    throw error;
  }
}

export async function deleteLetterTemplate(code: string) {
  assertSupportedCode(code);
  await ensureLetterTemplatesSeeded();
  try {
    await prisma.letterTemplate.delete({ where: { code } });
  } catch (error) {
    if (isNotFoundConstraint(error)) throw ApiError.notFound('Template surat tidak ditemukan');
    throw error;
  }
}

function isUniqueConstraint(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

function isNotFoundConstraint(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2025'
  );
}
