import { noStoreJson } from '@/lib/api/request';
import { authErrorResponse, AuthError } from '@/lib/auth/runtime';
import { requireSession } from '@/lib/auth/sessions';
import { getOpenLibraryWorkDetails, searchOpenLibrary } from '@/lib/books/open-library';

export async function GET(request: Request) {
  try {
    await requireSession(request);
    const url = new URL(request.url);
    const workKey = url.searchParams.get('workKey');
    if (workKey) return noStoreJson(await getOpenLibraryWorkDetails(workKey));

    const isbn = url.searchParams.get('isbn')?.slice(0, 40) || undefined;
    const title = url.searchParams.get('title')?.slice(0, 300) || undefined;
    const author = url.searchParams.get('author')?.slice(0, 200) || undefined;
    if (!isbn && !title) throw new AuthError('Enter an ISBN or title.', 400, 'LOOKUP_QUERY_REQUIRED');
    let candidates = await searchOpenLibrary({ isbn, title, author });
    let strategy = isbn ? 'isbn' : author ? 'title-author' : 'title';
    if (!candidates.length && title && author) {
      candidates = await searchOpenLibrary({ title });
      strategy = 'title-fallback';
    }
    return noStoreJson({ candidates, strategy, manualAllowed: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

