import { useEffect, useMemo, useRef, useState } from 'react';
import { Pipette } from 'lucide-react';
import type { LogoAsset } from '../../types';
import { detectBackground, removeBackground, type BgRemoveOptions } from '../../engine/bgRemove';
import { imgSize } from '../../engine/camo';
import { hexToRgb, rgbToHex } from '../../lib/color';
import { Btn, Check, Dialog, PropSlider } from '../ui';

const PREVIEW = 300;

export function BgRemovalDialog({
  logo, onApply, onRestore, onClose,
}: { logo: LogoAsset; onApply: (dataUrl: string) => void; onRestore: () => void; onClose: () => void }) {
  const detected = useMemo(() => detectBackground(logo.originalImg), [logo.originalImg]);
  const [opts, setOpts] = useState<BgRemoveOptions>({ color: detected.color, tolerance: 12, softness: 10, mode: 'edges', defringe: true });
  const [preview, setPreview] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const srcCanvas = useRef<HTMLCanvasElement>(null);

  const [iw, ih] = imgSize(logo.originalImg);
  const k = PREVIEW / Math.max(iw, ih);
  const pw = Math.round(iw * k), ph = Math.round(ih * k);

  useEffect(() => {
    const c = srcCanvas.current;
    if (!c) return;
    c.width = pw; c.height = ph;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.clearRect(0, 0, pw, ph);
    ctx.drawImage(logo.originalImg, 0, 0, pw, ph);
  }, [logo.originalImg, pw, ph]);

  useEffect(() => {
    const id = setTimeout(() => setPreview(removeBackground(logo.originalImg, opts, PREVIEW * 2)), 60);
    return () => clearTimeout(id);
  }, [logo.originalImg, opts]);

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!picking) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * pw);
    const y = Math.floor(((e.clientY - r.top) / r.height) * ph);
    const d = e.currentTarget.getContext('2d')!.getImageData(x, y, 1, 1).data;
    setOpts((o) => ({ ...o, color: [d[0], d[1], d[2]] }));
    setPicking(false);
  };

  const apply = () => {
    setBusy(true);
    // Let the button repaint before the full-resolution pass.
    setTimeout(() => onApply(removeBackground(logo.originalImg, opts)), 20);
  };

  const hex = rgbToHex(opts.color);
  return (
    <Dialog title={`Remove Background — ${logo.name}`} onClose={onClose} width="max-w-3xl"
      footer={<>
        {logo.bgRemoved && <Btn onClick={onRestore} className="mr-auto">Restore Original</Btn>}
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn primary onClick={apply} disabled={busy}>{busy ? 'Processing…' : 'OK'}</Btn>
      </>}>
      <div className="grid gap-5 md:grid-cols-[1fr_250px]">
        <div className="grid grid-cols-2 gap-3">
          {[['Original', true], ['Result', false]].map(([label, isSrc]) => (
            <figure key={label as string} className="min-w-0">
              <figcaption className="mb-1.5 text-[11px] text-ps-dim">{label as string}{isSrc && picking && <span className="text-tactical-accent"> — click the background</span>}</figcaption>
              <div className="checkerboard flex aspect-square items-center justify-center overflow-hidden rounded-[2px] border border-black/60">
                {isSrc ? (
                  <canvas ref={srcCanvas} onClick={pick} className="max-h-full max-w-full" style={{ cursor: picking ? 'crosshair' : 'default' }} />
                ) : preview ? (
                  <img src={preview} alt="Background removed preview" className="max-h-full max-w-full" />
                ) : null}
              </div>
            </figure>
          ))}
        </div>

        <div className="space-y-3">
          <div className="rounded-[3px] border border-ps-line bg-ps-input p-2 text-[11px] text-ps-dim">
            {detected.opaque ? 'Detected a solid background. Adjust the tolerance until only the backdrop disappears.' : 'This logo already has transparent edges, but you can still key out a color.'}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[78px] text-[11px] text-ps-dim">Key color</span>
            <label className="relative h-6 w-6 cursor-pointer border border-black" style={{ background: hex }}>
              <input type="color" value={hex} onChange={(e) => setOpts((o) => ({ ...o, color: hexToRgb(e.target.value) }))} className="absolute inset-0 opacity-0" aria-label="Key color" />
            </label>
            <span className="font-mono text-[11px] uppercase text-ps-dim">{hex}</span>
            <button type="button" onClick={() => setPicking((p) => !p)} title="Pick from original"
              className={`ml-auto rounded-[3px] p-1 ${picking ? 'bg-ps-blue text-white' : 'text-ps-dim hover:bg-ps-hover hover:text-white'}`}><Pipette size={14} /></button>
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setOpts((o) => ({ ...o, color: [255, 255, 255] }))} className="rounded-[3px] border border-ps-edge px-2 py-0.5 text-[10px] text-ps-text hover:bg-ps-hover">White</button>
            <button type="button" onClick={() => setOpts((o) => ({ ...o, color: [0, 0, 0] }))} className="rounded-[3px] border border-ps-edge px-2 py-0.5 text-[10px] text-ps-text hover:bg-ps-hover">Black</button>
            <button type="button" onClick={() => setOpts((o) => ({ ...o, color: detected.color }))} className="rounded-[3px] border border-ps-edge px-2 py-0.5 text-[10px] text-ps-text hover:bg-ps-hover">Auto-detect</button>
          </div>
          <PropSlider label="Tolerance" value={opts.tolerance} min={0} max={60} onChange={(v) => setOpts((o) => ({ ...o, tolerance: v }))} />
          <PropSlider label="Edge softness" value={opts.softness} min={0} max={40} onChange={(v) => setOpts((o) => ({ ...o, softness: v }))} />
          <div className="space-y-1.5">
            <span className="text-[11px] text-ps-dim">Mode</span>
            <div className="flex overflow-hidden rounded-[3px] border border-ps-line bg-ps-input">
              {([['edges', 'Contiguous'], ['global', 'All matching']] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setOpts((o) => ({ ...o, mode: v }))}
                  className={`h-6 flex-1 text-[11px] ${opts.mode === v ? 'bg-ps-active text-white' : 'text-ps-dim hover:text-white'}`}>{l}</button>
              ))}
            </div>
            <p className="text-[10px] leading-snug text-ps-faint">
              {opts.mode === 'edges' ? 'Removes only background touching the border, so white inside the logo is kept.' : 'Removes every matching pixel, including holes inside letters.'}
            </p>
          </div>
          <Check label="Defringe (remove halo on edges)" checked={opts.defringe} onChange={(v) => setOpts((o) => ({ ...o, defringe: v }))} />
        </div>
      </div>
    </Dialog>
  );
}
