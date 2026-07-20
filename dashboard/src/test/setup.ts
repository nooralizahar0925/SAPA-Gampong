import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { clearStoredSession } from '../auth/session';
import { resetContentState, server } from './server';

/**
 * jsdom does not implement <dialog>. The Modal component relies on the browser for
 * modal semantics, so stub just enough for it to open and close under test.
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  resetContentState();
  clearStoredSession();
});
afterAll(() => server.close());
