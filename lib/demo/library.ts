import { DEFAULT_APPEARANCE } from '@/lib/appearance/registry';
import type { BookRecord, ReadingStatus } from '@/lib/domain/types';

const date = '2026-08-27T12:00:00.000Z';

function demoBook(input: {
  id: string;
  title: string;
  author: string;
  year: string;
  finishedAt?: string;
  coverUrl: string;
  synopsis: string;
  rating: number;
  review: string;
  status?: ReadingStatus;
  favorite?: boolean;
  primaryGenre: string;
  facets?: string[];
  appearance?: Partial<typeof DEFAULT_APPEARANCE>;
}): BookRecord {
  const workId = `demo-work-${input.id}`;
  const editionId = `demo-edition-${input.id}`;
  const entryId = `demo-${input.id}`;
  const source = { source: 'demo' as const, importedAt: date };
  return {
    isDemo: true,
    work: {
      id: workId,
      title: input.title,
      synopsis: input.synopsis,
      subjects: [input.primaryGenre, ...(input.facets ?? [])],
      firstPublishedDate: input.year,
      primaryGenre: input.primaryGenre,
      genreFacets: input.facets ?? [],
      genreConfidence: 0.94,
      genreLockedByUser: false,
      provenance: { title: source, synopsis: source },
    },
    edition: {
      id: editionId,
      workId,
      contributors: [{ name: input.author, role: 'author' }],
      publishedDate: input.year,
      coverUrl: input.coverUrl,
      language: 'eng',
      sourceIds: {},
      provenance: { contributors: source, publishedDate: source, coverUrl: source },
    },
    entry: {
      id: entryId,
      userId: 'demo',
      editionId,
      status: input.status ?? 'read',
      favorite: input.favorite ?? false,
      finishedAt: input.finishedAt,
      shelves: [],
      source: 'demo',
      createdAt: date,
      updatedAt: date,
    },
    review: {
      id: `demo-review-${input.id}`,
      libraryEntryId: entryId,
      rating: input.rating,
      body: input.review,
      spoiler: false,
      createdAt: date,
      updatedAt: date,
    },
    appearance: {
      id: `demo-appearance-${input.id}`,
      libraryEntryId: entryId,
      ...DEFAULT_APPEARANCE,
      ...input.appearance,
    },
  };
}

export const DEMO_LIBRARY: BookRecord[] = [
  demoBook({
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: '1813',
    finishedAt: '2026-08-12',
    coverUrl: 'https://covers.openlibrary.org/b/id/14348537-L.jpg',
    synopsis: 'Elizabeth Bennet navigates family pressure, social rank, and her changing judgment of the proud Mr. Darcy.',
    rating: 5,
    review: 'Sharp, funny, and much warmer than I remembered. Every conversation feels like a tiny duel, but the tenderness sneaks up on you.',
    favorite: true,
    primaryGenre: 'Romance',
    facets: ['Historical'],
    appearance: { sceneId: 'autumn-study', constructionId: 'deckle-hardcover', pageId: 'parchment', fontId: 'cormorant-garamond' },
  }),
  demoBook({
    id: 'nineteen-eighty-four',
    title: '1984',
    author: 'George Orwell',
    year: '1949',
    finishedAt: '2026-07-28',
    coverUrl: 'https://covers.openlibrary.org/b/id/9267242-L.jpg',
    synopsis: 'Winston Smith quietly rebels against an authoritarian state that controls language, history, and even private thought.',
    rating: 4,
    review: 'Bleak and frighteningly precise. The ideas lingered longer than the plot.',
    primaryGenre: 'Science Fiction',
    facets: ['Dystopian'],
    appearance: { sceneId: 'gothic-archive', constructionId: 'modern-hardcover', pageId: 'foxed-paper', fontId: 'source-serif-4', accent: '#344c55' },
  }),
  demoBook({
    id: 'to-kill-a-mockingbird',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    year: '1960',
    finishedAt: '2026-06-16',
    coverUrl: 'https://covers.openlibrary.org/b/id/14351077-L.jpg',
    synopsis: 'Through Scout Finch’s childhood perspective, a small Southern town confronts racial injustice and moral courage.',
    rating: 5,
    review: 'Scout’s voice makes the difficult parts human without ever making them simple.',
    favorite: true,
    primaryGenre: 'Literary and Contemporary Fiction',
    facets: ['Historical'],
    appearance: { sceneId: 'botanical-journal', constructionId: 'linen-hardcover', pageId: 'ivory', fontId: 'literata', accent: '#7a6442' },
  }),
  demoBook({
    id: 'moby-dick',
    title: 'Moby-Dick',
    author: 'Herman Melville',
    year: '1851',
    coverUrl: 'https://covers.openlibrary.org/b/id/10544254-L.jpg',
    synopsis: 'Sailor Ishmael joins Captain Ahab’s increasingly destructive pursuit of the white whale that maimed him.',
    rating: 4,
    review: 'Strange, enormous, funny, and exhausting—in the best possible way.',
    status: 'reading',
    primaryGenre: 'Adventure',
    appearance: { sceneId: 'coastal-paperback', constructionId: 'paperback', pageId: 'ivory', fontId: 'vollkorn', accent: '#385d67' },
  }),
  demoBook({
    id: 'frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    year: '1818',
    finishedAt: '2026-03-19',
    coverUrl: 'https://covers.openlibrary.org/b/id/12356249-L.jpg',
    synopsis: 'Victor Frankenstein creates sentient life, recoils from his abandoned creation, and unleashes a cycle of loneliness and revenge.',
    rating: 5,
    review: 'More sorrowful than scary. I kept thinking about who was truly made monstrous.',
    favorite: true,
    primaryGenre: 'Horror',
    facets: ['Dark/Gothic'],
    appearance: { sceneId: 'gothic-archive', constructionId: 'antique-tome', pageId: 'foxed-paper', fontId: 'im-fell-english-sc', accent: '#556a48' },
  }),
  demoBook({
    id: 'jane-eyre',
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    year: '1847',
    coverUrl: 'https://covers.openlibrary.org/b/id/8235363-L.jpg',
    synopsis: 'An independent young governess falls in love with the brooding master of Thornfield Hall while guarding her dignity.',
    rating: 4,
    review: 'A fierce interior life in a gothic house. Jane’s self-respect is the real love story.',
    status: 'want-to-read',
    primaryGenre: 'Classics',
    facets: ['Dark/Gothic', 'Romance-forward'],
    appearance: { sceneId: 'minimal-linen', constructionId: 'linen-hardcover', pageId: 'ivory', fontId: 'eb-garamond', accent: '#6b4c52' },
  }),
];

