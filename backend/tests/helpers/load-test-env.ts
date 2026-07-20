import { config } from 'dotenv';

const result = config({ path: '.env.test', override: true });
if (result.error) {
  throw new Error(`Failed to load .env.test: ${result.error.message}`);
}
