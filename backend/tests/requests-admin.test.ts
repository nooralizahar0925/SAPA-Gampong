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
        status: 'GENERATED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
        subjectData: { nama: 'Budi', nik: '1607010101010001' },
        nomorSurat: '400.12.2.1/5/2026',
        verificationToken: 'abcdef1234567890abcdef1234567890',
        generatedPdfId: file.id,
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
    expect(res.body.generated_pdf_id).toBe(file.id);
    expect(res.body.generated_pdf_url).toContain(`/api/uploads/${file.id}?`);
    expect(res.body.verification_token).toBe('abcdef1234567890abcdef1234567890');
    expect(res.body.verification_url).toContain('/verify/abcdef1234567890abcdef1234567890');
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

describe('request counts', () => {
  /** Builds n requests in one status so the counts can exceed a single page of 20. */
  function buildRequests(status: string, count: number, offset: number) {
    return Array.from({ length: count }, (_, i) => ({
      referenceCode: `GB-2026-${String(offset + i).padStart(6, '0')}`,
      letterType: 'L1' as const,
      status: status as 'SUBMITTED',
      applicantName: `Warga ${offset + i}`,
      applicantEmail: `warga${offset + i}@mail.com`,
      subjectData: { nama: `Warga ${offset + i}` },
    }));
  }

  it('counts every status across the whole table, not just the first page', async () => {
    await testPrisma.letterRequest.createMany({
      data: [
        ...buildRequests('SUBMITTED', 25, 1),
        ...buildRequests('IN_REVIEW', 3, 100),
        ...buildRequests('SENT', 2, 200),
        ...buildRequests('REJECTED', 1, 300),
      ],
    });

    const token = await login();
    const res = await request(app)
      .get('/api/requests/counts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // 25 exceeds the 20-row page size: a client counting rows would report 20.
    expect(res.body.by_status.SUBMITTED).toBe(25);
    expect(res.body.by_status.IN_REVIEW).toBe(3);
    expect(res.body.by_status.SENT).toBe(2);
    expect(res.body.by_status.REJECTED).toBe(1);
    expect(res.body.total).toBe(31);
    // Work waiting on an admin: SUBMITTED + IN_REVIEW + NEEDS_INFO.
    expect(res.body.pending).toBe(28);
  });

  it('reports zero for statuses with no requests', async () => {
    const token = await login();
    const res = await request(app)
      .get('/api/requests/counts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.pending).toBe(0);
    expect(res.body.by_status.SUBMITTED).toBe(0);
    expect(res.body.by_status.GENERATED).toBe(0);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/requests/counts');
    expect(res.status).toBe(401);
  });
});

describe('queue sorting and period filter', () => {
  beforeEach(async () => {
    await testPrisma.letterRequest.createMany({
      data: [
        {
          referenceCode: 'GB-2026-000010',
          letterType: 'L1',
          status: 'SUBMITTED',
          applicantName: 'Zulkifli',
          applicantEmail: 'zulkifli@mail.com',
          subjectData: { nama: 'Zulkifli' },
          createdAt: new Date('2026-06-10T03:00:00.000Z'),
        },
        {
          referenceCode: 'GB-2026-000011',
          letterType: 'L1',
          status: 'SUBMITTED',
          applicantName: 'Adnan',
          applicantEmail: 'adnan@mail.com',
          subjectData: { nama: 'Adnan' },
          createdAt: new Date('2026-07-05T03:00:00.000Z'),
        },
        {
          referenceCode: 'GB-2026-000012',
          letterType: 'L1',
          status: 'SUBMITTED',
          applicantName: 'Marlina',
          applicantEmail: 'marlina@mail.com',
          subjectData: { nama: 'Marlina' },
          createdAt: new Date('2026-07-20T03:00:00.000Z'),
        },
      ],
    });
  });

  it('defaults to newest first', async () => {
    const token = await login();
    const res = await request(app).get('/api/requests').set('Authorization', `Bearer ${token}`);

    expect(res.body.items[0].reference_code).toBe('GB-2026-000012');
  });

  it('sorts by applicant name ascending', async () => {
    const token = await login();
    const res = await request(app)
      .get('/api/requests?sort=applicant_name&direction=asc')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.items.map((i: { applicant_name: string }) => i.applicant_name)).toEqual([
      'Adnan',
      'Marlina',
      'Zulkifli',
    ]);
  });

  it('sorts by reference code descending', async () => {
    const token = await login();
    const res = await request(app)
      .get('/api/requests?sort=reference_code&direction=desc')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.items[0].reference_code).toBe('GB-2026-000012');
  });

  it('filters to a single month of submissions', async () => {
    const token = await login();
    const res = await request(app)
      .get('/api/requests?year=2026&month=7')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.total).toBe(2);
    expect(res.body.items.map((i: { applicant_name: string }) => i.applicant_name).sort()).toEqual([
      'Adnan',
      'Marlina',
    ]);
  });

  it('filters to a whole year when no month is given', async () => {
    const token = await login();
    const res = await request(app)
      .get('/api/requests?year=2026')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.total).toBe(3);
  });

  it('finds a request by reference code', async () => {
    const token = await login();
    const res = await request(app)
      .get('/api/requests?q=GB-2026-000011')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].applicant_name).toBe('Adnan');
  });

  it('finds a request by applicant name, case-insensitively', async () => {
    const token = await login();
    const res = await request(app)
      .get('/api/requests?q=marlina')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].reference_code).toBe('GB-2026-000012');
  });

  it('rejects an unknown sort column instead of silently ignoring it', async () => {
    const token = await login();
    const res = await request(app)
      .get('/api/requests?sort=applicant_email;DROP')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('reports available periods for the filter dropdown', async () => {
    const token = await login();
    const res = await request(app)
      .get('/api/requests/counts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Newest first, so the dropdown lists the most recent month at the top.
    expect(res.body.periods[0]).toMatchObject({ year: 2026, month: 7, count: 2 });
    expect(res.body.periods[1]).toMatchObject({ year: 2026, month: 6, count: 1 });
  });
});

describe('queue paging', () => {
  it('returns 20 per page and a remainder on the last page', async () => {
    await testPrisma.letterRequest.createMany({
      data: Array.from({ length: 51 }, (_, i) => ({
        referenceCode: `GB-2026-${String(500 + i).padStart(6, '0')}`,
        letterType: 'L1' as const,
        status: 'SUBMITTED' as const,
        applicantName: `Warga ${500 + i}`,
        applicantEmail: `warga${500 + i}@mail.com`,
        subjectData: { nama: `Warga ${500 + i}` },
      })),
    });

    const token = await login();
    const page = (n: number) =>
      request(app).get(`/api/requests?page=${n}`).set('Authorization', `Bearer ${token}`);

    const first = await page(1);
    expect(first.body.items).toHaveLength(20);
    expect(first.body.total).toBe(51);

    const second = await page(2);
    expect(second.body.items).toHaveLength(20);

    // 51 = 20 + 20 + 11
    const third = await page(3);
    expect(third.body.items).toHaveLength(11);

    // No overlap between pages, so nothing is shown twice or skipped.
    const codes = [...first.body.items, ...second.body.items, ...third.body.items].map(
      (item: { reference_code: string }) => item.reference_code,
    );
    expect(new Set(codes).size).toBe(51);
  });

  it('returns an empty page past the end rather than erroring', async () => {
    const token = await login();
    const res = await request(app)
      .get('/api/requests?page=99')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});
