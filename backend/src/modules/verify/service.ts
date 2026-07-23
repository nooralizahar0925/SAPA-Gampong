import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { buildMaskedPerihal } from './masking';
import { getLetterTemplateDefinition } from '../letters/service';

const SIGNATORY_DISPLAY: Record<string, string> = {
  Keuchik: 'Sofian — Keuchik Gampong Blang',
  'Sekretaris Gampong a.n. Keuchik': 'Afzalul Zikri, S.P — Sekretaris Gampong a.n. Keuchik Gampong Blang',
};

export async function verifyByToken(token: string) {
  const found = await prisma.letterRequest.findUnique({
    where: { verificationToken: token },
  });

  if (!found) return { valid: false as const };
  if (found.qrRevoked) return { valid: false as const };
  if (!['GENERATED', 'SENT'].includes(found.status)) return { valid: false as const };

  await prisma.letterRequest.update({
    where: { id: found.id },
    data: { verifiedCount: { increment: 1 } },
  });

  const definition = await getLetterTemplateDefinition(found.letterType, true);
  const subjectData = found.subjectData as Record<string, unknown>;
  const name = pickSubjectName(subjectData);
  const nik = typeof subjectData.nik === 'string' ? subjectData.nik : undefined;
  const signatory = definition ? SIGNATORY_DISPLAY[definition.signatory] ?? definition.signatory : found.letterType;

  return {
    valid: true as const,
    nomor_surat: found.nomorSurat ?? '-',
    jenis_surat: definition?.name ?? found.letterType,
    tanggal_terbit: found.updatedAt.toISOString().slice(0, 10),
    penandatangan: signatory,
    perihal: buildMaskedPerihal(name, nik),
    revoked: false as const,
  };
}

export async function revokeVerification(id: string) {
  const found = await prisma.letterRequest.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!found) throw ApiError.notFound('Permohonan tidak ditemukan');

  await prisma.letterRequest.update({
    where: { id },
    data: { qrRevoked: true },
  });

  return { revoked: true as const };
}

function pickSubjectName(subjectData: Record<string, unknown>) {
  const candidates = ['nama', 'nama_anak', 'nama_pemohon', 'nama_kantor'];
  for (const key of candidates) {
    const value = subjectData[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}
