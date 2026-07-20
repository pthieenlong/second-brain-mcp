import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../../generated/prisma/client';
import { INDEX_DIR, INDEX_FILE, databaseFilePath } from './database-url';

/**
 * Applies migrations at startup. An `npx` user never runs `prisma migrate
 * deploy`, and shelling out to the Prisma CLI is not an option here: it writes
 * to stdout, which is the JSON-RPC channel under stdio transport.
 *
 * Instead the migration SQL that ships with the package is executed directly,
 * tracked in a table so each file runs once.
 */
export async function applyMigrations(): Promise<void> {
  const url = resolveUrlFromEnv();
  await ensureParentDirectory(url);

  const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS _applied_migrations (
                name TEXT PRIMARY KEY,
                applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`,
    );

    const applied = new Set(
      (
        await prisma.$queryRawUnsafe<{ name: string }[]>(
          'SELECT name FROM _applied_migrations',
        )
      ).map((row) => row.name),
    );

    const names = await migrationNames();

    // A database created by `prisma migrate dev` already has the schema but
    // none of our bookkeeping. Adopt it instead of replaying the baseline
    // migration onto tables that exist (which fails on CREATE TABLE).
    if (applied.size === 0 && (await hasSchema(prisma)) && names.length) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO _applied_migrations (name) VALUES (?)',
        names[0],
      );
      applied.add(names[0]);
    }

    for (const name of names) {
      if (applied.has(name)) continue;

      const sql = await fs.readFile(
        path.join(migrationsDir(), name, 'migration.sql'),
        'utf-8',
      );
      // One transaction per migration: a failure half-way through would
      // otherwise leave tables created but the migration unrecorded, so
      // the next start would retry it and die on "table already exists".
      // Driven with raw SQL rather than $transaction([...]) — the array
      // form starts every promise as it is built, running each statement
      // once before the transaction even begins.
      await prisma.$executeRawUnsafe('BEGIN');
      try {
        for (const statement of splitStatements(sql)) {
          await prisma.$executeRawUnsafe(statement);
        }
        await prisma.$executeRawUnsafe(
          'INSERT INTO _applied_migrations (name) VALUES (?)',
          name,
        );
        await prisma.$executeRawUnsafe('COMMIT');
      } catch (error) {
        await prisma.$executeRawUnsafe('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

/** True when the Note table is already present from an earlier Prisma run. */
async function hasSchema(prisma: PrismaClient): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Note'",
  );
  return rows.length > 0;
}

/**
 * Mirrors resolveDatabaseUrl() but reads process.env directly — migrations run
 * before the Nest container (and ConfigService) exists.
 */
function resolveUrlFromEnv(): string {
  const explicit = process.env.DATABASE_URL;
  if (explicit) return explicit;

  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) {
    throw new Error(
      'VAULT_PATH is not set. Point it at the folder where your notes should live.',
    );
  }
  return `file:${path.join(path.resolve(vaultPath), INDEX_DIR, INDEX_FILE)}`;
}

async function ensureParentDirectory(url: string): Promise<void> {
  const filePath = databaseFilePath(url);
  if (filePath) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }
}

function migrationsDir(): string {
  // dist/src/prisma/migrate.js -> package root -> prisma/migrations
  return path.join(__dirname, '..', '..', '..', 'prisma', 'migrations');
}

async function migrationNames(): Promise<string[]> {
  const entries = await fs.readdir(migrationsDir(), { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Prisma migration files hold several statements; libsql executes one at a time. */
function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter(
      (s) => s && !s.split('\n').every((line) => line.trim().startsWith('--')),
    );
}
