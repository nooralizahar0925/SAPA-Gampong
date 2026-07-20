import { describe, it, expect, beforeEach } from 'vitest';
import { testPrisma, truncateAll } from './helpers/db';

beforeEach(async () => {
  await truncateAll();
});

describe('LetterRequest schema', () => {
  it('persists a request with the brief §14 fields', async () => {
    const created = await testPrisma.letterRequest.create({
      data: {
        referenceCode: 'GB-2026-000001',
        letterType: 'L1',
        status: 'SUBMITTED',
        applicantName: 'Budi',
        applicantEmail: 'budi@mail.com',
        applicantPhone: '081234567890',
        subjectData: { nama: 'Budi', nik: '1607010101010001' },
      },
    });

    expect(created.id).toBeTruthy();
    expect(created.status).toBe('SUBMITTED');
    expect(created.qrRevoked).toBe(false);
    expect(created.verifiedCount).toBe(0);
    expect(created.verificationToken).toBeNull();
  });

  it('rejects a duplicate verification token', async () => {
    const base = {
      letterType: 'L1' as const,
      status: 'GENERATED' as const,
      applicantName: 'Budi',
      applicantEmail: 'budi@mail.com',
      subjectData: {},
      verificationToken: 'vt_duplicate',
    };

    await testPrisma.letterRequest.create({
      data: { ...base, referenceCode: 'GB-2026-000002' },
    });

    await expect(
      testPrisma.letterRequest.create({
        data: { ...base, referenceCode: 'GB-2026-000003' },
      }),
    ).rejects.toThrow();
  });
});

describe('AdminUser schema', () => {
  it('enforces a unique email', async () => {
    await testPrisma.adminUser.create({
      data: { name: 'A', email: 'dup@gampongblang.id', passwordHash: 'x', role: 'admin' },
    });

    await expect(
      testPrisma.adminUser.create({
        data: { name: 'B', email: 'dup@gampongblang.id', passwordHash: 'y', role: 'admin' },
      }),
    ).rejects.toThrow();
  });
});
