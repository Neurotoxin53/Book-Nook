import { noStoreJson, readJson } from '@/lib/api/request';
import { authErrorResponse } from '@/lib/auth/runtime';
import { requireSession } from '@/lib/auth/sessions';
import { createLibraryRecord, listLibrary, type CreateBookInput } from '@/lib/books/repository';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    return noStoreJson({ books: await listLibrary(session.userId) });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const body = await readJson<CreateBookInput>(request, 250_000);
    const book = await createLibraryRecord(session.userId, body);
    return noStoreJson({ book }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

