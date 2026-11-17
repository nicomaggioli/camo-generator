import { DEFAULT_CONFIG, type CamoConfig, type Preset } from '../types';
import { hexToRgb, rgbToHsl } from './color';

/** A named color theme: background plus the colors the logos are tinted with. */
export interface Theme {
  name: string;
  category: string;
  bg: string;
  colors: string[];
  /** Extra words that should find this theme (search box and text-to-pattern) */
  tags: string;
}

const t = (category: string, name: string, bg: string, colors: string[], tags = ''): Theme => ({ name, category, bg, colors, tags });

export const THEMES: Theme[] = [
  // Military
  t('Military', 'Woodland', '#3b4232', ['#4b5320', '#2e3326', '#6b5a3e', '#1f2118'], 'forest army green tactical classic'),
  t('Military', 'Desert Storm', '#c2a878', ['#a88b5a', '#8a6f45', '#d8c39a', '#6e5a3b'], 'sand dune tan khaki'),
  t('Military', 'Urban Grey', '#6b6f72', ['#3a3d40', '#8e9295', '#1f2124', '#b5b8ba'], 'city concrete street gray'),
  t('Military', 'Night Ops', '#14171a', ['#1f2a33', '#2c3a44', '#0a0c0e', '#3b4a3f'], 'dark stealth black covert'),
  t('Military', 'Jungle', '#2c3b22', ['#4f6b2f', '#1d2a17', '#7a8c3c', '#3d5a2a'], 'tropical vietnam rainforest'),
  t('Military', 'Coyote', '#8b7355', ['#6e5a42', '#a8906c', '#4f4030', '#c2ad8a'], 'brown tan wolf'),
  t('Military', 'Ranger', '#3f4a3c', ['#56634f', '#2a3128', '#6f7a5e', '#1c211b'], 'ranger green'),
  t('Military', 'Navy Digital', '#1f2a3a', ['#2e3f57', '#3b5274', '#131b26', '#566b8a'], 'navy blue sailor fleet'),
  t('Military', 'Tiger Stripe', '#4a5230', ['#1e2214', '#6b6a3a', '#2f331d', '#857a45'], 'tiger stripe olive'),
  t('Military', 'Multi-Terrain', '#9a8c6c', ['#6f6a4c', '#4f4a35', '#b8a985', '#7d6649'], 'multicam all terrain'),
  t('Military', 'Black Ops', '#0e0f10', ['#1b1d1f', '#2a2d30', '#3a3e42', '#070808'], 'blackout special forces'),
  t('Military', 'Olive Drab', '#4b5320', ['#3a4119', '#5f6a2a', '#2a2f12', '#727d3a'], 'od green vintage surplus'),

  // Nature
  t('Nature', 'Autumn Leaves', '#5a3a22', ['#a0522d', '#c97c2c', '#7a2e1d', '#d9a441'], 'fall maple orange'),
  t('Nature', 'Moss', '#3d4a2a', ['#5c6e38', '#7f8f4e', '#2b3520', '#a3ad6a'], 'lichen green soft'),
  t('Nature', 'Spring Meadow', '#a8c686', ['#6b9a4b', '#e8d36a', '#f2a6b5', '#4f7a3a'], 'flowers grass fresh'),
  t('Nature', 'Savanna', '#c9a65a', ['#8f6b2f', '#e0c27a', '#5c4520', '#a8873f'], 'safari lion africa'),
  t('Nature', 'Canyon', '#a8553a', ['#7a3a26', '#c9784f', '#4f2418', '#e0a074'], 'red rock arizona'),
  t('Nature', 'Volcanic', '#1a1414', ['#3a1f1a', '#c2410c', '#f97316', '#5a2a1f'], 'lava fire magma'),
  t('Nature', 'Rainforest', '#16301f', ['#1f5135', '#2f7a4a', '#0e2016', '#4fa36b'], 'amazon lush'),
  t('Nature', 'Wildflower', '#e9e3d0', ['#d9708a', '#8a6cc9', '#e8b54a', '#5f9a6b'], 'bloom floral garden'),
  t('Nature', 'Birch', '#e8e4da', ['#2b2b28', '#9a958a', '#c9c3b5', '#55524b'], 'bark tree white'),
  t('Nature', 'Swamp', '#2f3324', ['#4a4f2c', '#5c5636', '#1d2017', '#6f7a44'], 'bog marsh mud'),

  // Earth
  t('Earth', 'Terracotta', '#c66b4a', ['#8f4530', '#e3a07f', '#5a2d20', '#f0c7a8'], 'clay pottery'),
  t('Earth', 'Mocha', '#4a3428', ['#6f4f3c', '#2e2019', '#9a7660', '#c4a58c'], 'coffee chocolate brown'),
  t('Earth', 'Dune', '#e2c79a', ['#c9a56c', '#f2e1bd', '#a8834f', '#8a6a3c'], 'beach sand'),
  t('Earth', 'Stone', '#8a8478', ['#5f5a50', '#b0a999', '#3e3a33', '#cfc8b8'], 'rock granite pebble'),
  t('Earth', 'Rust', '#6b2e18', ['#a3471f', '#3d1a0e', '#c9682f', '#8a3a1c'], 'iron oxide'),

  // Winter
  t('Winter', 'Arctic', '#e8ecef', ['#c3cad0', '#9aa5ad', '#ffffff', '#6f7c86'], 'snow white polar'),
  t('Winter', 'Glacier', '#d4e6ee', ['#8fb8cc', '#5f8ea8', '#ffffff', '#3b6b85'], 'ice blue frozen'),
  t('Winter', 'Tundra', '#b8b4a6', ['#8a8576', '#e2dfd3', '#5f5b4f', '#a39c86'], 'cold steppe'),
  t('Winter', 'Frost', '#f2f6f8', ['#bcd3e0', '#dbe7ee', '#8aa9bb', '#e9f0f4'], 'icy light'),

  // Ocean
  t('Ocean', 'Deep Sea', '#0b1f33', ['#123a5a', '#1d5a80', '#06121e', '#2e7aa3'], 'deep water navy abyss ocean'),
  t('Ocean', 'Coral Reef', '#0f6b7a', ['#f2735a', '#ffb38a', '#0a4a55', '#4fd1c5'], 'tropical reef fish'),
  t('Ocean', 'Lagoon', '#3fb5b0', ['#1f8a8f', '#7fe0d5', '#0f5f66', '#e8f7f2'], 'turquoise teal aqua'),
  t('Ocean', 'Surf', '#1c6ea4', ['#ffffff', '#5fb3e0', '#0e4470', '#f2e1bd'], 'wave beach sea ocean'),
  t('Ocean', 'Kelp', '#1e3a34', ['#3a5a3a', '#5a7a46', '#122622', '#7a8f52'], 'seaweed'),

  // Sky
  t('Sky', 'Sunset', '#2b1d3f', ['#f97316', '#fb923c', '#7c3aed', '#1d4ed8'], 'dusk evening orange purple'),
  t('Sky', 'Sunrise', '#fde2c4', ['#fb923c', '#f472b6', '#fcd34d', '#93c5fd'], 'dawn morning'),
  t('Sky', 'Golden Hour', '#7a4a1f', ['#f59e0b', '#fbbf24', '#d97706', '#fde68a'], 'gold warm glow'),
  t('Sky', 'Aurora', '#0b1026', ['#22d3ee', '#4ade80', '#a78bfa', '#1e3a8a'], 'northern lights borealis'),
  t('Sky', 'Midnight', '#0a0e1f', ['#1e2a5a', '#312e81', '#0f172a', '#4c51bf'], 'night stars moon'),
  t('Sky', 'Storm', '#3a4048', ['#5a6470', '#1f242a', '#8a96a3', '#2c333b'], 'thunder cloud rain'),
  t('Sky', 'Galaxy', '#0b0620', ['#6d28d9', '#db2777', '#1e1b4b', '#38bdf8'], 'space cosmos nebula'),

  // Neon & Vivid
  t('Neon', 'Neon', '#0a0a0f', ['#39ff14', '#ff2bd6', '#00e5ff', '#fff01f'], 'glow electric bright'),
  t('Neon', 'Cyberpunk', '#120b1f', ['#ff2a6d', '#05d9e8', '#d1f7ff', '#7b2cbf'], 'future cyber'),
  t('Neon', 'Vaporwave', '#2d1b4e', ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'], 'retro 80s aesthetic'),
  t('Neon', 'Tropical', '#14532d', ['#f97316', '#facc15', '#ec4899', '#22d3ee'], 'island summer'),
  t('Neon', 'Pop Art', '#fef08a', ['#ef4444', '#2563eb', '#111111', '#ec4899'], 'comic bold'),
  t('Neon', 'Rainbow', '#ffffff', ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'], 'pride colorful'),
  t('Neon', 'Acid', '#1a1a1a', ['#ccff00', '#a3e635', '#facc15', '#65a30d'], 'lime toxic rave'),
  t('Neon', 'Candy', '#fde7f3', ['#f472b6', '#60a5fa', '#facc15', '#a78bfa'], 'sweet bubblegum sugar'),

  // Pastel
  t('Pastel', 'Pastel', '#fdf2f8', ['#fbcfe8', '#bfdbfe', '#bbf7d0', '#fde68a'], 'soft light baby'),
  t('Pastel', 'Blush', '#f8e1e4', ['#e8a8b5', '#d48a9a', '#f2c4cc', '#b86b7d'], 'pink rose'),
  t('Pastel', 'Mint', '#e6f7f0', ['#a7e3cb', '#6fcfab', '#cdeee0', '#3fae88'], 'fresh green'),
  t('Pastel', 'Lavender', '#efe9f7', ['#c9b6e8', '#a68bd6', '#ddd0f0', '#7f62b8'], 'purple lilac'),
  t('Pastel', 'Cream', '#f5efe2', ['#e6d7b8', '#cbb48a', '#f9f5ea', '#a8916a'], 'beige ivory'),
  t('Pastel', 'Sorbet', '#fff4e6', ['#ffb4a2', '#ffcdb2', '#b5e2d0', '#e5989b'], 'peach ice cream'),

  // Monochrome
  t('Mono', 'Black & White', '#ffffff', ['#000000', '#3a3a3a', '#7a7a7a'], 'bw monochrome contrast'),
  t('Mono', 'Charcoal', '#2a2a2a', ['#444444', '#1a1a1a', '#5f5f5f', '#0d0d0d'], 'dark grey'),
  t('Mono', 'Slate', '#475569', ['#334155', '#64748b', '#1e293b', '#94a3b8'], 'blue grey'),
  t('Mono', 'Bone', '#e8e2d4', ['#cfc6b2', '#b3a88f', '#f4f0e6', '#968b72'], 'off white'),
  t('Mono', 'Ink', '#0f172a', ['#1e293b', '#020617', '#334155', '#f8fafc'], 'navy black'),
  t('Mono', 'Whiteout', '#f8f8f8', ['#e6e6e6', '#d0d0d0', '#ffffff', '#bdbdbd'], 'white minimal'),

  // Metallic
  t('Metallic', 'Gold', '#2a2112', ['#d4af37', '#f5d76e', '#a67c00', '#7a5a00'], 'luxury rich'),
  t('Metallic', 'Silver', '#3a3d42', ['#c0c0c0', '#e5e5e5', '#8a8d91', '#5f6267'], 'chrome steel'),
  t('Metallic', 'Copper', '#3a2218', ['#b87333', '#da8a67', '#8a4f26', '#e8b896'], 'bronze penny'),
  t('Metallic', 'Rose Gold', '#f4e1dc', ['#b76e79', '#e0a899', '#d4919a', '#8f4f5a'], 'pink gold'),
  t('Metallic', 'Gunmetal', '#2a3035', ['#3e464d', '#535c64', '#1a1e21', '#6b757e'], 'metal steel'),

  // Seasonal
  t('Seasonal', 'Halloween', '#120a1a', ['#f97316', '#7c3aed', '#16a34a', '#0a0a0a'], 'spooky pumpkin october'),
  t('Seasonal', 'Christmas', '#14532d', ['#dc2626', '#f8fafc', '#facc15', '#166534'], 'xmas holiday festive'),
  t('Seasonal', 'Valentine', '#fde2e4', ['#e11d48', '#fb7185', '#be123c', '#ffffff'], 'love heart romance'),
  t('Seasonal', 'Summer', '#38bdf8', ['#facc15', '#f97316', '#ffffff', '#22c55e'], 'hot sun vacation'),
  t('Seasonal', 'Harvest', '#6b3f1d', ['#d97706', '#a16207', '#7c2d12', '#facc15'], 'thanksgiving pumpkin'),
  t('Seasonal', 'Easter', '#fef9c3', ['#c4b5fd', '#a7f3d0', '#fbcfe8', '#bae6fd'], 'spring egg'),

  // Streetwear
  t('Streetwear', 'Hype Pink', '#f9c6d9', ['#f472b6', '#db2777', '#fbcfe8', '#9d174d'], 'pink bold'),
  t('Streetwear', 'Royal Purple', '#2e1065', ['#6d28d9', '#a78bfa', '#4c1d95', '#c4b5fd'], 'violet king'),
  t('Streetwear', 'Blood Red', '#2a0a0a', ['#991b1b', '#dc2626', '#450a0a', '#7f1d1d'], 'red crimson'),
  t('Streetwear', 'Ice Blue', '#dbeafe', ['#60a5fa', '#2563eb', '#93c5fd', '#1e3a8a'], 'cool blue'),
  t('Streetwear', 'Earth Tone', '#c8b89a', ['#8a7356', '#5f5038', '#a89273', '#3e3424'], 'neutral'),
  t('Streetwear', 'Denim', '#3b5a80', ['#25405f', '#5a7aa3', '#1a2c42', '#a3b8d1'], 'jeans indigo'),
  t('Streetwear', 'Orange Crush', '#1a1a1a', ['#f97316', '#ea580c', '#fdba74', '#7c2d12'], 'orange black safety'),

  // Retro
  t('Retro', '70s Groove', '#f2d8a7', ['#d9822b', '#a3471f', '#6b8e23', '#e8b14a'], 'seventies disco'),
  t('Retro', 'Miami', '#ffe4ef', ['#ff6fb5', '#2ad2c9', '#ffd166', '#7b5cff'], 'vice 80s'),
  t('Retro', 'Sepia', '#e8d8b8', ['#a88a5f', '#7a5f3a', '#cbb38a', '#4f3c22'], 'old photo vintage'),
  t('Retro', 'Arcade', '#0d0221', ['#ff3864', '#2de2e6', '#f6019d', '#fcee0c'], 'game pixel 8bit'),
];

export interface Style {
  id: string;
  name: string;
  hint: string;
  config: (th: Theme) => Partial<CamoConfig>;
}

const lightness = (hex: string) => rgbToHsl(hexToRgb(hex))[2];
/** Outline color that contrasts with the background */
const outlineFor = (th: Theme) => {
  const sorted = [...th.colors].sort((a, b) => lightness(a) - lightness(b));
  return lightness(th.bg) < 0.45 ? sorted[sorted.length - 1] : sorted[0];
};

export const STYLES: Style[] = [
  { id: 'classic', name: 'Classic', hint: 'Balanced scatter', config: () => ({ density: 60, scaleMin: 0.5, scaleMax: 1.5, rotationJitter: 360, layering: 2 }) },
  { id: 'dense', name: 'Dense', hint: 'Packed, no gaps', config: () => ({ density: 140, scaleMin: 0.45, scaleMax: 1.2, rotationJitter: 360, layering: 3 }) },
  { id: 'scatter', name: 'Scatter', hint: 'Sparse, lots of background', config: () => ({ density: 22, scaleMin: 0.4, scaleMax: 0.9, rotationJitter: 360, layering: 1 }) },
  { id: 'micro', name: 'Micro', hint: 'Tiny repeating marks', config: () => ({ density: 260, scaleMin: 0.15, scaleMax: 0.42, rotationJitter: 360, layering: 2 }) },
  { id: 'bold', name: 'Bold', hint: 'Oversized logos', config: () => ({ density: 18, scaleMin: 1.5, scaleMax: 2.8, rotationJitter: 360, layering: 2 }) },
  { id: 'soft', name: 'Soft Focus', hint: 'Blurred depth', config: () => ({ density: 110, scaleMin: 0.4, scaleMax: 1.3, blur: 3, layering: 3 }) },
  { id: 'outlined', name: 'Outlined', hint: 'Shapes with a keyline', config: (th) => ({ density: 50, scaleMin: 0.6, scaleMax: 1.4, outlineWidth: 3, outlineColor: outlineFor(th), outlineChance: 0.6, layering: 2 }) },
  { id: 'upright', name: 'Upright', hint: 'No rotation, all facing up', config: () => ({ density: 70, scaleMin: 0.5, scaleMax: 1.2, rotationJitter: 0, layering: 2 }) },
];

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function themeConfig(th: Theme, style: Style): CamoConfig {
  return {
    ...DEFAULT_CONFIG,
    backgroundColor: th.bg,
    palette: [...th.colors],
    useCustomColors: true,
    blendMode: 'source-over',
    opacity: 0.95,
    blur: 0,
    outlineWidth: 0,
    ...style.config(th),
  };
}

export interface LibraryPattern extends Preset {
  theme: Theme;
  style: Style;
}

export const PATTERN_LIBRARY: LibraryPattern[] = THEMES.flatMap((th) =>
  STYLES.map((st) => ({
    id: `lib-${slug(th.name)}-${st.id}`,
    name: st.id === 'classic' ? th.name : `${th.name} ${st.name}`,
    timestamp: 0,
    config: themeConfig(th, st),
    theme: th,
    style: st,
  })),
);

export const CATEGORIES = [...new Set(THEMES.map((x) => x.category))];
