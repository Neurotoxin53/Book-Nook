import { noStoreJson, readJson } from '@/lib/api/request';
import { authErrorResponse, AuthError } from '@/lib/auth/runtime';
import { requireSession } from '@/lib/auth/sessions';
import { enrichLibraryRecord, listLibraryEnrichmentTargets } from '@/lib/books/repository';
import { searchOpenLibraryByIsbns } from '@/lib/books/open-library';

const BATCH_SIZE = 30;

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const body = await readJson<{ cursor?: string }>(request, 2_000);
    const cursor = typeof body.cursor === 'string' ? body.cursor.slice(0, 100) : '';
    const targets = await listLibraryEnrichmentTargets(session.userId, cursor, BATCH_SIZE);
    if (!targets.length) {
      return noStoreJson({ processed: 0, matched: 0, updated: 0, nextCursor: null });
    }

    let candidates;
    try {
      candidates = await searchOpenLibraryByIsbns(targets.map((target) => target.isbn), { signal: AbortSignal.timeout(12_000) });
    } catch (error) {
      throw new AuthError(
        error instanceof Error ? error.message : 'Book metadata lookup failed.',
        502,
        'BOOK_METADATA_PROVIDER_ERROR',
      );
    }

    let matched = 0;
    let updated = 0;
    for (const target of targets) {
      const candidate = candidates.get(target.isbn);
      if (!candidate) continue;
      matched += 1;
      if (await enrichLibraryRecord(session.userId, target.entryId, candidate)) updated += 1;
    }

    return noStoreJson({
      processed: targets.length,
      matched,
      updated,
      nextCursor: targets.length === BATCH_SIZE ? targets.at(-1)?.entryId ?? null : null,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
