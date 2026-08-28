import { env } from 'cloudflare:workers';
import { APP_SCHEMA_VERSION, schemaStatements } from '@/db/schema';

type RuntimeEnvironment = { DB?: D1Database };

let initialized: Promise<void> | undefined;

export function getDatabase(): D1Database {
  const database = (env as RuntimeEnvironment).DB;
  if (!database) throw new Error('The DB binding is not configured.');
  return database;
}

export function ensureDatabaseSchema(database = getDatabase()): Promise<void> {
  initialized ??= (async () => {
    await database.prepare('PRAGMA foreign_keys = ON').run();
    await database.batch(schemaStatements.map((statement) => database.prepare(statement)));
    await database.prepare(
      `INSERT OR IGNORE INTO app_schema (version, applied_at) VALUES (?, ?)`,
    ).bind(APP_SCHEMA_VERSION, new Date().toISOString()).run();
    await database.prepare('PRAGMA optimize').run();
  })().catch((error) => {
    initialized = undefined;
    throw error;
  });
  return initialized;
}

export async function withDatabase<T>(operation: (database: D1Database) => Promise<T>) {
  const database = getDatabase();
  await ensureDatabaseSchema(database);
  return operation(database);
}
