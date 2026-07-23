import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { renderRequestLetterHtml } from '../src/modules/letters/rendering';
import { testPrisma, truncateAll } from './helpers/db';

const app = createApp();

const LETTER_FIXTURES: Array<{
  letterType:
    | 'L1'
    | 'L2'
    | 'L3'
    | 'L4'
    | 'L5'
    | 'L6'
    | 'L7'
    | 'L8'
    | 'L9'
    | 'L10';
  applicantName: string;
  keperluan?: string;
  subjectData: Record<string, unknown>;
}> = [
  {
    letterType: 'L1',
    applicantName: 'Budi',
    subjectData: {
      nama: 'Budi',
      ttl_tempat: 'Calang',
      ttl_tanggal: '1999-10-22',
      nik: '1607010101010001',
      jenis_kelamin: 'Laki-laki',
      agama: 'Islam',
      status_perkawinan: 'Belum Kawin',
      pekerjaan: 'Pelajar',
      alamat: 'Dusun Kuini',
      dusun: 'Kuini',
      gampong: 'Blang',
      kecamatan: 'Krueng Sabee',
      kabupaten: 'Aceh Jaya',
    },
  },
  {
    letterType: 'L2',
    applicantName: 'Rina',
    subjectData: {
      nama_pemohon: 'Rina',
      nama_kantor: 'Koperasi Maju Bersama',
      alamat_jalan: 'Jl. Banda Aceh - Meulaboh',
      alamat_desa: 'Blang',
      alamat_kecamatan: 'Krueng Sabee',
      alamat_kabupaten: 'Aceh Jaya',
      sk_kemenkumham: 'AHU-12345.AH.01.01.Tahun 2026',
      akta_notaris: '12/NOT/2026',
      penanggung_jawab: 'Rina',
    },
  },
  {
    letterType: 'L3',
    applicantName: 'Rahmat',
    subjectData: {
      nama: 'Rahmat',
      ttl_tempat: 'Banda Aceh',
      ttl_tanggal: '1993-04-15',
      nik: '1607010101010003',
      jenis_kelamin: 'Laki-laki',
      agama: 'Islam',
      alamat: 'Dusun Mangga',
      barang_hilang: 'Kartu ATM Bank Aceh dan STNK sepeda motor BL 1234 XX',
    },
  },
  {
    letterType: 'L4',
    applicantName: 'Siti',
    keperluan: 'Beasiswa',
    subjectData: {
      nama: 'Siti',
      ttl_tempat: 'Calang',
      ttl_tanggal: '2001-06-02',
      nik: '1607010101010004',
      jenis_kelamin: 'Perempuan',
      kewarganegaraan: 'Indonesia',
      agama: 'Islam',
      status_perkawinan: 'Belum Kawin',
      pekerjaan: 'Pelajar',
      alamat: 'Dusun Rumbia',
    },
  },
  {
    letterType: 'L5',
    applicantName: 'Yusri',
    subjectData: {
      nama: 'Yusri',
      nik: '1607010101010005',
      ttl_tempat: 'Meulaboh',
      ttl_tanggal: '1988-01-12',
      pekerjaan: 'Wiraswasta',
      jenis_kelamin: 'Laki-laki',
      status_perkawinan: 'Kawin',
      agama: 'Islam',
      alamat: 'Dusun Kuini',
      jenis_usaha: 'Warung Kopi',
      nama_usaha: 'Kupi Blang',
      tahun_mulai: '2019',
      lokasi_dusun: 'Kuini',
    },
  },
  {
    letterType: 'L6',
    applicantName: 'Nuraini',
    subjectData: {
      nama_anak: 'Aisyah',
      ttl_tempat: 'Calang',
      ttl_tanggal: '2012-08-17',
      jenis_kelamin: 'Perempuan',
      agama: 'Islam',
      alamat: 'Dusun Mangga',
      nik: '1607010101010006',
      status: 'Yatim Piatu',
      nama_ayah: 'Abdullah',
      nama_ibu: 'Maryam',
    },
  },
  {
    letterType: 'L7',
    applicantName: 'Zulfikar',
    subjectData: {
      nama: 'Halimah',
      ttl_tempat: 'Calang',
      ttl_tanggal: '1965-02-10',
      nik: '1607010101010007',
      jenis_kelamin: 'Perempuan',
      status_perkawinan: 'Kawin',
      agama: 'Islam',
      pekerjaan: 'Ibu Rumah Tangga',
      alamat: 'Dusun Rumbia',
      tanggal_meninggal: '2026-06-30',
      pukul: '21:15',
      tempat_meninggal: 'Rumah duka',
      tempat_dimakamkan: 'TPU Gampong Blang',
      suami_istri: '1 orang bernama Zulfikar',
      anak_total: 3,
      anak_laki: 1,
      anak_perempuan: 2,
    },
  },
  {
    letterType: 'L8',
    applicantName: 'Fikri',
    subjectData: {
      nama: 'Fikri',
      ttl_tempat: 'Calang',
      ttl_tanggal: '1997-11-05',
      nik: '1607010101010008',
      jenis_kelamin: 'Laki-laki',
      status_perkawinan: 'Belum Kawin',
      agama: 'Islam',
      pekerjaan: 'Pegawai Swasta',
      alamat: 'Dusun Kuini',
    },
  },
  {
    letterType: 'L9',
    applicantName: 'Nadia',
    subjectData: {
      nama: 'Nadia',
      ttl_tempat: 'Calang',
      ttl_tanggal: '2000-09-09',
      nik: '1607010101010009',
      jenis_kelamin: 'Perempuan',
      agama: 'Islam',
      pekerjaan: 'Mahasiswa',
      status_perkawinan: 'Belum Kawin',
      alamat: 'Dusun Mangga',
    },
  },
  {
    letterType: 'L10',
    applicantName: 'Fauzan',
    subjectData: {
      tanggal_permohonan: '2026-07-01',
      perihal: 'izin usaha',
      tujuan_jabatan: 'Kepala Dinas Penanaman Modal',
      tujuan_instansi: 'DPMPTSP Kabupaten Aceh Jaya',
    },
  },
];

beforeEach(async () => {
  await truncateAll();
  await testPrisma.adminUser.create({
    data: {
      name: 'Admin Gampong',
      email: 'admin@gampongblang.id',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'admin',
    },
  });
});

async function login() {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@gampongblang.id',
    password: 'admin123',
  });

  return res.body.token as string;
}

describe('POST /api/requests/:id/generate across all letter types', () => {
  it.each(LETTER_FIXTURES)(
    'generates and verifies $letterType',
    async ({ letterType, applicantName, subjectData, keperluan }) => {
      const created = await testPrisma.letterRequest.create({
        data: {
          referenceCode: `GB-2026-${letterType}`,
          letterType,
          status: 'APPROVED',
          applicantName,
          applicantEmail: `${letterType.toLowerCase()}@mail.com`,
          keperluan,
          subjectData: subjectData as Prisma.InputJsonValue,
        },
      });

      const token = await login();
      const generated = await request(app)
        .post(`/api/requests/${created.id}/generate`)
        .set('Authorization', `Bearer ${token}`);

      expect(generated.status).toBe(200);
      expect(generated.body.pdf_id).toEqual(expect.any(String));
      expect(generated.body.verification_token).toMatch(/^[a-f0-9]{32}$/);

      const verify = await request(app)
        .get(`/verify/${generated.body.verification_token}`)
        .set('Accept', 'application/json');

      expect(verify.status).toBe(200);
      expect(verify.body).toMatchObject({
        valid: true,
        nomor_surat: generated.body.nomor_surat,
      });
    },
    20_000,
  );

  it('renders L7 death details and survivor details into the HTML template', async () => {
    const html = await renderRequestLetterHtml({
      letterType: 'L7',
      subjectData: LETTER_FIXTURES.find((item) => item.letterType === 'L7')!.subjectData,
      nomorSurat: '400.12.2.1/9/2026',
      verificationUrl: 'http://localhost:8080/verify/example',
      qrDataUrl: 'data:image/png;base64,abc123',
    });

    expect(html).toContain('Rumah duka');
    expect(html).toContain('TPU Gampong Blang');
    expect(html).toContain('1 orang bernama Zulfikar');
    expect(html).toContain('Anak Laki-laki');
    expect(html).toContain('Anak Perempuan');
  });
});
