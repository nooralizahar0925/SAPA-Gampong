import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import type { EmailAttachment } from '../../services/email.service';

const emailTemplatesRoot = resolve(process.cwd(), 'templates', 'emails');
const briefRoot = resolve(process.cwd(), '..', '..', 'Brief');
const EMAIL_LOGO_CID = 'gampong-logo.png';

export async function renderSentEmailHtml(input: {
  applicantName: string;
  referenceCode: string;
  nomorSurat: string;
  letterName: string;
}) {
  return renderEmailTemplate('request-sent.html', {
    preview_text: 'Pemberitahuan resmi bahwa surat Anda telah selesai diproses dan dikirim.',
    heading: 'Pemberitahuan Pengiriman Surat',
    badge_label: 'LAYANAN SURAT DIGITAL',
    applicant_name: input.applicantName,
    intro_body:
      'Dengan hormat, kami sampaikan bahwa permohonan surat Anda telah selesai diproses oleh Pemerintah Gampong Blang. Dokumen resmi telah kami lampirkan pada email ini untuk dipergunakan sebagaimana mestinya.',
    letter_name: input.letterName,
    reference_code: input.referenceCode,
    nomor_surat: input.nomorSurat,
    status_label: 'Surat berhasil diterbitkan dan dikirim',
    action_note:
      'Mohon menyimpan lampiran PDF ini dengan baik. Apabila diperlukan verifikasi keaslian dokumen, silakan gunakan QR pada surat atau halaman verifikasi resmi.',
    closing_note:
      'Apabila terdapat kekeliruan data atau Anda memerlukan bantuan lanjutan, silakan menghubungi aparatur gampong melalui kanal resmi.',
    summary_title: 'Ringkasan Dokumen',
    footer_title: 'Pemerintah Gampong Blang',
    footer_text:
      'Kecamatan Krueng Sabee, Kabupaten Aceh Jaya. Email ini dikirim otomatis oleh Gampong Blang Digital.',
    accent_color: '#0f5132',
    accent_soft: '#e8f3ee',
    status_soft: '#dff3e7',
    status_text: '#166534',
  });
}

export async function renderRejectedEmailHtml(input: {
  applicantName: string;
  referenceCode: string;
  letterName: string;
  reason: string;
}) {
  return renderEmailTemplate('request-rejected.html', {
    preview_text: 'Pemberitahuan resmi bahwa permohonan surat Anda belum dapat diproses.',
    heading: 'Pemberitahuan Hasil Verifikasi Permohonan',
    badge_label: 'PEMBERITAHUAN RESMI',
    applicant_name: input.applicantName,
    intro_body:
      'Dengan hormat, setelah dilakukan pemeriksaan administratif, permohonan surat Anda belum dapat kami lanjutkan pada tahap penerbitan. Informasi penolakan sementara disampaikan sebagai berikut.',
    letter_name: input.letterName,
    reference_code: input.referenceCode,
    rejection_reason: input.reason,
    status_label: 'Permohonan belum dapat diproses',
    action_note:
      'Silakan melakukan perbaikan data atau melengkapi dokumen pendukung sesuai catatan verifikasi, lalu ajukan kembali permohonan bila diperlukan.',
    closing_note:
      'Apabila membutuhkan penjelasan lebih lanjut, Anda dapat menghubungi kantor gampong pada jam layanan kerja.',
    summary_title: 'Ringkasan Permohonan',
    footer_title: 'Pemerintah Gampong Blang',
    footer_text:
      'Kecamatan Krueng Sabee, Kabupaten Aceh Jaya. Email ini dikirim otomatis oleh Gampong Blang Digital.',
    accent_color: '#8a5a12',
    accent_soft: '#f8efe1',
    status_soft: '#fdf1df',
    status_text: '#9a6700',
  });
}

export async function renderFeedbackReplyEmailHtml(input: {
  reporterName: string;
  referenceCode: string;
  reportedAt: string;
  reply: string;
}) {
  return renderEmailTemplate('feedback-reply.html', {
    preview_text: 'Balasan resmi atas laporan yang Anda sampaikan kepada Gampong Blang.',
    heading: 'Balasan Atas Laporan Anda',
    badge_label: 'KOTAK PELAPORAN',
    applicant_name: input.reporterName,
    intro_body:
      'Terima kasih telah menyampaikan laporan kepada Pemerintah Gampong Blang. Laporan Anda telah kami tinjau, dan berikut tanggapan resmi dari perangkat gampong.',
    letter_name: input.reportedAt,
    reference_code: input.referenceCode,
    reply_body: input.reply,
    status_label: 'Laporan sudah ditanggapi',
    action_note:
      'Apabila tanggapan ini belum menjawab persoalan yang Anda sampaikan, silakan kirimkan laporan susulan melalui aplikasi dengan mencantumkan kode laporan di atas.',
    closing_note:
      'Partisipasi Anda sangat membantu kami dalam meningkatkan pelayanan dan pembangunan gampong.',
    summary_title: 'Ringkasan Laporan',
    footer_title: 'Pemerintah Gampong Blang',
    footer_text:
      'Kecamatan Krueng Sabee, Kabupaten Aceh Jaya. Email ini dikirim otomatis oleh Gampong Blang Digital.',
    accent_color: '#0f5132',
    accent_soft: '#e8f3ee',
    status_soft: '#dff3e7',
    status_text: '#166534',
  });
}

export async function writeEmailPreviews() {
  const previewRoot = resolve(process.cwd(), 'previews');
  await mkdir(previewRoot, { recursive: true });

  const [sentHtml, rejectedHtml] = await Promise.all([
    renderSentEmailHtml({
      applicantName: 'Budi Saputra',
      referenceCode: 'GB-2026-001100',
      nomorSurat: '400.12.2.1/10/2026',
      letterName: 'Surat Keterangan Berdomisili',
    }),
    renderRejectedEmailHtml({
      applicantName: 'Sari Aulia',
      referenceCode: 'GB-2026-001102',
      letterName: 'Surat Keterangan Berdomisili',
      reason: 'Dokumen pendukung belum lengkap dan masih memerlukan klarifikasi alamat domisili.',
    }),
  ]);

  const sentPath = resolve(previewRoot, 'request-sent-preview.html');
  const rejectedPath = resolve(previewRoot, 'request-rejected-preview.html');

  await Promise.all([
    writeFile(sentPath, sentHtml, 'utf8'),
    writeFile(rejectedPath, rejectedHtml, 'utf8'),
  ]);

  return { sentPath, rejectedPath };
}

export async function buildEmailLogoAttachment(): Promise<EmailAttachment> {
  const source = await readFile(resolve(briefRoot, 'logo.webp'));
  const content = await sharp(source).png().toBuffer();

  return {
    filename: EMAIL_LOGO_CID,
    content,
    contentType: 'image/png',
    cid: EMAIL_LOGO_CID,
    disposition: 'inline',
  };
}

async function renderEmailTemplate(templateName: string, values: Record<string, string>) {
  const template = await readFile(resolve(emailTemplatesRoot, templateName), 'utf8');

  const merged = template.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return escapeHtml(values[key] ?? '');
  });

  return merged.replaceAll('__LOGO_DATA_URL__', `cid:${EMAIL_LOGO_CID}`);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
