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

describe('admin request management', () => {
  it('lists queued requests with filters and paging', async () => {
    await testPrisma.letterRequest.createMany({
      data: [
        {
          referenceCode: 'GB-2026-000001',
          letterType: 'L1',
          status: 'SUBMITTED',
          applicantName: 'Budi',
          applicantEmail: 'budi@mail.com',
          subjectData: { nama: 'Budi' },
        },
        {
          referenceCode: 'GB-2026-000002',
          letterType: 'L2',
          status: 'IN_REVIEW',
          applicantName: 'Sari',
          applicantEmail: 'sari@mail.com',
          subjectData: { nama_pemohon: 'Sari' },
        },
      ],
    });

    const token = await login();
    const res = await request(app)
      .get('/api/requests?status=SUBMITTED&letter_type=L1&q=budi&page=1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      reference_code: 'GB-2026-000001',
      letter_type: 'L1',
      applicant_name: 'Budi',
      status: 'SUBMITTED',
      email: 'budi@mail.com',
    });
  });

  it('returns request detail with signed attachment URLs', async () => {
    const file = await testPrisma.file.create({
      data: {
        storagePath: 'test/ktp.png',
        mime: 'image/png',
        size: 123,
      },
    });

    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000123',
        letterType: 'L1',
        status: 'SUBMITTED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
        subjectData: { nama: 'Budi', nik: '1607010101010001' },
        attachments: {
          create: [{ kind: 'KTP', fileId: file.id }],
        },
      },
    });

    const token = await login();
    const res = await request(app)
      .get(`/api/requests/${created.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
    expect(res.body.reference_code).toBe('GB-2026-000123');
    expect(res.body.subject_data).toMatchObject({ nama: 'Budi' });
    expect(res.body.attachments).toHaveLength(1);
    expect(res.body.attachments[0]).toMatchObject({
      kind: 'KTP',
      file_id: file.id,
      mime: 'image/png',
    });
    expect(res.body.attachments[0].url).toContain(`/api/uploads/${file.id}?`);
    expect(res.body.status_history).toEqual([]);
  });

  it('enforces valid state transitions and auto-assigns nomor surat on approve', async () => {
    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000200',
        letterType: 'L1',
        status: 'SUBMITTED',
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

    const invalid = await request(app)
      .patch(`/api/requests/${created.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe('CONFLICT');

    const inReview = await request(app)
      .patch(`/api/requests/${created.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'in_review' });

    expect(inReview.status).toBe(200);
    expect(inReview.body.status).toBe('IN_REVIEW');

    const approved = await request(app)
      .patch(`/api/requests/${created.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('APPROVED');
    expect(approved.body.nomor_surat).toBe(`400.12.2.1/1/${currentYear}`);
    expect(approved.body.status_history).toHaveLength(2);
    expect(approved.body.status_history[0]).toMatchObject({
      status: 'IN_REVIEW',
      action: 'in_review',
      by: 'Admin Gampong',
    });
    expect(approved.body.status_history[1]).toMatchObject({
      status: 'APPROVED',
      action: 'approve',
      by: 'Admin Gampong',
      nomor_surat: `400.12.2.1/1/${currentYear}`,
    });

    const another = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000201',
        letterType: 'L1',
        status: 'IN_REVIEW',
        applicantName: 'Ani',
        applicantEmail: 'ani@mail.com',
        subjectData: {
          nama: 'Ani',
          ttl_tempat: 'Calang',
          ttl_tanggal: '1998-01-01',
          nik: '1607010101010002',
          jenis_kelamin: 'Perempuan',
          agama: 'Islam',
          status_perkawinan: 'Belum Kawin',
          pekerjaan: 'Mahasiswa',
          alamat: 'Dusun Rumbia',
          dusun: 'Rumbia',
          gampong: 'Blang',
          kecamatan: 'Krueng Sabee',
          kabupaten: 'Aceh Jaya',
        },
      },
    });

    const rejectWithoutReason = await request(app)
      .patch(`/api/requests/${another.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'reject' });

    expect(rejectWithoutReason.status).toBe(400);
    expect(rejectWithoutReason.body.error.code).toBe('VALIDATION_ERROR');
    expect(rejectWithoutReason.body.error.fields).toHaveProperty('reason');
  });
});
