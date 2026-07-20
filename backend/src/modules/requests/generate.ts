import { createHash } from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { env } from '../../config/env';
import { getLetterDefinition } from '../letters/data';
import { QrService } from '../letters/qr.service';
import { assignLetterNumber } from '../letters/number.service';
import { readBriefAssetDataUrl, renderLetterTemplate } from '../letters/template.service';
import { PdfService } from '../../services/pdf.service';
import { signedUrl, storeGeneratedPdf } from '../../services/storage.service';

export async function generateApprovedRequest(id: string, adminUserId: string) {
  const found = await prisma.letterRequest.findUnique({
    where: { id },
    select: {
      id: true,
      letterType: true,
      status: true,
      subjectData: true,
      applicantName: true,
      nomorSurat: true,
      verificationToken: true,
    },
  });

  if (!found) throw ApiError.notFound('Permohonan tidak ditemukan');
  if (found.status !== 'APPROVED') {
    throw ApiError.conflict('Surat hanya dapat digenerate dari status APPROVED');
  }
  if (found.letterType !== 'L1') {
    throw ApiError.conflict('Generate PDF saat ini baru tersedia untuk jenis surat L1');
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
        status: true,
        letterType: true,
        subjectData: true,
        applicantName: true,
        nomorSurat: true,
        verificationToken: true,
      },
    });

    if (!current) throw ApiError.notFound('Permohonan tidak ditemukan');
    if (current.status !== 'APPROVED') {
      throw ApiError.conflict('Surat hanya dapat digenerate dari status APPROVED');
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
      letterType: current.letterType,
      applicantName: current.applicantName,
      subjectData: current.subjectData as Record<string, unknown>,
      nomorSurat,
      verificationToken,
    };
  });

  const verifyUrl = `${env.PUBLIC_BASE_URL}/verify/${prepared.verificationToken}`;
  const qrDataUrl = await QrService.pngDataUrl(verifyUrl);
  const html = await renderL1Letter(prepared.subjectData, {
    nomorSurat: prepared.nomorSurat,
    verificationUrl: verifyUrl,
    qrDataUrl,
  });
  const pdfBuffer = await PdfService.render(html);
  const stored = await storeGeneratedPdf(pdfBuffer, `surat-${prepared.id}.pdf`);
  const pdfHash = createHash('sha256').update(pdfBuffer).digest('hex');

  await prisma.$transaction(async (tx) => {
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
        fromStatus: 'APPROVED',
        toStatus: 'GENERATED',
        action: 'generate',
        actorId: adminUserId,
        actorName: admin?.name ?? null,
        nomorSurat: prepared.nomorSurat,
      },
    });
  });

  return {
    pdf_id: stored.file.id,
    pdf_url: signedUrl(stored.file.id),
    verification_token: prepared.verificationToken,
    nomor_surat: prepared.nomorSurat,
  };
}

async function renderL1Letter(
  subjectData: Record<string, unknown>,
  systemFields: {
    nomorSurat: string;
    verificationUrl: string;
    qrDataUrl: string;
  },
) {
  const definition = getLetterDefinition('L1');
  if (!definition) {
    throw new Error('Letter definition L1 is missing');
  }
  const logoDataUrl = await readBriefAssetDataUrl('logo.webp');

  return renderLetterTemplate('L1.html', {
    logoDataUrl,
    nomorSurat: systemFields.nomorSurat,
    tanggalTerbit: formatIndonesianDate(new Date()),
    nama: stringValue(subjectData.nama),
    ttl: buildTtl(subjectData),
    nik: stringValue(subjectData.nik),
    jenisKelamin: stringValue(subjectData.jenis_kelamin),
    agama: stringValue(subjectData.agama),
    statusPerkawinan: stringValue(subjectData.status_perkawinan),
    pekerjaan: stringValue(subjectData.pekerjaan),
    alamat: stringValue(subjectData.alamat),
    dusun: stringValue(subjectData.dusun),
    gampong: stringValue(subjectData.gampong) || 'Blang',
    kecamatan: stringValue(subjectData.kecamatan) || 'Krueng Sabee',
    kabupaten: stringValue(subjectData.kabupaten) || 'Aceh Jaya',
    jenisSurat: definition.name,
    qrDataUrl: systemFields.qrDataUrl,
    verificationUrl: systemFields.verificationUrl,
  });
}

function buildTtl(subjectData: Record<string, unknown>) {
  const place = stringValue(subjectData.ttl_tempat);
  const date = stringValue(subjectData.ttl_tanggal);
  if (!place && !date) return '-';
  return [place, formatDateFromIso(date)].filter(Boolean).join(', ');
}

function formatDateFromIso(value: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return formatIndonesianDate(date);
}

function formatIndonesianDate(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '-';
}
