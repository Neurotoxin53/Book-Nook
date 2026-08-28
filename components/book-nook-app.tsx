'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, RefreshCcw } from 'lucide-react';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { OpenBook } from '@/components/book/open-book';
import { GoodreadsImportDialog } from '@/components/import/goodreads-import-dialog';
import { AddBookDialog } from '@/components/library/add-book-dialog';
import { LibraryHome, type ShelfFilter } from '@/components/library/library-home';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { api, type SessionState } from '@/lib/client/api';
import { DEMO_LIBRARY } from '@/lib/demo/library';
import type { BookRecord } from '@/lib/domain/types';
import type { CreateBookInput, UpdateBookInput } from '@/lib/books/repository';

type Modal = 'auth' | 'add' | 'import' | 'settings' | null;

export function BookNookApp() {
  const [session, setSession] = useState<SessionState>({ authenticated: false });
  const [books, setBooks] = useState<BookRecord[]>(DEMO_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ShelfFilter>('all');
  const [modal, setModal] = useState<Modal>(null);

  const refreshLibrary = useCallback(async () => {
    const currentSession = await api.session();
    setSession(currentSession);
    if (currentSession.authenticated) {
      const result = await api.library();
      setBooks(result.books);
    } else {
      setBooks(DEMO_LIBRARY);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      await refreshLibrary();
    } catch (caught) {
      setSession({ authenticated: false });
      setBooks(DEMO_LIBRARY);
      setLoadError(caught instanceof Error ? caught.message : 'Your library could not be reached.');
    } finally {
      setLoading(false);
    }
  }, [refreshLibrary]);

  useEffect(() => {
    const task = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  useEffect(() => {
    const handlePopState = () => setSelectedId(null);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selected = books.find((book) => book.entry.id === selectedId) ?? null;
  const selectedIndex = selected ? books.findIndex((book) => book.entry.id === selected.entry.id) : -1;

  const openBook = (entryId: string) => {
    setSelectedId(entryId);
    window.history.pushState({ book: entryId }, '', `#book-${encodeURIComponent(entryId)}`);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const closeBook = () => {
    setSelectedId(null);
    if (window.location.hash.startsWith('#book-')) window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#library`);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const requireAccount = (next: Exclude<Modal, 'auth' | 'settings' | null>) => {
    if (session.authenticated) setModal(next);
    else setModal('auth');
  };

  const authenticated = session.authenticated;
  const displayName = authenticated ? session.user.displayName : undefined;

  const onAuthenticated = useCallback(async () => {
    await refreshLibrary();
    setSelectedId(null);
    setModal(null);
  }, [refreshLibrary]);

  const createBook = async (input: CreateBookInput) => {
    const result = await api.createBook(input);
    setBooks((current) => [result.book, ...current]);
    setSelectedId(result.book.entry.id);
  };

  const updateBook = async (entryId: string, update: UpdateBookInput) => {
    const result = await api.updateBook(entryId, update);
    setBooks((current) => current.map((book) => book.entry.id === entryId ? result.book : book));
  };

  const deleteBook = async (entryId: string) => {
    await api.deleteBook(entryId);
    setBooks((current) => current.filter((book) => book.entry.id !== entryId));
    closeBook();
  };

  const home = useMemo(() => (
    <LibraryHome
      books={books}
      authenticated={authenticated}
      displayName={displayName}
      query={query}
      filter={filter}
      onQuery={setQuery}
      onFilter={setFilter}
      onOpen={openBook}
      onAdd={() => requireAccount('add')}
      onImport={() => requireAccount('import')}
      onSettings={() => setModal('settings')}
      onAuth={() => setModal('auth')}
    />
  // Callbacks intentionally capture the current shelf state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [books, authenticated, displayName, query, filter]);

  if (loading) {
    return <main className="loading-screen"><span className="loading-mark"><BookOpen aria-hidden="true" /></span><span className="eyebrow">Opening your nook</span><h1>My Book Nook</h1><div className="loading-line" /></main>;
  }

  return (
    <>
      {selected ? (
        <OpenBook
          key={selected.entry.id}
          book={selected}
          authenticated={authenticated}
          onBack={closeBook}
          onSave={(update) => updateBook(selected.entry.id, update)}
          onDelete={() => deleteBook(selected.entry.id)}
          onRequireAuth={() => setModal('auth')}
          onPrevious={selectedIndex > 0 ? () => setSelectedId(books[selectedIndex - 1].entry.id) : undefined}
          onNext={selectedIndex >= 0 && selectedIndex < books.length - 1 ? () => setSelectedId(books[selectedIndex + 1].entry.id) : undefined}
        />
      ) : home}

      {loadError && (
        <div className="connection-banner" role="alert"><span>{loadError} The demo shelf is still available.</span><button type="button" onClick={() => void refresh()}><RefreshCcw aria-hidden="true" />Try again</button></div>
      )}

      {modal === 'auth' && <AuthDialog onClose={() => setModal(null)} onAuthenticated={onAuthenticated} />}
      {modal === 'add' && <AddBookDialog onClose={() => setModal(null)} onCreated={createBook} />}
      {modal === 'import' && <GoodreadsImportDialog onClose={() => setModal(null)} onImported={refreshLibrary} />}
      {modal === 'settings' && (
        <SettingsDialog
          session={session}
          onClose={() => setModal(null)}
          onAuth={() => setModal('auth')}
          onSessionChanged={refreshLibrary}
          onLibraryChanged={refreshLibrary}
        />
      )}
    </>
  );
}
