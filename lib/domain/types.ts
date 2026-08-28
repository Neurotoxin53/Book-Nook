export type ReadingStatus = 'read' | 'reading' | 'want-to-read';
export type DataOrigin = 'manual' | 'open-library' | 'goodreads' | 'migration' | 'demo';
export type MatchStatus = 'ready' | 'needs-review' | 'skipped';

export type Contributor = {
  name: string;
  role: 'author' | 'editor' | 'translator' | 'illustrator' | 'other';
};

export type FieldProvenance = {
  source: DataOrigin;
  sourceId?: string;
  importedAt?: string;
  userEditedAt?: string;
};

export type BookWork = {
  id: string;
  title: string;
  subtitle?: string;
  synopsis: string;
  subjects: string[];
  firstPublishedDate?: string;
  primaryGenre: string;
  genreFacets: string[];
  genreConfidence: number;
  genreLockedByUser: boolean;
  provenance: Record<string, FieldProvenance>;
};

export type BookEdition = {
  id: string;
  workId: string;
  contributors: Contributor[];
  isbn10?: string;
  isbn13?: string;
  publisher?: string;
  publishedDate?: string;
  language?: string;
  pageCount?: number;
  coverUrl?: string;
  sourceIds: Record<string, string>;
  provenance: Record<string, FieldProvenance>;
};

export type Review = {
  id: string;
  libraryEntryId: string;
  rating: number;
  body: string;
  spoiler: boolean;
  createdAt: string;
  updatedAt: string;
  userEditedAt?: string;
};

export type Appearance = {
  id: string;
  libraryEntryId: string;
  registryVersion: number;
  presetId: string;
  constructionId: string;
  sceneId: string;
  pageId: string;
  fontId: string;
  accent: string;
  decorations: string[];
  coverTreatmentId: string;
  openedBackgroundId: string;
  userOverrides: string[];
};

export type LibraryEntry = {
  id: string;
  userId: string;
  editionId: string;
  status: ReadingStatus;
  favorite: boolean;
  startedAt?: string;
  finishedAt?: string;
  shelves: string[];
  source: DataOrigin;
  sourceRecordId?: string;
  createdAt: string;
  updatedAt: string;
};

export type BookRecord = {
  work: BookWork;
  edition: BookEdition;
  entry: LibraryEntry;
  review: Review;
  appearance: Appearance;
  isDemo?: boolean;
};

export type BookLookupQuery = {
  isbn?: string;
  title?: string;
  author?: string;
};

export type BookLookupCandidate = {
  candidateId: string;
  title: string;
  subtitle?: string;
  contributors: Contributor[];
  isbn10?: string;
  isbn13?: string;
  publisher?: string;
  publishedDate?: string;
  firstPublishedDate?: string;
  language?: string;
  pageCount?: number;
  coverUrl?: string;
  synopsis?: string;
  subjects: string[];
  source: 'open-library';
  sourceIds: Record<string, string>;
  provenance: Record<string, FieldProvenance>;
};

export type GoodreadsNormalizedRow = {
  rowNumber: number;
  sourceId?: string;
  title: string;
  author: string;
  additionalAuthors: string[];
  isbn10?: string;
  isbn13?: string;
  rating?: number;
  review: string;
  dateRead?: string;
  dateAdded?: string;
  shelves: string[];
  exclusiveShelf?: string;
  status: MatchStatus;
  issues: string[];
  fingerprint: string;
  confirmedTitleAuthor?: boolean;
};

export type ImportSummary = {
  jobId: string;
  ready: number;
  needsReview: number;
  skipped: number;
  imported: number;
  unchanged: number;
  conflicts: number;
};

export type ApiError = {
  error: string;
  code: string;
  details?: unknown;
};
