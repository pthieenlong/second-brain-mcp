import { ConfigService } from '@nestjs/config';
import * as path from 'path';

/** Where the index lives inside the vault when DATABASE_URL isn't set. */
export const INDEX_DIR = '.second-brain';
export const INDEX_FILE = 'index.db';

/**
 * Resolves the SQLite URL. Users only have to set VAULT_PATH — the index then
 * lives alongside their notes, so moving the vault moves the index with it.
 * DATABASE_URL still wins when set, for development or a shared location.
 */
export function resolveDatabaseUrl(config: ConfigService): string {
  const explicit = config.get<string>('DATABASE_URL');
  if (explicit) return explicit;

  const vaultPath = config.get<string>('VAULT_PATH');
  if (!vaultPath) {
    throw new Error('VAULT_PATH is not defined');
  }
  return `file:${path.join(path.resolve(vaultPath), INDEX_DIR, INDEX_FILE)}`;
}

/** Filesystem path of the SQLite file, or null for non-file URLs. */
export function databaseFilePath(url: string): string | null {
  return url.startsWith('file:') ? url.slice('file:'.length) : null;
}
