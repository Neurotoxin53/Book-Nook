import type { Appearance } from '@/lib/domain/types';

export const APPEARANCE_REGISTRY_VERSION = 1;

export type AppearanceOption = {
  id: string;
  label: string;
  description: string;
};

export type SceneOption = AppearanceOption & {
  colors: [string, string, string];
};

export type FontGroup =
  | 'editorial-serif'
  | 'classic-serif'
  | 'clean-sans'
  | 'typewriter-mono'
  | 'handwriting'
  | 'decorative-fantasy';

export type FontOption = AppearanceOption & {
  family: string;
  group: FontGroup;
  weights: number[];
  license: 'OFL-1.1' | 'Apache-2.0';
  licenseUrl: string;
  headingOnly: boolean;
  files: Partial<Record<'400' | '500' | '600' | '700', string>>;
};

export const constructions: AppearanceOption[] = [
  { id: 'deckle-hardcover', label: 'Deckle hardcover', description: 'Torn page edges and deep book boards' },
  { id: 'linen-hardcover', label: 'Linen hardcover', description: 'Refined cloth-bound finish' },
  { id: 'paperback', label: 'Paperback', description: 'Light, crisp, and everyday' },
  { id: 'antique-tome', label: 'Antique tome', description: 'Aged leather and weighty pages' },
  { id: 'wizard-grimoire', label: 'Wizard grimoire', description: 'Arcane tooling, corner guards, and glow' },
  { id: 'medieval-leather', label: 'Medieval leather-bound', description: 'Raised bands and hand-tooled leather' },
  { id: 'stitched-journal', label: 'Stitched journal', description: 'Visible thread and a handmade cover' },
  { id: 'modern-hardcover', label: 'Modern hardcover', description: 'Clean boards with a precise spine' },
];

export const scenes: SceneOption[] = [
  { id: 'autumn-study', label: 'Autumn Study', description: 'Warm, collected, nostalgic', colors: ['#34473f', '#ad654d', '#d7b887'] },
  { id: 'gothic-archive', label: 'Gothic Archive', description: 'Inky, dramatic, candlelit', colors: ['#202329', '#60424d', '#b09575'] },
  { id: 'coastal-paperback', label: 'Coastal Paperback', description: 'Salt air and soft blue', colors: ['#76999c', '#d5c5a8', '#eee7dc'] },
  { id: 'botanical-journal', label: 'Botanical Journal', description: 'Pressed leaves and linen', colors: ['#566b55', '#a4a37e', '#d9c9a6'] },
  { id: 'minimal-linen', label: 'Minimal Linen', description: 'Quiet, bright, uncluttered', colors: ['#a99f95', '#dfd5c8', '#f2eee8'] },
  { id: 'dark-academia', label: 'Dark Academia', description: 'Walnut, ink, and lamplight', colors: ['#25231f', '#5c4635', '#a5875e'] },
  { id: 'enchanted-library', label: 'Enchanted Library', description: 'Emerald shelves and quiet magic', colors: ['#1f4038', '#725489', '#d7bd7b'] },
  { id: 'celestial-study', label: 'Celestial Study', description: 'Midnight blue and mapped stars', colors: ['#17243f', '#465784', '#d8c58d'] },
  { id: 'forest-archive', label: 'Forest Archive', description: 'Moss, bark, and filtered light', colors: ['#253b2e', '#657457', '#b9a978'] },
  { id: 'winter-reading-room', label: 'Winter Reading Room', description: 'Snowlight, wool, and cool paper', colors: ['#60717b', '#b5c4ca', '#ece9df'] },
];

export const pages: (AppearanceOption & { color: string })[] = [
  { id: 'ivory', label: 'Ivory', description: 'Clean, soft book paper', color: '#f7f2e7' },
  { id: 'parchment', label: 'Parchment', description: 'Warm fibers and a mellow tone', color: '#eee0c8' },
  { id: 'foxed-paper', label: 'Foxed paper', description: 'Timeworn edges and age spots', color: '#e6d1ac' },
  { id: 'ruled-journal', label: 'Ruled journal', description: 'Subtle horizontal writing lines', color: '#f1eadb' },
  { id: 'dotted-notebook', label: 'Dotted notebook', description: 'A quiet dot grid', color: '#eee9df' },
  { id: 'illuminated-border', label: 'Illuminated border', description: 'A restrained medieval page frame', color: '#f0dfb8' },
];

export const decorations: AppearanceOption[] = [
  { id: 'pressed-flower', label: 'Pressed flowers', description: 'Botanical fragments in the margins' },
  { id: 'handwritten-note', label: 'Handwritten note', description: 'A small scrap of remembered text' },
  { id: 'moon-stamp', label: 'Moon stamp', description: 'A quiet celestial seal' },
  { id: 'library-card', label: 'Library card', description: 'A checked-out card tucked into the page' },
  { id: 'brass-corner', label: 'Brass corners', description: 'Subtle metal corner ornaments' },
  { id: 'washi-tape', label: 'Washi tape', description: 'Layered strips holding notes in place' },
];

export const openedBackgrounds: AppearanceOption[] = [
  { id: 'scene-default', label: 'Match the room', description: 'Let the selected scene continue behind the book' },
  { id: 'quiet-linen', label: 'Quiet linen', description: 'A calm woven cloth under the open pages' },
  { id: 'walnut-desk', label: 'Walnut desk', description: 'Deep wood grain and warm lamplight' },
  { id: 'stone-table', label: 'Stone table', description: 'Cool mineral texture with restrained contrast' },
  { id: 'star-map', label: 'Star map', description: 'A midnight chart scattered with small constellations' },
  { id: 'botanical-paper', label: 'Botanical paper', description: 'Pressed foliage on handmade paper' },
  { id: 'library-stacks', label: 'Library stacks', description: 'Softly blurred shelves and pools of light' },
  { id: 'window-light', label: 'Window light', description: 'A bright tabletop with long quiet shadows' },
];

export const coverTreatments: AppearanceOption[] = [
  { id: 'soft-shadow', label: 'Soft shadow', description: 'Natural depth with a restrained lift' },
  { id: 'flat', label: 'Flat', description: 'Clean cover art without extra treatment' },
  { id: 'worn', label: 'Worn edges', description: 'Subtle age and handling around the cover' },
  { id: 'gilded', label: 'Gilded frame', description: 'A fine brass rule around the artwork' },
  { id: 'library-jacket', label: 'Library jacket', description: 'Clear protective jacket and label details' },
];

const ofl = 'https://openfontlicense.org';
const apache = 'https://www.apache.org/licenses/LICENSE-2.0';

const font = (
  id: string,
  family: string,
  group: FontGroup,
  description: string,
  headingOnly = false,
  license: FontOption['license'] = 'OFL-1.1',
  weights = [400, 600, 700],
): FontOption => ({
  id,
  family,
  label: family,
  group,
  description,
  weights,
  license,
  licenseUrl: license === 'OFL-1.1' ? ofl : apache,
  headingOnly,
  files: Object.fromEntries(weights.map((weight) => [String(weight), `/fonts/${id}-${weight}.woff2`])),
});

export const fonts: FontOption[] = [
  font('lora', 'Lora', 'editorial-serif', 'Warm contemporary editorial serif'),
  font('libre-baskerville', 'Libre Baskerville', 'editorial-serif', 'Measured bookish serif', false, 'OFL-1.1', [400, 700]),
  font('merriweather', 'Merriweather', 'editorial-serif', 'Sturdy serif for long reading'),
  font('source-serif-4', 'Source Serif 4', 'editorial-serif', 'Flexible modern text serif'),
  font('crimson-pro', 'Crimson Pro', 'editorial-serif', 'Literary old-style serif'),
  font('literata', 'Literata', 'editorial-serif', 'Screen-first reading serif'),

  font('cormorant-garamond', 'Cormorant Garamond', 'classic-serif', 'Elegant high-contrast Garamond'),
  font('eb-garamond', 'EB Garamond', 'classic-serif', 'Scholarly revival serif'),
  font('cardo', 'Cardo', 'classic-serif', 'Classical and multilingual book face', false, 'OFL-1.1', [400, 700]),
  font('spectral', 'Spectral', 'classic-serif', 'Contemporary classic with character'),
  font('vollkorn', 'Vollkorn', 'classic-serif', 'Dark, generous reading serif'),
  font('alegreya', 'Alegreya', 'classic-serif', 'Calligraphic literary serif'),

  font('inter', 'Inter', 'clean-sans', 'Neutral, highly legible interface sans'),
  font('source-sans-3', 'Source Sans 3', 'clean-sans', 'Humanist UI sans'),
  font('nunito-sans', 'Nunito Sans', 'clean-sans', 'Soft, friendly sans'),
  font('work-sans', 'Work Sans', 'clean-sans', 'Clean contemporary sans'),
  font('manrope', 'Manrope', 'clean-sans', 'Crisp geometric sans'),
  font('dm-sans', 'DM Sans', 'clean-sans', 'Compact modern UI sans'),

  font('ibm-plex-mono', 'IBM Plex Mono', 'typewriter-mono', 'Technical typewriter rhythm'),
  font('source-code-pro', 'Source Code Pro', 'typewriter-mono', 'Open and readable monospaced face'),
  font('courier-prime', 'Courier Prime', 'typewriter-mono', 'Polished screenplay typewriter', false, 'OFL-1.1', [400, 700]),
  font('roboto-mono', 'Roboto Mono', 'typewriter-mono', 'Balanced modern mono', false, 'Apache-2.0'),
  font('space-mono', 'Space Mono', 'typewriter-mono', 'Distinct retro-future mono', false, 'OFL-1.1', [400, 700]),
  font('inconsolata', 'Inconsolata', 'typewriter-mono', 'Humanist printed-code mono'),

  font('caveat', 'Caveat', 'handwriting', 'Loose handwritten annotation', true),
  font('kalam', 'Kalam', 'handwriting', 'Friendly marker handwriting', true, 'OFL-1.1', [400, 700]),
  font('patrick-hand', 'Patrick Hand', 'handwriting', 'Everyday handwritten note', true, 'OFL-1.1', [400]),
  font('homemade-apple', 'Homemade Apple', 'handwriting', 'Delicate cursive note', true, 'OFL-1.1', [400]),
  font('nanum-pen-script', 'Nanum Pen Script', 'handwriting', 'Quick expressive pen script', true, 'OFL-1.1', [400]),
  font('shadows-into-light', 'Shadows Into Light', 'handwriting', 'Tall airy handwriting', true, 'OFL-1.1', [400]),

  font('cinzel', 'Cinzel', 'decorative-fantasy', 'Inscriptional fantasy capitals', true),
  font('uncial-antiqua', 'Uncial Antiqua', 'decorative-fantasy', 'Rounded manuscript display', true, 'OFL-1.1', [400]),
  font('pirata-one', 'Pirata One', 'decorative-fantasy', 'Blackletter-inspired display', true, 'OFL-1.1', [400]),
  font('almendra', 'Almendra', 'decorative-fantasy', 'Calligraphic storybook display', true, 'OFL-1.1', [400, 700]),
  font('im-fell-english-sc', 'IM Fell English SC', 'decorative-fantasy', 'Historic small-cap printing face', true, 'OFL-1.1', [400]),
  font('medievalsharp', 'MedievalSharp', 'decorative-fantasy', 'Playful medieval display', true, 'OFL-1.1', [400]),
];

export const DEFAULT_APPEARANCE: Omit<Appearance, 'id' | 'libraryEntryId'> = {
  registryVersion: APPEARANCE_REGISTRY_VERSION,
  presetId: 'literary-warmth',
  constructionId: 'deckle-hardcover',
  sceneId: 'autumn-study',
  pageId: 'parchment',
  fontId: 'lora',
  accent: '#9a4f42',
  decorations: ['pressed-flower', 'handwritten-note'],
  coverTreatmentId: 'soft-shadow',
  openedBackgroundId: 'scene-default',
  userOverrides: [],
};

export function getAppearanceOption<T extends AppearanceOption>(items: T[], id: string): T {
  return items.find((item) => item.id === id) ?? items[0];
}
