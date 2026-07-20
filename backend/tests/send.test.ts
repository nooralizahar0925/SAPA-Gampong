import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { setEmailProviderConfigsForTests, setEmailTransportForTests } from '../src/services/email.service';
import { storageRoot } from '../src/services/storage.service';
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

afterEach(() => {
  setEmailTransportForTests(null);
  setEmailProviderConfigsForTests(null);
});

async function login() {
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@gampongblang.id',
    password: 'admin123',
  });

  return res.body.token as string;
}

async function createStoredPdf(storagePath: string) {
  const content = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF');
  const absolutePath = join(storageRoot, storagePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);

  return testPrisma.file.create({
    data: {
      storagePath,
      mime: 'application/pdf',
      size: content.length,
    },
  });
}

describe('request email delivery', () => {
  it('sends a generated PDF to the applicant email and marks the request as SENT', async () => {
    const sendMail = vi.fn(async () => ({ messageId: 'msg-1' }));
    setEmailTransportForTests({ sendMail });
    setEmailProviderConfigsForTests({
      mailersend: {
        fromEmail: 'no-reply@gampongblang.id',
        fromName: 'Administrasi Gampong Blang',
        apiKey: 'mailersend-test-key',
      },
    });

    const pdfFile = await createStoredPdf('tests/generated-letter.pdf');
    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-001100',
        letterType: 'L1',
        status: 'GENERATED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
        subjectData: { nama: 'Budi', nik: '1607010101010001' },
        nomorSurat: '400.12.2.1/10/2026',
        verificationToken: '1234567890abcdef1234567890abcdef',
        generatedPdfId: pdfFile.id,
      },
    });

    const token = await login();
    const res = await request(app)
      .post(`/api/requests/${created.id}/send`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'SENT' });
    expect(sendMail).toHaveBeenCalledTimes(1);

    const firstCall = sendMail.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [message] = (firstCall ?? []) as unknown as [
      {
        to: string;
        subject: string;
        html: string;
        attachments: Array<{ filename: string; content: Buffer; contentType: string }>;
      },
    ];
    expect(message).toBeDefined();
    expect(message.to).toBe('budi@mail.com');
    expect(message.subject).toContain('Surat');
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments[0].filename).toContain('GB-2026-001100');
    expect(message.attachments[0].contentType).toBe('application/pdf');
    expect(Buffer.isBuffer(message.attachments[0].content)).toBe(true);

    const reloaded = await testPrisma.letterRequest.findUnique({
      where: { id: created.id },
      include: {
        histories: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    expect(reloaded?.status).toBe('SENT');
    expect(reloaded?.histories.at(-1)).toMatchObject({
      fromStatus: 'GENERATED',
      toStatus: 'SENT',
      action: 'send',
      actorName: 'Admin Gampong',
      nomorSurat: '400.12.2.1/10/2026',
    });
  });

  it('rejects sending when the request is not in GENERATED status', async () => {
    const sendMail = vi.fn(async () => ({ messageId: 'msg-2' }));
    setEmailTransportForTests({ sendMail });
    setEmailProviderConfigsForTests({
      mailersend: {
        fromEmail: 'no-reply@gampongblang.id',
        fromName: 'Administrasi Gampong Blang',
        apiKey: 'mailersend-test-key',
      },
    });

    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-001101',
        letterType: 'L1',
        status: 'APPROVED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
        subjectData: { nama: 'Budi', nik: '1607010101010001' },
        nomorSurat: '400.12.2.1/11/2026',
      },
    });

    const token = await login();
    const res = await request(app)
      .post(`/api/requests/${created.id}/send`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('fires a rejection email hook when an admin rejects a request', async () => {
    const sendMail = vi.fn(async () => ({ messageId: 'msg-3' }));
    setEmailTransportForTests({ sendMail });
    setEmailProviderConfigsForTests({
      mailersend: {
        fromEmail: 'no-reply@gampongblang.id',
        fromName: 'Administrasi Gampong Blang',
        apiKey: 'mailersend-test-key',
      },
    });

    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-001102',
        letterType: 'L1',
        status: 'IN_REVIEW',
        applicantName: 'Sari',
        applicantEmail: 'sari@mail.com',
        subjectData: {
          nama: 'Sari',
          ttl_tempat: 'Calang',
          ttl_tanggal: '1998-01-01',
          nik: '1607010101010002',
          jenis_kelamin: 'Perempuan',
          agama: 'Islam',
          status_perkawinan: 'Belum Kawin',
          pekerjaan: 'Mahasiswa',
          alamat: 'Dusun Mangga',
          dusun: 'Mangga',
          gampong: 'Blang',
          kecamatan: 'Krueng Sabee',
          kabupaten: 'Aceh Jaya',
        },
      },
    });

    const token = await login();
    const res = await request(app)
      .patch(`/api/requests/${created.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'reject',
        reason: 'Dokumen pendukung belum lengkap',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REJECTED');
    expect(sendMail).toHaveBeenCalledTimes(1);

    const firstCall = sendMail.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [message] = (firstCall ?? []) as unknown as [
      {
        to: string;
        subject: string;
        html: string;
      },
    ];
    expect(message).toBeDefined();
    expect(message.to).toBe('sari@mail.com');
    expect(message.subject).toContain('Ditolak');
    expect(message.html).toContain('Dokumen pendukung belum lengkap');
  });
});
