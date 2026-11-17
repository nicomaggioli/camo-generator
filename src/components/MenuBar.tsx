import { useEffect, useRef, useState } from 'react';
import { Check as CheckIcon, Search, Share } from 'lucide-react';
import { CgLogo } from './ui';
import { useApp } from '../state/AppContext';
import { BLEND_MODES } from '../types';
import { adjustLightness, desaturate } from '../lib/color';

type Item = { label: string; shortcut?: string; onClick?: () => void; disabled?: boolean; checked?: boolean } | '-';
interface Menu { label: string; items: Item[] }

export function MenuBar() {
  const a = useApp();
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const m = a.mod;

  useEffect(() => {
    if (open === null) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const c = a.config;
  const menus: Menu[] = [
    { label: 'File', items: [
      { label: 'Place Logo…', shortcut: `${m}O`, onClick: a.openFilePicker, disabled: a.logos.length >= 2 },
      '-',
      { label: 'Export Vector SVG (Illustrator)…', shortcut: `${m}E`, onClick: () => a.openExport('svg') },
      { label: 'Export PNG…', shortcut: `⇧${m}E`, onClick: () => a.openExport('png') },
      { label: `Quick Export PNG (${a.size}px)`, onClick: () => a.exportPng() },
      '-',
      { label: 'Save as Preset…', shortcut: `${m}S`, onClick: () => a.openDialog('savePreset') },
    ] },
    { label: 'Edit', items: [
      { label: `Undo ${a.history.canUndo ? a.history.entries[a.history.index] : ''}`.trim(), shortcut: `${m}Z`, onClick: a.history.undo, disabled: !a.history.canUndo },
      { label: 'Redo', shortcut: `⇧${m}Z`, onClick: a.history.redo, disabled: !a.history.canRedo },
      '-',
      { label: 'Fill Background with Foreground', shortcut: 'G', onClick: a.fillBackground },
      { label: 'Swap Colors', shortcut: 'X', onClick: a.swapColors },
      { label: 'Default Colors', shortcut: 'D', onClick: a.resetColors },
      '-',
      { label: 'Delete Selected Stamp', shortcut: 'Del', onClick: () => a.selectedStampId && a.deleteStamp(a.selectedStampId), disabled: !a.selectedStampId },
      { label: 'Clear All Stamps', onClick: a.clearStamps, disabled: !a.doc.stamps.length },
      '-',
      { label: 'Keyboard Shortcuts…', shortcut: '?', onClick: () => a.openDialog('shortcuts') },
    ] },
    { label: 'Image', items: [
      { label: 'Remove Background…', shortcut: `${m}B`, onClick: () => a.openBgRemoval(), disabled: !a.logos.length },
      '-',
      ...[512, 1024, 2048].map((s) => ({ label: `Canvas Size ${s} × ${s}`, checked: a.size === s, onClick: () => a.setSize(s) })),
      '-',
      { label: 'Adjust: Darken Palette', onClick: () => a.updateConfig('Darken Palette', (cc) => ({ palette: cc.palette.map((x) => adjustLightness(x, -0.06)) })) },
      { label: 'Adjust: Lighten Palette', onClick: () => a.updateConfig('Lighten Palette', (cc) => ({ palette: cc.palette.map((x) => adjustLightness(x, 0.06)) })) },
      { label: 'Adjust: Desaturate Palette', onClick: () => a.updateConfig('Desaturate Palette', (cc) => ({ palette: cc.palette.map((x) => desaturate(x, 0.35)) })) },
      { label: 'Adjust: Randomize Palette', onClick: () => a.randomize('palette') },
    ] },
    { label: 'Pattern', items: [
      { label: 'Browse Pattern Library…', onClick: () => a.setTopPanel('patterns') },
      { label: 'Create Pattern from Words…', onClick: () => { a.setTopPanel('patterns'); setTimeout(() => (document.querySelector('[aria-label="Pattern idea"]') as HTMLInputElement | null)?.focus(), 50); } },
      '-',
      { label: 'Regenerate', shortcut: 'N', onClick: a.regenerate },
      { label: 'Randomize Everything', onClick: () => a.randomize('all') },
      '-',
      { label: 'Seamless Tiling', checked: c.seamless, onClick: () => a.updateConfig('Seamless', { seamless: !c.seamless }) },
      { label: 'Tint with Palette', checked: c.useCustomColors, onClick: () => a.updateConfig('Tint', { useCustomColors: !c.useCustomColors }) },
      '-',
      { label: 'Add Layer Pass', onClick: () => a.updateConfig('Layer Passes', { layering: Math.min(5, c.layering + 1) }), disabled: c.layering >= 5 },
      { label: 'Remove Layer Pass', onClick: () => a.updateConfig('Layer Passes', { layering: Math.max(1, c.layering - 1) }), disabled: c.layering <= 1 },
      '-',
      { label: 'Show Pattern Layer', checked: a.showPattern, onClick: () => a.setShowPattern(!a.showPattern) },
      { label: 'Show Stamps Layer', checked: a.stampsVisible, onClick: () => a.setStampsVisible(!a.stampsVisible) },
    ] },
    { label: 'Filter', items: [
      ...[['No Blur', 0], ['Soft Blur', 2], ['Medium Blur', 5], ['Heavy Blur', 9]].map(([l, v]) => ({ label: l as string, checked: c.blur === v, onClick: () => a.updateConfig('Blur', { blur: v as number }) })),
      '-',
      ...(['source-over', 'multiply', 'overlay', 'screen', 'soft-light'] as const).map((b) => ({ label: `Blend: ${b}`, checked: c.blendMode === b, onClick: () => a.updateConfig('Blend Mode', { blendMode: b }) })),
      { label: `More blend modes (${BLEND_MODES.length}) in Properties`, onClick: () => a.setBottomPanel('properties') },
    ] },
    { label: 'AI', items: [
      { label: 'Auto-Tune from Logo', onClick: a.ai.run, disabled: !a.logos.length || a.ai.loading },
      { label: 'Re-apply Last Recommendation', onClick: a.ai.apply, disabled: !a.ai.result },
      '-',
      { label: 'AI Settings…', onClick: a.ai.openSettings },
    ] },
    { label: 'View', items: [
      { label: 'Zoom In', shortcut: `${m}+`, onClick: () => a.setZoomAt(a.zoom * 1.25) },
      { label: 'Zoom Out', shortcut: `${m}−`, onClick: () => a.setZoomAt(a.zoom / 1.25) },
      { label: 'Fit on Screen', shortcut: `${m}0`, onClick: a.fit },
      { label: '100%', shortcut: `${m}1`, onClick: () => a.setZoomAt(1) },
      '-',
      { label: 'Tile Preview (3×3)', shortcut: 'T', checked: a.tileView, onClick: () => a.setTileView(!a.tileView) },
    ] },
    { label: 'Window', items: [
      ...(['color', 'swatches', 'patterns'] as const).map((p) => ({ label: p[0].toUpperCase() + p.slice(1), checked: a.topPanel === p, onClick: () => a.setTopPanel(p) })),
      '-',
      ...(['properties', 'layers', 'ai', 'history'] as const).map((p) => ({ label: p === 'ai' ? 'AI Auto-Tune' : p[0].toUpperCase() + p.slice(1), checked: a.bottomPanel === p, onClick: () => a.setBottomPanel(p) })),
    ] },
    { label: 'Help', items: [
      { label: 'Keyboard Shortcuts', shortcut: '?', onClick: () => a.openDialog('shortcuts') },
      { label: 'About Camo Generator', onClick: () => a.openDialog('about') },
    ] },
  ];

  return (
    <div ref={ref} className="relative z-50 flex h-8 shrink-0 items-center border-b border-ps-line bg-ps-menu pl-2 pr-2">
      <span className="mr-2 flex items-center"><CgLogo /></span>
      <div className="no-scrollbar flex min-w-0 flex-1 items-center overflow-x-auto">
        {menus.map((menu, i) => (
          <div key={menu.label} className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpen(open === i ? null : i); }}
              onMouseEnter={() => open !== null && setOpen(i)}
              className={`h-8 whitespace-nowrap px-2.5 text-[12.5px] ${open === i ? 'bg-ps-hover text-white' : 'text-ps-text hover:bg-ps-hover'}`}
            >
              {menu.label}
            </button>
          </div>
        ))}
      </div>
      <div className="ml-2 hidden items-center gap-1 sm:flex">
        <button type="button" onClick={() => a.openDialog('shortcuts')} className="rounded p-1.5 text-ps-dim hover:bg-ps-hover hover:text-white" title="Search shortcuts"><Search size={15} /></button>
        <button type="button" onClick={() => a.openExport('svg')} className="rounded p-1.5 text-ps-dim hover:bg-ps-hover hover:text-white" title="Export"><Share size={15} /></button>
      </div>
      {open !== null && <MenuDropdown items={menus[open].items} left={dropLeft(ref.current, open)} onDone={() => setOpen(null)} />}
    </div>
  );
}

function dropLeft(root: HTMLDivElement | null, i: number) {
  const btn = root?.querySelectorAll('div.relative > button')[i] as HTMLElement | undefined;
  const r = btn?.getBoundingClientRect();
  return Math.max(4, Math.min((r?.left ?? 0), window.innerWidth - 270));
}

function MenuDropdown({ items, left, onDone }: { items: Item[]; left: number; onDone: () => void }) {
  return (
    <div className="fixed top-8 z-50 min-w-[250px] rounded-b-[4px] border border-black/70 bg-ps-bar py-1 shadow-[0_8px_24px_rgba(0,0,0,.55)]" style={{ left }}>
      {items.map((it, i) =>
        it === '-' ? (
          <div key={i} className="my-1 h-px bg-ps-line" />
        ) : (
          <button
            key={i} type="button" disabled={it.disabled}
            onClick={() => { it.onClick?.(); onDone(); }}
            className="flex w-full items-center gap-2 px-3 py-[5px] text-left text-[12px] text-ps-text hover:bg-ps-blue hover:text-white disabled:pointer-events-none disabled:text-ps-faint"
          >
            <span className="w-3">{it.checked && <CheckIcon size={12} />}</span>
            <span className="flex-1 truncate">{it.label}</span>
            {it.shortcut && <span className="pl-6 text-[11px] text-ps-dim">{it.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  );
}
