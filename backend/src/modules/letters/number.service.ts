import { Prisma, type LetterType } from '@prisma/client';

// Source: client-provided NOMOR SURAT (1).pdf (2026-10-09).
export const PREFIX_BY_TYPE: Record<LetterType, string> = {
  L1: '400.12.2.1',
  L2: '400.10.4.4',
  L3: '400.10.2.2',
  L4: '400.10.4.3',
  L5: '400.1.4.3',
  L6: '400.12.2.2',
  L7: '400.12.3.1',
  L8: '400.10.2.4',
  L9: '400.12.2.3',
  L10: '400.10.2.3',
};

export function formatLetterNumber(letterType: LetterType, agenda: number, year: number) {
  return `${PREFIX_BY_TYPE[letterType]}/${String(agenda).padStart(2, '0')}/${year}`;
}

export async function assignLetterNumber(
  tx: Prisma.TransactionClient,
  letterType: LetterType,
  year: number,
) {
  await tx.letterNumberCounter.upsert({
    where: { letterType_year: { letterType, year } },
    update: {},
    create: { letterType, year, lastNumber: 0 },
  });

  const updated = await tx.letterNumberCounter.update({
    where: { letterType_year: { letterType, year } },
    data: { lastNumber: { increment: 1 } },
  });

  return formatLetterNumber(letterType, updated.lastNumber, year);
}
