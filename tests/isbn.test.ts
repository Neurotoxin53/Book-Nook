import { describe, expect, it } from 'vitest';
import { isbn10To13, isbn13To10, normalizeIsbn, pickIsbns } from '@/lib/books/isbn';

describe('ISBN normalization', () => {
  it('normalizes and converts valid ISBNs', () => {
    expect(normalizeIsbn('0-306-40615-2')).toBe('0306406152');
    expect(isbn10To13('0-306-40615-2')).toBe('9780306406157');
    expect(isbn13To10('9780306406157')).toBe('0306406152');
  });

  it('rejects invalid check digits', () => {
    expect(normalizeIsbn('9780306406158')).toBeUndefined();
    expect(normalizeIsbn('0306406153')).toBeUndefined();
  });

  it('picks a coherent pair from mixed values', () => {
    expect(pickIsbns(['junk', '9780306406157'])).toEqual({
      isbn10: '0306406152',
      isbn13: '9780306406157',
    });
  });
});

