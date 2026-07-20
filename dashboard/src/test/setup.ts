import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { clearStoredSession } from '../auth/session';
import { server } from './server';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  clearStoredSession();
});
afterAll(() => server.close());
