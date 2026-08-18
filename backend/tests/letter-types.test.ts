import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('GET /api/letter-types', () => {
  it('returns the 10 configured letter types from the shared contract', async () => {
    const res = await request(createApp()).get('/api/letter-types');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);

    const l1 = res.body.find((item: { code: string }) => item.code === 'L1');
    expect(l1).toMatchObject({
      code: 'L1',
      name: 'Surat Keterangan Berdomisili',
      subject_is_applicant: true,
      required_attachments: ['KTP'],
      signatory: 'Keuchik',
    });
    expect(
      res.body.every(
        (item: { required_attachments: string[] }) =>
          !item.required_attachments.includes('KK'),
      ),
    ).toBe(true);
    expect(l1.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'nik', type: 'nik', required: true }),
      ]),
    );

    const l10 = res.body.find((item: { code: string }) => item.code === 'L10');
    expect(l10.subject_is_applicant).toBe(true);
    expect(l10.fields.map((field: { key: string }) => field.key)).toEqual([
      'nama_pemohon',
      'tanggal_permohonan',
      'perihal',
      'tujuan_jabatan',
      'tujuan_instansi',
    ]);
  });
});
