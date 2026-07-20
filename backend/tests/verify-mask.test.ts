import { describe, expect, it } from 'vitest';
import { buildMaskedPerihal, maskName, maskNik } from '../src/modules/verify/masking';

describe('verify masking', () => {
  it('masks resident names and nik values for public verification output', () => {
    expect(maskName('Budi')).toBe('B***');
    expect(maskNik('1607010101010001')).toBe('1607********0001');
    expect(buildMaskedPerihal('Budi', '1607010101010001')).toBe(
      'a.n. B*** (NIK 1607********0001)',
    );
  });

  it('handles missing or short inputs defensively', () => {
    expect(maskName('')).toBe('***');
    expect(maskNik('1234')).toBe('****');
    expect(buildMaskedPerihal('Ani', undefined)).toBe('a.n. A***');
  });
});
