import { beforeEach, describe, expect, it } from 'vitest';
import { assignLetterNumber } from '../src/modules/letters/number.service';
import { testPrisma, truncateAll } from './helpers/db';

beforeEach(async () => {
  await truncateAll();
});

describe('assignLetterNumber', () => {
  it('increments sequentially per letter type and year', async () => {
    const first = await testPrisma.$transaction((tx) => assignLetterNumber(tx, 'L1', 2026));
    const second = await testPrisma.$transaction((tx) => assignLetterNumber(tx, 'L1', 2026));

    expect(first).toBe('400.12.2.1/1/2026');
    expect(second).toBe('400.12.2.1/2/2026');
  });

  it('uses the configured prefix map for each letter type', async () => {
    const number = await testPrisma.$transaction((tx) => assignLetterNumber(tx, 'L5', 2026));
    expect(number).toBe('400.1.4.3/1/2026');
  });
});
