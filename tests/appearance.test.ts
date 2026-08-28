import { describe, expect, it } from 'vitest';
import { constructions, fonts, pages, scenes } from '@/lib/appearance/registry';

describe('appearance registry', () => {
  it('ships the complete initial catalog', () => {
    expect(constructions).toHaveLength(8);
    expect(scenes).toHaveLength(10);
    expect(pages).toHaveLength(6);
    expect(fonts).toHaveLength(36);
    expect(new Set(fonts.map((font) => font.id)).size).toBe(36);
  });

  it('restricts ornamental handwriting and fantasy fonts to headings', () => {
    expect(fonts.filter((font) => ['handwriting', 'decorative-fantasy'].includes(font.group)).every((font) => font.headingOnly)).toBe(true);
  });
});

