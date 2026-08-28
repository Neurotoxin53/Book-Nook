'use client';

import { BookOpen, Heart } from 'lucide-react';
import type { BookRecord } from '@/lib/domain/types';

export function BookCover({ book, detailed = false }: { book: BookRecord; detailed?: boolean }) {
  const cover = book.edition.coverUrl;
  if (!cover) {
    return (
      <span className={`cover-art cover-placeholder${detailed ? ' cover-detailed' : ''}`} role="img" aria-label={`No cover available for ${book.work.title}`}>
        <BookOpen aria-hidden="true" />
        <strong>{book.work.title}</strong>
        <small>{book.edition.contributors[0]?.name}</small>
      </span>
    );
  }
  return (
    <span
      className={`cover-art${detailed ? ' cover-detailed' : ''} cover-treatment-${book.appearance.coverTreatmentId}`}
      role="img"
      aria-label={`Cover of ${book.work.title}`}
      style={{ backgroundImage: `url(${JSON.stringify(cover).slice(1, -1)})` }}
    >
      {book.entry.favorite && !detailed && <span className="cover-heart" aria-label="Favorite"><Heart aria-hidden="true" fill="currentColor" /></span>}
    </span>
  );
}

