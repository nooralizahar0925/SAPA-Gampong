import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { env } from '../config/env';

export const androidApkPath = resolve(
  process.cwd(),
  env.ANDROID_APK_PATH ?? `storage/${env.NODE_ENV}/releases/android/latest.apk`,
);

export const androidApkMetadataPath = resolve(
  process.cwd(),
  env.ANDROID_APK_METADATA_PATH ?? resolve(dirname(androidApkPath), 'metadata.json'),
);

type ApkReleaseMetadata = {
  version_name: string | null;
  release_date: string;
  file_size: string;
  sha256: string;
};

let cached:
  | { size: number; modifiedMs: number; metadataModifiedMs: number | null; value: ApkReleaseMetadata }
  | undefined;

export async function getDirectApkReleaseMetadata(): Promise<ApkReleaseMetadata | null> {
  let apkStat;
  try {
    apkStat = await stat(androidApkPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  let versionName: string | null = null;
  let metadataModifiedMs: number | null = null;
  try {
    const metadataStat = await stat(androidApkMetadataPath);
    metadataModifiedMs = metadataStat.mtimeMs;
    const metadata = JSON.parse(await readFile(androidApkMetadataPath, 'utf8')) as {
      version_name?: unknown;
    };
    if (typeof metadata.version_name === 'string' && metadata.version_name.trim()) {
      versionName = metadata.version_name.trim();
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) {
      throw error;
    }
  }

  if (
    cached &&
    cached.size === apkStat.size &&
    cached.modifiedMs === apkStat.mtimeMs &&
    cached.metadataModifiedMs === metadataModifiedMs
  ) {
    return cached.value;
  }

  const value: ApkReleaseMetadata = {
    version_name: versionName,
    release_date: apkStat.mtime.toISOString().slice(0, 10),
    file_size: `${(apkStat.size / 1_000_000).toFixed(1)} MB`,
    sha256: await sha256File(androidApkPath),
  };
  cached = { size: apkStat.size, modifiedMs: apkStat.mtimeMs, metadataModifiedMs, value };
  return value;
}

async function sha256File(path: string) {
  return new Promise<string>((resolveHash, rejectHash) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', rejectHash);
    stream.on('end', () => resolveHash(hash.digest('hex')));
  });
}
