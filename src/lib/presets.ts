import { DEFAULT_CONFIG, type CamoConfig, type Preset } from '../types';

const KEY = 'logocamo.presets';

const p = (id: string, name: string, c: Partial<CamoConfig>): Preset => ({
  id, name, timestamp: 0, config: { ...DEFAULT_CONFIG, ...c },
});

export const BUILTIN_PRESETS: Preset[] = [
  p('builtin-woodland', 'Woodland', { backgroundColor: '#3b4232', palette: ['#4b5320', '#2e3326', '#6b5a3e', '#1f2118'], density: 70, layering: 2 }),
  p('builtin-desert', 'Desert', { backgroundColor: '#c2a878', palette: ['#a88b5a', '#8a6f45', '#d8c39a', '#6e5a3b'], density: 55, scaleMax: 1.8 }),
  p('builtin-urban', 'Urban', { backgroundColor: '#6b6f72', palette: ['#3a3d40', '#8e9295', '#1f2124', '#b5b8ba'], density: 90, rotationJitter: 90, layering: 2 }),
  p('builtin-arctic', 'Arctic', { backgroundColor: '#e8ecef', palette: ['#c3cad0', '#9aa5ad', '#ffffff', '#6f7c86'], density: 60, opacity: 0.8, blendMode: 'multiply' }),
  p('builtin-night', 'Night Ops', { backgroundColor: '#14171a', palette: ['#1f2a33', '#2c3a44', '#0a0c0e', '#3b4a3f'], density: 80, layering: 3, outlineWidth: 2, outlineColor: '#4ade80', outlineChance: 0.08 }),
  p('builtin-blurred', 'Soft Digital', { backgroundColor: '#3d4636', palette: ['#5c6b47', '#2b3325', '#7d7a5a'], density: 120, scaleMin: 0.3, scaleMax: 0.9, blur: 3, layering: 3 }),
];

export function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw) as Preset[];
      return list.map((x) => ({ ...x, config: { ...DEFAULT_CONFIG, ...x.config } }));
    }
  } catch { /* storage unavailable */ }
  return [];
}

export function savePresets(list: Preset[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}
