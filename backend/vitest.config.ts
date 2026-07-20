import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/helpers/global-setup.ts'],
    setupFiles: ['tests/helpers/load-test-env.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
