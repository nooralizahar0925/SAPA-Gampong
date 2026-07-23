import { prisma } from '../../lib/prisma';
import { getLetterTemplateDefinition } from './service';
import { readAssetDataUrl, renderLetterTemplate } from './template.service';

type RenderLetterInput = {
  letterType: string;
  subjectData: Record<string, unknown>;
  nomorSurat: string;
  verificationUrl: string;
  qrDataUrl: string;
  applicantName?: string | null;
  keperluan?: string | null;
};

/**
 * Used when an admin has not filled a field in Pengaturan yet. Keeping these means an
 * unconfigured install still prints a correct Gampong Blang letter rather than a blank
 * letterhead or an empty signature line.
 */
const DEFAULT_SIGNATORY_BLOCKS: Record<string, { title: string; name: string }> = {
  Keuchik: {
    title: 'Keuchik Gampong Blang',
    name: 'SOFIAN',
  },
  'Sekretaris Gampong a.n. Keuchik': {
    title: 'Sekretaris Gampong a.n. Keuchik Gampong Blang',
    name: 'AFZALUL ZIKRI, S.P',
  },
};

const DEFAULT_LETTERHEAD = {
  line1: 'PEMERINTAH KABUPATEN ACEH JAYA',
  line2: 'KECAMATAN KRUENG SABEE',
  line3: 'GAMPONG BLANG',
};

/** Treats "" like "not set", so a cleared field falls back instead of printing blank. */
function orDefault(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

/**
 * Resolves letterhead and signatory from AppConfig, falling back per field. The letter
 * definition still decides *which role* signs (Keuchik vs Sekretaris a.n. Keuchik); the
 * dashboard supplies that role's title and name.
 */
async function resolveBranding(signatoryRole: string) {
  const config = await prisma.appConfig.findUnique({
    where: { id: 'singleton' },
    select: {
      letterheadLine1: true,
      letterheadLine2: true,
      letterheadLine3: true,
      keuchikTitle: true,
      keuchikName: true,
      secretaryTitle: true,
      secretaryName: true,
    },
  });

  const fallback = DEFAULT_SIGNATORY_BLOCKS[signatoryRole] ?? {
    title: signatoryRole,
    name: signatoryRole.toUpperCase(),
  };

  const isSecretary = signatoryRole.startsWith('Sekretaris');
  const configuredTitle = isSecretary ? config?.secretaryTitle : config?.keuchikTitle;
  const configuredName = isSecretary ? config?.secretaryName : config?.keuchikName;

  return {
    letterheadLine1: orDefault(config?.letterheadLine1, DEFAULT_LETTERHEAD.line1),
    letterheadLine2: orDefault(config?.letterheadLine2, DEFAULT_LETTERHEAD.line2),
    letterheadLine3: orDefault(config?.letterheadLine3, DEFAULT_LETTERHEAD.line3),
    signatoryTitle: orDefault(configuredTitle, fallback.title),
    signatoryName: orDefault(configuredName, fallback.name),
  };
}

export async function renderRequestLetterHtml(input: RenderLetterInput) {
  const definition = await getLetterTemplateDefinition(input.letterType, true);
  if (!definition) {
    throw new Error(`Letter definition ${input.letterType} is missing`);
  }

  const logoDataUrl = await readAssetDataUrl('logo.webp');
  const branding = await resolveBranding(definition.signatory);

  const templateValues = {
    logoDataUrl,
    nomorSurat: input.nomorSurat,
    tanggalTerbit: formatIndonesianDate(new Date()),
    verificationUrl: input.verificationUrl,
    qrDataUrl: input.qrDataUrl,
    letterName: definition.name,
    ...branding,
    ...buildTemplateValues(input.letterType, input.subjectData, {
      applicantName: input.applicantName,
      keperluan: input.keperluan,
    }),
  };

  return renderLetterTemplate(`${input.letterType}.html`, templateValues);
}

function buildTemplateValues(
  letterType: string,
  subjectData: Record<string, unknown>,
  context: { applicantName?: string | null; keperluan?: string | null } = {},
): Record<string, string> {
  switch (letterType) {
    case 'L1':
      return {
        nama: stringValue(subjectData.nama),
        ttl: buildTtl(subjectData),
        nik: stringValue(subjectData.nik),
        jenisKelamin: stringValue(subjectData.jenis_kelamin),
        agama: stringValue(subjectData.agama),
        statusPerkawinan: stringValue(subjectData.status_perkawinan),
        pekerjaan: stringValue(subjectData.pekerjaan),
        alamat: stringValue(subjectData.alamat),
        dusun: stringValue(subjectData.dusun),
        gampong: fallbackValue(subjectData.gampong, 'Blang'),
        kecamatan: fallbackValue(subjectData.kecamatan, 'Krueng Sabee'),
        kabupaten: fallbackValue(subjectData.kabupaten, 'Aceh Jaya'),
      };
    case 'L2':
      return {
        namaPemohon: firstNonEmptyValue(subjectData.nama_pemohon, context.applicantName, '-'),
        namaKantor: stringValue(subjectData.nama_kantor),
        penanggungJawab: stringValue(subjectData.penanggung_jawab),
        alamatJalan: stringValue(subjectData.alamat_jalan),
        alamatDesa: stringValue(subjectData.alamat_desa),
        alamatKecamatan: stringValue(subjectData.alamat_kecamatan),
        alamatKabupaten: stringValue(subjectData.alamat_kabupaten),
        skKemenkumham: stringValue(subjectData.sk_kemenkumham),
        aktaNotaris: stringValue(subjectData.akta_notaris),
      };
    case 'L3':
      return {
        nama: stringValue(subjectData.nama),
        ttl: buildTtl(subjectData),
        nik: stringValue(subjectData.nik),
        jenisKelamin: stringValue(subjectData.jenis_kelamin),
        agama: stringValue(subjectData.agama),
        alamat: stringValue(subjectData.alamat),
        barangHilang: stringValue(subjectData.barang_hilang),
      };
    case 'L4':
      return {
        nama: stringValue(subjectData.nama),
        ttl: buildTtl(subjectData),
        nik: stringValue(subjectData.nik),
        jenisKelamin: stringValue(subjectData.jenis_kelamin),
        kewarganegaraan: stringValue(subjectData.kewarganegaraan),
        agama: stringValue(subjectData.agama),
        statusPerkawinan: stringValue(subjectData.status_perkawinan),
        pekerjaan: stringValue(subjectData.pekerjaan),
        alamat: stringValue(subjectData.alamat),
        keperluan: firstNonEmptyValue(subjectData.keperluan, context.keperluan, '-'),
      };
    case 'L5':
      return {
        nama: stringValue(subjectData.nama),
        nik: stringValue(subjectData.nik),
        ttl: buildTtl(subjectData),
        pekerjaan: stringValue(subjectData.pekerjaan),
        jenisKelamin: stringValue(subjectData.jenis_kelamin),
        statusPerkawinan: stringValue(subjectData.status_perkawinan),
        agama: stringValue(subjectData.agama),
        alamat: stringValue(subjectData.alamat),
        jenisUsaha: stringValue(subjectData.jenis_usaha),
        namaUsaha: stringValue(subjectData.nama_usaha),
        tahunMulai: stringValue(subjectData.tahun_mulai),
        lokasiDusun: stringValue(subjectData.lokasi_dusun),
      };
    case 'L6':
      return {
        namaAnak: stringValue(subjectData.nama_anak),
        ttl: buildTtl(subjectData),
        jenisKelamin: stringValue(subjectData.jenis_kelamin),
        agama: stringValue(subjectData.agama),
        alamat: stringValue(subjectData.alamat),
        nik: stringValue(subjectData.nik),
        statusAnak: stringValue(subjectData.status),
        namaAyah: stringValue(subjectData.nama_ayah),
        namaIbu: stringValue(subjectData.nama_ibu),
      };
    case 'L7':
      return {
        nama: stringValue(subjectData.nama),
        ttl: buildTtl(subjectData),
        nik: stringValue(subjectData.nik),
        jenisKelamin: stringValue(subjectData.jenis_kelamin),
        statusPerkawinan: stringValue(subjectData.status_perkawinan),
        agama: stringValue(subjectData.agama),
        pekerjaan: stringValue(subjectData.pekerjaan),
        alamat: stringValue(subjectData.alamat),
        tanggalMeninggal: formatDateFromIso(stringValueOrEmpty(subjectData.tanggal_meninggal)) || '-',
        pukul: stringValue(subjectData.pukul),
        tempatMeninggal: stringValue(subjectData.tempat_meninggal),
        tempatDimakamkan: stringValue(subjectData.tempat_dimakamkan),
        suamiIstri: stringValue(subjectData.suami_istri),
        anakTotal: stringOrDash(subjectData.anak_total),
        anakLaki: stringOrDash(subjectData.anak_laki),
        anakPerempuan: stringOrDash(subjectData.anak_perempuan),
      };
    case 'L8':
      return {
        nama: stringValue(subjectData.nama),
        ttl: buildTtl(subjectData),
        nik: stringValue(subjectData.nik),
        jenisKelamin: stringValue(subjectData.jenis_kelamin),
        statusPerkawinan: stringValue(subjectData.status_perkawinan),
        agama: stringValue(subjectData.agama),
        pekerjaan: stringValue(subjectData.pekerjaan),
        alamat: stringValue(subjectData.alamat),
      };
    case 'L9':
      return {
        nama: stringValue(subjectData.nama),
        ttl: buildTtl(subjectData),
        nik: stringValue(subjectData.nik),
        jenisKelamin: stringValue(subjectData.jenis_kelamin),
        agama: stringValue(subjectData.agama),
        pekerjaan: stringValue(subjectData.pekerjaan),
        statusPerkawinan: stringValue(subjectData.status_perkawinan),
        alamat: stringValue(subjectData.alamat),
      };
    case 'L10':
      return {
        namaPemohon: firstNonEmptyValue(subjectData.nama_pemohon, context.applicantName, '-'),
        tanggalPermohonan: formatDateFromIso(stringValueOrEmpty(subjectData.tanggal_permohonan)) || '-',
        perihal: stringValue(subjectData.perihal),
        tujuanJabatan: stringValue(subjectData.tujuan_jabatan),
        tujuanInstansi: stringValue(subjectData.tujuan_instansi),
      };
    default:
      throw new Error(`No template renderer is registered for ${letterType}`);
  }
}

function buildTtl(subjectData: Record<string, unknown>) {
  const place = stringValueOrEmpty(subjectData.ttl_tempat);
  const date = formatDateFromIso(stringValueOrEmpty(subjectData.ttl_tanggal));
  if (!place && !date) return '-';
  return [place, date].filter(Boolean).join(', ');
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
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value.trim() ? value.trim() : '-';
}

function stringValueOrEmpty(value: unknown) {
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' ? value.trim() : '';
}

function fallbackValue(value: unknown, fallback: string) {
  const resolved = stringValueOrEmpty(value);
  return resolved || fallback;
}

function firstNonEmptyValue(...values: Array<unknown>) {
  for (const value of values) {
    const resolved = stringValueOrEmpty(value);
    if (resolved) return resolved;
  }
  return '';
}

function stringOrDash(value: unknown) {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return '-';
}
