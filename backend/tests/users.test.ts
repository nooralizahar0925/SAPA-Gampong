import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { testPrisma, truncateAll } from './helpers/db';

const app = createApp();

beforeEach(async () => {
  await truncateAll();
  await testPrisma.adminUser.createMany({
    data: [
      {
        name: 'Admin Gampong',
        email: 'admin@gampongblang.id',
        passwordHash: bcrypt.hashSync('admin123', 10),
        role: 'admin',
      },
      {
        name: 'Operator Kantor',
        email: 'operator@gampongblang.id',
        passwordHash: bcrypt.hashSync('operator123', 10),
        role: 'operator',
      },
    ],
  });
});

async function login(email = 'admin@gampongblang.id', password = 'admin123') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token as string;
}

describe('user account settings', () => {
  it('lets an admin create and update dashboard users', async () => {
    const token = await login();

    const created = await request(app)
      .post('/api/settings/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Operator Baru',
        email: 'operator.baru@gampongblang.id',
        password: 'operator123',
        active: true,
        role: 'operator',
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: 'Operator Baru',
      email: 'operator.baru@gampongblang.id',
      active: true,
      role: 'operator',
    });
    expect(created.body.passwordHash).toBeUndefined();

    const updated = await request(app)
      .patch(`/api/settings/users/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false, role: 'admin', name: 'Admin Baru' });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: 'Admin Baru', active: false, role: 'admin' });
  });

  it('keeps at least one active admin account', async () => {
    const token = await login();
    const admin = await testPrisma.adminUser.findUniqueOrThrow({
      where: { email: 'admin@gampongblang.id' },
    });

    const res = await request(app)
      .patch(`/api/settings/users/${admin.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.active).toContain('Admin aktif');
  });

  it('blocks operators from the Sistem APIs', async () => {
    const operatorToken = await login('operator@gampongblang.id', 'operator123');

    const users = await request(app)
      .get('/api/settings/users')
      .set('Authorization', `Bearer ${operatorToken}`);
    const settings = await request(app)
      .get('/api/settings/app')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(users.status).toBe(403);
    expect(settings.status).toBe(403);
  });
});

describe('profile settings', () => {
  it('updates the current user name and password', async () => {
    const token = await login();

    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Admin Baru',
        current_password: 'admin123',
        password: 'AdminBaru123',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Admin Baru',
      email: 'admin@gampongblang.id',
      role: 'admin',
      active: true,
    });

    const loginWithNewPassword = await request(app).post('/api/auth/login').send({
      email: 'admin@gampongblang.id',
      password: 'AdminBaru123',
    });
    expect(loginWithNewPassword.status).toBe(200);
  });

  it('rejects inactive accounts at login and on existing tokens', async () => {
    const token = await login('operator@gampongblang.id', 'operator123');

    await testPrisma.adminUser.update({
      where: { email: 'operator@gampongblang.id' },
      data: { active: false },
    });

    const loginAgain = await request(app).post('/api/auth/login').send({
      email: 'operator@gampongblang.id',
      password: 'operator123',
    });
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(loginAgain.status).toBe(403);
    expect(me.status).toBe(403);
  });
});
