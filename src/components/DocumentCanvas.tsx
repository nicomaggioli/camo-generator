import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { BASE_FRACTION, REFERENCE_SIZE, imgSize } from '../engine/camo';

const CURSORS: Record<string, string> = {
  move: 'default', hand: 'grab', zoom: 'zoom-in', stamp: 'copy', eraser: 'none', eyedropper: 'crosshair', bucket: 'cell', wand: 'pointer', dice: 'pointer',
};

export const VIEW_PAD = 28;

export function DocumentCanvas() {
  const a = useApp();
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<
    | { type: 'pan'; sx: number; sy: number; sl: number; st: number }
    | { type: 'move'; id: string; ox: number; oy: number }
    | { type: 'erase' }
    | null
  >(null);
  const [space, setSpace] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [alt, setAlt] = useState(false);

  useEffect(() => {
    const isField = (e: KeyboardEvent) => /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName);
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isField(e)) { e.preventDefault(); setSpace(true); }
      if (e.key === 'Alt') setAlt(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpace(false);
      if (e.key === 'Alt') setAlt(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const tool = space ? 'hand' : a.tool;
  const W = a.size * a.zoom;

  /** Pointer → tile coordinates (0–1). In tile view, the 3×3 grid folds back onto one tile. */
  const toNorm = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current!.getBoundingClientRect();
    const rx = (e.clientX - r.left) / r.width;
    const ry = (e.clientY - r.top) / r.height;
    const fx = a.tileView ? (((rx * 3) % 1) + 1) % 1 : rx;
    const fy = a.tileView ? (((ry * 3) % 1) + 1) % 1 : ry;
    return { rx, ry, fx, fy, px: e.clientX - r.left, py: e.clientY - r.top, inside: rx >= 0 && rx <= 1 && ry >= 0 && ry <= 1 };
  };

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const p = toNorm(e);
    const v = a.viewportRef.current!;
    if (tool === 'hand') {
      drag.current = { type: 'pan', sx: e.clientX, sy: e.clientY, sl: v.scrollLeft, st: v.scrollTop };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (!p.inside) { if (tool === 'move') a.setSelectedStampId(null); return; }
    switch (tool) {
      case 'zoom': a.setZoomAt(e.altKey ? a.zoom / 1.5 : a.zoom * 1.5, p.rx, p.ry); break;
      case 'stamp': a.placeStamp(p.fx, p.fy); break;
      case 'eraser': drag.current = { type: 'erase' }; a.eraseAt(p.fx, p.fy); e.currentTarget.setPointerCapture(e.pointerId); break;
      case 'move': {
        const hit = a.hitStamp(p.fx, p.fy);
        a.setSelectedStampId(hit?.id ?? null);
        if (hit) { drag.current = { type: 'move', id: hit.id, ox: p.fx - hit.x, oy: p.fy - hit.y }; e.currentTarget.setPointerCapture(e.pointerId); }
        break;
      }
      case 'eyedropper': a.sampleAt(p.fx, p.fy, e.altKey); break;
      case 'bucket': a.fillBackground(); break;
      case 'wand': a.openBgRemoval(); break;
      case 'dice': a.randomize(); break;
    }
  };

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const p = toNorm(e);
    setPointer(p.inside ? { x: p.px, y: p.py } : null);
    const d = drag.current;
    if (!d) return;
    if (d.type === 'pan') {
      const v = a.viewportRef.current!;
      v.scrollLeft = d.sl - (e.clientX - d.sx);
      v.scrollTop = d.st - (e.clientY - d.sy);
    } else if (d.type === 'erase') {
      if (p.inside) a.eraseAt(p.fx, p.fy);
    } else if (d.type === 'move') {
      // Use the unfolded position while dragging so a stamp can glide across the tile edge.
      const r = stageRef.current!.getBoundingClientRect();
      const rx = (e.clientX - r.left) / r.width * (a.tileView ? 3 : 1);
      const ry = (e.clientY - r.top) / r.height * (a.tileView ? 3 : 1);
      let nx = rx - d.ox, ny = ry - d.oy;
      if (a.tileView) { nx = ((nx % 1) + 1) % 1; ny = ((ny % 1) + 1) % 1; }
      a.moveStamp(d.id, nx, ny);
    }
  };

  const onUp = () => { drag.current = null; };

  // Marching-ants box around the selected stamp.
  const sel = !a.tileView ? a.doc.stamps.find((s) => s.id === a.selectedStampId) : undefined;
  const selLogo = sel && (a.renderLogos.find((l) => l.id === sel.logoId) ?? a.renderLogos[0]);
  let selBox: { w: number; h: number } | null = null;
  if (sel && selLogo) {
    const [iw, ih] = imgSize(selLogo.img);
    const longest = sel.scale * BASE_FRACTION * W;
    selBox = { w: (longest * iw) / Math.max(iw, ih), h: (longest * ih) / Math.max(iw, ih) };
  }

  const tileScale = a.tileView ? 1 / 3 : 1;
  const eraserD = (a.toolOpts.eraserSize / REFERENCE_SIZE) * W * tileScale;
  const ghostLogo = a.toolOpts.stampLogo === 'random' ? a.renderLogos[0] : a.renderLogos.find((l) => l.id === a.toolOpts.stampLogo) ?? a.renderLogos[0];
  const ghostSize = a.toolOpts.stampScale * BASE_FRACTION * W * tileScale;

  const cursor = tool === 'hand' && drag.current?.type === 'pan' ? 'grabbing' : tool === 'zoom' && alt ? 'zoom-out' : CURSORS[tool];
  const zoomPct = Math.round(a.zoom * 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Document tab */}
      <div className="flex h-8 shrink-0 items-end border-b border-ps-line bg-ps-menu">
        <div className="flex h-8 max-w-full items-center gap-2 border-r border-ps-line bg-ps-canvas px-3 text-[12px] text-ps-text">
          <span className="truncate">
            <span className="font-semibold">camo-pattern.png</span> @ {zoomPct}% ({a.tileView ? 'Tile Preview' : 'Camo Pattern'}, RGB/8)
            {a.history.index > 0 ? ' *' : ''}
          </span>
          <X size={12} className="shrink-0 text-ps-dim" />
        </div>
      </div>

      <div ref={a.viewportRef} className="ps-scroll relative min-h-0 flex-1 overflow-auto bg-ps-canvas">
        <div className="flex min-h-full w-max min-w-full items-center justify-center" style={{ padding: VIEW_PAD }}>
          <div
            ref={stageRef}
            className="relative shrink-0 shadow-[0_0_0_1px_rgba(0,0,0,.6),0_6px_28px_rgba(0,0,0,.45)]"
            style={{ width: W, height: W, cursor, touchAction: 'none' }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            onPointerLeave={() => setPointer(null)}
          >
            <div className="checkerboard absolute inset-0" />
            <canvas ref={a.canvasRef} className={`absolute inset-0 h-full w-full ${a.tileView ? 'invisible' : ''}`} style={{ imageRendering: a.zoom > 2 ? 'pixelated' : 'auto' }} />
            {a.tileView && a.tileUrl && (
              <div className="absolute inset-0" style={{ backgroundImage: `url(${a.tileUrl})`, backgroundSize: '33.3333% 33.3333%' }}>
                <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(20,115,230,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(20,115,230,.55) 1px, transparent 1px)', backgroundSize: '33.3333% 33.3333%', backgroundPosition: '-1px -1px' }} />
              </div>
            )}
            {sel && selBox && (
              <div className="pointer-events-none absolute" style={{ left: sel.x * W, top: sel.y * W, width: 0, height: 0 }}>
                <div className="marching-ants absolute" style={{ width: selBox.w, height: selBox.h, left: -selBox.w / 2, top: -selBox.h / 2, transform: `rotate(${sel.rotation}deg)` }}>
                  {[[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]].map(([hx, hy], i) => (
                    <span key={i} className="absolute h-[7px] w-[7px] border border-black bg-white" style={{ left: `calc(${hx * 100}% - 3.5px)`, top: `calc(${hy * 100}% - 3.5px)` }} />
                  ))}
                </div>
              </div>
            )}
            {pointer && tool === 'eraser' && (
              <div className="pointer-events-none absolute rounded-full border border-white mix-blend-difference" style={{ width: eraserD, height: eraserD, left: pointer.x - eraserD / 2, top: pointer.y - eraserD / 2 }} />
            )}
            {pointer && tool === 'stamp' && ghostLogo && (
              <img src={ghostLogo.dataUrl} alt="" className="pointer-events-none absolute object-contain opacity-50"
                style={{ width: ghostSize, height: ghostSize, left: pointer.x - ghostSize / 2, top: pointer.y - ghostSize / 2, transform: `rotate(${a.toolOpts.stampRandomRotation ? 0 : a.toolOpts.stampRotation}deg)` }} />
            )}
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}

function StatusBar() {
  const a = useApp();
  return (
    <div className="flex h-6 shrink-0 items-center gap-3 border-t border-ps-line bg-ps-bar px-2 text-[11px] text-ps-dim">
      <label className="flex items-center">
        <input
          key={a.zoom}
          defaultValue={`${Math.round(a.zoom * 100)}%`}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            const v = parseFloat((e.target as HTMLInputElement).value);
            if (!Number.isNaN(v)) a.setZoomAt(v / 100);
          }}
          className="h-[18px] w-14 rounded-[2px] border border-transparent bg-transparent px-1 text-ps-text hover:border-ps-edge focus:border-ps-blue focus:outline-none"
          aria-label="Zoom level"
        />
      </label>
      <span className="text-ps-text">{a.size} px × {a.size} px (72 ppi)</span>
      <span className="hidden sm:inline">seed {a.doc.seed.toString(16).padStart(8, '0')}</span>
      <span className="hidden md:inline">{a.stats.shapes} shapes · {a.doc.stamps.length} stamps</span>
      <span className="hidden md:inline">{a.stats.ms.toFixed(0)} ms</span>
      <span className={`ml-auto ${a.config.seamless ? 'text-tactical-accent' : ''}`}>{a.config.seamless ? 'Seamless' : 'Non-tiling'}</span>
    </div>
  );
}
