'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Flower2,
  Heart,
  Library,
  MoonStar,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Star,
  StickyNote,
  X,
} from 'lucide-react';

type Scene = 'autumn' | 'gothic' | 'coastal' | 'botanical' | 'minimal';
type BookStyle = 'deckle' | 'tome' | 'linen' | 'paperback';
type PaperStyle = 'parchment' | 'ivory' | 'rose' | 'sage';
type Status = 'read' | 'reading' | 'want';
type Decoration = 'flower' | 'note' | 'moon';

type Book = {
  id: string;
  title: string;
  author: string;
  year: number;
  readDate: string;
  cover: string;
  synopsis: string;
  rating: number;
  review: string;
  accent: string;
  status: Status;
  favorite: boolean;
  scene: Scene;
  bookStyle: BookStyle;
  paper: PaperStyle;
  decorations: Decoration[];
};

const starterBooks: Book[] = [
  {
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: 1813,
    readDate: 'August 12, 2026',
    cover: 'https://covers.openlibrary.org/b/id/14348537-L.jpg',
    synopsis:
      'Elizabeth Bennet navigates family pressure, social rank, and her changing judgment of the proud Mr. Darcy.',
    rating: 5,
    review:
      'Sharp, funny, and much warmer than I remembered. Every conversation feels like a tiny duel, but the tenderness sneaks up on you.',
    accent: '#9c4f3f',
    status: 'read',
    favorite: true,
    scene: 'autumn',
    bookStyle: 'deckle',
    paper: 'parchment',
    decorations: ['flower', 'note'],
  },
  {
    id: 'nineteen-eighty-four',
    title: '1984',
    author: 'George Orwell',
    year: 1949,
    readDate: 'July 28, 2026',
    cover: 'https://covers.openlibrary.org/b/id/9267242-L.jpg',
    synopsis:
      'Winston Smith quietly rebels against an authoritarian state that controls language, history, and even private thought.',
    rating: 4,
    review: 'Bleak and frighteningly precise. The ideas lingered longer than the plot.',
    accent: '#263d46',
    status: 'read',
    favorite: false,
    scene: 'gothic',
    bookStyle: 'tome',
    paper: 'parchment',
    decorations: ['moon', 'note'],
  },
  {
    id: 'to-kill-a-mockingbird',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    year: 1960,
    readDate: 'June 16, 2026',
    cover: 'https://covers.openlibrary.org/b/id/14351077-L.jpg',
    synopsis:
      'Through Scout Finch’s childhood perspective, a small Southern town confronts racial injustice and moral courage.',
    rating: 5,
    review: 'Scout’s voice makes the difficult parts human without ever making them simple.',
    accent: '#9b6f39',
    status: 'read',
    favorite: true,
    scene: 'botanical',
    bookStyle: 'linen',
    paper: 'sage',
    decorations: ['flower'],
  },
  {
    id: 'moby-dick',
    title: 'Moby-Dick',
    author: 'Herman Melville',
    year: 1851,
    readDate: 'May 2, 2026',
    cover: 'https://covers.openlibrary.org/b/id/10544254-L.jpg',
    synopsis:
      'Sailor Ishmael joins Captain Ahab’s increasingly destructive pursuit of the white whale that maimed him.',
    rating: 4,
    review: 'Strange, enormous, funny, and exhausting—in the best possible way.',
    accent: '#385d67',
    status: 'reading',
    favorite: false,
    scene: 'coastal',
    bookStyle: 'paperback',
    paper: 'ivory',
    decorations: ['note'],
  },
  {
    id: 'frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    year: 1818,
    readDate: 'March 19, 2026',
    cover: 'https://covers.openlibrary.org/b/id/12356249-L.jpg',
    synopsis:
      'Victor Frankenstein creates sentient life, then recoils from his abandoned creation and unleashes a cycle of loneliness and revenge.',
    rating: 5,
    review: 'More sorrowful than scary. I kept thinking about who was truly made monstrous.',
    accent: '#556a48',
    status: 'read',
    favorite: true,
    scene: 'gothic',
    bookStyle: 'tome',
    paper: 'parchment',
    decorations: ['moon', 'flower'],
  },
  {
    id: 'jane-eyre',
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    year: 1847,
    readDate: 'February 7, 2026',
    cover: 'https://covers.openlibrary.org/b/id/8235363-L.jpg',
    synopsis:
      'An independent young governess falls in love with the brooding master of Thornfield Hall while guarding her dignity.',
    rating: 4,
    review: 'A fierce interior life in a gothic house. Jane’s self-respect is the real love story.',
    accent: '#6b4c52',
    status: 'want',
    favorite: false,
    scene: 'minimal',
    bookStyle: 'linen',
    paper: 'rose',
    decorations: ['flower'],
  },
];

const sceneOptions: { id: Scene; label: string; note: string; colors: string[] }[] = [
  { id: 'autumn', label: 'Autumn Study', note: 'Warm, collected, nostalgic', colors: ['#425149', '#b66d4f', '#d9b683'] },
  { id: 'gothic', label: 'Gothic Archive', note: 'Inky, dramatic, candlelit', colors: ['#22242c', '#65424e', '#b39371'] },
  { id: 'coastal', label: 'Coastal Paperback', note: 'Salt air and soft blue', colors: ['#7d9fa2', '#d8c8ab', '#eee6d8'] },
  { id: 'botanical', label: 'Botanical Journal', note: 'Pressed leaves and linen', colors: ['#5d7058', '#a8a881', '#d8c9a5'] },
  { id: 'minimal', label: 'Minimal Linen', note: 'Quiet, bright, uncluttered', colors: ['#b7aca0', '#e0d6ca', '#f2eee7'] },
];

const bookStyleOptions: { id: BookStyle; label: string; note: string }[] = [
  { id: 'deckle', label: 'Deckle hardcover', note: 'Torn page edges and deep boards' },
  { id: 'tome', label: 'Old tome', note: 'Aged leather and weighty pages' },
  { id: 'linen', label: 'Linen hardcover', note: 'Refined cloth-bound finish' },
  { id: 'paperback', label: 'Standard paperback', note: 'Light, crisp, everyday' },
];

const paperOptions: { id: PaperStyle; label: string; color: string }[] = [
  { id: 'parchment', label: 'Warm parchment', color: '#f1e2c9' },
  { id: 'ivory', label: 'Clean ivory', color: '#f7f3e9' },
  { id: 'rose', label: 'Faded rose', color: '#ead9d2' },
  { id: 'sage', label: 'Pressed sage', color: '#dde0ce' },
];

const decorationOptions: { id: Decoration; label: string; icon: typeof Flower2 }[] = [
  { id: 'flower', label: 'Pressed flowers', icon: Flower2 },
  { id: 'note', label: 'Handwritten note', icon: StickyNote },
  { id: 'moon', label: 'Moon stamp', icon: MoonStar },
];

function Rating({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (['ArrowRight', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      onChange(Math.min(5, value + 1));
    }
    if (['ArrowLeft', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      onChange(Math.max(1, value - 1));
    }
    if (event.key === 'Home') onChange(1);
    if (event.key === 'End') onChange(5);
  };

  return (
    <fieldset className="rating-field">
      <legend>Your rating</legend>
      <div className="stars" role="radiogroup" aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            role="radio"
            key={star}
            className={star <= value ? 'star active' : 'star'}
            onClick={() => onChange(star)}
            onKeyDown={handleKey}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            aria-checked={star === value}
            tabIndex={star === Math.max(1, value) ? 0 : -1}
          >
            <Star size={25} strokeWidth={1.8} fill={star <= value ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Cover({ book, detailed = false }: { book: Book; detailed?: boolean }) {
  if (!book.cover) {
    return (
      <span className={detailed ? 'detail-cover cover-placeholder' : 'cover-placeholder'} aria-label={`No cover for ${book.title}`}>
        <BookOpen aria-hidden="true" />
        <strong>{book.title}</strong>
      </span>
    );
  }
  return <img className={detailed ? 'detail-cover' : undefined} src={book.cover} alt={detailed ? `Cover of ${book.title}` : ''} />;
}

export default function Home() {
  const [library, setLibrary] = useState<Book[]>(starterBooks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | Status | 'favorite'>('all');
  const [customizing, setCustomizing] = useState(false);
  const [customizeTab, setCustomizeTab] = useState<'scene' | 'book' | 'details'>('scene');
  const [addOpen, setAddOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [hydrated, setHydrated] = useState(false);

  const selectedBook = library.find((book) => book.id === selectedId) ?? null;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('book-nook-library');
      if (saved) {
        const parsed = JSON.parse(saved) as Book[];
        if (Array.isArray(parsed) && parsed.length) setLibrary(parsed);
      }
    } catch {
      // The starter library remains available if local storage is unavailable.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem('book-nook-library', JSON.stringify(library));
    } catch {
      // Editing still works in memory when browser storage is unavailable.
    }
  }, [library, hydrated]);

  useEffect(() => {
    if (saveStatus !== 'Saving…') return;
    const timer = window.setTimeout(() => setSaveStatus('Saved'), 650);
    return () => window.clearTimeout(timer);
  }, [library, saveStatus]);

  useEffect(() => {
    if (!customizing && !addOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCustomizing(false);
        setAddOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [customizing, addOpen]);

  const filteredBooks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return library.filter((book) => {
      const matchesQuery = !needle || `${book.title} ${book.author}`.toLowerCase().includes(needle);
      const matchesFilter = filter === 'all' || (filter === 'favorite' ? book.favorite : book.status === filter);
      return matchesQuery && matchesFilter;
    });
  }, [library, query, filter]);

  const updateBook = (id: string, update: Partial<Book>, shouldSave = false) => {
    setLibrary((current) => current.map((book) => (book.id === id ? { ...book, ...update } : book)));
    if (shouldSave) setSaveStatus('Saving…');
  };

  const stepBook = (direction: -1 | 1) => {
    if (!selectedBook) return;
    const currentIndex = library.findIndex((book) => book.id === selectedBook.id);
    const nextIndex = (currentIndex + direction + library.length) % library.length;
    setSelectedId(library[nextIndex].id);
    setSaveStatus('Saved');
  };

  const addBook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') || '').trim();
    const author = String(data.get('author') || '').trim();
    if (!title || !author) return;
    const newBook: Book = {
      id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`,
      title,
      author,
      year: Number(data.get('year')) || new Date().getFullYear(),
      readDate: String(data.get('readDate') || 'Not finished yet'),
      cover: String(data.get('cover') || '').trim(),
      synopsis: String(data.get('synopsis') || 'Add a synopsis when you are ready.').trim(),
      rating: 0,
      review: '',
      accent: '#9c4f3f',
      status: String(data.get('status') || 'read') as Status,
      favorite: false,
      scene: 'autumn',
      bookStyle: 'deckle',
      paper: 'parchment',
      decorations: ['flower', 'note'],
    };
    setLibrary((current) => [newBook, ...current]);
    setAddOpen(false);
    setSelectedId(newBook.id);
    event.currentTarget.reset();
  };

  if (selectedBook) {
    return (
      <main
        className={`reading-room scene-${selectedBook.scene}${customizing ? ' is-customizing' : ''}`}
        style={{ '--book-accent': selectedBook.accent } as React.CSSProperties}
      >
        <div className="desk-grain" aria-hidden="true" />
        {selectedBook.decorations.includes('note') && (
          <div className="desk-scrap scrap-one" aria-hidden="true">READ &amp; REMEMBER</div>
        )}
        {selectedBook.decorations.includes('moon') && (
          <div className="desk-scrap scrap-two" aria-hidden="true">☾</div>
        )}
        {selectedBook.decorations.includes('flower') && (
          <div className="pressed-leaf" aria-hidden="true">⌁</div>
        )}

        <nav className="book-toolbar" aria-label="Book view controls">
          <button className="quiet-button" onClick={() => { setSelectedId(null); setCustomizing(false); }}>
            <ArrowLeft size={18} />
            <span>Back to shelf</span>
          </button>
          <span className="toolbar-title">{selectedBook.title}</span>
          <div className="toolbar-actions">
            <button
              className={`favorite-button${selectedBook.favorite ? ' active' : ''}`}
              aria-label={selectedBook.favorite ? 'Remove from favorites' : 'Add to favorites'}
              title={selectedBook.favorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={() => updateBook(selectedBook.id, { favorite: !selectedBook.favorite })}
            >
              <Heart size={17} fill={selectedBook.favorite ? 'currentColor' : 'none'} />
            </button>
            <button className="customize-button" onClick={() => setCustomizing(true)}>
              <Sparkles size={17} />
              <span>Customize</span>
            </button>
          </div>
        </nav>

        <section
          className={`open-book book-${selectedBook.bookStyle} paper-${selectedBook.paper}`}
          aria-label={`${selectedBook.title} journal entry`}
        >
          <div className="book-page left-page">
            <div className="tape tape-left" aria-hidden="true" />
            <div className="page-number">ENTRY {String(library.findIndex((book) => book.id === selectedBook.id) + 1).padStart(2, '0')}</div>
            <div className="book-info-layout">
              <Cover book={selectedBook} detailed />
              <div className="book-heading">
                <span className="eyebrow">A book I read</span>
                <h1>{selectedBook.title}</h1>
                <p className="author">by {selectedBook.author}</p>
              </div>
            </div>

            <dl className="book-facts">
              <div>
                <dt>Finished</dt>
                <dd>{selectedBook.readDate}</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd>{selectedBook.year}</dd>
              </div>
            </dl>

            <div className="synopsis-block">
              <h2>The story</h2>
              <p>{selectedBook.synopsis}</p>
            </div>
            {selectedBook.decorations.includes('flower') && <div className="botanical-mark" aria-hidden="true">❦</div>}
          </div>

          <div className="book-spine" aria-hidden="true" />

          <div className="book-page right-page">
            <div className="paper-clip" aria-hidden="true" />
            <div className="review-header">
              <div>
                <span className="eyebrow">Notes from the margins</span>
                <h2>What I thought</h2>
              </div>
              <Heart size={22} strokeWidth={1.6} aria-hidden="true" />
            </div>

            <Rating
              value={selectedBook.rating}
              onChange={(rating) => updateBook(selectedBook.id, { rating }, true)}
            />
            <label className="review-label" htmlFor="review-entry">My review</label>
            <textarea
              id="review-entry"
              className="review-paper"
              value={selectedBook.review}
              placeholder="Write what stayed with you…"
              onChange={(event) => updateBook(selectedBook.id, { review: event.target.value }, true)}
              aria-describedby="save-status"
            />
            <div className="review-footer">
              <span id="save-status" role="status" aria-live="polite">{saveStatus}</span>
              {selectedBook.decorations.includes('note') && <span className="ink-note">keep this feeling →</span>}
            </div>
          </div>
        </section>

        <div className="book-pagination" aria-label="Browse books">
          <button onClick={() => stepBook(-1)} aria-label="Previous book" title="Previous book"><ChevronLeft /></button>
          <span>{library.findIndex((book) => book.id === selectedBook.id) + 1} / {library.length}</span>
          <button onClick={() => stepBook(1)} aria-label="Next book" title="Next book"><ChevronRight /></button>
        </div>

        {customizing && (
          <>
            <button className="panel-backdrop" aria-label="Close customization" onClick={() => setCustomizing(false)} />
            <aside className="customizer" aria-label="Customize this book">
              <div className="customizer-heading">
                <div>
                  <span className="eyebrow">Make it yours</span>
                  <h2>Customize</h2>
                </div>
                <button className="round-close" onClick={() => setCustomizing(false)} aria-label="Close customization" title="Close">
                  <X size={19} />
                </button>
              </div>

              <div className="customizer-tabs" role="tablist" aria-label="Customization categories">
                {(['scene', 'book', 'details'] as const).map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={customizeTab === tab}
                    className={customizeTab === tab ? 'active' : ''}
                    onClick={() => setCustomizeTab(tab)}
                  >
                    {tab === 'scene' ? 'Scene' : tab === 'book' ? 'Book' : 'Details'}
                  </button>
                ))}
              </div>

              <div className="customizer-body">
                {customizeTab === 'scene' && (
                  <section aria-labelledby="scene-heading">
                    <h3 id="scene-heading">Choose the atmosphere</h3>
                    <p className="control-help">The room around your book can match its mood.</p>
                    <div className="theme-list">
                      {sceneOptions.map((scene) => (
                        <button
                          key={scene.id}
                          className={`theme-option${selectedBook.scene === scene.id ? ' selected' : ''}`}
                          onClick={() => updateBook(selectedBook.id, { scene: scene.id })}
                        >
                          <span className="theme-swatches" aria-hidden="true">
                            {scene.colors.map((color) => <i key={color} style={{ background: color }} />)}
                          </span>
                          <span><strong>{scene.label}</strong><small>{scene.note}</small></span>
                          {selectedBook.scene === scene.id && <Check size={17} />}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {customizeTab === 'book' && (
                  <section aria-labelledby="book-style-heading">
                    <h3 id="book-style-heading">Book construction</h3>
                    <p className="control-help">Change the physical character of the open book.</p>
                    <div className="style-grid">
                      {bookStyleOptions.map((style) => (
                        <button
                          key={style.id}
                          className={`style-option style-sample-${style.id}${selectedBook.bookStyle === style.id ? ' selected' : ''}`}
                          onClick={() => updateBook(selectedBook.id, { bookStyle: style.id })}
                        >
                          <span className="mini-book" aria-hidden="true"><i /><i /></span>
                          <strong>{style.label}</strong>
                          <small>{style.note}</small>
                          {selectedBook.bookStyle === style.id && <Check className="option-check" size={15} />}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {customizeTab === 'details' && (
                  <section aria-labelledby="details-heading">
                    <h3 id="details-heading">Paper &amp; ephemera</h3>
                    <p className="control-help">Add just enough texture to hold the memory.</p>
                    <h4>Paper tone</h4>
                    <div className="paper-row">
                      {paperOptions.map((paper) => (
                        <button
                          key={paper.id}
                          className={selectedBook.paper === paper.id ? 'selected' : ''}
                          onClick={() => updateBook(selectedBook.id, { paper: paper.id })}
                          aria-label={paper.label}
                          title={paper.label}
                          style={{ background: paper.color }}
                        >
                          {selectedBook.paper === paper.id && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                    <h4>Decorations</h4>
                    <div className="decoration-list">
                      {decorationOptions.map((decoration) => {
                        const active = selectedBook.decorations.includes(decoration.id);
                        const Icon = decoration.icon;
                        return (
                          <button
                            key={decoration.id}
                            className={active ? 'active' : ''}
                            onClick={() => updateBook(selectedBook.id, {
                              decorations: active
                                ? selectedBook.decorations.filter((item) => item !== decoration.id)
                                : [...selectedBook.decorations, decoration.id],
                            })}
                            aria-pressed={active}
                          >
                            <Icon size={18} />
                            <span>{decoration.label}</span>
                            <i aria-hidden="true"><b /></i>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              <div className="customizer-footer">
                <span>Saved to this book</span>
                <button onClick={() => setCustomizing(false)}>Done</button>
              </div>
            </aside>
          </>
        )}
      </main>
    );
  }

  return (
    <main className="library-shell">
      <div className="library-texture" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Book Nook home">
          <span className="brand-mark"><BookOpen size={20} /></span>
          <span>Book Nook</span>
        </a>
        <nav className="header-nav" aria-label="Main navigation">
          <button className={filter !== 'favorite' ? 'active' : ''} onClick={() => setFilter('all')}><Library size={16} />Library</button>
          <button className={filter === 'favorite' ? 'active' : ''} onClick={() => setFilter('favorite')}><Heart size={16} />Favorites</button>
        </nav>
        <button className="add-button" onClick={() => setAddOpen(true)}><Plus size={17} />Add a book</button>
      </header>

      <section className="library-intro" id="top">
        <div>
          <span className="kicker">Your reading life, collected</span>
          <h1>Every book leaves a little behind.</h1>
          <p>Keep the plot, the feeling, and all your favorite thoughts in one beautiful place.</p>
        </div>
        <div className="library-stamp" aria-hidden="true">
          <span>EST.</span><strong>2026</strong><span>PERSONAL LIBRARY</span>
        </div>
      </section>

      <section className="library-section" id="library" aria-labelledby="library-heading">
        <div className="section-header">
          <div>
            <span className="section-label">THE SHELF</span>
            <h2 id="library-heading">{filter === 'favorite' ? 'My favorites' : 'My library'} <sup>{filteredBooks.length}</sup></h2>
          </div>
          <div className="library-actions">
            <label className="search-box">
              <Search size={17} />
              <span className="sr-only">Search your library</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Find a book…" />
            </label>
            <button className="icon-button" aria-label="Clear search and filters" title="Clear search and filters" onClick={() => { setQuery(''); setFilter('all'); }}>
              <Settings2 size={19} />
            </button>
          </div>
        </div>

        <div className="shelf-tabs" role="tablist" aria-label="Library filters">
          {[
            ['all', 'All books'],
            ['reading', 'Currently reading'],
            ['read', 'Finished'],
            ['want', 'Want to read'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? 'active' : ''}
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value as 'all' | Status)}
            >
              {label}
            </button>
          ))}
        </div>

        {filteredBooks.length ? (
          <div className="book-grid">
            {filteredBooks.map((book, index) => (
              <button
                className="book-card"
                key={book.id}
                onClick={() => { setSelectedId(book.id); setSaveStatus('Saved'); }}
                style={{ '--tilt': `${[-1.2, 0.7, -0.3, 1, -0.8, 0.5][index % 6]}deg` } as React.CSSProperties}
              >
                <span className="cover-wrap">
                  <Cover book={book} />
                  <span className="cover-shine" aria-hidden="true" />
                  {book.favorite && <span className="cover-favorite" aria-label="Favorite"><Heart size={12} fill="currentColor" /></span>}
                </span>
                <span className="card-copy">
                  <strong>{book.title}</strong>
                  <span>{book.author}</span>
                </span>
              </button>
            ))}

            <button className="new-book-card" onClick={() => setAddOpen(true)}>
              <span className="new-cover"><Plus size={26} /></span>
              <span className="card-copy"><strong>Add your next read</strong><span>Start a new entry</span></span>
            </button>
          </div>
        ) : (
          <div className="empty-shelf">
            <BookOpen size={31} />
            <h3>No books found</h3>
            <p>Try another search or add a new story to your shelf.</p>
            <button onClick={() => { setQuery(''); setFilter('all'); }}>Show all books</button>
          </div>
        )}
      </section>

      <footer className="library-footer">
        <span>{library.length} {library.length === 1 ? 'story' : 'stories'} kept. Countless feelings remembered.</span>
        <span aria-hidden="true">❦</span>
      </footer>

      {addOpen && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddOpen(false); }}>
          <section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-book-title">
            <div className="add-modal-heading">
              <div>
                <span className="eyebrow">A new memory</span>
                <h2 id="add-book-title">Add a book</h2>
              </div>
              <button className="round-close" onClick={() => setAddOpen(false)} aria-label="Close add book form" title="Close"><X size={19} /></button>
            </div>
            <form onSubmit={addBook}>
              <div className="form-grid">
                <label><span>Title *</span><input name="title" required placeholder="The book title" autoFocus /></label>
                <label><span>Author *</span><input name="author" required placeholder="Author name" /></label>
                <label><span>Published</span><input name="year" type="number" min="0" max="2100" placeholder="Year" /></label>
                <label><span>Read date</span><input name="readDate" type="date" /></label>
                <label><span>Shelf</span><select name="status" defaultValue="read"><option value="read">Finished</option><option value="reading">Currently reading</option><option value="want">Want to read</option></select></label>
                <label className="full"><span>Cover image URL</span><input name="cover" type="url" placeholder="https://…" /></label>
                <label className="full"><span>Synopsis</span><textarea name="synopsis" rows={4} placeholder="A quick reminder of the story…" /></label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setAddOpen(false)}>Cancel</button>
                <button type="submit"><Plus size={16} />Add to my shelf</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
