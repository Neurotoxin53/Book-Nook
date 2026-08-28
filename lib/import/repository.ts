import { withDatabase } from '@/db/client';
import { createLibraryRecord } from '@/lib/books/repository';
import type { GoodreadsNormalizedRow, ImportSummary, ReadingStatus } from '@/lib/domain/types';
import { AuthError } from '@/lib/auth/runtime';

type ExistingImportMatch = {
  entry_id: string;
  rating: number;
  body: string;
  user_edited_at: string | null;
  finished_at: string | null;
  source: string;
};

const timestamp = () => new Date().toISOString();

function readingStatus(row: GoodreadsNormalizedRow): ReadingStatus {
  const shelf = row.exclusiveShelf?.toLowerCase();
  if (shelf === 'read') return 'read';
  if (shelf === 'currently-reading') return 'reading';
  return 'want-to-read';
}

async function findExisting(database: D1Database, userId: string, row: GoodreadsNormalizedRow) {
  if (row.isbn13 || row.isbn10) {
    const byIsbn = await database.prepare(
      `SELECT l.id AS entry_id, r.rating, r.body, r.user_edited_at, l.finished_at, l.source
       FROM library_entry l JOIN book_edition e ON e.id = l.edition_id JOIN review r ON r.library_entry_id = l.id
       WHERE l.user_id = ? AND l.deleted_at IS NULL
         AND ((? IS NOT NULL AND e.isbn13 = ?) OR (? IS NOT NULL AND e.isbn10 = ?))
       LIMIT 1`,
    ).bind(userId, row.isbn13 ?? null, row.isbn13 ?? null, row.isbn10 ?? null, row.isbn10 ?? null).first<ExistingImportMatch>();
    if (byIsbn) return byIsbn;
  }
  if (row.sourceId) {
    const bySourceId = await database.prepare(
      `SELECT l.id AS entry_id, r.rating, r.body, r.user_edited_at, l.finished_at, l.source
       FROM library_entry l JOIN review r ON r.library_entry_id = l.id
       WHERE l.user_id = ? AND l.source = 'goodreads' AND l.source_record_id = ? AND l.deleted_at IS NULL LIMIT 1`,
    ).bind(userId, row.sourceId).first<ExistingImportMatch>();
    if (bySourceId) return bySourceId;
  }
  const byFingerprint = await database.prepare(
    `SELECT l.id AS entry_id, r.rating, r.body, r.user_edited_at, l.finished_at, l.source
     FROM import_row ir
     JOIN import_job j ON j.id = ir.import_job_id
     JOIN library_entry l ON l.id = ir.library_entry_id
     JOIN review r ON r.library_entry_id = l.id
     WHERE j.user_id = ? AND ir.fingerprint = ? AND ir.status = 'imported' AND l.deleted_at IS NULL
     ORDER BY ir.created_at DESC LIMIT 1`,
  ).bind(userId, row.fingerprint).first<ExistingImportMatch>();
  if (byFingerprint) return byFingerprint;

  if (row.confirmedTitleAuthor) {
    return database.prepare(
      `SELECT l.id AS entry_id, r.rating, r.body, r.user_edited_at, l.finished_at, l.source
       FROM library_entry l
       JOIN book_edition e ON e.id = l.edition_id
       JOIN book_work w ON w.id = e.work_id
       JOIN review r ON r.library_entry_id = l.id
       WHERE l.user_id = ? AND l.deleted_at IS NULL
         AND lower(w.title) = lower(?)
         AND lower(COALESCE(json_extract(e.contributors_json, '$[0].name'), '')) = lower(?)
       LIMIT 1`,
    ).bind(userId, row.title, row.author).first<ExistingImportMatch>();
  }
  return null;
}

function importRowStatement(
  database: D1Database,
  jobId: string,
  row: GoodreadsNormalizedRow,
  status: string,
  entryId?: string,
  conflict?: unknown,
) {
  return database.prepare(
    `INSERT INTO import_row
      (id, import_job_id, row_number, fingerprint, source_record_id, normalized_json, status, library_entry_id, conflict_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    jobId,
    row.rowNumber,
    row.fingerprint,
    row.sourceId ?? null,
    JSON.stringify(row),
    status,
    entryId ?? null,
    conflict ? JSON.stringify(conflict) : null,
    timestamp(),
  );
}

export async function startImportJob(userId: string, totalRows: number) {
  const jobId = crypto.randomUUID();
  await withDatabase((database) => database.prepare(
    `INSERT INTO import_job (id, user_id, source, status, total_rows, created_at)
     VALUES (?, ?, 'goodreads', 'processing', ?, ?)`,
  ).bind(jobId, userId, totalRows, timestamp()).run().then(() => undefined));
  return jobId;
}

export async function importGoodreadsChunk(
  userId: string,
  jobId: string,
  rows: GoodreadsNormalizedRow[],
  finalize: boolean,
): Promise<ImportSummary> {
  if (rows.length > 100) throw new AuthError('Import chunks are limited to 100 rows.', 400, 'IMPORT_CHUNK_TOO_LARGE');
  const job = await withDatabase((database) => database.prepare(
    `SELECT id, status, undone_at FROM import_job WHERE id = ? AND user_id = ?`,
  ).bind(jobId, userId).first<{ id: string; status: string; undone_at: string | null }>());
  if (!job || job.undone_at) throw new AuthError('Import job not found.', 404, 'IMPORT_NOT_FOUND');

  for (const row of rows) {
    await withDatabase(async (database) => {
      const duplicate = await database.prepare(
        'SELECT id FROM import_row WHERE import_job_id = ? AND row_number = ?',
      ).bind(jobId, row.rowNumber).first();
      if (duplicate) return;

      if (row.status !== 'ready') {
        await database.batch([
          importRowStatement(database, jobId, row, row.status),
          database.prepare('UPDATE import_job SET skipped_rows = skipped_rows + 1 WHERE id = ?').bind(jobId),
        ]);
        return;
      }

      const existing = await findExisting(database, userId, row);
      if (existing) {
        const unchanged = existing.rating === (row.rating ?? 0)
          && existing.body === row.review
          && (existing.finished_at ?? '') === (row.dateRead ?? '');
        if (unchanged) {
          await database.batch([
            importRowStatement(database, jobId, row, 'unchanged', existing.entry_id),
            database.prepare('UPDATE import_job SET skipped_rows = skipped_rows + 1 WHERE id = ?').bind(jobId),
          ]);
        } else {
          await database.batch([
            importRowStatement(database, jobId, row, 'conflict', existing.entry_id, {
              reason: existing.user_edited_at ? 'user-edit-protected' : 'existing-record-differs',
              imported: { rating: row.rating ?? 0, review: row.review, finishedAt: row.dateRead },
            }),
            database.prepare('UPDATE import_job SET conflict_rows = conflict_rows + 1 WHERE id = ?').bind(jobId),
          ]);
        }
        return;
      }

      const created = await createLibraryRecord(userId, {
        title: row.title,
        contributors: [
          { name: row.author, role: 'author' },
          ...row.additionalAuthors.map((name) => ({ name, role: 'author' as const })),
        ],
        isbn10: row.isbn10,
        isbn13: row.isbn13,
        status: readingStatus(row),
        finishedAt: row.dateRead,
        shelves: row.shelves,
        rating: row.rating,
        review: row.review,
        source: 'goodreads',
        sourceRecordId: row.sourceId,
      });
      await database.batch([
        importRowStatement(database, jobId, row, 'imported', created.entry.id),
        database.prepare('UPDATE import_job SET imported_rows = imported_rows + 1 WHERE id = ?').bind(jobId),
      ]);
    });
  }

  if (finalize) {
    await withDatabase((database) => database.prepare(
      `UPDATE import_job SET status = 'complete', completed_at = ? WHERE id = ? AND user_id = ?`,
    ).bind(timestamp(), jobId, userId).run().then(() => undefined));
  }
  return getImportSummary(userId, jobId);
}

export async function getImportSummary(userId: string, jobId: string): Promise<ImportSummary> {
  return withDatabase(async (database) => {
    const job = await database.prepare(
      `SELECT id, imported_rows, skipped_rows, conflict_rows FROM import_job WHERE id = ? AND user_id = ?`,
    ).bind(jobId, userId).first<{
      id: string; imported_rows: number; skipped_rows: number; conflict_rows: number;
    }>();
    if (!job) throw new AuthError('Import job not found.', 404, 'IMPORT_NOT_FOUND');
    const groups = await database.prepare(
      `SELECT status, COUNT(*) AS count FROM import_row WHERE import_job_id = ? GROUP BY status`,
    ).bind(jobId).all<{ status: string; count: number }>();
    const counts = Object.fromEntries(groups.results.map((group) => [group.status, group.count]));
    return {
      jobId,
      ready: counts.ready ?? counts.imported ?? 0,
      needsReview: counts['needs-review'] ?? 0,
      skipped: job.skipped_rows,
      imported: job.imported_rows,
      unchanged: counts.unchanged ?? 0,
      conflicts: job.conflict_rows,
    };
  });
}

export async function undoImport(userId: string, jobId: string) {
  return withDatabase(async (database) => {
    const job = await database.prepare(
      'SELECT id, undone_at FROM import_job WHERE id = ? AND user_id = ?',
    ).bind(jobId, userId).first<{ id: string; undone_at: string | null }>();
    if (!job) throw new AuthError('Import job not found.', 404, 'IMPORT_NOT_FOUND');
    if (job.undone_at) return { undone: true, alreadyUndone: true };
    const imported = await database.prepare(
      `SELECT library_entry_id FROM import_row
       WHERE import_job_id = ? AND status = 'imported' AND library_entry_id IS NOT NULL`,
    ).bind(jobId).all<{ library_entry_id: string }>();
    const undoneAt = timestamp();
    const statements = imported.results.map(({ library_entry_id }) => database.prepare(
      `UPDATE library_entry SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    ).bind(undoneAt, undoneAt, library_entry_id, userId));
    statements.push(database.prepare(
      `UPDATE import_job SET status = 'undone', undone_at = ? WHERE id = ? AND user_id = ?`,
    ).bind(undoneAt, jobId, userId));
    await database.batch(statements);
    return { undone: true, removed: imported.results.length };
  });
}
