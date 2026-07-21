import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderRequestLetterHtml } from '../src/modules/letters/rendering';
import { PdfService } from '../src/services/pdf.service';
import { QrService } from '../src/modules/letters/qr.service';

const VERIFY_URL = 'http://localhost:8080/verify/947e9617a715c5cec2a4cf0a9e6db417';

/**
 * Deliberately long values: a letter that fits with short data can still overflow for
 * a real applicant, and the narrower A4 column wraps more lines than a default viewport.
 */
const SUBJECT = {
  nama: 'Muhammad Rizki Ramadhan Syahputra',
  nik: '1706221001990006',
  ttl_tempat: 'Banda Aceh',
  ttl_tanggal: '1990-01-10',
  jenis_kelamin: 'Perempuan',
  agama: 'Islam',
  pekerjaan: 'Petani',
  alamat: 'Jln. Pendidikan, Lr. Mesjid Al-Istiqamah, Dusun Kuini, Gampong Blang',
  kewarganegaraan: 'Indonesia',
  status_perkawinan: 'Kawin',
  dusun: 'Kuini',
};

/** Counts page objects in the raw PDF, so a second page cannot slip in unnoticed. */
function countPages(pdf: Buffer) {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

type LetterCode = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'L9' | 'L10';

async function renderPdf(letterType: LetterCode) {
  const html = await renderRequestLetterHtml({
    letterType,
    nomorSurat: '400.12.2.1/1000/2026',
    subjectData: SUBJECT,
    keperluan: 'Pengajuan beasiswa pendidikan tinggi tahun ajaran 2026/2027',
    verificationUrl: VERIFY_URL,
    qrDataUrl: await QrService.pngDataUrl(VERIFY_URL),
  });

  return PdfService.render(html);
}

describe('letter page layout', () => {
  it(
    'keeps a standard letter on a single page',
    async () => {
      const types = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'] as const;

      for (const letterType of types) {
        const pdf = await renderPdf(letterType);
        expect(countPages(pdf), `${letterType} should fit on one page`).toBe(1);
      }
    },
    300_000,
  );

  it('marks the signature and QR block as unbreakable', async () => {
    const css = await readFile(
      resolve(process.cwd(), 'templates/letters/partials/styles.html'),
      'utf8',
    );

    // Without these, the renderer may split the QR from the name it verifies.
    expect(css).toMatch(/\.sign-row\s*\{[^}]*page-break-inside:\s*avoid/s);
    expect(css).toMatch(/\.sign-block\s*\{[^}]*page-break-inside:\s*avoid/s);
  });

  it('keeps page margins in exactly one place', async () => {
    const [css, service] = await Promise.all([
      readFile(resolve(process.cwd(), 'templates/letters/partials/styles.html'), 'utf8'),
      readFile(resolve(process.cwd(), 'src/services/pdf.service.ts'), 'utf8'),
    ]);

    // `.page` owns the margin. If Playwright also passed a non-zero margin the two
    // would add together, which is what pushed the kop ~42mm down the sheet before.
    expect(css).toMatch(/\.page\s*\{[^}]*padding:\s*\d+mm/s);
    expect(service).toMatch(/margin:\s*\{\s*top:\s*'0'/);
  });
});
