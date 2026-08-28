import { withDatabase } from '@/db/client';
import { createLibraryRecord, type CreateBookInput } from '@/lib/books/repository';
import { AuthError } from '@/lib/auth/runtime';

export async function migrateLocalLibrary(
  userId: string,
  input: { deviceFingerprint: string; payloadHash: string; books: Array<CreateBookInput & { legacyId?: string }> },
) {
  if (!/^[a-f0-9]{64}$/.test(input.payloadHash)) throw new AuthError('Migration payload hash is invalid.', 400, 'MIGRATION_HASH_INVALID');
  if (!input.deviceFingerprint || input.deviceFingerprint.length > 100) throw new AuthError('Migration device identifier is invalid.', 400, 'MIGRATION_DEVICE_INVALID');
  if (input.books.length > 2_000) throw new AuthError('Local migration is limited to 2,000 books.', 400, 'MIGRATION_TOO_LARGE');
  const existingReceipt = await withDatabase((database) => database.prepare(
    `SELECT id, imported_count, confirmed_at FROM local_migration
     WHERE user_id = ? AND device_fingerprint = ? AND payload_hash = ?`,
  ).bind(userId, input.deviceFingerprint, input.payloadHash).first<{
    id: string; imported_count: number; confirmed_at: string;
  }>());
  if (existingReceipt) return { migrationId: existingReceipt.id, imported: existingReceipt.imported_count, confirmedAt: existingReceipt.confirmed_at, alreadyMigrated: true };

  let imported = 0;
  for (const book of input.books) {
    const sourceRecordId = book.legacyId || book.sourceRecordId;
    if (!sourceRecordId) continue;
    const exists = await withDatabase((database) => database.prepare(
      `SELECT id FROM library_entry
       WHERE user_id = ? AND source = 'migration' AND source_record_id = ? AND deleted_at IS NULL`,
    ).bind(userId, sourceRecordId).first());
    if (exists) continue;
    await createLibraryRecord(userId, { ...book, source: 'migration', sourceRecordId });
    imported += 1;
  }

  const migrationId = crypto.randomUUID();
  const confirmedAt = new Date().toISOString();
  await withDatabase((database) => database.prepare(
    `INSERT INTO local_migration (id, user_id, device_fingerprint, payload_hash, imported_count, confirmed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(migrationId, userId, input.deviceFingerprint, input.payloadHash, imported, confirmedAt).run().then(() => undefined));
  return { migrationId, imported, confirmedAt, alreadyMigrated: false };
}

