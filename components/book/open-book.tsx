'use client';

import { useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  ArrowLeft,
  BookMarked,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Pencil,
  Save,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { BookCustomizer } from '@/components/book/customizer';
import { BookCover } from '@/components/library/book-cover';
import { fonts, getAppearanceOption, pages } from '@/lib/appearance/registry';
import type { BookRecord, ReadingStatus } from '@/lib/domain/types';
import { FALLBACK_GENRES, GENRE_FACETS, PRIMARY_GENRES, type GenreFacet, type PrimaryGenre } from '@/lib/genres/taxonomy';
import type { UpdateBookInput } from '@/lib/books/repository';

type BookDraft = {
  title: string;
  subtitle: string;
  author: string;
  synopsis: string;
  publishedDate: string;
  firstPublishedDate: string;
  publisher: string;
  isbn: string;
  language: string;
  pageCount: string;
  status: ReadingStatus;
  favorite: boolean;
  startedAt: string;
  finishedAt: string;
  rating: number;
  review: string;
  spoiler: boolean;
  primaryGenre: PrimaryGenre;
  facets: GenreFacet[];
  appearance: Pick<
    BookRecord['appearance'],
    'constructionId' | 'sceneId' | 'pageId' | 'fontId' | 'accent' | 'decorations' | 'coverTreatmentId' | 'openedBackgroundId'
  >;
};

function makeDraft(book: BookRecord): BookDraft {
  return {
    title: book.work.title,
    subtitle: book.work.subtitle ?? '',
    author: book.edition.contributors.find((person) => person.role === 'author')?.name ?? book.edition.contributors[0]?.name ?? '',
    synopsis: book.work.synopsis,
    publishedDate: book.edition.publishedDate ?? '',
    firstPublishedDate: book.work.firstPublishedDate ?? '',
    publisher: book.edition.publisher ?? '',
    isbn: book.edition.isbn13 ?? book.edition.isbn10 ?? '',
    language: book.edition.language ?? '',
    pageCount: book.edition.pageCount ? String(book.edition.pageCount) : '',
    status: book.entry.status,
    favorite: book.entry.favorite,
    startedAt: toDateInput(book.entry.startedAt),
    finishedAt: toDateInput(book.entry.finishedAt),
    rating: book.review.rating,
    review: book.review.body,
    spoiler: book.review.spoiler,
    primaryGenre: book.work.primaryGenre as PrimaryGenre,
    facets: book.work.genreFacets.filter((facet): facet is GenreFacet => GENRE_FACETS.includes(facet as GenreFacet)).slice(0, 2),
    appearance: {
      constructionId: book.appearance.constructionId,
      sceneId: book.appearance.sceneId,
      pageId: book.appearance.pageId,
      fontId: book.appearance.fontId,
      accent: book.appearance.accent,
      decorations: book.appearance.decorations,
      coverTreatmentId: book.appearance.coverTreatmentId,
      openedBackgroundId: book.appearance.openedBackgroundId,
    },
  };
}

export function OpenBook({
  book,
  authenticated,
  onBack,
  onSave,
  onDelete,
  onRequireAuth,
  onPrevious,
  onNext,
}: {
  book: BookRecord;
  authenticated: boolean;
  onBack: () => void;
  onSave: (update: UpdateBookInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onRequireAuth: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const [draft, setDraft] = useState(() => makeDraft(book));
  const [customizing, setCustomizing] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [mobilePage, setMobilePage] = useState<'about' | 'review'>('about');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const original = useMemo(() => JSON.stringify(makeDraft(book)), [book]);
  const dirty = JSON.stringify(draft) !== original;
  const chosenFont = getAppearanceOption(fonts, draft.appearance.fontId);
  const page = getAppearanceOption(pages, draft.appearance.pageId);
  const style = {
    '--book-accent': draft.appearance.accent,
    '--book-font': `'${chosenFont.family}', Georgia, serif`,
    '--book-paper': page.color,
  } as CSSProperties;
  const previewBook = {
    ...book,
    work: { ...book.work, title: draft.title },
    appearance: { ...book.appearance, ...draft.appearance },
  };

  const save = async () => {
    if (!authenticated) {
      onRequireAuth();
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await onSave({
        work: {
          title: draft.title,
          subtitle: draft.subtitle,
          synopsis: draft.synopsis,
          firstPublishedDate: draft.firstPublishedDate,
        },
        edition: {
          contributors: draft.author ? [{ name: draft.author, role: 'author' }] : [],
          publishedDate: draft.publishedDate,
          publisher: draft.publisher,
          ...(draft.isbn.length === 13 ? { isbn13: draft.isbn } : draft.isbn.length === 10 ? { isbn10: draft.isbn } : {}),
          language: draft.language,
          pageCount: Number(draft.pageCount) || undefined,
        },
        entry: {
          status: draft.status,
          favorite: draft.favorite,
          startedAt: draft.startedAt,
          finishedAt: draft.finishedAt,
        },
        review: { rating: draft.rating, body: draft.review, spoiler: draft.spoiler },
        appearance: draft.appearance,
        genre: { primaryGenre: draft.primaryGenre, facets: draft.facets },
      });
      setMessage('Your nook saved every change.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'This book could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!authenticated) {
      onRequireAuth();
      return;
    }
    if (!window.confirm(`Remove “${book.work.title}” from your library?`)) return;
    setDeleting(true);
    setError('');
    try {
      await onDelete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'This book could not be removed.');
      setDeleting(false);
    }
  };

  return (
    <main
      className="reader-shell"
      data-scene={draft.appearance.sceneId}
      data-background={draft.appearance.openedBackgroundId}
      data-construction={draft.appearance.constructionId}
      data-page={draft.appearance.pageId}
      style={style}
    >
      <div className="room-texture" aria-hidden="true" />
      <header className="reader-toolbar">
        <button type="button" className="reader-back" onClick={onBack}><ArrowLeft aria-hidden="true" /> Library</button>
        <div className="reader-title"><BookMarked aria-hidden="true" /><span><strong>{draft.title || 'Untitled book'}</strong><small>{draft.author || 'Unknown author'}</small></span></div>
        <div className="reader-actions">
          <button type="button" className={customizing ? 'toolbar-button active' : 'toolbar-button'} aria-pressed={customizing} onClick={() => setCustomizing((value) => !value)}>
            <Settings2 aria-hidden="true" /> Customize
          </button>
          <button type="button" className="toolbar-button primary" disabled={saving || (!dirty && authenticated)} onClick={() => void save()}>
            {saving ? <Sparkles aria-hidden="true" /> : <Save aria-hidden="true" />}{saving ? 'Saving…' : authenticated ? 'Save' : 'Unlock to save'}
          </button>
        </div>
      </header>

      {!authenticated && (
        <button className="reader-demo-notice" type="button" onClick={onRequireAuth}>
          You’re styling a demo copy. Unlock with a passkey to keep your changes.
        </button>
      )}

      <nav className="mobile-page-tabs" aria-label="Open book pages">
        <button type="button" aria-pressed={mobilePage === 'about'} className={mobilePage === 'about' ? 'active' : ''} onClick={() => setMobilePage('about')}>About the book</button>
        <button type="button" aria-pressed={mobilePage === 'review'} className={mobilePage === 'review' ? 'active' : ''} onClick={() => setMobilePage('review')}>My review</button>
      </nav>

      <div className={customizing ? 'reader-workspace customizer-open' : 'reader-workspace'}>
        <section className={`open-book construction-${draft.appearance.constructionId}`} aria-label={`${draft.title} open book`}>
          <div className={`book-page book-page-left${mobilePage === 'about' ? ' mobile-active' : ''}`}>
            <div className="book-page-inner">
              <div className="book-folio">Ex libris · My Book Nook</div>
              <div className="book-identity">
                <BookCover book={previewBook} detailed />
                <div>
                  {editingDetails ? (
                    <div className="identity-edit-fields">
                      <label><span>Title</span><input value={draft.title} maxLength={300} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
                      <label><span>Subtitle</span><input value={draft.subtitle} maxLength={300} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></label>
                      <label><span>Author</span><input value={draft.author} maxLength={200} onChange={(event) => setDraft({ ...draft, author: event.target.value })} /></label>
                    </div>
                  ) : (
                    <>
                      <span className="book-genre">{draft.primaryGenre}</span>
                      <h1>{draft.title || 'Untitled book'}</h1>
                      {draft.subtitle && <p className="book-subtitle">{draft.subtitle}</p>}
                      <p className="book-author">by {draft.author || 'Unknown author'}</p>
                    </>
                  )}
                  <button type="button" className="text-button" onClick={() => setEditingDetails((value) => !value)}>
                    {editingDetails ? <Check aria-hidden="true" /> : <Pencil aria-hidden="true" />}{editingDetails ? 'Done editing' : 'Edit details'}
                  </button>
                </div>
              </div>

              {editingDetails ? (
                <div className="metadata-editor">
                  <label><span>Synopsis</span><textarea value={draft.synopsis} rows={5} maxLength={20000} onChange={(event) => setDraft({ ...draft, synopsis: event.target.value })} /></label>
                  <div className="form-grid">
                    <label><span>Edition published</span><input value={draft.publishedDate} onChange={(event) => setDraft({ ...draft, publishedDate: event.target.value })} /></label>
                    <label><span>First published</span><input value={draft.firstPublishedDate} onChange={(event) => setDraft({ ...draft, firstPublishedDate: event.target.value })} /></label>
                    <label><span>Publisher</span><input value={draft.publisher} onChange={(event) => setDraft({ ...draft, publisher: event.target.value })} /></label>
                    <label><span>ISBN</span><input value={draft.isbn} inputMode="numeric" onChange={(event) => setDraft({ ...draft, isbn: event.target.value.replace(/[^0-9Xx]/g, '').slice(0, 13) })} /></label>
                    <label><span>Language</span><input value={draft.language} maxLength={20} onChange={(event) => setDraft({ ...draft, language: event.target.value })} /></label>
                    <label><span>Pages</span><input type="number" min="1" value={draft.pageCount} onChange={(event) => setDraft({ ...draft, pageCount: event.target.value })} /></label>
                  </div>
                  <label><span>Primary genre</span><select value={draft.primaryGenre} onChange={(event) => setDraft({ ...draft, primaryGenre: event.target.value as PrimaryGenre })}>{[...PRIMARY_GENRES, ...FALLBACK_GENRES].map((genre) => <option key={genre}>{genre}</option>)}</select></label>
                  <fieldset className="facet-editor">
                    <legend>Genre facets · choose up to two</legend>
                    <div className="facet-options">
                      {GENRE_FACETS.map((facet) => {
                        const checked = draft.facets.includes(facet);
                        return <label key={facet} className={checked ? 'facet-chip active' : 'facet-chip'}><input type="checkbox" checked={checked} disabled={!checked && draft.facets.length >= 2} onChange={() => setDraft({ ...draft, facets: checked ? draft.facets.filter((item) => item !== facet) : [...draft.facets, facet].slice(0, 2) })} />{facet}</label>;
                      })}
                    </div>
                  </fieldset>
                </div>
              ) : (
                <>
                  <dl className="book-metadata">
                    <div><dt>Read</dt><dd>{draft.finishedAt ? formatDate(draft.finishedAt) : statusLabel(draft.status)}</dd></div>
                    <div><dt>Published</dt><dd>{draft.publishedDate || draft.firstPublishedDate || 'Unknown'}</dd></div>
                    <div><dt>Edition</dt><dd>{[draft.publisher, draft.pageCount ? `${draft.pageCount} pages` : ''].filter(Boolean).join(' · ') || 'Not specified'}</dd></div>
                  </dl>
                  <section className="synopsis-block"><span className="page-label">Synopsis</span><p>{draft.synopsis || 'No synopsis yet. Add one when you edit the book details.'}</p></section>
                  <div className="genre-stamp"><strong>{draft.primaryGenre}</strong>{draft.facets.length > 0 && <span>{draft.facets.join(' · ')}</span>}</div>
                </>
              )}

              <div className="page-decoration" aria-hidden="true">{decorationMarks(draft.appearance.decorations)}</div>
              <span className="page-number">1</span>
            </div>
          </div>

          <div className="book-gutter" aria-hidden="true" />

          <div className={`book-page book-page-right${mobilePage === 'review' ? ' mobile-active' : ''}`}>
            <div className="book-page-inner review-page-inner">
              <div className="book-folio">Reading notes</div>
              <div className="review-heading">
                <div><span className="page-label">My review</span><h2>How this book felt</h2></div>
                <button type="button" className={draft.favorite ? 'favorite-button active' : 'favorite-button'} aria-pressed={draft.favorite} onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}><Heart aria-hidden="true" fill={draft.favorite ? 'currentColor' : 'none'} />{draft.favorite ? 'A favorite' : 'Favorite'}</button>
              </div>
              <StarRating value={draft.rating} onChange={(rating) => setDraft({ ...draft, rating })} />
              <label className="review-field">
                <span className="sr-only">Your review</span>
                <textarea
                  value={draft.review}
                  maxLength={100000}
                  placeholder="Write the lines, moments, and feelings you want to remember…"
                  onChange={(event) => setDraft({ ...draft, review: event.target.value })}
                />
              </label>
              <div className="reading-details">
                <label><span>Shelf</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ReadingStatus })}><option value="want-to-read">Want to read</option><option value="reading">Reading</option><option value="read">Finished</option></select></label>
                <label><span>Started</span><input type="date" value={draft.startedAt} onChange={(event) => setDraft({ ...draft, startedAt: event.target.value })} /></label>
                <label><span>Finished</span><input type="date" value={draft.finishedAt} onChange={(event) => setDraft({ ...draft, finishedAt: event.target.value })} /></label>
              </div>
              <label className="check-row spoiler-row"><input type="checkbox" checked={draft.spoiler} onChange={(event) => setDraft({ ...draft, spoiler: event.target.checked })} /><span>This review contains spoilers</span></label>
              <div className="page-save-row">
                <div aria-live="polite">{message && <span className="save-message"><Check aria-hidden="true" />{message}</span>}{error && <span className="form-error">{error}</span>}</div>
                <button type="button" className="primary-action" disabled={saving || (!dirty && authenticated)} onClick={() => void save()}><Save aria-hidden="true" />{saving ? 'Saving…' : authenticated ? 'Save book' : 'Unlock to save'}</button>
              </div>
              <button type="button" className="danger-text-button" disabled={deleting} onClick={() => void remove()}><Trash2 aria-hidden="true" />{deleting ? 'Removing…' : 'Remove from library'}</button>
              <span className="page-number">2</span>
            </div>
          </div>
        </section>

        {customizing && (
          <div className="customizer-drawer">
            <button className="customizer-close icon-control" type="button" aria-label="Close book studio" onClick={() => setCustomizing(false)}><X aria-hidden="true" /></button>
            <BookCustomizer value={draft.appearance} onChange={(appearance) => setDraft({ ...draft, appearance })} />
          </div>
        )}
      </div>

      <div className="book-navigation" aria-label="Move between books">
        <button type="button" disabled={!onPrevious} onClick={onPrevious} aria-label="Previous book"><ChevronLeft aria-hidden="true" /></button>
        <span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <button type="button" disabled={!onNext} onClick={onNext} aria-label="Next book"><ChevronRight aria-hidden="true" /></button>
      </div>
    </main>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (['ArrowRight', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      onChange(Math.min(5, value + 1));
    }
    if (['ArrowLeft', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      onChange(Math.max(0, value - 1));
    }
    if (event.key === 'Home') onChange(0);
    if (event.key === 'End') onChange(5);
  };
  return (
    <fieldset className="rating-field">
      <legend>Your rating</legend>
      <div className="stars" role="radiogroup" aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button type="button" role="radio" aria-checked={value === star} tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1} key={star} className={star <= value ? 'star active' : 'star'} onClick={() => onChange(star)} onKeyDown={handleKey} aria-label={`${star} star${star === 1 ? '' : 's'}`}><Star aria-hidden="true" fill={star <= value ? 'currentColor' : 'none'} /></button>
        ))}
        <span>{value ? `${value}.0` : 'Not rated'}</span>
      </div>
    </fieldset>
  );
}

function decorationMarks(ids: string[]) {
  return ids.map((id) => ({
    'pressed-flower': '❦',
    'handwritten-note': 'Remember this',
    'moon-stamp': '☾',
    'library-card': 'EX LIBRIS',
    'brass-corner': '✦',
    'washi-tape': '////',
  }[id] ?? '•')).join('  ');
}

function statusLabel(status: ReadingStatus) {
  return status === 'read' ? 'Finished' : status === 'reading' ? 'Currently reading' : 'Want to read';
}

function toDateInput(value?: string) {
  if (!value) return '';
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? '';
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}
