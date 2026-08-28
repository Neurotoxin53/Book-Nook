import type { Appearance } from '@/lib/domain/types';
import { DEFAULT_APPEARANCE } from '@/lib/appearance/registry';

export const PRIMARY_GENRES = [
  'Literary and Contemporary Fiction',
  'Romance',
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Thriller and Suspense',
  'Horror',
  'Historical Fiction',
  'Adventure',
  'Classics',
  'Young Adult',
  'Children’s and Middle Grade',
  'Graphic Novels and Manga',
  'Poetry',
  'Drama and Plays',
  'Memoir',
  'Biography',
  'History',
  'True Crime',
  'Science and Nature',
  'Psychology',
  'Philosophy',
  'Self-Help and Wellness',
  'Business and Economics',
  'Society, Politics and Current Affairs',
] as const;

export const FALLBACK_GENRES = ['General Nonfiction', 'Uncategorized'] as const;

export const GENRE_FACETS = [
  'Romance-forward',
  'Dark/Gothic',
  'Cozy',
  'Historical',
  'Dystopian',
  'Cyberpunk',
  'Paranormal/Supernatural',
  'Epic/High Fantasy',
  'Psychological',
  'Mythic/Folkloric',
] as const;

export type PrimaryGenre = (typeof PRIMARY_GENRES)[number] | (typeof FALLBACK_GENRES)[number];
export type GenreFacet = (typeof GENRE_FACETS)[number];

type KeywordRule = { phrase: string; weight: number };
type ClassificationInput = { title?: string; synopsis?: string; subjects?: string[] };

const rules = (entries: Array<string | [string, number]>): KeywordRule[] =>
  entries.map((entry) => typeof entry === 'string' ? { phrase: entry, weight: 1 } : { phrase: entry[0], weight: entry[1] });

const primaryRules: Record<(typeof PRIMARY_GENRES)[number], KeywordRule[]> = {
  'Literary and Contemporary Fiction': rules([['literary fiction', 3], 'domestic fiction', 'contemporary fiction', 'family life', 'psychological fiction']),
  Romance: rules([['romance', 2.5], 'love stories', 'romantic fiction', 'relationships', 'courtship']),
  Fantasy: rules([['fantasy', 2.5], ['epic fantasy', 1.5], ['romantasy', 3], 'magic', 'wizards', 'dragons', 'imaginary worlds', 'fairies']),
  'Science Fiction': rules([['science fiction', 3], 'space opera', 'alien', 'time travel', 'robots', 'speculative fiction']),
  Mystery: rules([['mystery', 2.5], 'detective', 'whodunit', 'private investigators', 'crime fiction']),
  'Thriller and Suspense': rules([['thriller', 2.5], 'suspense', 'spy stories', 'espionage', 'legal stories']),
  Horror: rules([['horror', 3], 'ghost stories', 'monsters', 'occult fiction', 'haunted']),
  'Historical Fiction': rules([['historical fiction', 3], 'historical novels', 'war fiction', 'period fiction']),
  Adventure: rules([['adventure', 2.5], 'survival', 'quests', 'exploration', 'sea stories']),
  Classics: rules([['classic literature', 3], 'classics', 'canonical literature', '19th century fiction']),
  'Young Adult': rules([['young adult', 3], 'teen fiction', 'adolescence', 'juvenile fiction']),
  'Children’s and Middle Grade': rules([['children', 2.5], 'middle grade', 'juvenile literature', 'picture books', 'children stories']),
  'Graphic Novels and Manga': rules([['graphic novels', 3], ['manga', 3], 'comic books', 'sequential art']),
  Poetry: rules([['poetry', 3], 'poems', 'verse']),
  'Drama and Plays': rules([['drama', 2.5], ['plays', 2.5], 'theater', 'tragedies', 'comedies']),
  Memoir: rules([['memoir', 3], 'personal narratives', 'autobiography', 'reminiscences']),
  Biography: rules([['biography', 3], 'biographies', 'life stories']),
  History: rules([['history', 2.5], 'historical study', 'civilization', 'military history']),
  'True Crime': rules([['true crime', 3], 'criminal cases', 'murder investigation', 'organized crime']),
  'Science and Nature': rules([['science', 2], 'nature', 'biology', 'physics', 'astronomy', 'environment']),
  Psychology: rules([['psychology', 3], 'behavior', 'cognition', 'mental health research']),
  Philosophy: rules([['philosophy', 3], 'ethics', 'metaphysics', 'epistemology', 'philosophers']),
  'Self-Help and Wellness': rules([['self-help', 3], 'wellness', 'personal development', 'health', 'mindfulness']),
  'Business and Economics': rules([['business', 2.5], 'economics', 'finance', 'management', 'entrepreneurship']),
  'Society, Politics and Current Affairs': rules([['politics', 2.5], 'social issues', 'current affairs', 'government', 'sociology', 'public policy']),
};

const facetRules: Record<GenreFacet, KeywordRule[]> = {
  'Romance-forward': rules([['romantasy', 4], ['romance', 2], 'love story', 'courtship']),
  'Dark/Gothic': rules([['gothic', 3], 'dark fantasy', 'haunted house', 'macabre', 'noir']),
  Cozy: rules([['cozy', 3], 'small town', 'gentle mystery', 'found family']),
  Historical: rules([['historical', 2], 'victorian', 'regency', 'medieval', 'ancient world']),
  Dystopian: rules([['dystopian', 3], 'totalitarian', 'post-apocalyptic', 'oppressive society']),
  Cyberpunk: rules([['cyberpunk', 4], 'virtual reality', 'megacorporation', 'cyberspace', 'android']),
  'Paranormal/Supernatural': rules([['paranormal', 3], ['supernatural', 3], 'vampires', 'werewolves', 'ghosts']),
  'Epic/High Fantasy': rules([['high fantasy', 3], ['epic fantasy', 3], 'secondary world', 'quest fantasy']),
  Psychological: rules([['psychological', 2.5], 'unreliable narrator', 'obsession', 'mind games']),
  'Mythic/Folkloric': rules([['mythology', 3], ['folklore', 3], 'fairy tales', 'legend', 'retelling']),
};

const normalize = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function scoreRules(haystack: string, sourceRules: KeywordRule[]) {
  const matched: string[] = [];
  const score = sourceRules.reduce((sum, rule) => {
    const phrase = normalize(rule.phrase);
    if (!phrase || !haystack.includes(phrase)) return sum;
    matched.push(rule.phrase);
    return sum + rule.weight;
  }, 0);
  return { score, matched };
}

export type GenreClassification = {
  primaryGenre: PrimaryGenre;
  facets: GenreFacet[];
  confidence: number;
  autoApply: boolean;
  reasons: string[];
  scores: Array<{ genre: PrimaryGenre; score: number }>;
};

export function classifyGenre(input: ClassificationInput, threshold = 0.58): GenreClassification {
  const subjectText = (input.subjects ?? []).map(normalize).join(' | ');
  const bodyText = normalize(`${input.title ?? ''} ${input.synopsis ?? ''}`);
  const haystack = `${subjectText} | ${bodyText}`;
  const scored = PRIMARY_GENRES.map((genre) => {
    const result = scoreRules(haystack, primaryRules[genre]);
    return { genre: genre as PrimaryGenre, score: result.score, matched: result.matched };
  }).sort((a, b) => b.score - a.score || a.genre.localeCompare(b.genre));

  const best = scored[0];
  const runnerUp = scored[1];
  const nonfictionSignal = /biography|history|science|psychology|philosophy|business|economics|politics|self help|memoir/.test(haystack);
  const primaryGenre: PrimaryGenre = best.score > 0
    ? best.genre
    : nonfictionSignal ? 'General Nonfiction' : 'Uncategorized';
  const margin = Math.max(0, best.score - runnerUp.score);
  const confidence = best.score === 0
    ? 0
    : Math.min(0.99, 0.38 + Math.min(best.score, 5) * 0.09 + Math.min(margin, 3) * 0.08);

  const facets = GENRE_FACETS.map((facet) => {
    const result = scoreRules(haystack, facetRules[facet]);
    return { facet, ...result };
  })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.facet.localeCompare(b.facet))
    .slice(0, 2);

  return {
    primaryGenre,
    facets: facets.map((result) => result.facet),
    confidence,
    autoApply: confidence >= threshold,
    reasons: [
      ...best.matched.map((phrase) => `Primary match: ${phrase}`),
      ...facets.flatMap((result) => result.matched.map((phrase) => `Facet match: ${phrase}`)),
    ],
    scores: scored.map(({ genre, score }) => ({ genre, score })),
  };
}

const baseRecipes: Partial<Record<PrimaryGenre, Partial<Appearance>>> = {
  Romance: { sceneId: 'botanical-journal', pageId: 'ivory', constructionId: 'linen-hardcover', fontId: 'cormorant-garamond', accent: '#9b5561' },
  Fantasy: { sceneId: 'enchanted-library', pageId: 'parchment', constructionId: 'wizard-grimoire', fontId: 'cinzel', accent: '#66518a' },
  'Science Fiction': { sceneId: 'celestial-study', pageId: 'dotted-notebook', constructionId: 'modern-hardcover', fontId: 'space-mono', accent: '#4a6c8c' },
  Mystery: { sceneId: 'dark-academia', pageId: 'foxed-paper', constructionId: 'antique-tome', fontId: 'spectral', accent: '#6c4f45' },
  Horror: { sceneId: 'gothic-archive', pageId: 'foxed-paper', constructionId: 'antique-tome', fontId: 'im-fell-english-sc', accent: '#6e3341' },
  'Historical Fiction': { sceneId: 'autumn-study', pageId: 'parchment', constructionId: 'medieval-leather', fontId: 'eb-garamond', accent: '#81583c' },
  Memoir: { sceneId: 'minimal-linen', pageId: 'ruled-journal', constructionId: 'stitched-journal', fontId: 'literata', accent: '#6b6f5a' },
  History: { sceneId: 'dark-academia', pageId: 'foxed-paper', constructionId: 'linen-hardcover', fontId: 'cardo', accent: '#70543c' },
  Poetry: { sceneId: 'botanical-journal', pageId: 'ivory', constructionId: 'stitched-journal', fontId: 'alegreya', accent: '#6f6a8a' },
  'Business and Economics': { sceneId: 'minimal-linen', pageId: 'dotted-notebook', constructionId: 'modern-hardcover', fontId: 'manrope', accent: '#365e66' },
};

const facetRecipes: Record<GenreFacet, Partial<Appearance>> = {
  'Romance-forward': { accent: '#a74f68', decorations: ['pressed-flower', 'handwritten-note'] },
  'Dark/Gothic': { sceneId: 'gothic-archive', pageId: 'foxed-paper', accent: '#5d3242' },
  Cozy: { sceneId: 'winter-reading-room', pageId: 'ivory', accent: '#936d4d' },
  Historical: { pageId: 'parchment', constructionId: 'medieval-leather' },
  Dystopian: { sceneId: 'gothic-archive', constructionId: 'modern-hardcover', accent: '#53606c' },
  Cyberpunk: { sceneId: 'celestial-study', fontId: 'space-mono', accent: '#8a3f92' },
  'Paranormal/Supernatural': { sceneId: 'enchanted-library', decorations: ['moon-stamp', 'brass-corner'] },
  'Epic/High Fantasy': { constructionId: 'wizard-grimoire', pageId: 'illuminated-border', fontId: 'cinzel' },
  Psychological: { sceneId: 'dark-academia', fontId: 'spectral', accent: '#5b586e' },
  'Mythic/Folkloric': { sceneId: 'forest-archive', pageId: 'illuminated-border', fontId: 'almendra' },
};

export function composeAppearanceRecipe(primaryGenre: PrimaryGenre, facets: GenreFacet[]) {
  return facets.slice(0, 2).reduce(
    (appearance, facet) => ({ ...appearance, ...facetRecipes[facet] }),
    { ...DEFAULT_APPEARANCE, ...(baseRecipes[primaryGenre] ?? {}) },
  );
}
