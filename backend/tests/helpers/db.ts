import { PrismaClient } from '@prisma/client';

export const testPrisma = new PrismaClient();

const TABLES = [
  'RequestAttachment',
  'FeedbackAttachment',
  'LetterRequest',
  'Feedback',
  'BannerSlide',
  'Official',
  'VillageStrength',
  'Mosque',
  'DemographicStatBlock',
  'VillageProfile',
  'VisionMission',
  'PrayerConfig',
  'LetterNumberCounter',
  'AdminUser',
  'File',
];

export async function truncateAll() {
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}
