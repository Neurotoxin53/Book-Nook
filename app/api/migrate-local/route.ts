import type { CreateBookInput } from '@/lib/books/repository';
import { noStoreJson, readJson } from '@/lib/api/request';
import { authErrorResponse } from '@/lib/auth/runtime';
import { requireSession } from '@/lib/auth/sessions';
import { migrateLocalLibrary } from '@/lib/migration/repository';

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const body = await readJson<{
      deviceFingerprint: string;
      payloadHash: string;
      books: Array<CreateBookInput & { legacyId?: string }>;
    }>(request, 4_000_000);
    return noStoreJson(await migrateLocalLibrary(session.userId, body));
  } catch (error) {
    return authErrorResponse(error);
  }
}

