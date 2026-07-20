import { Prisma, type LetterType } from '@prisma/client';

const PREFIX_BY_TYPE: Record<LetterType, string> = {
  L1: '400.12.2.1',
  L2: '400.10.4.4',
  L3: '400.10.2.2',
  L4: '400.10.4.4',
  L5: '400.1.4.3',
  L6: '400.12.2.1',
  L7: '400.12.2.1',
  L8: '400.10.2.2',
  L9: '400.12.2.1',
  L10: '400.10.2.2',
};

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

  return `${PREFIX_BY_TYPE[letterType]}/${updated.lastNumber}/${year}`;
}
