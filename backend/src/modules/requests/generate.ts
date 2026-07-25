import { createHash } from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { env } from '../../config/env';
import { QrService } from '../letters/qr.service';
import { assignLetterNumber } from '../letters/number.service';
import { renderRequestLetterHtml } from '../letters/rendering';
import { PdfService } from '../../services/pdf.service';
import { signedUrl, storeGeneratedPdf } from '../../services/storage.service';
import { notifyRequestStatusChanged } from '../notifications/service';

export async function generateApprovedRequest(id: string, adminUserId: string) {
  const found = await prisma.letterRequest.findUnique({
    where: { id },
    select: {
      id: true,
      referenceCode: true,
      letterType: true,
      status: true,
      subjectData: true,
      applicantName: true,
      keperluan: true,
      nomorSurat: true,
      verificationToken: true,
    },
  });

  if (!found) throw ApiError.notFound('Permohonan tidak ditemukan');
  if (found.status !== 'APPROVED' && found.status !== 'GENERATED') {
    throw ApiError.conflict('Surat hanya dapat digenerate dari status APPROVED atau GENERATED');
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: { name: true },
  });

  const prepared = await prisma.$transaction(async (tx) => {
    const current = await tx.letterRequest.findUnique({
      where: { id },
      select: {
        id: true,
        referenceCode: true,
        status: true,
        letterType: true,
        subjectData: true,
        applicantName: true,
        keperluan: true,
        nomorSurat: true,
        verificationToken: true,
      },
    });

    if (!current) throw ApiError.notFound('Permohonan tidak ditemukan');
    if (current.status !== 'APPROVED' && current.status !== 'GENERATED') {
      throw ApiError.conflict('Surat hanya dapat digenerate dari status APPROVED atau GENERATED');
    }

    const nomorSurat =
      current.nomorSurat ?? (await assignLetterNumber(tx, current.letterType, new Date().getFullYear()));
    const verificationToken = current.verificationToken ?? QrService.newToken();

    await tx.letterRequest.update({
      where: { id },
      data: {
        nomorSurat,
        verificationToken,
      },
    });

      return {
        id: current.id,
        referenceCode: current.referenceCode,
        letterType: current.letterType,
        subjectData: current.subjectData as Record<string, unknown>,
        applicantName: current.applicantName,
        keperluan: current.keperluan,
        nomorSurat,
        verificationToken,
      };
  });

  const verifyUrl = `${env.PUBLIC_BASE_URL}/verify/${prepared.verificationToken}`;
  const qrDataUrl = await QrService.pngDataUrl(verifyUrl);
  const html = await renderRequestLetterHtml({
    letterType: prepared.letterType,
    subjectData: prepared.subjectData,
    applicantName: prepared.applicantName,
    keperluan: prepared.keperluan,
    nomorSurat: prepared.nomorSurat,
    qrDataUrl,
    verificationUrl: verifyUrl,
  });
  const pdfBuffer = await PdfService.render(html);
  const stored = await storeGeneratedPdf(pdfBuffer, `surat-${prepared.id}.pdf`);
  const pdfHash = createHash('sha256').update(pdfBuffer).digest('hex');

  await prisma.$transaction(async (tx) => {
    const previousStatus = found.status;
    await tx.letterRequest.update({
      where: { id: prepared.id },
      data: {
        status: 'GENERATED',
        generatedPdfId: stored.file.id,
        pdfHash,
      },
    });

    await tx.requestStatusHistory.create({
      data: {
        requestId: prepared.id,
        fromStatus: previousStatus,
        toStatus: 'GENERATED',
        action: previousStatus === 'GENERATED' ? 'regenerate' : 'generate',
        actorId: adminUserId,
        actorName: admin?.name ?? null,
        nomorSurat: prepared.nomorSurat,
      },
    });
  });

  if (found.status === 'APPROVED') {
    await notifyRequestStatusChanged({
      requestId: prepared.id,
      referenceCode: prepared.referenceCode,
      letterType: prepared.letterType,
      status: 'GENERATED',
    });
  }

  return {
    pdf_id: stored.file.id,
    pdf_url: signedUrl(stored.file.id),
    verification_token: prepared.verificationToken,
    nomor_surat: prepared.nomorSurat,
  };
}
