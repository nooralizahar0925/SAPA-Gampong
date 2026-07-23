import type { AdminUser } from '../api/client';

const STORAGE_KEY = 'gampong-blang-digital-dashboard-session';
const memoryStorage = new Map<string, string>();

export type StoredSession = {
  token: string;
  user: AdminUser;
};

export function getStoredSession(): StoredSession | null {
  const raw = getSafeStorage().getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    getSafeStorage().removeItem(STORAGE_KEY);
    return null;
  }
}

export function setStoredSession(session: StoredSession) {
  getSafeStorage().setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  getSafeStorage().removeItem(STORAGE_KEY);
}

export function isAuthenticated() {
  return Boolean(getStoredSession()?.token);
}

export function isSystemAdmin() {
  return getStoredSession()?.user.role === 'admin';
}

type SafeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'>;

function getSafeStorage(): SafeStorage {
  try {
    const storage = window.localStorage;
    if (
      storage &&
      typeof storage.getItem === 'function' &&
      typeof storage.setItem === 'function' &&
      typeof storage.removeItem === 'function'
    ) {
      return storage;
    }
  } catch {
    // Fall back to in-memory storage for tests/environments where localStorage
    // is unavailable or partially stubbed.
  }

  return {
    getItem(key) {
      return memoryStorage.get(key) ?? null;
    },
    setItem(key, value) {
      memoryStorage.set(key, value);
    },
    removeItem(key) {
      memoryStorage.delete(key);
    },
    clear() {
      memoryStorage.clear();
    },
  };
}
