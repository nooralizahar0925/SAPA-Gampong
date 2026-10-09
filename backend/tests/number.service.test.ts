import { beforeEach, describe, expect, it } from 'vitest';
import { assignLetterNumber, formatLetterNumber } from '../src/modules/letters/number.service';
import { testPrisma, truncateAll } from './helpers/db';

beforeEach(async () => {
  await truncateAll();
});

describe('assignLetterNumber', () => {
  it('increments sequentially per letter type and year', async () => {
    const first = await testPrisma.$transaction((tx) => assignLetterNumber(tx, 'L1', 2026));
    const second = await testPrisma.$transaction((tx) => assignLetterNumber(tx, 'L1', 2026));

    expect(first).toBe('400.12.2.1/01/2026');
    expect(second).toBe('400.12.2.1/02/2026');
  });

  it('uses the configured prefix map for each letter type', async () => {
    const number = await testPrisma.$transaction((tx) => assignLetterNumber(tx, 'L5', 2026));
    expect(number).toBe('400.1.4.3/01/2026');
  });

  it('matches all ten Nomor Induk in the client PDF', async () => {
    const expected = ['400.12.2.1', '400.10.4.4', '400.10.2.2', '400.10.4.3',
      '400.1.4.3', '400.12.2.2', '400.12.3.1', '400.10.2.4', '400.12.2.3', '400.10.2.3'];
    const codes = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'] as const;
    for (const [index, code] of codes.entries()) {
      expect(await testPrisma.$transaction((tx) => assignLetterNumber(tx, code, 2026)))
        .toBe(`${expected[index]}/01/2026`);
    }
  });

  it('continues existing counters and does not truncate agenda 100', async () => {
    await testPrisma.letterNumberCounter.create({ data: { letterType: 'L7', year: 2026, lastNumber: 98 } });
    expect(await testPrisma.$transaction((tx) => assignLetterNumber(tx, 'L7', 2026))).toBe('400.12.3.1/99/2026');
    expect(await testPrisma.$transaction((tx) => assignLetterNumber(tx, 'L7', 2026))).toBe('400.12.3.1/100/2026');
    expect(await testPrisma.$transaction((tx) => assignLetterNumber(tx, 'L7', 2027))).toBe('400.12.3.1/01/2027');
  });

  it('allocates distinct agenda numbers during concurrent requests', async () => {
    const numbers = await Promise.all(Array.from({ length: 5 }, () =>
      testPrisma.$transaction((tx) => assignLetterNumber(tx, 'L4', 2026))));
    expect(new Set(numbers).size).toBe(5);
    expect(numbers.sort()).toEqual(Array.from({ length: 5 }, (_, i) => formatLetterNumber('L4', i + 1, 2026)));
  });
});
