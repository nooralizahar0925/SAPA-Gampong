import bcrypt from 'bcryptjs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { androidApkMetadataPath, androidApkPath } from '../src/services/app-release.service';
import { testPrisma, truncateAll } from './helpers/db';

const app = createApp();

beforeEach(async () => {
  await truncateAll();
  await rm(androidApkPath, { force: true });
  await rm(androidApkMetadataPath, { force: true });
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

describe('app settings', () => {
  it('returns empty defaults before anything has been configured', async () => {
    const token = await login();

    const res = await request(app).get('/api/settings/app').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.contact_phone).toBeNull();
    expect(res.body.letterhead_line1).toBeNull();
    expect(res.body.keuchik_name).toBeNull();
  });

  it('saves contact, letterhead, and signatory blocks', async () => {
    const token = await login();

    const patch = await request(app)
      .patch('/api/settings/app')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contact_phone: '0651-123456',
        contact_email: 'gampongblang@acehjaya.go.id',
        contact_address: 'Jl. Pesisir No. 1, Gampong Blang',
        letterhead_line1: 'PEMERINTAH KABUPATEN ACEH JAYA',
        letterhead_line2: 'KECAMATAN KRUENG SABEE',
        letterhead_line3: 'GAMPONG BLANG',
        keuchik_title: 'Keuchik Gampong Blang',
        keuchik_name: 'SOFIAN',
        secretary_title: 'Sekretaris Gampong a.n. Keuchik Gampong Blang',
        secretary_name: 'AFZALUL ZIKRI, S.P',
      });

    expect(patch.status).toBe(200);
    expect(patch.body.keuchik_name).toBe('SOFIAN');

    const res = await request(app).get('/api/settings/app').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.contact_phone).toBe('0651-123456');
    expect(res.body.letterhead_line2).toBe('KECAMATAN KRUENG SABEE');
    expect(res.body.secretary_name).toBe('AFZALUL ZIKRI, S.P');
  });

  it('applies a partial PATCH without clearing untouched fields', async () => {
    const token = await login();

    await request(app)
      .patch('/api/settings/app')
      .set('Authorization', `Bearer ${token}`)
      .send({ keuchik_name: 'SOFIAN', contact_phone: '0651-123456' });

    await request(app)
      .patch('/api/settings/app')
      .set('Authorization', `Bearer ${token}`)
      .send({ contact_phone: '0651-999888' });

    const res = await request(app).get('/api/settings/app').set('Authorization', `Bearer ${token}`);

    expect(res.body.keuchik_name).toBe('SOFIAN');
    expect(res.body.contact_phone).toBe('0651-999888');
  });

  it('does not expose email provider secrets on the app settings payload', async () => {
    const token = await login();

    const res = await request(app).get('/api/settings/app').set('Authorization', `Bearer ${token}`);

    expect(res.body.email_provider_configs).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('apiKey');
  });

  it('rejects an invalid contact email', async () => {
    const token = await login();

    const res = await request(app)
      .patch('/api/settings/app')
      .set('Authorization', `Bearer ${token}`)
      .send({ contact_email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('requires authentication for both read and write', async () => {
    expect((await request(app).get('/api/settings/app')).status).toBe(401);
    expect((await request(app).patch('/api/settings/app').send({ keuchik_name: 'X' })).status).toBe(401);
  });
});

describe('app distribution settings', () => {
  it('is publicly readable but disabled by default', async () => {
    const res = await request(app).get('/api/app-distribution');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      channel: 'direct_apk',
      enabled: false,
      apk_url: null,
      play_store_url: null,
    });
  });

  it('lets an admin configure APK distribution without exposing authentication', async () => {
    const token = await login();
    const sha256 = 'a'.repeat(64);

    const patch = await request(app)
      .patch('/api/settings/app-distribution')
      .set('Authorization', `Bearer ${token}`)
      .send({
        channel: 'direct_apk',
        enabled: true,
        apk_url: '/api/app-distribution/android.apk',
        version_name: '1.0.0',
        release_date: '2026-09-15',
        file_size: '42 MB',
        sha256,
        notice: 'Publikasi Google Play sedang diproses.',
      });

    expect(patch.status).toBe(200);
    expect(patch.body).toMatchObject({
      channel: 'direct_apk',
      enabled: true,
      apk_url: '/api/app-distribution/android.apk',
      sha256,
    });

    const publicResult = await request(app).get('/api/app-distribution');
    expect(publicResult.body.notice).toBe('Publikasi Google Play sedang diproses.');
  });

  it('requires an admin for writes and rejects unsafe download URLs', async () => {
    expect(
      (
        await request(app)
          .patch('/api/settings/app-distribution')
          .send({ enabled: true, apk_url: 'http://insecure.example/app.apk' })
      ).status,
    ).toBe(401);

    const token = await login();
    const invalid = await request(app)
      .patch('/api/settings/app-distribution')
      .set('Authorization', `Bearer ${token}`)
      .send({ apk_url: 'http://insecure.example/app.apk' });

    expect(invalid.status).toBe(400);
  });

  it('does not enable a channel until its destination URL is configured', async () => {
    const token = await login();

    const res = await request(app)
      .patch('/api/settings/app-distribution')
      .set('Authorization', `Bearer ${token}`)
      .send({ channel: 'google_play', enabled: true });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.play_store_url).toBeDefined();
  });

  it('keeps the APK unavailable while public distribution is disabled', async () => {
    await mkdir(dirname(androidApkPath), { recursive: true });
    await writeFile(androidApkPath, 'signed-apk-fixture');

    const res = await request(app).get('/api/app-distribution/android.apk');

    expect(res.status).toBe(404);
  });

  it('streams the APK only while direct distribution is active', async () => {
    const token = await login();
    await mkdir(dirname(androidApkPath), { recursive: true });
    await writeFile(androidApkPath, 'signed-apk-fixture');
    await request(app)
      .patch('/api/settings/app-distribution')
      .set('Authorization', `Bearer ${token}`)
      .send({
        channel: 'direct_apk',
        enabled: true,
        apk_url: '/api/app-distribution/android.apk',
        version_name: '1.0.0',
      });

    const res = await request(app).get('/api/app-distribution/android.apk');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.android.package-archive');
    expect(res.headers['content-disposition']).toContain('gampong-blang-digital-1.0.0.apk');
    expect(res.headers['content-length']).toBe(Buffer.byteLength('signed-apk-fixture').toString());
  });

  it('reads direct APK release metadata automatically from the private artifact', async () => {
    await mkdir(dirname(androidApkPath), { recursive: true });
    await writeFile(androidApkPath, 'signed-apk-fixture');
    await writeFile(androidApkMetadataPath, JSON.stringify({ version_name: '2.3.4' }));
    await testPrisma.appConfig.create({
      data: { id: 'singleton', appReleaseDate: '2026-10-01' },
    });

    const res = await request(app).get('/api/app-distribution');

    expect(res.status).toBe(200);
    expect(res.body.version_name).toBe('2.3.4');
    expect(res.body.file_size).toBe('0.0 MB');
    expect(res.body.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.release_date).toBe('2026-10-01');
  });
});

describe('letter number counters', () => {
  it('lists counters for a year, including types that have not been used yet', async () => {
    const token = await login();

    await testPrisma.letterNumberCounter.create({
      data: { letterType: 'L1', year: 2026, lastNumber: 12 },
    });

    const res = await request(app)
      .get('/api/settings/letter-counters?year=2026')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2026);

    const l1 = res.body.counters.find((c: { letter_type: string }) => c.letter_type === 'L1');
    expect(l1.last_number).toBe(12);

    // A type with no row yet still appears, at 0, so the dashboard can show all ten.
    const l2 = res.body.counters.find((c: { letter_type: string }) => c.letter_type === 'L2');
    expect(l2.last_number).toBe(0);
  });

  it('updates a counter so the next generated letter continues from it', async () => {
    const token = await login();

    const patch = await request(app)
      .patch('/api/settings/letter-counters')
      .set('Authorization', `Bearer ${token}`)
      .send({ letter_type: 'L1', year: 2026, last_number: 40 });

    expect(patch.status).toBe(200);

    const row = await testPrisma.letterNumberCounter.findUnique({
      where: { letterType_year: { letterType: 'L1', year: 2026 } },
    });
    expect(row?.lastNumber).toBe(40);
  });

  it('rejects a negative counter value', async () => {
    const token = await login();

    const res = await request(app)
      .patch('/api/settings/letter-counters')
      .set('Authorization', `Bearer ${token}`)
      .send({ letter_type: 'L1', year: 2026, last_number: -1 });

    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    expect((await request(app).get('/api/settings/letter-counters?year=2026')).status).toBe(401);
  });
});

describe('letter templates', () => {
  it('lists seeded templates for admins and only active templates publicly', async () => {
    const token = await login();

    const adminList = await request(app)
      .get('/api/settings/letter-templates')
      .set('Authorization', `Bearer ${token}`);

    expect(adminList.status).toBe(200);
    expect(adminList.body).toHaveLength(10);

    const patch = await request(app)
      .patch('/api/settings/letter-templates/L1')
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false, name: 'Surat Domisili Warga' });

    expect(patch.status).toBe(200);
    expect(patch.body.active).toBe(false);
    expect(patch.body.name).toBe('Surat Domisili Warga');

    const publicList = await request(app).get('/api/letter-types');
    expect(publicList.body.some((item: { code: string }) => item.code === 'L1')).toBe(false);
  });

  it('deletes and restores a template from the built-in official code', async () => {
    const token = await login();

    const deleted = await request(app)
      .delete('/api/settings/letter-templates/L2')
      .set('Authorization', `Bearer ${token}`);

    expect(deleted.status).toBe(204);

    const afterDelete = await request(app)
      .get('/api/settings/letter-templates')
      .set('Authorization', `Bearer ${token}`);
    expect(afterDelete.body.some((item: { code: string }) => item.code === 'L2')).toBe(false);

    const restored = await request(app)
      .post('/api/settings/letter-templates')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'L2' });

    expect(restored.status).toBe(201);
    expect(restored.body).toMatchObject({
      code: 'L2',
      name: 'Surat Keterangan Domisili Kantor',
      active: true,
    });
  });

  it('does not allow KK to become required again through a stale client', async () => {
    const token = await login();

    const patch = await request(app)
      .patch('/api/settings/letter-templates/L1')
      .set('Authorization', `Bearer ${token}`)
      .send({ required_attachments: ['KTP', 'KK'] });

    expect(patch.status).toBe(200);
    expect(patch.body.required_attachments).toEqual(['KTP']);

    const stored = await testPrisma.letterTemplate.findUniqueOrThrow({
      where: { code: 'L1' },
      select: { requiredAttachments: true },
    });
    expect(stored.requiredAttachments).toEqual(['KTP']);
  });

  it('renders a PDF preview for an admin', async () => {
    const token = await login();

    const res = await request(app)
      .get('/api/settings/letter-templates/L1/preview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });

  it('requires authentication', async () => {
    expect((await request(app).get('/api/settings/letter-templates')).status).toBe(401);
    expect(
      (await request(app).patch('/api/settings/letter-templates/L1').send({ active: false }))
        .status,
    ).toBe(401);
  });
});
