import { withDatabase } from '@/db/client';
import { DEFAULT_APPEARANCE } from '@/lib/appearance/registry';
import { normalizeIsbn } from '@/lib/books/isbn';
import type {
  Appearance,
  BookEdition,
  BookLookupCandidate,
  BookRecord,
  BookWork,
  Contributor,
  DataOrigin,
  FieldProvenance,
  LibraryEntry,
  ReadingStatus,
  Review,
} from '@/lib/domain/types';
import { classifyGenre, composeAppearanceRecipe, type GenreFacet, type PrimaryGenre } from '@/lib/genres/taxonomy';

export type CreateBookInput = {
  title: string;
  subtitle?: string;
  contributors?: Contributor[];
  author?: string;
  isbn10?: string;
  isbn13?: string;
  publisher?: string;
  publishedDate?: string;
  firstPublishedDate?: string;
  language?: string;
  pageCount?: number;
  coverUrl?: string;
  synopsis?: string;
  subjects?: string[];
  status?: ReadingStatus;
  favorite?: boolean;
  startedAt?: string;
  finishedAt?: string;
  shelves?: string[];
  rating?: number;
  review?: string;
  source?: DataOrigin;
  sourceRecordId?: string;
  sourceIds?: Record<string, string>;
  provenance?: Record<string, FieldProvenance>;
  primaryGenre?: PrimaryGenre;
  genreFacets?: GenreFacet[];
  genreLockedByUser?: boolean;
  appearance?: Partial<Appearance>;
};

type LibraryRow = {
  work_id: string;
  title: string;
  subtitle: string | null;
  synopsis: string;
  subjects_json: string;
  work_provenance_json: string;
  first_published_date: string | null;
  edition_id: string;
  contributors_json: string;
  isbn10: string | null;
  isbn13: string | null;
  publisher: string | null;
  published_date: string | null;
  language: string | null;
  page_count: number | null;
  cover_url: string | null;
  source_ids_json: string;
  edition_provenance_json: string;
  entry_id: string;
  user_id: string;
  status: ReadingStatus;
  favorite: number;
  started_at: string | null;
  finished_at: string | null;
  shelves_json: string;
  source: DataOrigin;
  source_record_id: string | null;
  entry_created_at: string;
  entry_updated_at: string;
  review_id: string;
  rating: number;
  review_body: string;
  spoiler: number;
  review_created_at: string;
  review_updated_at: string;
  review_user_edited_at: string | null;
  appearance_id: string;
  registry_version: number;
  preset_id: string;
  construction_id: string;
  scene_id: string;
  page_id: string;
  font_id: string;
  accent: string;
  decorations_json: string;
  cover_treatment_id: string;
  opened_background_id: string;
  user_overrides_json: string;
  primary_genre: string;
  genre_facets_json: string;
  genre_confidence: number;
  genre_locked: number;
};

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const maybe = <T>(value: T | null): T | undefined => value ?? undefined;

function rowToRecord(row: LibraryRow): BookRecord {
  const work: BookWork = {
    id: row.work_id,
    title: row.title,
    subtitle: maybe(row.subtitle),
    synopsis: row.synopsis,
    subjects: parseJson(row.subjects_json, []),
    firstPublishedDate: maybe(row.first_published_date),
    primaryGenre: row.primary_genre,
    genreFacets: parseJson(row.genre_facets_json, []),
    genreConfidence: row.genre_confidence,
    genreLockedByUser: Boolean(row.genre_locked),
    provenance: parseJson(row.work_provenance_json, {}),
  };
  const edition: BookEdition = {
    id: row.edition_id,
    workId: row.work_id,
    contributors: parseJson(row.contributors_json, []),
    isbn10: maybe(row.isbn10),
    isbn13: maybe(row.isbn13),
    publisher: maybe(row.publisher),
    publishedDate: maybe(row.published_date),
    language: maybe(row.language),
    pageCount: maybe(row.page_count),
    coverUrl: maybe(row.cover_url),
    sourceIds: parseJson(row.source_ids_json, {}),
    provenance: parseJson(row.edition_provenance_json, {}),
  };
  const entry: LibraryEntry = {
    id: row.entry_id,
    userId: row.user_id,
    editionId: row.edition_id,
    status: row.status,
    favorite: Boolean(row.favorite),
    startedAt: maybe(row.started_at),
    finishedAt: maybe(row.finished_at),
    shelves: parseJson(row.shelves_json, []),
    source: row.source,
    sourceRecordId: maybe(row.source_record_id),
    createdAt: row.entry_created_at,
    updatedAt: row.entry_updated_at,
  };
  const review: Review = {
    id: row.review_id,
    libraryEntryId: row.entry_id,
    rating: row.rating,
    body: row.review_body,
    spoiler: Boolean(row.spoiler),
    createdAt: row.review_created_at,
    updatedAt: row.review_updated_at,
    userEditedAt: maybe(row.review_user_edited_at),
  };
  const appearance: Appearance = {
    id: row.appearance_id,
    libraryEntryId: row.entry_id,
    registryVersion: row.registry_version,
    presetId: row.preset_id,
    constructionId: row.construction_id,
    sceneId: row.scene_id,
    pageId: row.page_id,
    fontId: row.font_id,
    accent: row.accent,
    decorations: parseJson(row.decorations_json, []),
    coverTreatmentId: row.cover_treatment_id,
    openedBackgroundId: row.opened_background_id,
    userOverrides: parseJson(row.user_overrides_json, []),
  };
  return { work, edition, entry, review, appearance };
}

const SELECT_LIBRARY = `
  SELECT
    w.id AS work_id, w.title, w.subtitle, w.synopsis, w.subjects_json,
    w.provenance_json AS work_provenance_json, w.first_published_date,
    e.id AS edition_id, e.contributors_json, e.isbn10, e.isbn13, e.publisher,
    e.published_date, e.language, e.page_count, e.cover_url, e.source_ids_json,
    e.provenance_json AS edition_provenance_json,
    l.id AS entry_id, l.user_id, l.status, l.favorite, l.started_at, l.finished_at,
    l.shelves_json, l.source, l.source_record_id, l.created_at AS entry_created_at,
    l.updated_at AS entry_updated_at,
    r.id AS review_id, r.rating, r.body AS review_body, r.spoiler,
    r.created_at AS review_created_at, r.updated_at AS review_updated_at,
    r.user_edited_at AS review_user_edited_at,
    a.id AS appearance_id, a.registry_version, a.preset_id, a.construction_id,
    a.scene_id, a.page_id, a.font_id, a.accent, a.decorations_json,
    a.cover_treatment_id, a.opened_background_id, a.user_overrides_json,
    g.primary_genre, g.facets_json AS genre_facets_json, g.confidence AS genre_confidence,
    g.user_locked AS genre_locked
  FROM library_entry l
  JOIN book_edition e ON e.id = l.edition_id
  JOIN book_work w ON w.id = e.work_id
  JOIN review r ON r.library_entry_id = l.id
  JOIN appearance a ON a.library_entry_id = l.id
  JOIN genre_assignment g ON g.work_id = w.id
`;

export async function listLibrary(userId: string) {
  return withDatabase(async (database) => {
    const result = await database.prepare(
      `${SELECT_LIBRARY} WHERE l.user_id = ? AND l.deleted_at IS NULL ORDER BY l.updated_at DESC`,
    ).bind(userId).all<LibraryRow>();
    return result.results.map(rowToRecord);
  });
}

export async function getLibraryRecord(userId: string, entryId: string) {
  return withDatabase(async (database) => {
    const row = await database.prepare(
      `${SELECT_LIBRARY} WHERE l.user_id = ? AND l.id = ? AND l.deleted_at IS NULL`,
    ).bind(userId, entryId).first<LibraryRow>();
    return row ? rowToRecord(row) : null;
  });
}

export type LibraryEnrichmentTarget = {
  entryId: string;
  title: string;
  author?: string;
  isbn: string;
};

export async function listLibraryEnrichmentTargets(userId: string, cursor = '', limit = 30) {
  return withDatabase(async (database) => {
    const result = await database.prepare(
      `SELECT l.id AS entry_id, w.title, e.contributors_json, e.isbn10, e.isbn13
       FROM library_entry l
       JOIN book_edition e ON e.id = l.edition_id
       JOIN book_work w ON w.id = e.work_id
       WHERE l.user_id = ?
         AND l.source = 'goodreads'
         AND l.deleted_at IS NULL
         AND l.id > ?
         AND (e.isbn13 IS NOT NULL OR e.isbn10 IS NOT NULL)
         AND e.source_ids_json = '{}'
       ORDER BY l.id
       LIMIT ?`,
    ).bind(userId, cursor, Math.max(1, Math.min(30, limit))).all<{
      entry_id: string;
      title: string;
      contributors_json: string;
      isbn10: string | null;
      isbn13: string | null;
    }>();
    return result.results.map((row): LibraryEnrichmentTarget => ({
      entryId: row.entry_id,
      title: row.title,
      author: parseJson<Contributor[]>(row.contributors_json, [])[0]?.name,
      isbn: row.isbn13 ?? row.isbn10 as string,
    }));
  });
}

export async function enrichLibraryRecord(userId: string, entryId: string, candidate: BookLookupCandidate) {
  return withDatabase(async (database) => {
    const row = await database.prepare(
      `SELECT l.edition_id, e.work_id, w.title, w.subtitle, w.synopsis, w.subjects_json,
              w.first_published_date, w.provenance_json AS work_provenance,
              e.contributors_json, e.isbn10, e.isbn13, e.publisher, e.published_date,
              e.language, e.page_count, e.cover_url, e.source_ids_json,
              e.provenance_json AS edition_provenance, g.user_locked
       FROM library_entry l
       JOIN book_edition e ON e.id = l.edition_id
       JOIN book_work w ON w.id = e.work_id
       JOIN genre_assignment g ON g.work_id = w.id
       WHERE l.id = ? AND l.user_id = ? AND l.deleted_at IS NULL`,
    ).bind(entryId, userId).first<{
      edition_id: string;
      work_id: string;
      title: string;
      subtitle: string | null;
      synopsis: string;
      subjects_json: string;
      first_published_date: string | null;
      work_provenance: string;
      contributors_json: string;
      isbn10: string | null;
      isbn13: string | null;
      publisher: string | null;
      published_date: string | null;
      language: string | null;
      page_count: number | null;
      cover_url: string | null;
      source_ids_json: string;
      edition_provenance: string;
      user_locked: number;
    }>();
    if (!row) return false;

    const timestamp = nowIso();
    const workSourceId = candidate.sourceIds.work;
    const editionSourceId = candidate.sourceIds.edition ?? workSourceId;
    const fieldProvenance = (sourceId?: string): FieldProvenance => ({ source: 'open-library', sourceId, importedAt: timestamp });
    const workProvenance = parseJson<Record<string, FieldProvenance>>(row.work_provenance, {});
    const editionProvenance = parseJson<Record<string, FieldProvenance>>(row.edition_provenance, {});
    const existingSubjects = parseJson<string[]>(row.subjects_json, []);
    const subjects = existingSubjects.length ? undefined : candidate.subjects.slice(0, 60);
    const subtitle = row.subtitle ? undefined : candidate.subtitle;
    const synopsis = row.synopsis ? undefined : candidate.synopsis;
    const firstPublishedDate = row.first_published_date ? undefined : candidate.firstPublishedDate;
    const statements: D1PreparedStatement[] = [];

    if (subtitle || synopsis || subjects?.length || firstPublishedDate) {
      if (subtitle) workProvenance.subtitle = fieldProvenance(workSourceId);
      if (synopsis) workProvenance.synopsis = fieldProvenance(workSourceId);
      if (subjects?.length) workProvenance.subjects = fieldProvenance(workSourceId);
      if (firstPublishedDate) workProvenance.firstPublishedDate = fieldProvenance(workSourceId);
      statements.push(database.prepare(
        `UPDATE book_work SET subtitle = COALESCE(?, subtitle), synopsis = COALESCE(?, synopsis),
          subjects_json = COALESCE(?, subjects_json), first_published_date = COALESCE(?, first_published_date),
          provenance_json = ?, updated_at = ? WHERE id = ?`,
      ).bind(
        subtitle?.trim().slice(0, 300) || null,
        synopsis?.trim().slice(0, 20_000) || null,
        subjects?.length ? JSON.stringify(subjects) : null,
        firstPublishedDate || null,
        JSON.stringify(workProvenance),
        timestamp,
        row.work_id,
      ));
    }

    const existingContributors = parseJson<Contributor[]>(row.contributors_json, []);
    const contributors = existingContributors.length ? undefined : candidate.contributors;
    const isbn10 = row.isbn10 ? undefined : candidate.isbn10;
    const isbn13 = row.isbn13 ? undefined : candidate.isbn13;
    const publisher = row.publisher ? undefined : candidate.publisher;
    const publishedDate = row.published_date ? undefined : candidate.publishedDate;
    const language = row.language ? undefined : candidate.language;
    const pageCount = row.page_count ? undefined : candidate.pageCount;
    const coverUrl = row.cover_url ? undefined : candidate.coverUrl;
    const sourceIds = { ...parseJson<Record<string, string>>(row.source_ids_json, {}), ...candidate.sourceIds };
    const sourceIdsChanged = JSON.stringify(sourceIds) !== JSON.stringify(parseJson<Record<string, string>>(row.source_ids_json, {}));
    const editionChanged = Boolean(
      contributors?.length || isbn10 || isbn13 || publisher || publishedDate || language || pageCount || coverUrl || sourceIdsChanged,
    );
    if (editionChanged) {
      if (contributors?.length) editionProvenance.contributors = fieldProvenance(editionSourceId);
      if (isbn10) editionProvenance.isbn10 = fieldProvenance(editionSourceId);
      if (isbn13) editionProvenance.isbn13 = fieldProvenance(editionSourceId);
      if (publisher) editionProvenance.publisher = fieldProvenance(editionSourceId);
      if (publishedDate) editionProvenance.publishedDate = fieldProvenance(editionSourceId);
      if (language) editionProvenance.language = fieldProvenance(editionSourceId);
      if (pageCount) editionProvenance.pageCount = fieldProvenance(editionSourceId);
      if (coverUrl) editionProvenance.coverUrl = fieldProvenance(editionSourceId);
      statements.push(database.prepare(
        `UPDATE book_edition SET contributors_json = COALESCE(?, contributors_json), isbn10 = COALESCE(?, isbn10),
          isbn13 = COALESCE(?, isbn13), publisher = COALESCE(?, publisher), published_date = COALESCE(?, published_date),
          language = COALESCE(?, language), page_count = COALESCE(?, page_count), cover_url = COALESCE(?, cover_url),
          source_ids_json = ?, provenance_json = ?, updated_at = ? WHERE id = ?`,
      ).bind(
        contributors?.length ? JSON.stringify(contributors) : null,
        isbn10 ?? null,
        isbn13 ?? null,
        publisher?.trim().slice(0, 300) || null,
        publishedDate || null,
        language?.slice(0, 20) || null,
        pageCount && pageCount > 0 ? Math.round(pageCount) : null,
        coverUrl?.slice(0, 2_000) || null,
        JSON.stringify(sourceIds),
        JSON.stringify(editionProvenance),
        timestamp,
        row.edition_id,
      ));
    }

    if (subjects?.length && !row.user_locked) {
      const genre = classifyGenre({ title: row.title, synopsis: synopsis ?? row.synopsis, subjects });
      statements.push(database.prepare(
        `UPDATE genre_assignment SET primary_genre = ?, facets_json = ?, confidence = ?, reasons_json = ?,
          source = 'open-library', updated_at = ? WHERE work_id = ? AND user_locked = 0`,
      ).bind(
        genre.primaryGenre,
        JSON.stringify(genre.facets.slice(0, 2)),
        genre.confidence,
        JSON.stringify(genre.reasons),
        timestamp,
        row.work_id,
      ));
    }

    if (!statements.length) return false;
    await database.batch(statements);
    return true;
  });
}

export async function createLibraryRecord(userId: string, input: CreateBookInput) {
  const title = input.title.normalize('NFKC').trim().slice(0, 300);
  if (!title) throw new Error('A title is required.');
  const contributors = input.contributors?.length
    ? input.contributors
    : input.author?.trim() ? [{ name: input.author.trim(), role: 'author' as const }] : [];
  const subjects = [...new Set((input.subjects ?? []).map((subject) => subject.trim()).filter(Boolean))].slice(0, 60);
  const generatedGenre = classifyGenre({ title, synopsis: input.synopsis, subjects });
  const primaryGenre = input.primaryGenre ?? generatedGenre.primaryGenre;
  const facets = (input.genreFacets ?? generatedGenre.facets).slice(0, 2);
  const recipe = composeAppearanceRecipe(primaryGenre, facets);
  const timestamp = nowIso();
  const workId = crypto.randomUUID();
  const editionId = crypto.randomUUID();
  const entryId = crypto.randomUUID();
  const reviewId = crypto.randomUUID();
  const appearanceId = crypto.randomUUID();
  const genreId = crypto.randomUUID();
  const source = input.source ?? 'manual';
  const defaultProvenance: FieldProvenance = { source, importedAt: timestamp };
  const workProvenance = input.provenance ?? Object.fromEntries(
    ['title', 'subtitle', 'synopsis', 'subjects', 'firstPublishedDate'].map((field) => [field, defaultProvenance]),
  );
  const editionProvenance = input.provenance ?? Object.fromEntries(
    ['contributors', 'isbn10', 'isbn13', 'publisher', 'publishedDate', 'language', 'pageCount', 'coverUrl'].map((field) => [field, defaultProvenance]),
  );
  const appearance = { ...DEFAULT_APPEARANCE, ...recipe, ...input.appearance };

  return withDatabase(async (database) => {
    await database.batch([
      database.prepare(
        `INSERT INTO book_work
          (id, owner_user_id, title, subtitle, synopsis, subjects_json, provenance_json, first_published_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        workId,
        userId,
        title,
        input.subtitle?.trim().slice(0, 300) || null,
        input.synopsis?.trim().slice(0, 20_000) || '',
        JSON.stringify(subjects),
        JSON.stringify(workProvenance),
        input.firstPublishedDate || null,
        timestamp,
        timestamp,
      ),
      database.prepare(
        `INSERT INTO book_edition
          (id, work_id, contributors_json, isbn10, isbn13, publisher, published_date, language, page_count,
           cover_url, source_ids_json, provenance_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        editionId,
        workId,
        JSON.stringify(contributors),
        normalizeIsbn(input.isbn10)?.slice(0, 10) || null,
        normalizeIsbn(input.isbn13)?.slice(0, 13) || null,
        input.publisher?.trim().slice(0, 300) || null,
        input.publishedDate || null,
        input.language?.slice(0, 20) || null,
        input.pageCount && input.pageCount > 0 ? Math.round(input.pageCount) : null,
        input.coverUrl?.trim().slice(0, 2_000) || null,
        JSON.stringify(input.sourceIds ?? {}),
        JSON.stringify(editionProvenance),
        timestamp,
        timestamp,
      ),
      database.prepare(
        `INSERT INTO library_entry
          (id, user_id, edition_id, status, favorite, started_at, finished_at, shelves_json,
           source, source_record_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        entryId,
        userId,
        editionId,
        input.status ?? 'want-to-read',
        input.favorite ? 1 : 0,
        input.startedAt || null,
        input.finishedAt || null,
        JSON.stringify(input.shelves ?? []),
        source,
        input.sourceRecordId || null,
        timestamp,
        timestamp,
      ),
      database.prepare(
        `INSERT INTO review (id, library_entry_id, rating, body, spoiler, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
      ).bind(reviewId, entryId, Math.max(0, Math.min(5, Math.round(input.rating ?? 0))), input.review?.slice(0, 100_000) || '', timestamp, timestamp),
      database.prepare(
        `INSERT INTO appearance
          (id, library_entry_id, registry_version, preset_id, construction_id, scene_id, page_id, font_id,
           accent, decorations_json, cover_treatment_id, opened_background_id, user_overrides_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        appearanceId,
        entryId,
        appearance.registryVersion,
        appearance.presetId,
        appearance.constructionId,
        appearance.sceneId,
        appearance.pageId,
        appearance.fontId,
        appearance.accent,
        JSON.stringify(appearance.decorations),
        appearance.coverTreatmentId,
        appearance.openedBackgroundId,
        JSON.stringify(appearance.userOverrides),
        timestamp,
      ),
      database.prepare(
        `INSERT INTO genre_assignment
          (id, work_id, primary_genre, facets_json, confidence, reasons_json, source, user_locked, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        genreId,
        workId,
        primaryGenre,
        JSON.stringify(facets),
        input.primaryGenre ? 1 : generatedGenre.confidence,
        JSON.stringify(input.primaryGenre ? ['Selected by reader'] : generatedGenre.reasons),
        input.primaryGenre ? 'manual' : source,
        input.genreLockedByUser || input.primaryGenre ? 1 : 0,
        timestamp,
      ),
    ]);
    const record = await getLibraryRecord(userId, entryId);
    if (!record) throw new Error('Book was created but could not be read back.');
    return record;
  });
}

export type UpdateBookInput = {
  entry?: Partial<Pick<LibraryEntry, 'status' | 'favorite' | 'startedAt' | 'finishedAt' | 'shelves'>>;
  review?: Partial<Pick<Review, 'rating' | 'body' | 'spoiler'>>;
  appearance?: Partial<Pick<Appearance, 'presetId' | 'constructionId' | 'sceneId' | 'pageId' | 'fontId' | 'accent' | 'decorations' | 'coverTreatmentId' | 'openedBackgroundId'>>;
  work?: Partial<Pick<BookWork, 'title' | 'subtitle' | 'synopsis' | 'subjects' | 'firstPublishedDate'>>;
  edition?: Partial<Pick<BookEdition, 'contributors' | 'isbn10' | 'isbn13' | 'publisher' | 'publishedDate' | 'language' | 'pageCount' | 'coverUrl'>>;
  genre?: { primaryGenre: PrimaryGenre; facets: GenreFacet[] };
};

export async function updateLibraryRecord(userId: string, entryId: string, input: UpdateBookInput) {
  return withDatabase(async (database) => {
    const ids = await database.prepare(
      `SELECT l.edition_id, e.work_id, w.provenance_json AS work_provenance,
              e.provenance_json AS edition_provenance, a.user_overrides_json AS appearance_overrides
       FROM library_entry l
       JOIN book_edition e ON e.id = l.edition_id
       JOIN book_work w ON w.id = e.work_id
       JOIN appearance a ON a.library_entry_id = l.id
       WHERE l.id = ? AND l.user_id = ? AND l.deleted_at IS NULL`,
    ).bind(entryId, userId).first<{
      edition_id: string; work_id: string; work_provenance: string; edition_provenance: string; appearance_overrides: string;
    }>();
    if (!ids) return null;
    const statements: D1PreparedStatement[] = [];
    const timestamp = nowIso();

    if (input.entry) {
      statements.push(database.prepare(
        `UPDATE library_entry SET status = COALESCE(?, status), favorite = COALESCE(?, favorite),
          started_at = COALESCE(?, started_at), finished_at = COALESCE(?, finished_at),
          shelves_json = COALESCE(?, shelves_json), updated_at = ? WHERE id = ? AND user_id = ?`,
      ).bind(
        input.entry.status ?? null,
        input.entry.favorite === undefined ? null : input.entry.favorite ? 1 : 0,
        input.entry.startedAt ?? null,
        input.entry.finishedAt ?? null,
        input.entry.shelves ? JSON.stringify(input.entry.shelves) : null,
        timestamp,
        entryId,
        userId,
      ));
    }
    if (input.review) {
      statements.push(database.prepare(
        `UPDATE review SET rating = COALESCE(?, rating), body = COALESCE(?, body), spoiler = COALESCE(?, spoiler),
          updated_at = ?, user_edited_at = ? WHERE library_entry_id = ?`,
      ).bind(
        input.review.rating === undefined ? null : Math.max(0, Math.min(5, Math.round(input.review.rating))),
        input.review.body === undefined ? null : input.review.body.slice(0, 100_000),
        input.review.spoiler === undefined ? null : input.review.spoiler ? 1 : 0,
        timestamp,
        timestamp,
        entryId,
      ));
    }
    if (input.appearance) {
      const overrides = [...new Set([
        ...parseJson<string[]>(ids.appearance_overrides, []),
        ...Object.keys(input.appearance),
      ])];
      statements.push(database.prepare(
        `UPDATE appearance SET preset_id = COALESCE(?, preset_id), construction_id = COALESCE(?, construction_id),
          scene_id = COALESCE(?, scene_id), page_id = COALESCE(?, page_id), font_id = COALESCE(?, font_id),
          accent = COALESCE(?, accent), decorations_json = COALESCE(?, decorations_json),
          cover_treatment_id = COALESCE(?, cover_treatment_id), opened_background_id = COALESCE(?, opened_background_id),
          user_overrides_json = ?, updated_at = ? WHERE library_entry_id = ?`,
      ).bind(
        input.appearance.presetId ?? null,
        input.appearance.constructionId ?? null,
        input.appearance.sceneId ?? null,
        input.appearance.pageId ?? null,
        input.appearance.fontId ?? null,
        input.appearance.accent ?? null,
        input.appearance.decorations ? JSON.stringify(input.appearance.decorations) : null,
        input.appearance.coverTreatmentId ?? null,
        input.appearance.openedBackgroundId ?? null,
        JSON.stringify(overrides),
        timestamp,
        entryId,
      ));
    }
    if (input.work) {
      const provenance = parseJson<Record<string, FieldProvenance>>(ids.work_provenance, {});
      for (const field of Object.keys(input.work)) provenance[field] = { source: 'manual', userEditedAt: timestamp };
      statements.push(database.prepare(
        `UPDATE book_work SET title = COALESCE(?, title), subtitle = COALESCE(?, subtitle), synopsis = COALESCE(?, synopsis),
          subjects_json = COALESCE(?, subjects_json), first_published_date = COALESCE(?, first_published_date),
          provenance_json = ?, updated_at = ? WHERE id = ?`,
      ).bind(
        input.work.title?.trim().slice(0, 300) || null,
        input.work.subtitle ?? null,
        input.work.synopsis ?? null,
        input.work.subjects ? JSON.stringify(input.work.subjects) : null,
        input.work.firstPublishedDate ?? null,
        JSON.stringify(provenance),
        timestamp,
        ids.work_id,
      ));
    }
    if (input.edition) {
      const provenance = parseJson<Record<string, FieldProvenance>>(ids.edition_provenance, {});
      for (const field of Object.keys(input.edition)) provenance[field] = { source: 'manual', userEditedAt: timestamp };
      statements.push(database.prepare(
        `UPDATE book_edition SET contributors_json = COALESCE(?, contributors_json), isbn10 = COALESCE(?, isbn10),
          isbn13 = COALESCE(?, isbn13), publisher = COALESCE(?, publisher), published_date = COALESCE(?, published_date),
          language = COALESCE(?, language), page_count = COALESCE(?, page_count), cover_url = COALESCE(?, cover_url),
          provenance_json = ?, updated_at = ? WHERE id = ?`,
      ).bind(
        input.edition.contributors ? JSON.stringify(input.edition.contributors) : null,
        input.edition.isbn10 ? normalizeIsbn(input.edition.isbn10) ?? null : null,
        input.edition.isbn13 ? normalizeIsbn(input.edition.isbn13) ?? null : null,
        input.edition.publisher ?? null,
        input.edition.publishedDate ?? null,
        input.edition.language ?? null,
        input.edition.pageCount ?? null,
        input.edition.coverUrl ?? null,
        JSON.stringify(provenance),
        timestamp,
        ids.edition_id,
      ));
    }
    if (input.genre) {
      statements.push(database.prepare(
        `UPDATE genre_assignment SET primary_genre = ?, facets_json = ?, confidence = 1,
          reasons_json = '["Selected by reader"]', source = 'manual', user_locked = 1, updated_at = ? WHERE work_id = ?`,
      ).bind(input.genre.primaryGenre, JSON.stringify(input.genre.facets.slice(0, 2)), timestamp, ids.work_id));
    }
    if (statements.length) {
      statements.push(database.prepare('UPDATE library_entry SET updated_at = ? WHERE id = ? AND user_id = ?').bind(timestamp, entryId, userId));
      await database.batch(statements);
    }
    return getLibraryRecord(userId, entryId);
  });
}

export async function deleteLibraryRecord(userId: string, entryId: string) {
  return withDatabase(async (database) => {
    const result = await database.prepare(
      'UPDATE library_entry SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    ).bind(nowIso(), nowIso(), entryId, userId).run();
    return result.meta.changes > 0;
  });
}

function nowIso() {
  return new Date().toISOString();
}
