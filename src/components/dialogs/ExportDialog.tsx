import { useEffect, useMemo, useState } from 'react';
import { FileImage, LoaderCircle, PenTool } from 'lucide-react';
import { Btn, Check, Dialog, SubHead } from '../ui';
import { exportSvg, type SvgExportResult, type SvgUnit } from '../../engine/svgExport';
import type { CamoConfig } from '../../types';
import type { RenderStamp } from '../../engine/camo';

type Format = 'svg' | 'png';

interface Props {
  logos: { img: HTMLImageElement; dataUrl: string }[];
  config: CamoConfig;
  seed: number;
  stamps: RenderStamp[];
  showPattern: boolean;
  initialFormat?: Format;
  onExportPng: (size: number) => void;
  onDone: (msg: string) => void;
  onClose: () => void;
}

const UNITS: { id: SvgUnit; label: string; def: number }[] = [
  { id: 'in', label: 'inches', def: 12 },
  { id: 'cm', label: 'cm', def: 30 },
  { id: 'mm', label: 'mm', def: 300 },
  { id: 'px', label: 'px', def: 1024 },
];

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const fmtBytes = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export function ExportDialog({ logos, config, seed, stamps, showPattern, initialFormat = 'svg', onExportPng, onDone, onClose }: Props) {
  const [format, setFormat] = useState<Format>(initialFormat);
  const [unit, setUnit] = useState<SvgUnit>('in');
  const [width, setWidth] = useState(12);
  const [includeBackground, setIncludeBackground] = useState(true);
  const [clipToTile, setClipToTile] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [pngSize, setPngSize] = useState(4096);
  const [result, setResult] = useState<SvgExportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const opts = useMemo(() => ({ width, unit, includeBackground, clipToTile, useSymbols, showPattern, stamps }),
    [width, unit, includeBackground, clipToTile, useSymbols, showPattern, stamps]);

  // Build the SVG in the background whenever options change, so size and colors are shown before downloading.
  useEffect(() => {
    if (format !== 'svg') return;
    setBusy(true);
    const t = setTimeout(() => {
      try { setResult(exportSvg(logos, config, seed, opts)); } finally { setBusy(false); }
    }, 30);
    return () => clearTimeout(t);
  }, [format, logos, config, seed, opts]);

  const bytes = result ? new Blob([result.svg]).size : 0;
  const preview = useMemo(() => (result ? URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml' })) : null), [result]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const doExport = () => {
    if (format === 'png') { onExportPng(pngSize); onClose(); return; }
    if (!result) return;
    download(new Blob([result.svg], { type: 'image/svg+xml' }), `camo-${seed.toString(16)}.svg`);
    onDone(`Exported vector SVG (${result.shapes} shapes, ${result.colors.length} colors)`);
    onClose();
  };

  const tab = (id: Format, label: string, Icon: typeof PenTool, sub: string) => (
    <button type="button" onClick={() => setFormat(id)}
      className={`flex flex-1 items-start gap-2.5 rounded-[4px] border p-2.5 text-left ${format === id ? 'border-ps-blue bg-ps-blue/10' : 'border-ps-edge hover:border-ps-dim'}`}>
      <Icon size={18} className={format === id ? 'text-ps-blue' : 'text-ps-dim'} />
      <span><span className="block text-[12px] font-semibold text-white">{label}</span><span className="text-[10px] text-ps-dim">{sub}</span></span>
    </button>
  );

  return (
    <Dialog title="Export" onClose={onClose} width="max-w-2xl"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn primary onClick={doExport} disabled={format === 'svg' && (busy || !result)}>{format === 'svg' ? 'Export SVG' : `Export PNG`}</Btn></>}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex gap-2">
            {tab('svg', 'Vector SVG', PenTool, 'Illustrator, print, manufacturing')}
            {tab('png', 'PNG image', FileImage, 'Web, mockups, previews')}
          </div>

          {format === 'svg' ? (
            <>
              <div>
                <SubHead>Artboard size (square tile)</SubHead>
                <div className="flex items-center gap-2">
                  <input type="number" min={0.1} step="any" value={width} onChange={(e) => setWidth(Math.max(0.1, +e.target.value || 0.1))} className="ps-input h-7 w-24" aria-label="Width and height" />
                  <select value={unit} onChange={(e) => { const u = UNITS.find((x) => x.id === e.target.value)!; setUnit(u.id); setWidth(u.def); }} className="ps-input h-7" aria-label="Unit">
                    {UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                  </select>
                </div>
                <p className="mt-1.5 text-[10px] text-ps-faint">Vector scales to any size without losing quality. This only sets the artboard size Illustrator opens with.</p>
              </div>
              <div className="space-y-2">
                <SubHead>Options</SubHead>
                <div><Check label="Include background color" checked={includeBackground} onChange={setIncludeBackground} /></div>
                <div><Check label="Clip to tile (clean seamless repeat)" checked={clipToTile} onChange={setClipToTile} /></div>
                <div><Check label="Compact file (shared symbols)" checked={useSymbols} onChange={setUseSymbols} /></div>
              </div>
            </>
          ) : (
            <div>
              <SubHead>Pixel size</SubHead>
              <div className="grid grid-cols-4 gap-1.5">
                {[1024, 2048, 4096, 8192].map((s) => (
                  <button key={s} type="button" onClick={() => setPngSize(s)} className={`h-8 rounded-[3px] border text-[12px] ${pngSize === s ? 'border-ps-blue bg-ps-blue/10 text-white' : 'border-ps-edge text-ps-text hover:border-ps-dim'}`}>{s}px</button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-ps-faint">For manufacturing, use Vector SVG instead: it stays sharp at any size.</p>
            </div>
          )}
        </div>

        {format === 'svg' && (
          <div className="w-full shrink-0 space-y-2 sm:w-56">
            <div className="checkerboard-dark relative aspect-square overflow-hidden rounded-[3px] border border-ps-line">
              {preview && <img src={preview} alt="Vector preview" className="h-full w-full" />}
              {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><LoaderCircle size={20} className="animate-spin text-white" /></div>}
            </div>
            {result && (
              <div className="space-y-1.5 text-[11px] text-ps-dim">
                <div className="flex justify-between"><span>Shapes</span><span className="text-ps-text">{result.shapes}</span></div>
                <div className="flex justify-between"><span>File size</span><span className="text-ps-text">{fmtBytes(bytes)}</span></div>
                <div>
                  <span>Spot colors ({result.colors.length})</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.colors.map((c) => <span key={c} title={c.toUpperCase()} className="h-4 w-4 rounded-[2px] border border-black/50" style={{ background: c }} />)}
                  </div>
                </div>
                {result.notes.map((t) => <p key={t} className="rounded-[3px] border border-amber-400/30 bg-amber-400/10 p-1.5 text-[10px] text-amber-100">{t}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
