import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { clearStoredSession } from '../auth/session';
import { resetContentState, server } from './server';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  resetContentState();
  clearStoredSession();
});
afterAll(() => server.close());
