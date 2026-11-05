import { Maximize, Trash2, WandSparkles, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../state/AppContext';
import { TOOLS } from './tools';
import { Btn, Check, NumberInput } from './ui';

const Sep = () => <div className="mx-1 h-5 w-px shrink-0 bg-ps-edge" />;
const Lbl = ({ children }: { children: ReactNode }) => <span className="shrink-0 whitespace-nowrap text-[11px] text-ps-dim">{children}</span>;

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-[3px] border border-ps-line bg-ps-input">
      {options.map((o) => (
        <button key={String(o.v)} type="button" onClick={() => onChange(o.v)}
          className={`h-[22px] whitespace-nowrap px-2 text-[11px] ${value === o.v ? 'bg-ps-active text-white' : 'text-ps-dim hover:text-ps-text'}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

const SmallBtn = ({ children, onClick, title, disabled }: { children: ReactNode; onClick: () => void; title?: string; disabled?: boolean }) => (
  <button type="button" onClick={onClick} title={title} disabled={disabled}
    className="inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-[3px] border border-ps-edge px-2 text-[11px] text-ps-text hover:bg-ps-hover disabled:opacity-40">
    {children}
  </button>
);

export function OptionsBar() {
  const a = useApp();
  const o = a.toolOpts;
  const def = TOOLS.find((t) => t.id === a.tool)!;
  const Icon = def.icon;
  const selected = a.doc.stamps.find((s) => s.id === a.selectedStampId);
  const logoOptions = [{ v: 'random', l: 'Random' }, ...a.renderLogos.map((l, i) => ({ v: l.id, l: a.logos.length ? `L${i + 1}` : 'Sample' }))];

  let body: ReactNode;
  switch (a.tool) {
    case 'move':
      body = selected ? (
        <>
          <Lbl>Selected stamp</Lbl>
          <Lbl>Scale</Lbl>
          <NumberInput value={selected.scale} min={0.1} max={3} step={0.05} decimals={2} onChange={(v) => a.updateStamp(selected.id, { scale: v })} className="w-14" />
          <Lbl>Angle</Lbl>
          <NumberInput value={selected.rotation} min={-360} max={360} step={5} onChange={(v) => a.updateStamp(selected.id, { rotation: v })} className="w-14" suffix="°" />
          <SmallBtn onClick={() => a.updateStamp(selected.id, { color: a.fgColor })}>Use foreground</SmallBtn>
          <SmallBtn onClick={() => a.deleteStamp(selected.id)}><Trash2 size={11} /> Delete</SmallBtn>
        </>
      ) : (
        <>
          <Lbl>{a.doc.stamps.length ? 'Click a stamp to select it, then drag to move. Arrow keys nudge.' : 'No stamps yet. Use the Logo Stamp Tool (S) to place logos by hand.'}</Lbl>
          {a.doc.stamps.length > 0 && <SmallBtn onClick={a.clearStamps}>Clear {a.doc.stamps.length} stamps</SmallBtn>}
        </>
      );
      break;
    case 'hand':
    case 'zoom':
      body = (
        <>
          <SmallBtn onClick={() => a.setZoomAt(a.zoom * 1.25)} title="Zoom in"><ZoomIn size={12} /></SmallBtn>
          <SmallBtn onClick={() => a.setZoomAt(a.zoom / 1.25)} title="Zoom out"><ZoomOut size={12} /></SmallBtn>
          <SmallBtn onClick={() => a.setZoomAt(1)}>100%</SmallBtn>
          <SmallBtn onClick={a.fit}><Maximize size={11} /> Fit Screen</SmallBtn>
          <Sep />
          <Check label="Tile preview" checked={a.tileView} onChange={a.setTileView} />
        </>
      );
      break;
    case 'stamp':
      body = (
        <>
          <Lbl>Logo</Lbl>
          <Seg value={o.stampLogo} options={logoOptions} onChange={(v) => a.setToolOpts({ stampLogo: v })} />
          <Sep />
          <Lbl>Size</Lbl>
          <NumberInput value={o.stampScale} min={0.1} max={3} step={0.05} decimals={2} onChange={(v) => a.setToolOpts({ stampScale: v })} className="w-14" suffix="×" />
          <Lbl>Angle</Lbl>
          <NumberInput value={o.stampRotation} min={-180} max={180} step={5} onChange={(v) => a.setToolOpts({ stampRotation: v })} className="w-14" suffix="°" />
          <Check label="Random angle" checked={o.stampRandomRotation} onChange={(v) => a.setToolOpts({ stampRandomRotation: v })} />
          <Sep />
          <Lbl>Color</Lbl>
          <Seg value={o.stampColor} options={[{ v: 'fg', l: 'Foreground' }, { v: 'random', l: 'Palette' }, { v: 'original', l: 'Original' }]} onChange={(v) => a.setToolOpts({ stampColor: v })} />
          <Check label="Outline" checked={o.stampOutline} onChange={(v) => a.setToolOpts({ stampOutline: v })} />
        </>
      );
      break;
    case 'eraser':
      body = (
        <>
          <Lbl>Size</Lbl>
          <input type="range" min={10} max={400} value={o.eraserSize} onChange={(e) => a.setToolOpts({ eraserSize: +e.target.value })} className="!w-28" style={{ ['--fill' as string]: `${((o.eraserSize - 10) / 390) * 100}%` }} aria-label="Eraser size" />
          <NumberInput value={o.eraserSize} min={10} max={400} onChange={(v) => a.setToolOpts({ eraserSize: v })} className="w-14" suffix="px" />
          <Lbl>[ and ] change size</Lbl>
          <Sep />
          <SmallBtn onClick={a.clearStamps} disabled={!a.doc.stamps.length}><Trash2 size={11} /> Clear all stamps</SmallBtn>
        </>
      );
      break;
    case 'eyedropper':
      body = (
        <>
          <Lbl>Sample size</Lbl>
          <Seg value={o.eyedropSample} options={[{ v: 1, l: 'Point' }, { v: 3, l: '3×3 Avg' }, { v: 5, l: '5×5 Avg' }]} onChange={(v) => a.setToolOpts({ eyedropSample: v })} />
          <Sep />
          <Lbl>Send to</Lbl>
          <Seg value={o.eyedropTarget} options={[{ v: 'fg', l: 'Foreground' }, { v: 'bg', l: 'Background' }, { v: 'add', l: 'New swatch' }]} onChange={(v) => a.setToolOpts({ eyedropTarget: v })} />
          <Lbl>Alt-click: background</Lbl>
        </>
      );
      break;
    case 'bucket':
      body = (
        <>
          <span className="h-4 w-4 shrink-0 border border-black" style={{ background: a.fgColor }} />
          <Lbl>Click the canvas to fill the background with the foreground color.</Lbl>
          <SmallBtn onClick={a.fillBackground}>Fill now</SmallBtn>
        </>
      );
      break;
    case 'wand':
      body = (
        <>
          <Lbl>Layer</Lbl>
          {a.logos.length ? (
            <Seg value={a.activeLogoId ?? a.logos[0].id} options={a.logos.map((l, i) => ({ v: l.id, l: `L${i + 1} ${l.bgRemoved ? '✓' : ''}` }))} onChange={(v) => a.setActiveLogoId(v)} />
          ) : <Lbl>Upload a logo first</Lbl>}
          <Sep />
          <Btn primary onClick={() => a.openBgRemoval()} disabled={!a.logos.length} className="!h-[22px] !px-3 !text-[11px]">
            <WandSparkles size={12} /> Remove Background…
          </Btn>
          <Lbl>Makes white / solid backgrounds transparent</Lbl>
        </>
      );
      break;
    case 'dice':
      body = (
        <>
          <Lbl>Randomize</Lbl>
          <Seg value={o.diceMode} options={[{ v: 'seed', l: 'Layout' }, { v: 'palette', l: 'Palette' }, { v: 'all', l: 'Everything' }]} onChange={(v) => a.setToolOpts({ diceMode: v })} />
          <SmallBtn onClick={() => a.randomize()}><RefreshCw size={11} /> Roll</SmallBtn>
        </>
      );
      break;
  }

  return (
    <div className="no-scrollbar flex h-10 shrink-0 items-center gap-2 overflow-x-auto border-b border-ps-line bg-ps-bar px-2">
      <div className="flex shrink-0 items-center gap-1 rounded-[3px] px-1.5 py-1 text-ps-text" title={def.name}>
        <Icon size={17} strokeWidth={1.7} />
      </div>
      <Sep />
      {body}
    </div>
  );
}
