import { PrismaClient } from '@prisma/client';
import { assertTestDatabase } from './assert-test-db';

export const testPrisma = new PrismaClient();

export async function truncateAll() {
  assertTestDatabase(process.env.DATABASE_URL);

  const tables = await testPrisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) {
    return;
  }

  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}
