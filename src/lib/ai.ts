import type { AIAnalysisResult, LogoAsset } from '../types';
import { BLEND_MODES } from '../types';
import { imageToPng, samplePixels } from '../engine/camo';
import { hexToRgb, hslToRgb, normalizeHex, rgbToHex, rgbToHsl, type RGB } from './color';

export interface AISettings {
  apiKey: string;
  model: string;
}

export const DEFAULT_MODEL = 'claude-sonnet-5-5';
const SETTINGS_KEY = 'logocamo.ai.settings';

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { apiKey: '', model: DEFAULT_MODEL, ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return { apiKey: '', model: DEFAULT_MODEL };
}

export function saveAISettings(s: AISettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const PROMPT = `You are a camouflage pattern designer. The image(s) are transparent logos that will be scattered, rotated and tinted to form a tactical camouflage pattern.

Analyse the logo's shapes, colors and mood, then recommend a cohesive tactical camo color scheme that still nods to the brand's colors (desaturated / military-toned versions are ideal).

Respond with ONLY a JSON object, no markdown, in exactly this shape:
{
  "backgroundColor": "#RRGGBB",
  "accentColors": ["#RRGGBB", "... 3 to 5 colors total"],
  "styleDescription": "One or two sentences describing the camo style and why it suits the logo.",
  "recommendedBlendMode": "one of: ${BLEND_MODES.join(', ')}"
}`;

function sanitize(raw: Partial<AIAnalysisResult>): AIAnalysisResult {
  const accents = (Array.isArray(raw.accentColors) ? raw.accentColors : [])
    .map((c) => normalizeHex(String(c), ''))
    .filter(Boolean)
    .slice(0, 6);
  const blend = BLEND_MODES.includes(raw.recommendedBlendMode as GlobalCompositeOperation)
    ? (raw.recommendedBlendMode as string)
    : 'source-over';
  return {
    backgroundColor: normalizeHex(String(raw.backgroundColor ?? ''), '#2f3326'),
    accentColors: accents.length ? accents : ['#4b5320', '#6b6b47', '#2e3326'],
    styleDescription: String(raw.styleDescription ?? 'Tactical palette derived from your logo.'),
    recommendedBlendMode: blend,
  };
}

export async function analyzeWithClaude(logos: LogoAsset[], settings: AISettings): Promise<AIAnalysisResult> {
  const images = logos.map((l) => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: 'image/png' as const, data: imageToPng(l.img).split(',')[1] },
  }));

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
      messages: [{ role: 'user', content: [...images, { type: 'text', text: PROMPT }] }],
    }),
  });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      if (err?.error?.message) msg = err.error.message;
    } catch { /* keep status text */ }
    throw new Error(msg);
  }

  const data = await res.json();
  const text: string = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model did not return JSON');
  return sanitize(JSON.parse(match[0]));
}

/** Offline fallback: k-means the opaque pixels, then push the clusters into a military range. */
export function analyzeLocally(logos: LogoAsset[]): AIAnalysisResult {
  const pts: RGB[] = [];
  for (const l of logos) {
    const d = samplePixels(l.img);
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 140) pts.push([d[i], d[i + 1], d[i + 2]]);
  }
  if (!pts.length) pts.push([75, 83, 32]);

  const K = Math.min(4, pts.length);
  let centers: RGB[] = Array.from({ length: K }, (_, i) => pts[Math.floor((i / K) * pts.length)]);
  for (let iter = 0; iter < 8; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      let best = 0, bd = Infinity;
      centers.forEach((c, ci) => {
        const dd = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (dd < bd) { bd = dd; best = ci; }
      });
      const s = sums[best];
      s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    }
    centers = centers.map((c, i) => (sums[i][3] ? [sums[i][0] / sums[i][3], sums[i][1] / sums[i][3], sums[i][2] / sums[i][3]] : c));
  }

  const hsl = centers.map((c) => rgbToHsl(c));
  const avgSat = hsl.reduce((a, h) => a + h[1], 0) / hsl.length;
  const avgLight = hsl.reduce((a, h) => a + h[2], 0) / hsl.length;
  // Achromatic logos get an olive base hue; colored ones keep their hue family.
  const hues = hsl.map((h) => (h[1] < 0.12 ? 75 : h[0]));

  const lights = [0.2, 0.33, 0.46, 0.6];
  const accents = hues
    .map((h, i) => rgbToHex(hslToRgb(h, Math.min(0.42, Math.max(0.12, hsl[i][1] * 0.45)), lights[i % lights.length])))
    .filter((c, i, arr) => arr.indexOf(c) === i);
  if (accents.length < 3) accents.push(rgbToHex(hslToRgb(hues[0] + 25, 0.2, 0.3)), rgbToHex(hslToRgb(hues[0] - 20, 0.18, 0.48)));

  const [bh] = rgbToHsl(hexToRgb(accents[0]));
  const backgroundColor = rgbToHex(hslToRgb(bh, 0.2, 0.13));
  // Shapes are flat-tinted, so normal compositing keeps the palette readable.
  const blend = 'source-over';

  return {
    backgroundColor,
    accentColors: accents.slice(0, 5),
    styleDescription: `Local analysis: ${avgSat > 0.35 ? 'vivid' : 'muted'} ${avgLight > 0.55 ? 'light' : 'dark'} logo — muted its hues into a flat, military-toned palette. Add a Claude API key in Settings for vision-based tuning.`,
    recommendedBlendMode: blend,
  };
}
