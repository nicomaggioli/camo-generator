export interface CamoConfig {
  density: number;
  scaleMin: number;
  scaleMax: number;
  rotationJitter: number;
  opacity: number;
  backgroundColor: string;
  blendMode: GlobalCompositeOperation;
  blur: number;
  layering: number;
  palette: string[];
  useCustomColors: boolean;
  seamless: boolean;
  outlineWidth: number;
  outlineColor: string;
  outlineChance: number;
}

export interface Preset {
  id: string;
  name: string;
  config: CamoConfig;
  timestamp: number;
}

export interface AIAnalysisResult {
  backgroundColor: string;
  accentColors: string[];
  styleDescription: string;
  recommendedBlendMode: string;
}

export interface LogoAsset {
  id: string;
  name: string;
  /** Current (possibly background-removed) image */
  dataUrl: string;
  img: HTMLImageElement;
  /** Untouched upload, kept so background removal can be redone or reverted */
  originalDataUrl: string;
  originalImg: HTMLImageElement;
  visible: boolean;
  /** Upload had an opaque, uniform background */
  bgDetected: boolean;
  bgRemoved: boolean;
}

/** A logo placed by hand with the Stamp tool. Coordinates are 0–1 of the tile. */
export interface Stamp {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  logoId: string;
  color: string | null;
  outlined: boolean;
}

/** Everything that undo/redo tracks. */
export interface DocState {
  config: CamoConfig;
  stamps: Stamp[];
  seed: number;
}

export type ToolId = 'move' | 'hand' | 'zoom' | 'stamp' | 'eraser' | 'eyedropper' | 'bucket' | 'wand' | 'dice';

export interface ToolOptions {
  stampLogo: string; // 'random' or a logo id
  stampScale: number;
  stampRotation: number;
  stampRandomRotation: boolean;
  stampColor: 'fg' | 'random' | 'original';
  stampOutline: boolean;
  eraserSize: number; // px at 1024
  eyedropTarget: 'fg' | 'bg' | 'add';
  eyedropSample: 1 | 3 | 5;
  diceMode: 'seed' | 'palette' | 'all';
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  stampLogo: 'random',
  stampScale: 1,
  stampRotation: 0,
  stampRandomRotation: true,
  stampColor: 'fg',
  stampOutline: false,
  eraserSize: 80,
  eyedropTarget: 'fg',
  eyedropSample: 3,
  diceMode: 'seed',
};

export const BLEND_MODES: GlobalCompositeOperation[] = [
  'source-over',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
];

export const DEFAULT_CONFIG: CamoConfig = {
  density: 50,
  scaleMin: 0.5,
  scaleMax: 1.5,
  rotationJitter: 360,
  opacity: 0.9,
  backgroundColor: '#3b4232',
  blendMode: 'source-over',
  blur: 0,
  layering: 1,
  palette: ['#4b5320', '#6b6b47', '#2e3326', '#8a7f5a'],
  useCustomColors: true,
  seamless: true,
  outlineWidth: 0,
  outlineColor: '#111111',
  outlineChance: 0.3,
};
