'use client';

import { BookOpen, Heart, Import, KeyRound, Library, Plus, Search, Settings2 } from 'lucide-react';
import type { BookRecord, ReadingStatus } from '@/lib/domain/types';
import { BookCover } from '@/components/library/book-cover';

export type ShelfFilter = 'all' | ReadingStatus | 'favorite';

export function LibraryHome({
  books,
  authenticated,
  displayName,
  query,
  filter,
  onQuery,
  onFilter,
  onOpen,
  onAdd,
  onImport,
  onSettings,
  onAuth,
}: {
  books: BookRecord[];
  authenticated: boolean;
  displayName?: string;
  query: string;
  filter: ShelfFilter;
  onQuery: (value: string) => void;
  onFilter: (filter: ShelfFilter) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onImport: () => void;
  onSettings: () => void;
  onAuth: () => void;
}) {
  const needle = query.trim().toLowerCase();
  const filtered = books.filter((book) => {
    const author = book.edition.contributors.map((person) => person.name).join(' ');
    const matchesQuery = !needle || `${book.work.title} ${author} ${book.work.primaryGenre}`.toLowerCase().includes(needle);
    const matchesShelf = filter === 'all'
      || (filter === 'favorite' ? book.entry.favorite : book.entry.status === filter);
    return matchesQuery && matchesShelf;
  });

  return (
    <main className="shelf-shell">
      <header className="app-header">
        <a className="brand" href="#library" aria-label="My Book Nook home">
          <span className="brand-mark"><BookOpen aria-hidden="true" /></span>
          <span><strong>My Book Nook</strong><small>{authenticated ? `${displayName || 'Reader'}’s library` : 'Private beta preview'}</small></span>
        </a>
        <div className="header-actions">
          <button type="button" className="header-button hide-small" onClick={onImport}><Import aria-hidden="true" />Import</button>
          <button type="button" className="header-button primary" onClick={onAdd}><Plus aria-hidden="true" />Add book</button>
          <button type="button" className="icon-control" onClick={onSettings} aria-label="Settings and about" title="Settings and about"><Settings2 aria-hidden="true" /></button>
        </div>
      </header>

      {!authenticated && (
        <aside className="beta-banner">
          <div><KeyRound aria-hidden="true" /><span><strong>You’re exploring the demo shelf.</strong> Unlock your private library to save books across devices.</span></div>
          <button type="button" onClick={onAuth}>Unlock with passkey</button>
        </aside>
      )}

      <section className="library-main" id="library" aria-labelledby="library-title">
        <div className="library-heading-row">
          <div>
            <span className="eyebrow">The shelf</span>
            <h1 id="library-title">{filter === 'favorite' ? 'Favorites' : 'My library'} <sup>{filtered.length}</sup></h1>
          </div>
          <div className="library-tools">
            <label className="search-control">
              <Search aria-hidden="true" />
              <span className="sr-only">Search your library</span>
              <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search title, author, or genre" />
            </label>
            <button type="button" className="mobile-import" onClick={onImport}><Import aria-hidden="true" />Import</button>
          </div>
        </div>

        <nav className="shelf-filters" aria-label="Library filters">
          {([
            ['all', 'All books', Library],
            ['reading', 'Reading', BookOpen],
            ['read', 'Finished', BookOpen],
            ['want-to-read', 'Want to read', Plus],
            ['favorite', 'Favorites', Heart],
          ] as const).map(([value, label, Icon]) => (
            <button type="button" key={value} className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => onFilter(value)}>
              <Icon aria-hidden="true" />{label}
            </button>
          ))}
        </nav>

        {filtered.length ? (
          <div className="cover-grid">
            {filtered.map((book) => (
              <button type="button" className="cover-card" key={book.entry.id} onClick={() => onOpen(book.entry.id)}>
                <BookCover book={book} />
                <span className="cover-copy"><strong>{book.work.title}</strong><span>{book.edition.contributors[0]?.name || 'Unknown author'}</span></span>
              </button>
            ))}
            <button type="button" className="cover-card add-cover-card" onClick={onAdd}>
              <span className="add-cover"><Plus aria-hidden="true" /><small>Add your next read</small></span>
              <span className="cover-copy"><strong>Add a book</strong><span>Lookup or enter manually</span></span>
            </button>
          </div>
        ) : (
          <div className="empty-library">
            <BookOpen aria-hidden="true" />
            <h2>No books here yet</h2>
            <p>Try a different filter or add your next read.</p>
            <button type="button" onClick={() => { onQuery(''); onFilter('all'); }}>Show all books</button>
          </div>
        )}
      </section>
    </main>
  );
}

