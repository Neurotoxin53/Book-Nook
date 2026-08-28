import type { GoodreadsNormalizedRow, MatchStatus } from '@/lib/domain/types';
import { normalizeIsbn } from '@/lib/books/isbn';

export type CsvRecord = Record<string, string>;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('The CSV ends inside a quoted field.');
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows.filter((values) => values.some((value) => value.trim()));
}

export function rowsToRecords(rows: string[][]): CsvRecord[] {
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, '').trim());
  return rows.slice(1).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? '']),
  ));
}

function cleanGoodreadsIsbn(value: string) {
  return value.trim().replace(/^="/, '').replace(/"$/, '');
}

function parseRating(value: string): number | undefined {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined;
}

function parseDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const isoOrder = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  const usOrder = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!isoOrder && !usOrder) return trimmed;
  const year = isoOrder?.[1] ?? usOrder?.[3] ?? '';
  const month = isoOrder?.[2] ?? usOrder?.[1] ?? '';
  const day = isoOrder?.[3] ?? usOrder?.[2] ?? '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function fingerprint(parts: Array<string | undefined>) {
  const input = parts.map((part) => part?.normalize('NFKC').trim().toLowerCase() ?? '').join('\u241f');
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `gr-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizeRecord(record: CsvRecord, rowNumber: number): GoodreadsNormalizedRow {
  const title = (record.Title ?? '').trim();
  const author = (record.Author ?? '').trim();
  const sourceId = (record['Book Id'] ?? '').trim() || undefined;
  const isbn10 = normalizeIsbn(cleanGoodreadsIsbn(record.ISBN ?? ''));
  const isbn13 = normalizeIsbn(cleanGoodreadsIsbn(record.ISBN13 ?? ''));
  const issues: string[] = [];
  let status: MatchStatus = 'ready';

  if (!title || !author) {
    status = 'skipped';
    issues.push('A title and author are required.');
  } else if (!isbn10 && !isbn13) {
    status = 'needs-review';
    issues.push('No valid ISBN; confirm the title and author match.');
  }

  const shelves = splitList(record.Bookshelves ?? '');
  const exclusiveShelf = (record['Exclusive Shelf'] ?? '').trim() || undefined;
  const dateRead = parseDate(record['Date Read'] ?? '');
  const dateAdded = parseDate(record['Date Added'] ?? '');

  return {
    rowNumber,
    sourceId,
    title,
    author,
    additionalAuthors: splitList(record['Additional Authors'] ?? ''),
    isbn10: isbn10?.length === 10 ? isbn10 : undefined,
    isbn13: isbn13?.length === 13 ? isbn13 : undefined,
    rating: parseRating(record['My Rating'] ?? ''),
    review: record['My Review'] ?? '',
    dateRead,
    dateAdded,
    shelves,
    exclusiveShelf,
    status,
    issues,
    fingerprint: fingerprint([sourceId, isbn13, isbn10, title, author, dateRead]),
  };
}

export function parseGoodreadsCsv(text: string): GoodreadsNormalizedRow[] {
  if (new Blob([text]).size > 15 * 1024 * 1024) throw new Error('Goodreads CSV files must be 15 MB or smaller.');
  const records = rowsToRecords(parseCsv(text));
  if (!records.length) return [];
  const headers = new Set(Object.keys(records[0]));
  if (!headers.has('Title') || !headers.has('Author')) {
    throw new Error('This does not look like a Goodreads export: Title and Author columns are missing.');
  }
  if (records.length > 10_000) throw new Error('Goodreads imports are limited to 10,000 rows at a time.');

  const seen = new Set<string>();
  return records.map((record, index) => {
    const row = normalizeRecord(record, index + 2);
    if (seen.has(row.fingerprint)) {
      return { ...row, status: 'skipped', issues: [...row.issues, 'Duplicate row in this CSV.'] };
    }
    seen.add(row.fingerprint);
    return row;
  });
}

export function summarizeGoodreadsRows(rows: GoodreadsNormalizedRow[]) {
  return rows.reduce(
    (summary, row) => ({ ...summary, [row.status]: summary[row.status] + 1 }),
    { ready: 0, 'needs-review': 0, skipped: 0 },
  );
}
