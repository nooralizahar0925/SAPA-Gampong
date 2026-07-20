import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { testPrisma, truncateAll } from './helpers/db';

const app = createApp();
const currentYear = new Date().getFullYear();

beforeEach(async () => {
  await truncateAll();
});

describe('public requests flow', () => {
  it('creates an L1 request and allows tracking it by reference code', async () => {
    const uploadedFile = await testPrisma.file.create({
      data: {
        storagePath: 'test/ktp.png',
        mime: 'image/png',
        size: 1234,
      },
    });

    const createRes = await request(app).post('/api/requests').send({
      letter_type: 'L1',
      applicant_name: 'Budi',
      applicant_email: 'budi@mail.com',
      applicant_phone: '081234567890',
      keperluan: 'Beasiswa',
      subject_data: {
        nama: 'Budi',
        ttl_tempat: 'Calang',
        ttl_tanggal: '1999-10-22',
        nik: '1607010101010001',
        jenis_kelamin: 'Laki-laki',
        agama: 'Islam',
        status_perkawinan: 'Belum Kawin',
        pekerjaan: 'Pelajar',
        alamat: 'Dusun Kuini, Gampong Blang',
        dusun: 'Kuini',
        gampong: 'Blang',
        kecamatan: 'Krueng Sabee',
        kabupaten: 'Aceh Jaya',
      },
      attachments: [
        { file_id: uploadedFile.id, kind: 'KTP' },
        { file_id: uploadedFile.id, kind: 'KK' },
      ],
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toEqual(expect.any(String));
    expect(createRes.body.reference_code).toMatch(new RegExp(`^GB-${currentYear}-\\d{6}$`));
    expect(createRes.body.status).toBe('SUBMITTED');

    const saved = await testPrisma.letterRequest.findUnique({
      where: { id: createRes.body.id },
      include: { attachments: true },
    });
    expect(saved?.attachments).toHaveLength(2);

    const trackRes = await request(app).get(
      `/api/requests/track/${createRes.body.reference_code}`,
    );

    expect(trackRes.status).toBe(200);
    expect(trackRes.body).toMatchObject({
      reference_code: createRes.body.reference_code,
      letter_type: 'L1',
      status: 'SUBMITTED',
      status_label: 'Menunggu diproses',
    });
    expect(trackRes.body.updated_at).toEqual(expect.any(String));
  });

  it('returns field-level validation when applicant_email is missing', async () => {
    const res = await request(app).post('/api/requests').send({
      letter_type: 'L1',
      applicant_name: 'Budi',
      subject_data: {},
      attachments: [],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty('applicant_email');
  });
});
