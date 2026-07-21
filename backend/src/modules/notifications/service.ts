import { getLetterDefinition } from '../letters/data';
import { EmailService } from '../../services/email.service';
import {
  renderFeedbackReplyEmailHtml,
  renderRejectedEmailHtml,
  renderSentEmailHtml,
} from './templates';

export async function notifyRequestSent(input: {
  applicantEmail: string;
  applicantName: string;
  referenceCode: string;
  nomorSurat: string;
  letterType: string;
  pdf: Buffer;
}) {
  const letterName = getLetterDefinition(input.letterType)?.name ?? input.letterType;
  const html = await renderSentEmailHtml({
    applicantName: input.applicantName,
    referenceCode: input.referenceCode,
    nomorSurat: input.nomorSurat,
    letterName,
  });

  await EmailService.send({
    to: input.applicantEmail,
    subject: `Surat Anda Sudah Dikirim - ${input.referenceCode}`,
    html,
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
  const html = await renderRejectedEmailHtml({
    applicantName: input.applicantName,
    referenceCode: input.referenceCode,
    letterName,
    reason: input.reason,
  });

  await EmailService.send({
    to: input.applicantEmail,
    subject: `Permohonan Surat Ditolak - ${input.referenceCode}`,
    html,
  });
}

export async function notifyFeedbackReply(input: {
  reporterEmail: string;
  reporterName: string;
  referenceCode: string;
  reportedAt: Date;
  reply: string;
}) {
  const reportedAt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(input.reportedAt);

  const html = await renderFeedbackReplyEmailHtml({
    reporterName: input.reporterName,
    referenceCode: input.referenceCode,
    reportedAt,
    reply: input.reply,
  });

  await EmailService.send({
    to: input.reporterEmail,
    subject: `Balasan Laporan Anda - ${input.referenceCode}`,
    html,
  });
}
