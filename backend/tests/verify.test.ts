import request from 'supertest';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { testPrisma, truncateAll } from './helpers/db';

const app = createApp();

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

describe('GET /verify/:token', () => {
  it('returns valid verification data, masks personal fields, and increments verifiedCount', async () => {
    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000900',
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
        nomorSurat: '400.12.2.1/123/2026',
        verificationToken: '0123456789abcdef0123456789abcdef',
      },
    });

    const first = await request(app)
      .get(`/verify/${created.verificationToken}`)
      .set('Accept', 'application/json');
    const second = await request(app)
      .get(`/verify/${created.verificationToken}`)
      .set('Accept', 'application/json');

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      valid: true,
      nomor_surat: '400.12.2.1/123/2026',
      jenis_surat: 'Surat Keterangan Berdomisili',
      penandatangan: 'Sofian — Keuchik Gampong Blang',
      perihal: 'a.n. B*** (NIK 1607********0001)',
      revoked: false,
    });
    expect(second.status).toBe(200);

    const reloaded = await testPrisma.letterRequest.findUnique({
      where: { id: created.id },
      select: { verifiedCount: true },
    });
    expect(reloaded?.verifiedCount).toBe(2);
  });

  it('returns valid false for unknown or revoked tokens and supports admin revoke', async () => {
    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000901',
        letterType: 'L1',
        status: 'GENERATED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
        subjectData: { nama: 'Budi', nik: '1607010101010001' },
        nomorSurat: '400.12.2.1/124/2026',
        verificationToken: 'fedcba9876543210fedcba9876543210',
      },
    });

    const random = await request(app)
      .get('/verify/not-a-real-token')
      .set('Accept', 'application/json');
    expect(random.status).toBe(200);
    expect(random.body).toEqual({ valid: false });

    const token = await login();
    const revoke = await request(app)
      .post(`/api/requests/${created.id}/revoke`)
      .set('Authorization', `Bearer ${token}`);

    expect(revoke.status).toBe(200);
    expect(revoke.body).toEqual({ revoked: true });

    const afterRevoke = await request(app)
      .get(`/verify/${created.verificationToken}`)
      .set('Accept', 'application/json');

    expect(afterRevoke.status).toBe(200);
    expect(afterRevoke.body).toEqual({ valid: false });
  });

  it('renders an HTML verification page when JSON is not requested', async () => {
    await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000902',
        letterType: 'L1',
        status: 'GENERATED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
        subjectData: { nama: 'Budi', nik: '1607010101010001' },
        nomorSurat: '400.12.2.1/125/2026',
        verificationToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    });

    const res = await request(app).get('/verify/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('Surat TERVERIFIKASI');
    expect(res.text).toContain('400.12.2.1/125/2026');
  });
});
