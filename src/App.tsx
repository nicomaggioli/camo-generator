import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Layers, Image as ImageIcon } from 'lucide-react';
import {
  DEFAULT_CONFIG, DEFAULT_TOOL_OPTIONS,
  type AIAnalysisResult, type DocState, type LogoAsset, type Preset, type Stamp, type ToolId, type ToolOptions,
} from './types';
import { BASE_FRACTION, REFERENCE_SIZE, loadImage, makeCanvas, mulberry32, renderCamo, type RenderStamp } from './engine/camo';
import { detectBackground } from './engine/bgRemove';
import { DEMO_LOGO_URL } from './lib/demoLogo';
import { analyzeLocally, analyzeWithClaude, loadAISettings, saveAISettings, type AISettings } from './lib/ai';
import { loadPresets, savePresets } from './lib/presets';
import { randomTacticalColor, rgbToHex, hslToRgb } from './lib/color';
import { useHistory } from './state/history';
import { AppCtx, type AppApi, type BottomPanel, type TopPanel } from './state/AppContext';
import { MenuBar } from './components/MenuBar';
import { OptionsBar } from './components/OptionsBar';
import { Toolbar } from './components/Toolbar';
import { DocumentCanvas, VIEW_PAD } from './components/DocumentCanvas';
import { IconDock, Panels } from './components/panels/Panels';
import { BgRemovalDialog } from './components/dialogs/BgRemovalDialog';
import { AboutDialog, SavePresetDialog, SettingsDialog, ShortcutsDialog } from './components/dialogs/Dialogs';
import { ExportDialog } from './components/dialogs/ExportDialog';
import { interpretLocally, interpretWithClaude, type TextPatternResult } from './lib/textPattern';
import { TOOLS } from './components/tools';

// Discrete actions always get their own History step; slider drags and moves collapse into one.
const DISCRETE = /^(Stamp|Pattern:|Delete Stamp|Clear Stamps|Regenerate|Randomize|Add Swatch|Delete Swatch|Paint Bucket|Swap Colors|Default Colors|AI Auto-Tune|Preset:|Swatches:|Reset Settings|Seamless|Tint|Darken|Lighten|Desaturate)/;
const canMerge = (label: string) => !DISCRETE.test(label);
const newSeed = () => (Math.random() * 0xffffffff) >>> 0;
const uid = () => Math.random().toString(36).slice(2, 10);
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
const wrap01 = (v: number) => ((v % 1) + 1) % 1;

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

type DialogId = 'savePreset' | 'shortcuts' | 'about' | 'settings' | 'export' | null;

export default function App() {
  const hist = useHistory<DocState>({ config: DEFAULT_CONFIG, stamps: [], seed: newSeed() }, canMerge);
  const doc = hist.state;
  const config = doc.config;

  const [logos, setLogos] = useState<LogoAsset[]>([]);
  const [demo, setDemo] = useState<HTMLImageElement | null>(null);
  const [activeLogoId, setActiveLogoId] = useState<string | null>(null);
  const [bgDialogId, setBgDialogId] = useState<string | null>(null);

  const [tool, setTool] = useState<ToolId>('move');
  const [toolOpts, setToolOptsState] = useState<ToolOptions>(DEFAULT_TOOL_OPTIONS);
  const [fgIndex, setFgIndexState] = useState(0);
  const [colorTarget, setColorTarget] = useState<'fg' | 'bg'>('fg');

  const [size, setSizeState] = useState(1024);
  const [zoom, setZoom] = useState(0.5);
  const [fitMode, setFitMode] = useState(true);
  const [tileView, setTileView] = useState(false);
  const [tileUrl, setTileUrl] = useState<string | null>(null);
  const [showPattern, setShowPattern] = useState(true);
  const [stampsVisible, setStampsVisible] = useState(true);
  const [stats, setStats] = useState({ shapes: 0, ms: 0 });
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);

  const [presets, setPresets] = useState<Preset[]>(loadPresets);
  const [aiSettings, setAISettings] = useState<AISettings>(loadAISettings);
  const [aiResult, setAIResult] = useState<AIAnalysisResult | null>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);

  const [topPanel, setTopPanel] = useState<TopPanel>('color');
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('properties');
  const [dialog, setDialog] = useState<DialogId>(null);
  const [mobileView, setMobileView] = useState<'canvas' | 'panels'>('canvas');
  const [toast, setToast] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'svg' | 'png'>('svg');
  const [tpText, setTpText] = useState('');
  const [tpLoading, setTpLoading] = useState(false);
  const [tpError, setTpError] = useState<string | null>(null);
  const [tpResult, setTpResult] = useState<TextPatternResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<{ nx: number; ny: number } | null>(null);

  const toastTimer = useRef<number>();
  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => { loadImage(DEMO_LOGO_URL).then(setDemo).catch(() => {}); }, []);

  // ---------- doc helpers ----------
  const setDoc = hist.set;
  const updateConfig = useCallback<AppApi['updateConfig']>((label, patch) => {
    setDoc(label, (d) => ({ ...d, config: { ...d.config, ...(typeof patch === 'function' ? patch(d.config) : patch) } }));
  }, [setDoc]);

  const safeFg = Math.min(fgIndex, config.palette.length - 1);
  const fgColor = config.palette[safeFg] ?? '#000000';

  // ---------- logos ----------
  const renderLogos = useMemo(() => {
    if (logos.length) return logos.filter((l) => l.visible).map((l) => ({ id: l.id, img: l.img, dataUrl: l.dataUrl }));
    return demo ? [{ id: 'demo', img: demo, dataUrl: DEMO_LOGO_URL }] : [];
  }, [logos, demo]);

  const logosRef = useRef(logos);
  logosRef.current = logos;
  const addLogoFiles = useCallback(async (files: File[]) => {
    let firstOpaque: string | null = null;
    let count = logosRef.current.length;
    for (const f of files) {
      if (count >= 2) { notify('Two logos max. Delete one first.'); break; }
      if (!/^image\/(png|svg\+xml|webp|gif|jpeg)$/.test(f.type)) { notify(`${f.name}: use PNG, SVG, WebP or JPG`); continue; }
      try {
        const dataUrl = await readFile(f);
        const img = await loadImage(dataUrl);
        const det = detectBackground(img);
        const id = uid();
        count++;
        setLogos((ls) => [...ls, { id, name: f.name, dataUrl, img, originalDataUrl: dataUrl, originalImg: img, visible: true, bgDetected: det.opaque, bgRemoved: false }]);
        setActiveLogoId(id);
        if (det.opaque && !firstOpaque) firstOpaque = id;
      } catch {
        notify(`${f.name}: could not be read`);
      }
    }
    // A logo with a solid backdrop opens the remover right away.
    if (firstOpaque) setBgDialogId(firstOpaque);
  }, [notify]);

  const removeLogo = (id: string) => {
    setLogos((ls) => ls.filter((l) => l.id !== id));
    setActiveLogoId((cur) => (cur === id ? null : cur));
  };
  const toggleLogoVisible = (id: string) => setLogos((ls) => ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  const openBgRemoval = (id?: string | null) => {
    const target = id ?? activeLogoId ?? logos[0]?.id;
    if (!target) { notify('Place a logo first'); openFilePicker(); return; }
    setBgDialogId(target);
  };
  const openFilePicker = () => {
    if (logos.length >= 2) { notify('Two logos max. Delete one first.'); return; }
    fileRef.current?.click();
  };

  // ---------- render ----------
  const resolveStamps = useCallback((): RenderStamp[] => {
    if (!stampsVisible) return [];
    const ids = renderLogos.map((l) => l.id);
    return doc.stamps
      .map((s) => ({ ...s, logoIndex: ids.indexOf(s.logoId) }))
      .map((s) => (s.logoIndex < 0 && ids.length ? { ...s, logoIndex: 0 } : s))
      .filter((s) => s.logoIndex >= 0);
  }, [doc.stamps, renderLogos, stampsVisible]);

  const draw = useCallback((target: HTMLCanvasElement, s: number) =>
    renderCamo(target, renderLogos.map((l) => l.img), config, doc.seed, s, { stamps: resolveStamps(), showPattern }),
  [renderLogos, config, doc.seed, resolveStamps, showPattern]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const id = requestAnimationFrame(() => {
      setStats(draw(canvas, size));
      if (tileView) setTileUrl(canvas.toDataURL('image/png'));
    });
    return () => cancelAnimationFrame(id);
  }, [draw, size, tileView, mobileView]);

  // ---------- zoom ----------
  const fit = useCallback(() => {
    const v = viewportRef.current;
    if (!v) return;
    const z = Math.min((v.clientWidth - VIEW_PAD * 2) / size, (v.clientHeight - VIEW_PAD * 2) / size);
    setZoom(Math.max(0.05, Math.min(4, z)));
    setFitMode(true);
  }, [size]);

  const setZoomAt = useCallback((z: number, nx = 0.5, ny = 0.5) => {
    anchorRef.current = { nx, ny };
    setZoom(Math.max(0.05, Math.min(8, z)));
    setFitMode(false);
  }, []);

  useLayoutEffect(() => {
    const v = viewportRef.current, a = anchorRef.current;
    if (!v || !a) return;
    const W = size * zoom;
    v.scrollLeft = VIEW_PAD + a.nx * W - v.clientWidth / 2;
    v.scrollTop = VIEW_PAD + a.ny * W - v.clientHeight / 2;
    anchorRef.current = null;
  }, [zoom, size]);

  useEffect(() => {
    const v = viewportRef.current;
    if (!v) return;
    const ro = new ResizeObserver(() => { if (fitMode) fit(); });
    ro.observe(v);
    return () => ro.disconnect();
  }, [fit, fitMode, mobileView]);

  const setSize = (s: number) => { setSizeState(s); setFitMode(true); };
  useEffect(() => { if (fitMode) fit(); }, [size]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- colors ----------
  const setFgIndex = (i: number) => setFgIndexState(i);
  const setTargetColor = useCallback((hex: string, target?: 'fg' | 'bg') => {
    const t = target ?? colorTarget;
    if (t === 'bg') updateConfig('Background Color', { backgroundColor: hex });
    else updateConfig('Swatch Color', (c) => ({ palette: c.palette.map((p, i) => (i === Math.min(fgIndex, c.palette.length - 1) ? hex : p)) }));
  }, [colorTarget, fgIndex, updateConfig]);

  const swapColors = () => updateConfig('Swap Colors', (c) => {
    const i = Math.min(fgIndex, c.palette.length - 1);
    return { backgroundColor: c.palette[i], palette: c.palette.map((p, j) => (j === i ? c.backgroundColor : p)) };
  });
  const resetColors = () => updateConfig('Default Colors', { backgroundColor: DEFAULT_CONFIG.backgroundColor, palette: DEFAULT_CONFIG.palette });
  const addSwatch = (hex: string) => {
    if (config.palette.length >= 6) { notify('Palette is full (6 swatches)'); return; }
    updateConfig('Add Swatch', (c) => ({ palette: [...c.palette, hex] }));
    setFgIndexState(config.palette.length);
  };

  // ---------- stamps ----------
  const stampRadius = (s: Stamp) => (s.scale * BASE_FRACTION) / 2;
  const hitStamp = (x: number, y: number): Stamp | null => {
    for (let i = doc.stamps.length - 1; i >= 0; i--) {
      const s = doc.stamps[i];
      let dx = Math.abs(x - s.x), dy = Math.abs(y - s.y);
      if (config.seamless) { dx = Math.min(dx, 1 - dx); dy = Math.min(dy, 1 - dy); }
      if (Math.hypot(dx, dy) <= stampRadius(s) * 0.9) return s;
    }
    return null;
  };
  const placeStamp = (x: number, y: number) => {
    const ids = renderLogos.map((l) => l.id);
    if (!ids.length) return;
    const logoId = toolOpts.stampLogo !== 'random' && ids.includes(toolOpts.stampLogo) ? toolOpts.stampLogo : ids[Math.floor(Math.random() * ids.length)];
    const color = toolOpts.stampColor === 'fg' ? fgColor : toolOpts.stampColor === 'random' ? config.palette[Math.floor(Math.random() * config.palette.length)] : null;
    const stamp: Stamp = {
      id: uid(), x, y, logoId, color, outlined: toolOpts.stampOutline, scale: toolOpts.stampScale,
      rotation: toolOpts.stampRandomRotation ? Math.round(Math.random() * 360 - 180) : toolOpts.stampRotation,
    };
    setDoc('Stamp', (d) => ({ ...d, stamps: [...d.stamps, stamp] }));
    if (!stampsVisible) setStampsVisible(true);
  };
  const eraseAt = (x: number, y: number) => {
    const r = toolOpts.eraserSize / REFERENCE_SIZE / 2;
    setDoc('Erase Stamps', (d) => {
      const next = d.stamps.filter((s) => {
        let dx = Math.abs(x - s.x), dy = Math.abs(y - s.y);
        if (d.config.seamless) { dx = Math.min(dx, 1 - dx); dy = Math.min(dy, 1 - dy); }
        return Math.hypot(dx, dy) > r + stampRadius(s) * 0.5;
      });
      return next.length === d.stamps.length ? d : { ...d, stamps: next };
    });
  };
  const moveStamp = (id: string, x: number, y: number) => setDoc('Move Stamp', (d) => ({
    ...d, stamps: d.stamps.map((s) => (s.id === id ? { ...s, x: d.config.seamless ? wrap01(x) : Math.max(0, Math.min(1, x)), y: d.config.seamless ? wrap01(y) : Math.max(0, Math.min(1, y)) } : s)),
  }));
  const updateStamp = (id: string, patch: Partial<Stamp>) => setDoc('Edit Stamp', (d) => ({ ...d, stamps: d.stamps.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const deleteStamp = (id: string) => { setDoc('Delete Stamp', (d) => ({ ...d, stamps: d.stamps.filter((s) => s.id !== id) })); setSelectedStampId(null); };
  const clearStamps = () => { setDoc('Clear Stamps', (d) => (d.stamps.length ? { ...d, stamps: [] } : d)); setSelectedStampId(null); };

  // ---------- canvas tools ----------
  const sampleAt = (x: number, y: number, alt: boolean) => {
    const c = canvasRef.current;
    if (!c) return;
    const n = toolOpts.eyedropSample;
    const px = Math.floor(x * c.width), py = Math.floor(y * c.height);
    const sx = Math.max(0, Math.min(c.width - n, px - (n >> 1))), sy = Math.max(0, Math.min(c.height - n, py - (n >> 1)));
    const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(sx, sy, n, n).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const cnt = d.length / 4;
    const hex = rgbToHex([r / cnt, g / cnt, b / cnt]);
    const target = alt ? 'bg' : toolOpts.eyedropTarget;
    if (target === 'add') addSwatch(hex);
    else setTargetColor(hex, target);
    notify(`Sampled ${hex.toUpperCase()} → ${target === 'add' ? 'new swatch' : target === 'bg' ? 'background' : 'foreground'}`);
  };
  const fillBackground = () => updateConfig('Paint Bucket', { backgroundColor: fgColor });
  const regenerate = () => setDoc('Regenerate', (d) => ({ ...d, seed: newSeed() }));
  const randomize = (mode: ToolOptions['diceMode'] = toolOpts.diceMode) => {
    const rng = mulberry32(newSeed());
    const pal = (n: number) => {
      const hue = 20 + rng() * 120;
      return Array.from({ length: n }, (_, i) => rgbToHex(hslToRgb(hue + (rng() - 0.5) * 50, 0.12 + rng() * 0.3, 0.14 + (i / n) * 0.45 + rng() * 0.05)));
    };
    if (mode === 'seed') return regenerate();
    if (mode === 'palette') return updateConfig('Randomize Palette', (c) => ({ palette: c.palette.map(() => randomTacticalColor(rng)), useCustomColors: true }));
    const p = pal(3 + Math.floor(rng() * 3));
    setDoc('Randomize Everything', (d) => ({
      ...d, seed: newSeed(),
      config: {
        ...d.config,
        density: Math.round(30 + rng() * 120), scaleMin: +(0.3 + rng() * 0.5).toFixed(2), scaleMax: +(1 + rng() * 1.4).toFixed(2),
        rotationJitter: [90, 180, 360][Math.floor(rng() * 3)], layering: 1 + Math.floor(rng() * 3),
        backgroundColor: p[0], palette: p.slice(1).length ? p.slice(1) : p, useCustomColors: true,
        blur: rng() < 0.25 ? +(rng() * 4).toFixed(1) : 0,
      },
    }));
  };

  const exportPng = (s?: number) => {
    const out = s && s !== size ? makeCanvas(s, s) : canvasRef.current;
    if (!out) return;
    const finalSize = s ?? size;
    if (s && s !== size) draw(out, s);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `camo-${doc.seed.toString(16)}-${finalSize}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      notify(`Exported ${finalSize}×${finalSize} PNG`);
    }, 'image/png');
  };

  const openExport = (format: 'svg' | 'png' = 'svg') => { setExportFormat(format); setDialog('export'); };

  // ---------- text to pattern ----------
  const runTextPattern = async (text = tpText) => {
    const idea = text.trim();
    if (!idea) return;
    setTpText(idea); setTpLoading(true); setTpError(null); setTopPanel('patterns');
    try {
      let r: TextPatternResult;
      if (aiSettings.apiKey) {
        try { r = await interpretWithClaude(idea, aiSettings); }
        catch (e) { setTpError(`Claude request failed (${(e as Error).message}). Used the offline generator.`); r = interpretLocally(idea); }
      } else {
        await new Promise((res) => setTimeout(res, 150));
        r = interpretLocally(idea);
      }
      setTpResult(r);
      setDoc(`Pattern: ${r.name}`, (d) => ({ ...d, config: { ...r.config } }));
    } finally { setTpLoading(false); }
  };

  // ---------- presets ----------
  const savePreset = (name: string) => {
    const next = [{ id: uid(), name, config, timestamp: Date.now() }, ...presets];
    setPresets(next); savePresets(next); notify(`Saved preset “${name}”`);
  };
  const deletePreset = (id: string) => { const next = presets.filter((p) => p.id !== id); setPresets(next); savePresets(next); };
  const applyPreset = (p: Preset) => setDoc(`Preset: ${p.name}`, (d) => ({ ...d, config: { ...p.config } }));

  // ---------- AI ----------
  const applyAI = (r: AIAnalysisResult) => updateConfig('AI Auto-Tune', {
    backgroundColor: r.backgroundColor, palette: r.accentColors.slice(0, 6), blendMode: r.recommendedBlendMode as GlobalCompositeOperation, useCustomColors: true,
  });
  const runAI = async () => {
    const src = logos.filter((l) => l.visible).length ? logos.filter((l) => l.visible) : logos;
    if (!src.length) { notify('Place a logo first'); return; }
    setAILoading(true); setAIError(null); setBottomPanel('ai');
    try {
      let r: AIAnalysisResult;
      if (aiSettings.apiKey) {
        try { r = await analyzeWithClaude(src, aiSettings); }
        catch (e) { setAIError(`Claude request failed (${(e as Error).message}). Used local analysis instead.`); r = analyzeLocally(src); }
      } else {
        await new Promise((res) => setTimeout(res, 300));
        r = analyzeLocally(src);
      }
      setAIResult(r); applyAI(r);
    } finally { setAILoading(false); }
  };

  // ---------- keyboard ----------
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName) || dialog || bgDialogId) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod) {
      const map: Record<string, () => void> = {
        z: () => (e.shiftKey ? hist.redo() : hist.undo()), y: hist.redo,
        o: openFilePicker, e: () => openExport(e.shiftKey ? 'png' : 'svg'), s: () => setDialog('savePreset'), b: () => openBgRemoval(),
        '=': () => setZoomAt(zoom * 1.25), '+': () => setZoomAt(zoom * 1.25), '-': () => setZoomAt(zoom / 1.25), '0': fit, '1': () => setZoomAt(1),
      };
      if (map[k]) { e.preventDefault(); map[k](); }
      return;
    }
    const t = TOOLS.find((x) => x.key.toLowerCase() === k);
    if (t) { setTool(t.id); return; }
    const sel = doc.stamps.find((s) => s.id === selectedStampId);
    if (sel && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const step = (e.shiftKey ? 10 : 1) / size;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      moveStamp(sel.id, sel.x + dx, sel.y + dy);
      return;
    }
    switch (e.key) {
      case 'x': case 'X': swapColors(); break;
      case 'd': case 'D': resetColors(); break;
      case 'n': case 'N': regenerate(); break;
      case 't': case 'T': setTileView((v) => !v); break;
      case '?': setDialog('shortcuts'); break;
      case 'Delete': case 'Backspace': if (sel) { e.preventDefault(); deleteStamp(sel.id); } break;
      case 'Escape': setSelectedStampId(null); break;
      case '[': case ']': {
        const dir = e.key === ']' ? 1 : -1;
        if (tool === 'eraser') setToolOptsState((o) => ({ ...o, eraserSize: Math.max(10, Math.min(400, o.eraserSize + dir * 10)) }));
        else setToolOptsState((o) => ({ ...o, stampScale: +Math.max(0.1, Math.min(3, o.stampScale + dir * 0.1)).toFixed(2) }));
        break;
      }
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Paste or drop images anywhere.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (files.length) addLogoFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addLogoFiles]);
  const [dragOver, setDragOver] = useState(false);

  const api: AppApi = {
    doc, config, setDoc, updateConfig,
    history: { entries: hist.entries, index: hist.index, undo: hist.undo, redo: hist.redo, jump: hist.jump, canUndo: hist.canUndo, canRedo: hist.canRedo },
    logos, renderLogos, activeLogoId, setActiveLogoId, openFilePicker, addLogoFiles, removeLogo, toggleLogoVisible, openBgRemoval,
    tool, setTool, toolOpts, setToolOpts: (p) => setToolOptsState((o) => ({ ...o, ...p })),
    fgIndex: safeFg, setFgIndex, fgColor, colorTarget, setColorTarget, setTargetColor, swapColors, resetColors, addSwatch,
    canvasRef, viewportRef, zoom, setZoomAt, fit, size, setSize, tileView, setTileView, tileUrl,
    showPattern, setShowPattern, stampsVisible, setStampsVisible, stats,
    selectedStampId, setSelectedStampId, placeStamp, eraseAt, hitStamp, moveStamp, updateStamp, deleteStamp, clearStamps,
    sampleAt, fillBackground, randomize, regenerate, exportPng, openExport,
    presets, savePreset, deletePreset, applyPreset,
    ai: { result: aiResult, loading: aiLoading, error: aiError, settings: aiSettings, run: runAI, apply: () => aiResult && applyAI(aiResult), openSettings: () => setDialog('settings') },
    textPattern: { text: tpText, setText: setTpText, loading: tpLoading, error: tpError, result: tpResult, run: (t) => { void runTextPattern(t); }, clear: () => { setTpResult(null); setTpError(null); } },
    topPanel, setTopPanel,
    bottomPanel, setBottomPanel,
    openDialog: setDialog, mod: MOD,
  };

  const bgLogo = logos.find((l) => l.id === bgDialogId);

  return (
    <AppCtx.Provider value={api}>
      <div
        className="flex h-[100dvh] flex-col overflow-hidden"
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addLogoFiles(Array.from(e.dataTransfer.files)); }}
      >
        <MenuBar />
        <OptionsBar />
        <div className="flex min-h-0 flex-1">
          <div className="hidden lg:flex"><Toolbar /></div>
          <main className={`${mobileView === 'canvas' ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col lg:flex`}>
            <DocumentCanvas />
          </main>
          <div className="hidden lg:flex"><IconDock /></div>
          <aside className={`${mobileView === 'panels' ? 'flex' : 'hidden'} ps-scroll w-full flex-col overflow-y-auto bg-ps-line lg:flex lg:w-[320px] lg:shrink-0 lg:overflow-hidden xl:w-[340px]`}>
            <Panels stacked={mobileView === 'panels' && typeof window !== 'undefined' && window.innerWidth < 1024} />
          </aside>
        </div>
        {mobileView === 'canvas' && <div className="lg:hidden"><Toolbar horizontal /></div>}
        <nav className="grid shrink-0 grid-cols-2 border-t border-ps-line bg-ps-menu pb-[env(safe-area-inset-bottom)] lg:hidden">
          {([['canvas', 'Canvas', ImageIcon], ['panels', 'Panels', Layers]] as const).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => setMobileView(k)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${mobileView === k ? 'text-white' : 'text-ps-dim'}`}>
              <Icon size={17} />{label}
            </button>
          ))}
        </nav>

        <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/webp,image/gif,image/jpeg" multiple hidden
          onChange={(e) => { addLogoFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />

        {dragOver && (
          <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-ps-blue/20 ring-4 ring-inset ring-ps-blue">
            <span className="rounded bg-ps-menu px-4 py-2 text-[13px] text-white shadow-lg">Drop to place logo</span>
          </div>
        )}
        {toast && (
          <div className="pointer-events-none fixed bottom-16 left-1/2 z-[80] -translate-x-1/2 rounded-[4px] border border-black/60 bg-ps-menu px-3 py-1.5 text-[12px] text-ps-text shadow-lg lg:bottom-10">{toast}</div>
        )}

        {bgLogo && (
          <BgRemovalDialog
            key={bgLogo.id}
            logo={bgLogo}
            onClose={() => setBgDialogId(null)}
            onRestore={() => {
              setLogos((ls) => ls.map((l) => (l.id === bgLogo.id ? { ...l, dataUrl: l.originalDataUrl, img: l.originalImg, bgRemoved: false } : l)));
              setBgDialogId(null);
            }}
            onApply={async (dataUrl) => {
              const img = await loadImage(dataUrl);
              setLogos((ls) => ls.map((l) => (l.id === bgLogo.id ? { ...l, dataUrl, img, bgRemoved: true } : l)));
              setBgDialogId(null);
              notify('Background removed');
            }}
          />
        )}
        {dialog === 'settings' && <SettingsDialog settings={aiSettings} onClose={() => setDialog(null)} onSave={(s) => { setAISettings(s); saveAISettings(s); setDialog(null); }} />}
        {dialog === 'savePreset' && <SavePresetDialog defaultName={`Preset ${presets.length + 1}`} onClose={() => setDialog(null)} onSave={(n) => { savePreset(n); setDialog(null); }} />}
        {dialog === 'shortcuts' && <ShortcutsDialog mod={MOD} onClose={() => setDialog(null)} />}
        {dialog === 'about' && <AboutDialog onClose={() => setDialog(null)} />}
        {dialog === 'export' && (
          <ExportDialog logos={renderLogos} config={config} seed={doc.seed} stamps={resolveStamps()} showPattern={showPattern}
            initialFormat={exportFormat} onExportPng={exportPng} onDone={notify} onClose={() => setDialog(null)} />
        )}
      </div>
    </AppCtx.Provider>
  );
}

