import type { BookLookupCandidate, BookLookupQuery, Contributor, FieldProvenance } from '@/lib/domain/types';
import { normalizeIsbn, pickIsbns } from '@/lib/books/isbn';

type OpenLibraryDocument = {
  key?: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  publish_date?: string[];
  publisher?: string[];
  isbn?: string[];
  language?: string[];
  number_of_pages_median?: number;
  cover_i?: number;
  subject?: string[];
  description?: string | { value?: string };
  edition_key?: string[];
  editions?: {
    docs?: OpenLibraryEditionDocument[];
  };
};

type OpenLibraryEditionDocument = {
  key?: string;
  title?: string;
  subtitle?: string;
  publisher?: string[];
  publish_date?: string[];
  isbn?: string[];
  language?: string[];
  number_of_pages?: number;
  cover_i?: number;
};

type OpenLibrarySearchResponse = { docs?: OpenLibraryDocument[]; numFound?: number };
type OpenLibraryWorkResponse = { description?: string | { value?: string }; subjects?: string[] };

const SEARCH_FIELDS = [
  'key',
  'title',
  'subtitle',
  'author_name',
  'author_key',
  'first_publish_year',
  'publish_date',
  'publisher',
  'isbn',
  'language',
  'number_of_pages_median',
  'cover_i',
  'subject',
  'edition_key',
].join(',');

const BATCH_SEARCH_FIELDS = [
  'key',
  'title',
  'subtitle',
  'author_name',
  'first_publish_year',
  'number_of_pages_median',
  'cover_i',
  'subject',
  'description',
  'editions',
].join(',');

const OPEN_LIBRARY_USER_AGENT = 'MyBookNook/0.7 (+https://github.com/Neurotoxin53/Book-Nook)';

const provenance = (sourceId: string): FieldProvenance => ({
  source: 'open-library',
  sourceId,
  importedAt: new Date().toISOString(),
});

function choosePublicationDate(values: string[] = [], firstYear?: number) {
  const sorted = values.filter(Boolean).sort((left, right) => right.length - left.length);
  return sorted[0] ?? (firstYear ? String(firstYear) : undefined);
}

function descriptionText(value?: string | { value?: string }) {
  return (typeof value === 'string' ? value : value?.value)?.trim() || undefined;
}

function toCandidate(document: OpenLibraryDocument): BookLookupCandidate | null {
  if (!document.key || !document.title) return null;
  const { isbn10, isbn13 } = pickIsbns(document.isbn ?? []);
  const contributors: Contributor[] = (document.author_name ?? []).map((name) => ({ name, role: 'author' }));
  const sourceIds: Record<string, string> = { work: document.key };
  if (document.edition_key?.[0]) sourceIds.edition = document.edition_key[0];

  return {
    candidateId: `${document.key}:${document.edition_key?.[0] ?? isbn13 ?? 'work'}`,
    title: document.title,
    subtitle: document.subtitle,
    contributors,
    isbn10,
    isbn13,
    publisher: document.publisher?.[0],
    publishedDate: choosePublicationDate(document.publish_date, document.first_publish_year),
    firstPublishedDate: document.first_publish_year ? String(document.first_publish_year) : undefined,
    language: document.language?.[0],
    pageCount: document.number_of_pages_median,
    coverUrl: document.cover_i ? `https://covers.openlibrary.org/b/id/${document.cover_i}-L.jpg` : undefined,
    synopsis: descriptionText(document.description),
    subjects: (document.subject ?? []).slice(0, 40),
    source: 'open-library',
    sourceIds,
    provenance: Object.fromEntries(
      ['title', 'subtitle', 'contributors', 'isbn10', 'isbn13', 'publisher', 'publishedDate', 'firstPublishedDate', 'language', 'pageCount', 'coverUrl', 'subjects']
        .map((field) => [field, provenance(document.key as string)]),
    ),
  };
}

function toIsbnCandidate(document: OpenLibraryDocument, isbn: string): BookLookupCandidate | null {
  const edition = document.editions?.docs?.find((item) => item.isbn?.some((value) => normalizeIsbn(value) === isbn));
  if (!edition) return null;
  const editionKey = edition.key?.replace(/^\/books\//, '');
  return toCandidate({
    ...document,
    title: edition.title || document.title,
    subtitle: edition.subtitle || document.subtitle,
    publisher: edition.publisher,
    publish_date: edition.publish_date,
    isbn: edition.isbn,
    language: edition.language,
    number_of_pages_median: edition.number_of_pages ?? document.number_of_pages_median,
    cover_i: edition.cover_i ?? document.cover_i,
    edition_key: editionKey ? [editionKey] : undefined,
  });
}

function buildSearchUrl(query: BookLookupQuery) {
  const params = new URLSearchParams({ fields: SEARCH_FIELDS, limit: '12' });
  const isbn = normalizeIsbn(query.isbn);
  if (isbn) {
    params.set('q', `isbn:${isbn}`);
  } else if (query.title?.trim() && query.author?.trim()) {
    params.set('title', query.title.trim());
    params.set('author', query.author.trim());
  } else if (query.title?.trim()) {
    params.set('title', query.title.trim());
  } else {
    throw new Error('Enter an ISBN or a title.');
  }
  return `https://openlibrary.org/search.json?${params}`;
}

export async function searchOpenLibrary(
  query: BookLookupQuery,
  options: { signal?: AbortSignal; contact?: string } = {},
): Promise<BookLookupCandidate[]> {
  const response = await fetch(buildSearchUrl(query), {
    headers: {
      Accept: 'application/json',
      'User-Agent': options.contact ? `MyBookNook/0.7 (${options.contact})` : OPEN_LIBRARY_USER_AGENT,
    },
    signal: options.signal,
  });
  if (response.status === 429) throw new Error('Open Library is busy. Try again in a moment.');
  if (!response.ok) throw new Error(`Open Library lookup failed (${response.status}).`);
  const payload = await response.json() as OpenLibrarySearchResponse;
  return (payload.docs ?? []).flatMap((document) => toCandidate(document) ?? []);
}

export async function searchOpenLibraryByIsbns(
  values: string[],
  options: { signal?: AbortSignal; contact?: string } = {},
): Promise<Map<string, BookLookupCandidate>> {
  const isbns = [...new Set(values.map((value) => normalizeIsbn(value)).filter((value): value is string => Boolean(value)))].slice(0, 30);
  if (!isbns.length) return new Map();
  const params = new URLSearchParams({
    q: `isbn:(${isbns.join(' OR ')})`,
    fields: BATCH_SEARCH_FIELDS,
    limit: String(Math.min(100, isbns.length * 2)),
  });
  const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': options.contact ? `MyBookNook/0.7 (${options.contact})` : OPEN_LIBRARY_USER_AGENT,
    },
    signal: options.signal,
  });
  if (response.status === 429) throw new Error('Open Library is busy. Try refreshing book details again in a moment.');
  if (!response.ok) throw new Error(`Open Library metadata lookup failed (${response.status}).`);
  const payload = await response.json() as OpenLibrarySearchResponse;
  const candidates = new Map<string, BookLookupCandidate>();
  for (const isbn of isbns) {
    for (const document of payload.docs ?? []) {
      const candidate = toIsbnCandidate(document, isbn);
      if (candidate) {
        candidates.set(isbn, candidate);
        break;
      }
    }
  }
  return candidates;
}

export async function enrichOpenLibraryCandidate(
  candidate: BookLookupCandidate,
  options: { signal?: AbortSignal; contact?: string } = {},
): Promise<BookLookupCandidate> {
  const workKey = candidate.sourceIds.work;
  if (!workKey?.startsWith('/works/')) return candidate;
  const response = await fetch(`https://openlibrary.org${workKey}.json`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': options.contact ? `MyBookNook/0.7 (${options.contact})` : OPEN_LIBRARY_USER_AGENT,
    },
    signal: options.signal,
  });
  if (!response.ok) return candidate;
  const work = await response.json() as OpenLibraryWorkResponse;
  const synopsis = typeof work.description === 'string' ? work.description : work.description?.value;
  return {
    ...candidate,
    synopsis: synopsis?.trim() || candidate.synopsis,
    subjects: [...new Set([...(candidate.subjects ?? []), ...(work.subjects ?? [])])].slice(0, 60),
    provenance: {
      ...candidate.provenance,
      ...(synopsis ? { synopsis: provenance(workKey) } : {}),
    },
  };
}

export async function getOpenLibraryWorkDetails(
  workKey: string,
  options: { signal?: AbortSignal; contact?: string } = {},
) {
  if (!/^\/works\/OL\d+W$/.test(workKey)) throw new Error('Open Library work key is invalid.');
  const response = await fetch(`https://openlibrary.org${workKey}.json`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': options.contact ? `MyBookNook/0.7 (${options.contact})` : OPEN_LIBRARY_USER_AGENT,
    },
    signal: options.signal,
  });
  if (response.status === 429) throw new Error('Open Library is busy. Try again in a moment.');
  if (!response.ok) throw new Error(`Open Library detail lookup failed (${response.status}).`);
  const work = await response.json() as OpenLibraryWorkResponse;
  return {
    synopsis: (typeof work.description === 'string' ? work.description : work.description?.value)?.trim() || '',
    subjects: (work.subjects ?? []).slice(0, 60),
  };
}
