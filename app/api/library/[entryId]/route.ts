import { noStoreJson, readJson } from '@/lib/api/request';
import { authErrorResponse } from '@/lib/auth/runtime';
import { requireSession } from '@/lib/auth/sessions';
import { deleteLibraryRecord, getLibraryRecord, updateLibraryRecord, type UpdateBookInput } from '@/lib/books/repository';

type RouteContext = { params: Promise<{ entryId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { entryId } = await context.params;
    const book = await getLibraryRecord(session.userId, entryId);
    return book
      ? noStoreJson({ book })
      : noStoreJson({ error: 'Book not found.', code: 'BOOK_NOT_FOUND' }, { status: 404 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { entryId } = await context.params;
    const input = await readJson<UpdateBookInput>(request, 250_000);
    const book = await updateLibraryRecord(session.userId, entryId, input);
    return book
      ? noStoreJson({ book })
      : noStoreJson({ error: 'Book not found.', code: 'BOOK_NOT_FOUND' }, { status: 404 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { entryId } = await context.params;
    const deleted = await deleteLibraryRecord(session.userId, entryId);
    return deleted
      ? noStoreJson({ deleted: true })
      : noStoreJson({ error: 'Book not found.', code: 'BOOK_NOT_FOUND' }, { status: 404 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

