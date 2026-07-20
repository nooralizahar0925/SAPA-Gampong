import { beforeEach, describe, expect, it } from 'vitest';
import { renderRequestLetterHtml } from '../src/modules/letters/rendering';
import { testPrisma, truncateAll } from './helpers/db';

const BASE_INPUT = {
  subjectData: {
    nama: 'Budi',
    ttl_tempat: 'Calang',
    ttl_tanggal: '1999-10-22',
    nik: '1103010101990001',
    jenis_kelamin: 'Laki-laki',
    agama: 'Islam',
    status_perkawinan: 'Belum Kawin',
    pekerjaan: 'Petani',
    alamat: 'Dusun Meunasah',
    dusun: 'Meunasah',
  },
  nomorSurat: '470/001/2026',
  verificationUrl: 'http://localhost:8080/verify/abc',
  qrDataUrl: 'data:image/png;base64,AAAA',
};

beforeEach(async () => {
  await truncateAll();
});

async function saveBranding(values: Record<string, string>) {
  await testPrisma.appConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...values },
    update: values,
  });
}

describe('letter branding from app settings', () => {
  it('prints the letterhead configured in the dashboard', async () => {
    await saveBranding({
      letterheadLine1: 'PEMERINTAH KABUPATEN ACEH BARAT',
      letterheadLine2: 'KECAMATAN JOHAN PAHLAWAN',
      letterheadLine3: 'GAMPONG UJONG KALAK',
    });

    const html = await renderRequestLetterHtml({ ...BASE_INPUT, letterType: 'L1' });

    expect(html).toContain('PEMERINTAH KABUPATEN ACEH BARAT');
    expect(html).toContain('KECAMATAN JOHAN PAHLAWAN');
    expect(html).toContain('GAMPONG UJONG KALAK');
  });

  it('prints the keuchik configured in the dashboard', async () => {
    await saveBranding({
      keuchikTitle: 'Keuchik Gampong Ujong Kalak',
      keuchikName: 'MUHAMMAD YUSUF',
    });

    // L1 is signed by the Keuchik.
    const html = await renderRequestLetterHtml({ ...BASE_INPUT, letterType: 'L1' });

    expect(html).toContain('Keuchik Gampong Ujong Kalak');
    expect(html).toContain('MUHAMMAD YUSUF');
    expect(html).not.toContain('SOFIAN');
  });

  it('prints the secretary for letters the secretary signs', async () => {
    await saveBranding({
      secretaryTitle: 'Sekretaris Gampong a.n. Keuchik Ujong Kalak',
      secretaryName: 'NURUL HUDA, S.E',
    });

    // L9 is the letter signed by the Sekretaris a.n. Keuchik.
    const html = await renderRequestLetterHtml({ ...BASE_INPUT, letterType: 'L9' });

    expect(html).toContain('Sekretaris Gampong a.n. Keuchik Ujong Kalak');
    expect(html).toContain('NURUL HUDA, S.E');
    expect(html).not.toContain('AFZALUL ZIKRI');
  });

  it('falls back to the built-in defaults when nothing is configured', async () => {
    const html = await renderRequestLetterHtml({ ...BASE_INPUT, letterType: 'L1' });

    expect(html).toContain('PEMERINTAH KABUPATEN ACEH JAYA');
    expect(html).toContain('GAMPONG BLANG');
    expect(html).toContain('SOFIAN');
  });

  it('uses defaults for the fields left blank, not an empty letterhead', async () => {
    await saveBranding({ letterheadLine3: 'GAMPONG BLANG BARU' });

    const html = await renderRequestLetterHtml({ ...BASE_INPUT, letterType: 'L1' });

    expect(html).toContain('GAMPONG BLANG BARU');
    // Lines 1 and 2 were never configured, so they keep the built-in text.
    expect(html).toContain('PEMERINTAH KABUPATEN ACEH JAYA');
    expect(html).toContain('KECAMATAN KRUENG SABEE');
  });
});
