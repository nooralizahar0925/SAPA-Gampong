import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { readStoredFile } from '../../services/storage.service';
import { notifyRequestSent } from '../notifications/service';

export async function sendGeneratedRequest(id: string, adminUserId: string) {
  const found = await prisma.letterRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      referenceCode: true,
      applicantName: true,
      applicantEmail: true,
      letterType: true,
      nomorSurat: true,
      generatedPdfId: true,
    },
  });

  if (!found) throw ApiError.notFound('Permohonan tidak ditemukan');
  if (found.status !== 'GENERATED') {
    throw ApiError.conflict('Surat hanya dapat dikirim dari status GENERATED');
  }
  if (!found.generatedPdfId || !found.nomorSurat) {
    throw ApiError.conflict('PDF surat belum siap dikirim');
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: { name: true },
  });

  const { buffer } = await readStoredFile(found.generatedPdfId);

  await notifyRequestSent({
    requestId: found.id,
    applicantEmail: found.applicantEmail,
    applicantName: found.applicantName,
    referenceCode: found.referenceCode,
    nomorSurat: found.nomorSurat,
    letterType: found.letterType,
    pdf: buffer,
  });

  await prisma.$transaction(async (tx) => {
    await tx.letterRequest.update({
      where: { id: found.id },
      data: {
        status: 'SENT',
      },
    });

    await tx.requestStatusHistory.create({
      data: {
        requestId: found.id,
        fromStatus: 'GENERATED',
        toStatus: 'SENT',
        action: 'send',
        actorId: adminUserId,
        actorName: admin?.name ?? null,
        nomorSurat: found.nomorSurat,
      },
    });
  });

  return { status: 'SENT' as const };
}
