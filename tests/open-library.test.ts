import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchOpenLibraryByIsbns } from '@/lib/books/open-library';

afterEach(() => vi.unstubAllGlobals());

describe('Open Library batch enrichment', () => {
  it('matches ISBNs to exact editions in one request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      docs: [
        {
          key: '/works/OL5735363W',
          title: 'The Hunger Games',
          author_name: ['Suzanne Collins'],
          first_publish_year: 2008,
          cover_i: 100,
          description: 'A televised fight for survival.',
          subject: ['Dystopian fiction', 'Young adult fiction'],
          editions: { docs: [{
            key: '/books/OL61276815M',
            title: 'The Hunger Games',
            cover_i: 200,
            language: ['eng'],
            publisher: ['Scholastic'],
            publish_date: ['2009'],
            number_of_pages: 374,
            isbn: ['0439023521', '9780439023528'],
          }] },
        },
        {
          key: '/works/OL5720022W',
          title: 'Breaking Dawn',
          author_name: ['Stephenie Meyer'],
          first_publish_year: 2008,
          editions: { docs: [{
            key: '/books/OL24709839M',
            title: 'Breaking Dawn',
            cover_i: 300,
            language: ['eng'],
            publisher: ['Little, Brown'],
            publish_date: ['2008'],
            isbn: ['031606792X', '9780316067928'],
          }] },
        },
      ],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchOpenLibraryByIsbns(['9780439023528', '9780316067928']);

    expect(fetchMock).toHaveBeenCalledOnce();
    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestUrl.searchParams.get('q')).toBe('isbn:(9780439023528 OR 9780316067928)');
    expect(requestUrl.searchParams.get('fields')).toContain('editions.isbn');
    expect(requestUrl.searchParams.get('fields')).toContain('editions.cover_i');
    expect(results.get('9780439023528')).toMatchObject({
      title: 'The Hunger Games',
      isbn10: '0439023521',
      isbn13: '9780439023528',
      publisher: 'Scholastic',
      publishedDate: '2009',
      language: 'eng',
      pageCount: 374,
      coverUrl: 'https://covers.openlibrary.org/b/id/200-L.jpg',
      synopsis: 'A televised fight for survival.',
      sourceIds: { work: '/works/OL5735363W', edition: 'OL61276815M' },
    });
    expect(results.get('9780316067928')?.coverUrl).toBe('https://covers.openlibrary.org/b/id/300-L.jpg');
  });
});
