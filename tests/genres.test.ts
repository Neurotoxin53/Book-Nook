import { describe, expect, it } from 'vitest';
import { classifyGenre, composeAppearanceRecipe, GENRE_FACETS, PRIMARY_GENRES } from '@/lib/genres/taxonomy';

describe('genre taxonomy', () => {
  it('contains exactly 25 primary genres and 10 facets', () => {
    expect(PRIMARY_GENRES).toHaveLength(25);
    expect(GENRE_FACETS).toHaveLength(10);
  });

  it('finds a fantasy romance and composes the facet modification', () => {
    const result = classifyGenre({ subjects: ['Fantasy', 'Romance'], synopsis: 'An epic fantasy courtship.' });
    expect(result.primaryGenre).toBe('Fantasy');
    expect(result.facets).toContain('Romance-forward');
    expect(result.autoApply).toBe(true);
    const appearance = composeAppearanceRecipe(result.primaryGenre, result.facets);
    expect(appearance.constructionId).toBe('wizard-grimoire');
    expect(appearance.accent).toBe('#a74f68');
  });

  it('distinguishes cyberpunk from general science fiction', () => {
    const result = classifyGenre({ subjects: ['Science fiction', 'Cyberpunk', 'Virtual reality'] });
    expect(result.primaryGenre).toBe('Science Fiction');
    expect(result.facets[0]).toBe('Cyberpunk');
  });
});

