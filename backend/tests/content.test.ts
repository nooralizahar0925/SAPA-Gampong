import bcrypt from 'bcryptjs';
import request from 'supertest';
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

/** Banner slides require a real File row because of the imageFileId FK. */
async function createImageFile(name: string) {
  return testPrisma.file.create({
    data: {
      storagePath: `content/${name}.webp`,
      mime: 'image/webp',
      size: 2048,
    },
  });
}

async function createAudioFile(name: string) {
  return testPrisma.file.create({
    data: {
      storagePath: `content/${name}.mp3`,
      mime: 'audio/mpeg',
      size: 4096,
    },
  });
}

describe('content module', () => {
  describe('village profile (singleton)', () => {
    it('reflects an admin PATCH in the public GET', async () => {
      const token = await login();

      const patch = await request(app)
        .patch('/api/content/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Gampong Blang',
          kecamatan: 'Kuta Alam',
          kabupaten: 'Banda Aceh',
          contact_phone: '0651-123456',
          description: 'Gampong di pesisir Aceh.',
        });

      expect(patch.status).toBe(200);
      expect(patch.body.name).toBe('Gampong Blang');

      const publicRes = await request(app).get('/api/content/profile');

      expect(publicRes.status).toBe(200);
      expect(publicRes.body.name).toBe('Gampong Blang');
      expect(publicRes.body.kecamatan).toBe('Kuta Alam');
      expect(publicRes.body.contact_phone).toBe('0651-123456');
    });

    it('applies a partial PATCH without clearing untouched fields', async () => {
      const token = await login();

      await request(app)
        .patch('/api/content/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Gampong Blang', kecamatan: 'Kuta Alam', kabupaten: 'Banda Aceh' });

      await request(app)
        .patch('/api/content/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ contact_phone: '0651-999888' });

      const res = await request(app).get('/api/content/profile');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Gampong Blang');
      expect(res.body.contact_phone).toBe('0651-999888');
    });

    it('rejects an unauthenticated write', async () => {
      const res = await request(app)
        .patch('/api/content/profile')
        .send({ name: 'Tanpa Token' });

      expect(res.status).toBe(401);
    });
  });

  describe('banner slides', () => {
    it('creates, lists, and persists a reordering', async () => {
      const token = await login();
      const [first, second] = await Promise.all([
        createImageFile('banner-a'),
        createImageFile('banner-b'),
      ]);

      const createA = await request(app)
        .post('/api/content/banners')
        .set('Authorization', `Bearer ${token}`)
        .send({ image_file_id: first.id, order: 0 });

      const createB = await request(app)
        .post('/api/content/banners')
        .set('Authorization', `Bearer ${token}`)
        .send({ image_file_id: second.id, order: 1 });

      expect(createA.status).toBe(201);
      expect(createB.status).toBe(201);

      const reorder = await request(app)
        .post('/api/content/banners/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: [createB.body.id, createA.body.id] });

      expect(reorder.status).toBe(200);

      const listed = await request(app).get('/api/content/banners');

      expect(listed.status).toBe(200);
      expect(listed.body.map((b: { id: string }) => b.id)).toEqual([
        createB.body.id,
        createA.body.id,
      ]);
      expect(listed.body[0].order).toBe(0);
      expect(listed.body[1].order).toBe(1);
    });

    it('deletes a banner', async () => {
      const token = await login();
      const file = await createImageFile('banner-del');

      const created = await request(app)
        .post('/api/content/banners')
        .set('Authorization', `Bearer ${token}`)
        .send({ image_file_id: file.id });

      const removed = await request(app)
        .delete(`/api/content/banners/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(removed.status).toBe(204);

      const listed = await request(app).get('/api/content/banners');
      expect(listed.body).toHaveLength(0);
    });

    it('rejects a banner pointing at a missing file', async () => {
      const token = await login();

      const res = await request(app)
        .post('/api/content/banners')
        .set('Authorization', `Bearer ${token}`)
        .send({ image_file_id: 'does-not-exist' });

      expect(res.status).toBe(404);
    });
  });

  describe('vision & mission', () => {
    it('stores the vision and mission list', async () => {
      const token = await login();

      const patch = await request(app)
        .patch('/api/content/vision-mission')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vision: 'Gampong mandiri dan sejahtera.',
          missions: ['Meningkatkan pelayanan publik', 'Memperkuat ekonomi warga'],
        });

      expect(patch.status).toBe(200);

      const res = await request(app).get('/api/content/vision-mission');

      expect(res.status).toBe(200);
      expect(res.body.vision).toBe('Gampong mandiri dan sejahtera.');
      expect(res.body.missions).toEqual([
        'Meningkatkan pelayanan publik',
        'Memperkuat ekonomi warga',
      ]);
    });
  });

  describe('officials', () => {
    it('supports create, update, list ordering, and delete', async () => {
      const token = await login();

      const keuchik = await request(app)
        .post('/api/content/officials')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Tgk. Ismail', role: 'Keuchik', order: 0, is_leadership_highlight: true });

      const sekretaris = await request(app)
        .post('/api/content/officials')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nurul Huda', role: 'Sekretaris', order: 1 });

      expect(keuchik.status).toBe(201);
      expect(keuchik.body.is_leadership_highlight).toBe(true);
      expect(sekretaris.status).toBe(201);

      const updated = await request(app)
        .patch(`/api/content/officials/${sekretaris.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'Sekretaris Gampong' });

      expect(updated.status).toBe(200);
      expect(updated.body.role).toBe('Sekretaris Gampong');

      const listed = await request(app).get('/api/content/officials');
      expect(listed.status).toBe(200);
      expect(listed.body.map((o: { name: string }) => o.name)).toEqual([
        'Tgk. Ismail',
        'Nurul Huda',
      ]);

      const removed = await request(app)
        .delete(`/api/content/officials/${keuchik.body.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(removed.status).toBe(204);

      const after = await request(app).get('/api/content/officials');
      expect(after.body).toHaveLength(1);
    });

    it('returns 404 when updating a missing official', async () => {
      const token = await login();

      const res = await request(app)
        .patch('/api/content/officials/missing-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'Keuchik' });

      expect(res.status).toBe(404);
    });
  });

  describe('village strengths', () => {
    it('supports create, list, and delete', async () => {
      const token = await login();

      const created = await request(app)
        .post('/api/content/strengths')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Wisata Pantai', body: 'Pantai bersih sepanjang tahun.', order: 0 });

      expect(created.status).toBe(201);

      const listed = await request(app).get('/api/content/strengths');
      expect(listed.status).toBe(200);
      expect(listed.body).toHaveLength(1);
      expect(listed.body[0].title).toBe('Wisata Pantai');

      const removed = await request(app)
        .delete(`/api/content/strengths/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(removed.status).toBe(204);
    });
  });

  describe('mosques', () => {
    it('supports create, update, and public list', async () => {
      const token = await login();

      const created = await request(app)
        .post('/api/content/mosques')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Masjid Baiturrahim', address: 'Jl. Pesisir No. 1' });

      expect(created.status).toBe(201);

      const updated = await request(app)
        .patch(`/api/content/mosques/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ landmark: 'Depan balai gampong' });

      expect(updated.status).toBe(200);
      expect(updated.body.landmark).toBe('Depan balai gampong');

      const listed = await request(app).get('/api/content/mosques');
      expect(listed.status).toBe(200);
      expect(listed.body[0].name).toBe('Masjid Baiturrahim');
    });
  });

  describe('prayer config', () => {
    it('stores coordinates the mobile app uses for local computation', async () => {
      const token = await login();

      const patch = await request(app)
        .patch('/api/content/prayer-config')
        .set('Authorization', `Bearer ${token}`)
        .send({ lat: 4.7, lng: 95.6, calc_method: 'Kemenag', timezone: 'Asia/Jakarta' });

      expect(patch.status).toBe(200);

      const res = await request(app).get('/api/content/prayer-config');

      expect(res.status).toBe(200);
      expect(res.body.lat).toBeCloseTo(4.7);
      expect(res.body.lng).toBeCloseTo(95.6);
      expect(res.body.calc_method).toBe('Kemenag');
      expect(res.body.timezone).toBe('Asia/Jakarta');
    });

    it('rejects an out-of-range latitude', async () => {
      const token = await login();

      const res = await request(app)
        .patch('/api/content/prayer-config')
        .set('Authorization', `Bearer ${token}`)
        .send({ lat: 999, lng: 95.6, calc_method: 'Kemenag' });

      expect(res.status).toBe(400);
    });

    it('stores an adzan audio file for the mobile app', async () => {
      const token = await login();
      const audio = await createAudioFile('adzan');

      const patch = await request(app)
        .patch('/api/content/prayer-config')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: 4.7,
          lng: 95.6,
          calc_method: 'Kemenag',
          adzan_file_id: audio.id,
        });

      expect(patch.status).toBe(200);
      expect(patch.body.adzan_file_id).toBe(audio.id);
      expect(patch.body.adzan_url).toContain(`/api/uploads/${audio.id}?`);

      const res = await request(app).get('/api/content/prayer-config');
      expect(res.body.adzan_file_id).toBe(audio.id);
      expect(res.body.adzan_url).toContain(`/api/uploads/${audio.id}?`);
    });

    it('rejects a non-audio file as adzan audio', async () => {
      const token = await login();
      const image = await createImageFile('not-adzan');

      const res = await request(app)
        .patch('/api/content/prayer-config')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: 4.7,
          lng: 95.6,
          calc_method: 'Kemenag',
          adzan_file_id: image.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.fields.adzan_file_id).toBe('File audio azan harus berupa audio');
    });
  });

  describe('demographics', () => {
    it('upserts stat blocks and returns them ordered', async () => {
      const token = await login();

      const patch = await request(app)
        .patch('/api/content/demographics')
        .set('Authorization', `Bearer ${token}`)
        .send({
          blocks: [
            { key: 'total_penduduk', label: 'Total Penduduk', type: 'number', data: { value: 1240 }, order: 0 },
            {
              key: 'jenis_kelamin',
              label: 'Jenis Kelamin',
              type: 'split',
              data: { male: 620, female: 620 },
              order: 1,
            },
          ],
        });

      expect(patch.status).toBe(200);

      const res = await request(app).get('/api/content/demographics');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].key).toBe('total_penduduk');
      expect(res.body[0].data).toEqual({ value: 1240 });
      expect(res.body[1].type).toBe('split');
    });

    it('updates an existing block in place rather than duplicating it', async () => {
      const token = await login();
      const send = (value: number) =>
        request(app)
          .patch('/api/content/demographics')
          .set('Authorization', `Bearer ${token}`)
          .send({
            blocks: [
              { key: 'total_penduduk', label: 'Total Penduduk', type: 'number', data: { value }, order: 0 },
            ],
          });

      await send(1240);
      await send(1301);

      const res = await request(app).get('/api/content/demographics');

      expect(res.body).toHaveLength(1);
      expect(res.body[0].data).toEqual({ value: 1301 });
    });

    it('rejects an unknown block type', async () => {
      const token = await login();

      const res = await request(app)
        .patch('/api/content/demographics')
        .set('Authorization', `Bearer ${token}`)
        .send({
          blocks: [{ key: 'bad', label: 'Bad', type: 'scatter', data: {}, order: 0 }],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('public read access', () => {
    it('serves every public content endpoint without a token', async () => {
      const paths = [
        '/api/content/banners',
        '/api/content/profile',
        '/api/content/vision-mission',
        '/api/content/officials',
        '/api/content/strengths',
        '/api/content/mosques',
        '/api/content/prayer-config',
        '/api/content/demographics',
      ];

      for (const path of paths) {
        const res = await request(app).get(path);
        expect(res.status, `${path} should be publicly readable`).toBe(200);
      }
    });
  });
});
