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
  const issuedAt = new Date('2026-07-21T00:00:00.000Z');

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
        createdAt: issuedAt,
        updatedAt: issuedAt,
      },
    });

    const res = await request(app).get('/verify/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('Surat Terverifikasi');
    expect(res.text).toContain('400.12.2.1/125/2026');
    // Dates are shown the way warga read them, not as a raw column value.
    expect(res.text).toContain('Juli 2026');
    expect(res.text).not.toContain('2026-07');
    // The masked identity is the privacy guarantee — it must never print in full.
    expect(res.text).toContain('B***');
    expect(res.text).not.toContain('1607010101010001');
  });

  it('serves the page without any external requests', async () => {
    await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000903',
        letterType: 'L1',
        status: 'GENERATED',
        applicantName: 'Sari',
        applicantEmail: 'sari@mail.com',
        subjectData: { nama: 'Sari', nik: '1607010101010002' },
        nomorSurat: '400.12.2.1/126/2026',
        verificationToken: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      },
    });

    const res = await request(app).get('/verify/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

    // Warga scan this on rural signal: no scripts, no web fonts, no remote assets.
    expect(res.text).not.toMatch(/<script/i);
    expect(res.text).not.toMatch(/<link[^>]+stylesheet/i);
    expect(res.text).not.toMatch(/https?:\/\/(?!localhost)/);
    expect(res.text).toContain('<style>');
  });

  it('tells the reader what to do when a QR does not verify', async () => {
    const res = await request(app).get('/verify/cccccccccccccccccccccccccccccccc');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Tidak Terverifikasi');
    // An unverifiable letter is a security warning, so it must not dead-end.
    expect(res.text).toContain('Yang perlu dilakukan');
    expect(res.text).toMatch(/Hubungi Kantor Keuchik/i);
  });
});
