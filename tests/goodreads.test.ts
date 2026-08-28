import { describe, expect, it } from 'vitest';
import { parseGoodreadsCsv, summarizeGoodreadsRows } from '@/lib/import/goodreads';

describe('Goodreads CSV normalization', () => {
  it('preserves quoted multiline reviews and Unicode', () => {
    const csv = [
      'Book Id,Title,Author,Additional Authors,ISBN,ISBN13,My Rating,My Review,Date Read,Date Added,Bookshelves,Exclusive Shelf',
      '42,"The, Book",Zoë Author,,="0306406152",="9780306406157",5,"First line, with comma',
      'Second line with “quotes”.",08/12/2026,2026/08/01,"favorites, autumn",read',
    ].join('\n');
    const [row] = parseGoodreadsCsv(csv);
    expect(row.title).toBe('The, Book');
    expect(row.author).toBe('Zoë Author');
    expect(row.review).toContain('Second line');
    expect(row.dateRead).toBe('2026-08-12');
    expect(row.isbn13).toBe('9780306406157');
    expect(row.status).toBe('ready');
  });

  it('marks title/author matches without ISBN for review and duplicate rows as skipped', () => {
    const csv = 'Title,Author,My Review\nA Book,An Author,hello\nA Book,An Author,hello\n';
    const rows = parseGoodreadsCsv(csv);
    expect(rows[0].status).toBe('needs-review');
    expect(rows[1].status).toBe('skipped');
    expect(summarizeGoodreadsRows(rows)).toEqual({ ready: 0, 'needs-review': 1, skipped: 1 });
  });
});

