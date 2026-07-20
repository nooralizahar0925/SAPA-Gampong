/**
 * Guards against running destructive test setup (migrations, TRUNCATE) against a
 * non-test database. Parses the database name out of DATABASE_URL (a
 * postgresql://user:pass@host:port/dbname?schema=public URL) and requires it to
 * end in "_test". This deliberately does NOT substring-match the raw URL, since
 * that would wrongly accept a password or hostname that happens to contain "test".
 */
export function assertTestDatabase(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Refusing to run destructive test setup. ' +
        'Ensure tests/helpers/load-test-env.ts (or global-setup.ts) has loaded .env.test before this runs.',
    );
  }

  let dbName: string;
  try {
    const parsed = new URL(databaseUrl);
    dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  } catch (err) {
    throw new Error(
      `DATABASE_URL is not a valid URL, so its database name could not be determined: ${databaseUrl}`,
    );
  }

  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run destructive test setup: DATABASE_URL points at database "${dbName}", ` +
        'which does not end in "_test". This looks like it may be a development or production ' +
        'database. Fix: point DATABASE_URL (via .env.test) at a database whose name ends in "_test", ' +
        'e.g. "sapa_test".',
    );
  }
}
