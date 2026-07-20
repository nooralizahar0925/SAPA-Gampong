import request from 'supertest';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { testPrisma, truncateAll } from './helpers/db';

const app = createApp();
const currentYear = new Date().getFullYear();

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

describe('POST /api/requests/:id/generate', () => {
  it(
    'generates an L1 PDF, stores it, and returns a verification token that verifies as valid',
    async () => {
      const created = await testPrisma.letterRequest.create({
        data: {
          referenceCode: `GB-${currentYear}-001000`,
          letterType: 'L1',
          status: 'APPROVED',
          applicantName: 'Budi',
          applicantEmail: 'budi@mail.com',
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
      });

      const token = await login();
      const generated = await request(app)
        .post(`/api/requests/${created.id}/generate`)
        .set('Authorization', `Bearer ${token}`);

      expect(generated.status).toBe(200);
      expect(generated.body.pdf_id).toEqual(expect.any(String));
      expect(generated.body.pdf_url).toContain(`/api/uploads/${generated.body.pdf_id}?`);
      expect(generated.body.verification_token).toMatch(/^[a-f0-9]{32}$/);
      expect(generated.body.nomor_surat).toBe(`400.12.2.1/1/${currentYear}`);

      const reloaded = await testPrisma.letterRequest.findUnique({
        where: { id: created.id },
        select: {
          status: true,
          generatedPdfId: true,
          verificationToken: true,
          nomorSurat: true,
          pdfHash: true,
        },
      });

      expect(reloaded).toMatchObject({
        status: 'GENERATED',
        generatedPdfId: generated.body.pdf_id,
        verificationToken: generated.body.verification_token,
        nomorSurat: generated.body.nomor_surat,
      });
      expect(reloaded?.pdfHash).toMatch(/^[a-f0-9]{64}$/);

      const pdfFile = await testPrisma.file.findUnique({
        where: { id: generated.body.pdf_id },
      });
      expect(pdfFile).toMatchObject({
        id: generated.body.pdf_id,
        mime: 'application/pdf',
      });
      expect(pdfFile?.size ?? 0).toBeGreaterThan(1000);

      const signedPdfUrl = new URL(generated.body.pdf_url);
      const pdfResponse = await request(app).get(`${signedPdfUrl.pathname}${signedPdfUrl.search}`);

      expect(pdfResponse.status).toBe(200);
      expect(pdfResponse.headers['content-type']).toMatch(/application\/pdf/);
      expect(pdfResponse.body.subarray(0, 4).toString()).toBe('%PDF');

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

  it('allows regenerating a PDF while keeping the same verification token and status', async () => {
    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: `GB-${currentYear}-001001`,
        letterType: 'L1',
        status: 'GENERATED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
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
        nomorSurat: `400.12.2.1/9/${currentYear}`,
        verificationToken: '1234567890abcdef1234567890abcdef',
      },
    });

    const token = await login();
    const generated = await request(app)
      .post(`/api/requests/${created.id}/generate`)
      .set('Authorization', `Bearer ${token}`);

    expect(generated.status).toBe(200);
    expect(generated.body.verification_token).toBe('1234567890abcdef1234567890abcdef');
    expect(generated.body.nomor_surat).toBe(`400.12.2.1/9/${currentYear}`);

    const reloaded = await testPrisma.letterRequest.findUnique({
      where: { id: created.id },
      include: {
        histories: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    expect(reloaded?.status).toBe('GENERATED');
    expect(reloaded?.verificationToken).toBe('1234567890abcdef1234567890abcdef');
    expect(reloaded?.generatedPdfId).toBe(generated.body.pdf_id);
    expect(reloaded?.histories.at(-1)).toMatchObject({
      fromStatus: 'GENERATED',
      toStatus: 'GENERATED',
      action: 'regenerate',
      actorName: 'Admin Gampong',
      nomorSurat: `400.12.2.1/9/${currentYear}`,
    });
  }, 20_000);
});
