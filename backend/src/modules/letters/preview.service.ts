import type { LetterType } from '@prisma/client';
import { env } from '../../config/env';
import { ApiError } from '../../lib/errors';
import { PdfService } from '../../services/pdf.service';
import { QrService } from './qr.service';
import { renderRequestLetterHtml } from './rendering';
import { getLetterTemplateDefinition } from './service';
import type { LetterField } from './data';

export async function renderLetterTemplatePreviewPdf(code: string) {
  const definition = await getLetterTemplateDefinition(code, true);
  if (!definition) throw ApiError.notFound('Template surat tidak ditemukan');

  const verificationUrl = `${env.PUBLIC_BASE_URL}/verify/preview-${definition.code.toLowerCase()}`;
  const html = await renderRequestLetterHtml({
    letterType: definition.code as LetterType,
    subjectData: sampleSubjectData(definition.fields),
    applicantName: 'Muhammad Rizki',
    keperluan: 'Pratinjau template surat',
    nomorSurat: `PREVIEW/${definition.code}/${new Date().getFullYear()}`,
    verificationUrl,
    qrDataUrl: await QrService.pngDataUrl(verificationUrl),
  });

  return PdfService.render(html);
}

function sampleSubjectData(fields: readonly LetterField[]) {
  return Object.fromEntries(fields.map((field) => [field.key, sampleValue(field)]));
}

function sampleValue(field: LetterField) {
  if (field.options?.length) return field.options[0];

  switch (field.type) {
    case 'date':
      return '2026-07-22';
    case 'time':
      return '09:00';
    case 'year':
      return '2026';
    case 'number':
      return 1;
    case 'nik':
      return '1107012207960001';
    case 'phone':
      return '+62 812 3456 789';
    case 'email':
      return 'warga@gampongblangdigital.com';
    case 'textarea':
      return sampleTextForKey(field.key, field.label, true);
    default:
      return sampleTextForKey(field.key, field.label, false);
  }
}

function sampleTextForKey(key: string, label: string, long: boolean) {
  const lower = key.toLowerCase();
  if (lower.includes('nama')) return 'Muhammad Rizki';
  if (lower.includes('nik')) return '1107012207960001';
  if (lower.includes('ttl_tempat')) return 'Calang';
  if (lower.includes('alamat')) return 'Dusun Kuini, Gampong Blang, Kec. Krueng Sabee';
  if (lower.includes('pekerjaan')) return 'Wiraswasta';
  if (lower.includes('gampong')) return 'Blang';
  if (lower.includes('kecamatan')) return 'Krueng Sabee';
  if (lower.includes('kabupaten')) return 'Aceh Jaya';
  if (lower.includes('dusun')) return 'Kuini';
  if (lower.includes('agama')) return 'Islam';
  if (lower.includes('status')) return 'Belum Kawin';
  if (lower.includes('keperluan')) return 'Melengkapi administrasi';

  return long
    ? `Contoh isian untuk ${label.toLowerCase()} pada pratinjau template.`
    : `Contoh ${label}`;
}
