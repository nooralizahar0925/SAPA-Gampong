import { getLetterDefinition } from '../letters/data';
import { EmailService } from '../../services/email.service';

export async function notifyRequestSent(input: {
  applicantEmail: string;
  applicantName: string;
  referenceCode: string;
  nomorSurat: string;
  letterType: string;
  pdf: Buffer;
}) {
  const letterName = getLetterDefinition(input.letterType)?.name ?? input.letterType;

  await EmailService.send({
    to: input.applicantEmail,
    subject: `Surat Anda Sudah Dikirim - ${input.referenceCode}`,
    html: renderSentEmail({
      applicantName: input.applicantName,
      referenceCode: input.referenceCode,
      nomorSurat: input.nomorSurat,
      letterName,
    }),
    attachments: [
      {
        filename: `${input.referenceCode}.pdf`,
        content: input.pdf,
        contentType: 'application/pdf',
      },
    ],
  });
}

export async function notifyRequestRejected(input: {
  applicantEmail: string;
  applicantName: string;
  referenceCode: string;
  letterType: string;
  reason: string;
}) {
  const letterName = getLetterDefinition(input.letterType)?.name ?? input.letterType;

  await EmailService.send({
    to: input.applicantEmail,
    subject: `Permohonan Surat Ditolak - ${input.referenceCode}`,
    html: renderRejectedEmail({
      applicantName: input.applicantName,
      referenceCode: input.referenceCode,
      letterName,
      reason: input.reason,
    }),
  });
}

function renderSentEmail(input: {
  applicantName: string;
  referenceCode: string;
  nomorSurat: string;
  letterName: string;
}) {
  return `<!doctype html>
<html lang="id">
  <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <p>Yth. ${escapeHtml(input.applicantName)},</p>
    <p>Surat Anda telah selesai diproses dan dikirimkan sebagai lampiran email ini.</p>
    <ul>
      <li>Jenis surat: ${escapeHtml(input.letterName)}</li>
      <li>Kode permohonan: ${escapeHtml(input.referenceCode)}</li>
      <li>Nomor surat: ${escapeHtml(input.nomorSurat)}</li>
    </ul>
    <p>Silakan simpan dokumen PDF terlampir untuk keperluan Anda.</p>
    <p>Hormat kami,<br />Pemerintah Gampong Blang</p>
  </body>
</html>`;
}

function renderRejectedEmail(input: {
  applicantName: string;
  referenceCode: string;
  letterName: string;
  reason: string;
}) {
  return `<!doctype html>
<html lang="id">
  <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <p>Yth. ${escapeHtml(input.applicantName)},</p>
    <p>Permohonan Anda untuk ${escapeHtml(input.letterName)} belum dapat diproses lebih lanjut.</p>
    <ul>
      <li>Kode permohonan: ${escapeHtml(input.referenceCode)}</li>
      <li>Alasan: ${escapeHtml(input.reason)}</li>
    </ul>
    <p>Silakan perbaiki data atau dokumen pendukung lalu ajukan kembali jika diperlukan.</p>
    <p>Hormat kami,<br />Pemerintah Gampong Blang</p>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
