import type { CreateBookInput } from '@/lib/books/repository';

const LEGACY_KEY = 'book-nook-library';
const MIGRATION_RECEIPT_KEY = 'my-book-nook.local-migration-receipt';

const DEMO_IDS = new Set([
  'pride-and-prejudice',
  'nineteen-eighty-four',
  'to-kill-a-mockingbird',
  'moby-dick',
  'frankenstein',
  'jane-eyre',
]);

type LegacyBook = {
  id?: string;
  title?: string;
  author?: string;
  year?: number;
  readDate?: string;
  cover?: string;
  synopsis?: string;
  rating?: number;
  review?: string;
  status?: 'read' | 'reading' | 'want';
  favorite?: boolean;
  scene?: string;
  bookStyle?: string;
  paper?: string;
  decorations?: string[];
};

export function readLegacyBooks(): Array<CreateBookInput & { legacyId: string }> {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(LEGACY_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as LegacyBook[];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((book) => {
      const legacyId = book.id?.trim();
      if (!legacyId || DEMO_IDS.has(legacyId) || !book.title?.trim()) return [];
      return [{
        legacyId,
        title: book.title,
        author: book.author || 'Unknown author',
        publishedDate: book.year ? String(book.year) : undefined,
        finishedAt: book.readDate || undefined,
        coverUrl: book.cover || undefined,
        synopsis: book.synopsis || '',
        rating: book.rating ?? 0,
        review: book.review || '',
        status: book.status === 'want' ? 'want-to-read' : book.status ?? 'read',
        favorite: Boolean(book.favorite),
        source: 'migration',
        sourceRecordId: legacyId,
        appearance: {
          sceneId: legacyScene(book.scene),
          constructionId: legacyConstruction(book.bookStyle),
          pageId: legacyPage(book.paper),
          decorations: (book.decorations ?? []).map(legacyDecoration),
        },
      } satisfies CreateBookInput & { legacyId: string }];
    });
  } catch {
    return [];
  }
}

function legacyScene(value?: string) {
  return ({ autumn: 'autumn-study', gothic: 'gothic-archive', coastal: 'coastal-paperback', botanical: 'botanical-journal', minimal: 'minimal-linen' } as Record<string, string>)[value ?? ''] ?? 'autumn-study';
}

function legacyConstruction(value?: string) {
  return ({ deckle: 'deckle-hardcover', tome: 'antique-tome', linen: 'linen-hardcover', paperback: 'paperback' } as Record<string, string>)[value ?? ''] ?? 'deckle-hardcover';
}

function legacyPage(value?: string) {
  return ({ parchment: 'parchment', ivory: 'ivory', rose: 'ivory', sage: 'ivory' } as Record<string, string>)[value ?? ''] ?? 'parchment';
}

function legacyDecoration(value: string) {
  return ({ flower: 'pressed-flower', note: 'handwritten-note', moon: 'moon-stamp' } as Record<string, string>)[value] ?? value;
}

export async function makeLocalMigrationPayload() {
  const books = readLegacyBooks();
  if (!books.length) return null;
  const canonical = JSON.stringify(books);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical)));
  const payloadHash = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  let deviceFingerprint = window.localStorage.getItem('my-book-nook.device-id');
  if (!deviceFingerprint) {
    deviceFingerprint = crypto.randomUUID();
    window.localStorage.setItem('my-book-nook.device-id', deviceFingerprint);
  }
  return { books, payloadHash, deviceFingerprint };
}

export function markLocalMigrationConfirmed(receipt: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MIGRATION_RECEIPT_KEY, JSON.stringify(receipt));
  // The legacy library intentionally remains untouched until the reader chooses
  // to remove it in a future cleanup flow.
}

