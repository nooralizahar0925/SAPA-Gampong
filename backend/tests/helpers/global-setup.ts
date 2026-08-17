import { execSync } from 'node:child_process';
import { config } from 'dotenv';
import { assertTestDatabase } from './assert-test-db';

export default function setup() {
  const result = config({ path: '.env.test', override: true });
  if (result.error && !process.env.DATABASE_URL) {
    throw new Error(`Failed to load .env.test: ${result.error.message}`);
  }

  assertTestDatabase(process.env.DATABASE_URL);

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
}
