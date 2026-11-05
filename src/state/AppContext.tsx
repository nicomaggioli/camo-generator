import { createContext, useContext, type RefObject } from 'react';
import type { AIAnalysisResult, CamoConfig, DocState, LogoAsset, Preset, Stamp, ToolId, ToolOptions } from '../types';
import type { AISettings } from '../lib/ai';

export type TopPanel = 'color' | 'swatches' | 'patterns';
export type BottomPanel = 'properties' | 'layers' | 'ai' | 'history';

export interface AppApi {
  doc: DocState;
  config: CamoConfig;
  setDoc: (label: string, updater: (d: DocState) => DocState) => void;
  updateConfig: (label: string, patch: Partial<CamoConfig> | ((c: CamoConfig) => Partial<CamoConfig>)) => void;
  history: { entries: string[]; index: number; undo: () => void; redo: () => void; jump: (i: number) => void; canUndo: boolean; canRedo: boolean };

  logos: LogoAsset[];
  /** Images the engine draws (visible uploads, or the sample mark) and their ids, in order */
  renderLogos: { id: string; img: HTMLImageElement; dataUrl: string }[];
  activeLogoId: string | null;
  setActiveLogoId: (id: string | null) => void;
  openFilePicker: () => void;
  addLogoFiles: (files: File[]) => void;
  removeLogo: (id: string) => void;
  toggleLogoVisible: (id: string) => void;
  openBgRemoval: (id?: string | null) => void;

  tool: ToolId;
  setTool: (t: ToolId) => void;
  toolOpts: ToolOptions;
  setToolOpts: (patch: Partial<ToolOptions>) => void;

  fgIndex: number;
  setFgIndex: (i: number) => void;
  fgColor: string;
  colorTarget: 'fg' | 'bg';
  setColorTarget: (t: 'fg' | 'bg') => void;
  setTargetColor: (hex: string, target?: 'fg' | 'bg') => void;
  swapColors: () => void;
  resetColors: () => void;
  addSwatch: (hex: string) => void;

  canvasRef: RefObject<HTMLCanvasElement>;
  viewportRef: RefObject<HTMLDivElement>;
  zoom: number;
  setZoomAt: (z: number, nx?: number, ny?: number) => void;
  fit: () => void;
  size: number;
  setSize: (s: number) => void;
  tileView: boolean;
  setTileView: (v: boolean) => void;
  tileUrl: string | null;
  showPattern: boolean;
  setShowPattern: (v: boolean) => void;
  stampsVisible: boolean;
  setStampsVisible: (v: boolean) => void;
  stats: { shapes: number; ms: number };

  selectedStampId: string | null;
  setSelectedStampId: (id: string | null) => void;
  placeStamp: (x: number, y: number) => void;
  eraseAt: (x: number, y: number) => void;
  hitStamp: (x: number, y: number) => Stamp | null;
  moveStamp: (id: string, x: number, y: number) => void;
  updateStamp: (id: string, patch: Partial<Stamp>) => void;
  deleteStamp: (id: string) => void;
  clearStamps: () => void;
  sampleAt: (x: number, y: number, alt: boolean) => void;
  fillBackground: () => void;
  randomize: (mode?: ToolOptions['diceMode']) => void;
  regenerate: () => void;
  exportPng: (size?: number) => void;

  presets: Preset[];
  savePreset: (name: string) => void;
  deletePreset: (id: string) => void;
  applyPreset: (p: Preset) => void;

  ai: {
    result: AIAnalysisResult | null;
    loading: boolean;
    error: string | null;
    settings: AISettings;
    run: () => void;
    apply: () => void;
    openSettings: () => void;
  };

  topPanel: TopPanel;
  setTopPanel: (p: TopPanel) => void;
  bottomPanel: BottomPanel;
  setBottomPanel: (p: BottomPanel) => void;
  openDialog: (d: 'savePreset' | 'shortcuts' | 'about' | 'settings') => void;
  mod: string;
}

export const AppCtx = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const v = useContext(AppCtx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}
