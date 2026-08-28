'use client';

import { useState } from 'react';
import { BookOpen, Check, LoaderCircle, Search, Sparkles } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ApiClientError, api } from '@/lib/client/api';
import type { BookLookupCandidate } from '@/lib/domain/types';
import type { CreateBookInput } from '@/lib/books/repository';

type BookForm = {
  title: string;
  subtitle: string;
  author: string;
  isbn10: string;
  isbn13: string;
  publisher: string;
  publishedDate: string;
  firstPublishedDate: string;
  language: string;
  pageCount: string;
  coverUrl: string;
  synopsis: string;
  subjects: string;
};

const emptyForm: BookForm = {
  title: '',
  subtitle: '',
  author: '',
  isbn10: '',
  isbn13: '',
  publisher: '',
  publishedDate: '',
  firstPublishedDate: '',
  language: '',
  pageCount: '',
  coverUrl: '',
  synopsis: '',
  subjects: '',
};

function candidateToForm(candidate: BookLookupCandidate): BookForm {
  return {
    title: candidate.title,
    subtitle: candidate.subtitle ?? '',
    author: candidate.contributors.find((person) => person.role === 'author')?.name ?? candidate.contributors[0]?.name ?? '',
    isbn10: candidate.isbn10 ?? '',
    isbn13: candidate.isbn13 ?? '',
    publisher: candidate.publisher ?? '',
    publishedDate: candidate.publishedDate ?? '',
    firstPublishedDate: candidate.firstPublishedDate ?? '',
    language: candidate.language ?? '',
    pageCount: candidate.pageCount ? String(candidate.pageCount) : '',
    coverUrl: candidate.coverUrl ?? '',
    synopsis: candidate.synopsis ?? '',
    subjects: candidate.subjects.join(', '),
  };
}

export function AddBookDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (input: CreateBookInput) => Promise<void>;
}) {
  const [query, setQuery] = useState({ isbn: '', title: '', author: '' });
  const [candidates, setCandidates] = useState<BookLookupCandidate[]>([]);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [selected, setSelected] = useState<BookLookupCandidate | null>(null);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [strategy, setStrategy] = useState('');

  const search = async () => {
    setSearching(true);
    setError('');
    try {
      const result = await api.lookup(query);
      setCandidates(result.candidates);
      setStrategy(result.strategy);
      if (!result.candidates.length) setError('No edition matched. You can still enter this book manually.');
    } catch (caught) {
      setError(caught instanceof ApiClientError || caught instanceof Error ? caught.message : 'Lookup failed. You can still add the book manually.');
    } finally {
      setSearching(false);
    }
  };

  const chooseCandidate = async (candidate: BookLookupCandidate) => {
    setSelected(candidate);
    setForm(candidateToForm(candidate));
    setError('');
    const workKey = candidate.sourceIds.work;
    if (!workKey) return;
    try {
      const details = await api.workDetails(workKey);
      setForm((current) => ({
        ...current,
        synopsis: details.synopsis || current.synopsis,
        subjects: [...new Set([...current.subjects.split(',').map((item) => item.trim()).filter(Boolean), ...details.subjects])].join(', '),
      }));
    } catch {
      // Edition selection still works when the optional detail request fails.
    }
  };

  const create = async () => {
    if (!form.title.trim()) {
      setError('A title is required.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await onCreated({
        title: form.title,
        subtitle: form.subtitle || undefined,
        author: form.author || undefined,
        isbn10: form.isbn10 || undefined,
        isbn13: form.isbn13 || undefined,
        publisher: form.publisher || undefined,
        publishedDate: form.publishedDate || undefined,
        firstPublishedDate: form.firstPublishedDate || undefined,
        language: form.language || undefined,
        pageCount: Number(form.pageCount) || undefined,
        coverUrl: form.coverUrl || undefined,
        synopsis: form.synopsis,
        subjects: form.subjects.split(',').map((subject) => subject.trim()).filter(Boolean),
        source: selected ? 'open-library' : 'manual',
        sourceIds: selected?.sourceIds,
        provenance: selected?.provenance,
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The book could not be added.');
    } finally {
      setCreating(false);
    }
  };

  const field = <Key extends keyof BookForm>(key: Key, value: BookForm[Key]) => setForm({ ...form, [key]: value });

  return (
    <Dialog title="Add a book" eyebrow="Lookup or enter manually" onClose={onClose} wide footer={
      <div className="dialog-footer-actions">
        <span>{selected ? 'Open Library fields stay editable and retain their source.' : 'Manual entry is always available.'}</span>
        <button className="primary-action" type="button" disabled={creating || !form.title.trim()} onClick={() => void create()}><BookOpen aria-hidden="true" />{creating ? 'Adding…' : 'Add to my nook'}</button>
      </div>
    }>
      <form className="lookup-form" onSubmit={(event) => { event.preventDefault(); void search(); }}>
        <label><span>ISBN</span><input value={query.isbn} inputMode="numeric" placeholder="978…" onChange={(event) => setQuery({ ...query, isbn: event.target.value })} /></label>
        <span className="lookup-or">or</span>
        <label><span>Title</span><input value={query.title} placeholder="Book title" onChange={(event) => setQuery({ ...query, title: event.target.value })} /></label>
        <label><span>Author</span><input value={query.author} placeholder="Optional author" onChange={(event) => setQuery({ ...query, author: event.target.value })} /></label>
        <button className="secondary-action" type="submit" disabled={searching || (!query.isbn.trim() && !query.title.trim())}>{searching ? <LoaderCircle className="spin" aria-hidden="true" /> : <Search aria-hidden="true" />}{searching ? 'Searching…' : 'Search'}</button>
      </form>

      {candidates.length > 0 && (
        <section className="lookup-results" aria-labelledby="lookup-results-title">
          <div className="section-inline-heading"><h3 id="lookup-results-title">Choose an edition</h3><span>{candidates.length} result{candidates.length === 1 ? '' : 's'} · {strategy.replace('-', ' ')}</span></div>
          <div className="candidate-strip">
            {candidates.map((candidate) => (
              <button type="button" className={selected?.candidateId === candidate.candidateId ? 'candidate-card active' : 'candidate-card'} key={candidate.candidateId} onClick={() => void chooseCandidate(candidate)}>
                {candidate.coverUrl ? <span className="candidate-cover" role="img" aria-label={`Cover of ${candidate.title}`} style={{ backgroundImage: `url(${JSON.stringify(candidate.coverUrl).slice(1, -1)})` }} /> : <span className="candidate-cover empty"><BookOpen aria-hidden="true" /></span>}
                <span><strong>{candidate.title}</strong><small>{candidate.contributors[0]?.name || 'Unknown author'}</small><small>{[candidate.publisher, candidate.publishedDate].filter(Boolean).join(' · ') || 'Edition details unavailable'}</small></span>
                {selected?.candidateId === candidate.candidateId && <Check className="candidate-check" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="book-entry-form" aria-labelledby="book-entry-title">
        <div className="section-inline-heading"><h3 id="book-entry-title">Book information</h3><button type="button" className="text-button" onClick={() => { setSelected(null); setForm(emptyForm); }}><Sparkles aria-hidden="true" />Start a blank entry</button></div>
        <div className="form-grid">
          <label className="span-two"><span>Title</span><input required maxLength={300} value={form.title} onChange={(event) => field('title', event.target.value)} /></label>
          <label className="span-two"><span>Subtitle</span><input maxLength={300} value={form.subtitle} onChange={(event) => field('subtitle', event.target.value)} /></label>
          <label><span>Author</span><input maxLength={200} value={form.author} onChange={(event) => field('author', event.target.value)} /></label>
          <label><span>Publisher</span><input maxLength={300} value={form.publisher} onChange={(event) => field('publisher', event.target.value)} /></label>
          <label><span>ISBN-13</span><input inputMode="numeric" value={form.isbn13} onChange={(event) => field('isbn13', event.target.value.replace(/[^0-9]/g, '').slice(0, 13))} /></label>
          <label><span>ISBN-10</span><input value={form.isbn10} onChange={(event) => field('isbn10', event.target.value.replace(/[^0-9Xx]/g, '').slice(0, 10))} /></label>
          <label><span>Edition published</span><input value={form.publishedDate} onChange={(event) => field('publishedDate', event.target.value)} /></label>
          <label><span>First published</span><input value={form.firstPublishedDate} onChange={(event) => field('firstPublishedDate', event.target.value)} /></label>
          <label><span>Language</span><input maxLength={20} value={form.language} onChange={(event) => field('language', event.target.value)} /></label>
          <label><span>Pages</span><input type="number" min="1" value={form.pageCount} onChange={(event) => field('pageCount', event.target.value)} /></label>
          <label className="span-two"><span>Cover URL</span><input type="url" value={form.coverUrl} onChange={(event) => field('coverUrl', event.target.value)} /></label>
          <label className="span-four"><span>Synopsis</span><textarea rows={4} maxLength={20000} value={form.synopsis} onChange={(event) => field('synopsis', event.target.value)} /></label>
          <label className="span-four"><span>Subjects <small>comma-separated, used for the genre template</small></span><input value={form.subjects} onChange={(event) => field('subjects', event.target.value)} /></label>
        </div>
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Dialog>
  );
}
