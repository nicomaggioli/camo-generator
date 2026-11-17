import { DEFAULT_CONFIG, type CamoConfig } from '../types';
import { STYLES, THEMES, themeConfig, type Theme } from './patternLibrary';
import { hexToRgb, hslToRgb, normalizeHex, rgbToHex, rgbToHsl } from './color';
import { DEFAULT_MODEL, type AISettings } from './ai';

export interface TextPatternResult {
  name: string;
  description: string;
  config: CamoConfig;
  source: 'claude' | 'local';
}

// ---------- local interpretation ----------

const COLOR_WORDS: Record<string, string[]> = {
  red: ['#dc2626', '#991b1b', '#f87171'], crimson: ['#b91c1c', '#7f1d1d'], scarlet: ['#ef4444', '#b91c1c'],
  orange: ['#f97316', '#ea580c', '#fdba74'], amber: ['#f59e0b', '#b45309'], peach: ['#ffb38a', '#f9a07a'],
  yellow: ['#facc15', '#eab308', '#fde68a'], gold: ['#d4af37', '#f5d76e', '#a67c00'], lemon: ['#fde047', '#facc15'],
  green: ['#16a34a', '#15803d', '#4ade80'], lime: ['#a3e635', '#65a30d'], olive: ['#4b5320', '#6b6b47'], mint: ['#a7e3cb', '#6fcfab'],
  emerald: ['#10b981', '#047857'], sage: ['#9caf88', '#6f8060'], teal: ['#0d9488', '#14b8a6'], turquoise: ['#2dd4bf', '#0f766e'],
  blue: ['#2563eb', '#1d4ed8', '#60a5fa'], navy: ['#1e3a8a', '#172554'], sky: ['#38bdf8', '#7dd3fc'], cyan: ['#06b6d4', '#22d3ee'],
  indigo: ['#4f46e5', '#3730a3'], purple: ['#7c3aed', '#6d28d9', '#a78bfa'], violet: ['#8b5cf6', '#5b21b6'], lavender: ['#c9b6e8', '#a68bd6'],
  magenta: ['#d946ef', '#a21caf'], pink: ['#ec4899', '#f472b6', '#fbcfe8'], rose: ['#f43f5e', '#fda4af'],
  brown: ['#78350f', '#92400e', '#a16207'], tan: ['#c2a878', '#a88b5a'], beige: ['#e6d7b8', '#cbb48a'], khaki: ['#bdb07a', '#8f845a'],
  black: ['#0a0a0a', '#1f1f1f', '#2e2e2e'], white: ['#ffffff', '#f1f1f1', '#e2e2e2'], grey: ['#6b7280', '#9ca3af', '#374151'],
  gray: ['#6b7280', '#9ca3af', '#374151'], silver: ['#c0c0c0', '#8a8d91'], cream: ['#f5efe2', '#e6d7b8'], maroon: ['#7f1d1d', '#450a0a'],
};

const STYLE_WORDS: [RegExp, string][] = [
  [/^(dense|packed|busy|chaos|chaotic|crowded|wild|loud|intense)$/, 'dense'],
  [/^(minimal|minimalist|sparse|clean|simple|calm|quiet|few|airy)$/, 'scatter'],
  [/^(tiny|micro|small|digital|pixel|pixels|pixelated|confetti|dots)$/, 'micro'],
  [/^(big|huge|bold|giant|large|oversized|massive|loud)$/, 'bold'],
  [/^(soft|dreamy|blur|blurry|hazy|haze|fog|foggy|misty|mist|smoke|smoky|glow|glowing|ethereal)$/, 'soft'],
  [/^(outline|outlined|sticker|stickers|cartoon|comic|graphic|keyline)$/, 'outlined'],
  [/^(straight|upright|neat|ordered|grid|uniform|tidy|aligned)$/, 'upright'],
];

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s&-]/g, ' ').split(/[\s-]+/).filter(Boolean);
const stem = (w: string) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');

function scoreTheme(th: Theme, ws: string[]) {
  const name = words(th.name), tags = words(th.tags), cat = th.category.toLowerCase();
  let s = 0;
  const hits = new Set<string>();
  const nameHits = new Set<string>();
  for (const w of ws) {
    const sw = stem(w);
    const n = name.find((x) => x === w || stem(x) === sw);
    if (n) { s += 3; hits.add(w); nameHits.add(n); }
    else if (tags.some((t) => t === w || stem(t) === sw)) { s += 2; hits.add(w); }
    else if (cat === w || stem(cat) === sw) { s += 1; hits.add(w); }
    else if (w.length >= 4 && [...name, ...tags].some((t) => t.startsWith(w) || (w.startsWith(t) && t.length >= 4))) { s += 1; hits.add(w); }
  }
  // Prefer themes whose whole name was typed ("storm" → Storm over Desert Storm).
  if (nameHits.size && nameHits.size === name.length) s += 1;
  return { s, hits };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const L = (hex: string) => rgbToHsl(hexToRgb(hex))[2];

/** Build a palette from any words: known themes first, then color names, then a deterministic hash palette. */
export function interpretLocally(text: string, styleOverride?: string): TextPatternResult {
  const ws = words(text);
  const ranked = THEMES.map((th) => ({ th, ...scoreTheme(th, ws) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const colorHits = ws.flatMap((w) => COLOR_WORDS[w] ?? COLOR_WORDS[stem(w)] ?? []);
  const styleId = styleOverride ?? STYLE_WORDS.find(([re]) => ws.some((w) => re.test(w)))?.[1] ?? 'classic';
  const style = STYLES.find((s) => s.id === styleId) ?? STYLES[0];

  let bg: string;
  let colors: string[];
  let description: string;

  if (ranked.length) {
    const top = ranked[0].th;
    // Mix in a second theme that covers words the first one missed ("ocean storm" → Deep Sea + Storm).
    const second = ranked.slice(1).find((x) => [...x.hits].some((w) => !ranked[0].hits.has(w)))?.th
      ?? (ranked[1] && ranked[1].s >= ranked[0].s - 1 ? ranked[1].th : null);
    colors = [...top.colors];
    if (second) colors = [...top.colors.slice(0, 3), ...second.colors.slice(0, 2)];
    if (colorHits.length) colors = [...colorHits.slice(0, 3), ...colors].slice(0, 5);
    bg = top.bg;
    description = `Inspired by ${top.name}${second ? ` and ${second.name}` : ''}${colorHits.length ? ' with your colors' : ''}.`;
  } else if (colorHits.length) {
    colors = [...new Set(colorHits)].slice(0, 5);
    const sorted = [...colors].sort((a, b) => L(a) - L(b));
    const [h, s] = rgbToHsl(hexToRgb(sorted[0]));
    bg = rgbToHex(hslToRgb(h, Math.min(0.5, s), 0.1));
    if (ws.includes('white') || ws.includes('light')) bg = '#f4f4f4';
    description = `Built from the colors you named.`;
  } else {
    // Unknown word: derive a harmonious palette from the word itself, so the same word always gives the same result.
    const hv = hash(text.trim().toLowerCase() || 'camo');
    const hue = hv % 360;
    const scheme = (hv >> 9) % 3; // analogous, complementary, triadic
    const spread = scheme === 0 ? [0, 25, -25, 50] : scheme === 1 ? [0, 180, 15, 195] : [0, 120, 240, 30];
    const sat = 0.45 + ((hv >> 12) % 40) / 100;
    colors = spread.map((d, i) => rgbToHex(hslToRgb(hue + d, sat, 0.35 + i * 0.12)));
    bg = rgbToHex(hslToRgb(hue + 200, 0.35, (hv >> 16) % 2 ? 0.1 : 0.92));
    description = `An original palette generated from “${text.trim()}”.`;
  }

  const th: Theme = { name: text, category: 'Custom', bg, colors, tags: '' };
  const pretty = text.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Custom';
  return { name: pretty, description, config: themeConfig(th, style), source: 'local' };
}

// ---------- Claude ----------

const PROMPT = (text: string) => `You design repeating logo-camouflage patterns. A user typed this idea: "${text.replace(/"/g, "'")}"

Turn it into a pattern. Logos are scattered, rotated and flat-tinted with your colors over a solid background. Pick colors that clearly evoke the idea (e.g. "sunset" → deep purple background with orange, coral, magenta and dusky blue), and choose layout settings that match its mood.

Respond with ONLY a JSON object, no markdown:
{
  "name": "Short title, 1-3 words",
  "description": "One sentence on how the pattern reflects the idea.",
  "backgroundColor": "#RRGGBB",
  "colors": ["#RRGGBB", "3 to 6 colors"],
  "density": 10-300 (logos per layer),
  "scaleMin": 0.1-3,
  "scaleMax": 0.2-4,
  "rotationJitter": 0-360 (degrees; 0 = all upright),
  "layering": 1-4,
  "blur": 0-8 (0 for crisp),
  "outlineWidth": 0-6 (0 = none),
  "outlineColor": "#RRGGBB"
}`;

const clamp = (v: unknown, lo: number, hi: number, def: number) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : def;
};

export async function interpretWithClaude(text: string, settings: AISettings): Promise<TextPatternResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model || DEFAULT_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: PROMPT(text) }],
    }),
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const e = await res.json(); if (e?.error?.message) msg = e.error.message; } catch { /* keep status */ }
    throw new Error(msg);
  }
  const data = await res.json();
  const out: string = (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Model did not return JSON');
  const r = JSON.parse(m[0]);
  const colors = (Array.isArray(r.colors) ? r.colors : []).map((c: unknown) => normalizeHex(String(c), '')).filter(Boolean).slice(0, 6);
  if (!colors.length) throw new Error('No colors in response');
  const scaleMin = clamp(r.scaleMin, 0.1, 3, 0.5);
  const outlineWidth = clamp(r.outlineWidth, 0, 6, 0);
  return {
    name: String(r.name ?? text).slice(0, 40),
    description: String(r.description ?? ''),
    source: 'claude',
    config: {
      ...DEFAULT_CONFIG,
      backgroundColor: normalizeHex(String(r.backgroundColor ?? ''), '#222222'),
      palette: colors,
      useCustomColors: true,
      blendMode: 'source-over',
      opacity: 0.95,
      density: Math.round(clamp(r.density, 10, 300, 60)),
      scaleMin,
      scaleMax: Math.max(scaleMin + 0.1, clamp(r.scaleMax, 0.2, 4, 1.5)),
      rotationJitter: Math.round(clamp(r.rotationJitter, 0, 360, 360)),
      layering: Math.round(clamp(r.layering, 1, 4, 2)),
      blur: clamp(r.blur, 0, 8, 0),
      outlineWidth,
      outlineColor: normalizeHex(String(r.outlineColor ?? ''), '#111111'),
      outlineChance: outlineWidth > 0 ? 0.5 : DEFAULT_CONFIG.outlineChance,
    },
  };
}

/** Same palette, different layouts, so the user can pick a look. */
export function variations(base: TextPatternResult): { label: string; config: CamoConfig }[] {
  const th: Theme = { name: base.name, category: 'Custom', bg: base.config.backgroundColor, colors: base.config.palette, tags: '' };
  return [
    { label: 'As generated', config: base.config },
    ...STYLES.filter((s) => s.id !== 'classic' || base.source === 'claude').slice(0, 7).map((s) => ({ label: s.name, config: themeConfig(th, s) })),
  ];
}
