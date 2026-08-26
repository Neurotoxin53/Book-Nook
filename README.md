# Book Nook

Book Nook is a personal, scrapbook-style home for book reviews. Your library appears as a shelf of covers; opening a title reveals a full-screen two-page journal with book details on the left and a rating plus review on the right.

## Features

- Searchable and filterable cover library
- Full-screen open-book reading journal
- Editable reviews and keyboard-friendly 1–5 star ratings
- Device-local autosave for reviews, ratings, books, and visual choices
- Add-book form with cover, metadata, synopsis, and reading status
- Five scene themes: Autumn Study, Gothic Archive, Coastal Paperback, Botanical Journal, and Minimal Linen
- Four book constructions: deckle-edge hardcover, old tome, linen hardcover, and standard paperback
- Custom paper tones and optional scrapbook decorations
- Responsive desktop, tablet, and mobile layouts

## Run locally

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Build

```bash
pnpm build
```

The project uses React, TypeScript, Vinext, Vite, and the OpenAI Sites Vite plugin.

Book-cover demo images are served by the [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers).
