import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../state/AppContext';
import { hexToRgb, hsvToRgb, isHex, normalizeHex, rgbToHex, rgbToHsv } from '../../lib/color';

function useDrag(onPos: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const handler = (e: React.PointerEvent) => {
    const el = ref.current!;
    const update = (ev: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      onPos(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)));
    };
    update(e);
    const move = (ev: PointerEvent) => update(ev);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return { ref, onPointerDown: handler };
}

export function ColorPanel() {
  const a = useApp();
  const target = a.colorTarget;
  const value = target === 'fg' ? a.fgColor : a.config.backgroundColor;
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(value)));
  const lastEmitted = useRef(value);

  // Follow external changes without losing hue when saturation hits 0.
  useEffect(() => {
    if (value.toLowerCase() !== lastEmitted.current.toLowerCase()) {
      setHsv(rgbToHsv(hexToRgb(value)));
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = (h: number, s: number, v: number) => {
    setHsv([h, s, v]);
    const hex = rgbToHex(hsvToRgb(h, s, v));
    lastEmitted.current = hex;
    a.setTargetColor(hex);
  };

  const sv = useDrag((x, y) => emit(hsv[0], x, 1 - y));
  const hue = useDrag((_, y) => emit(Math.min(359.9, y * 360), hsv[1], hsv[2]));
  const rgb = hexToRgb(value);
  const [hexDraft, setHexDraft] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="relative h-11 w-11 shrink-0">
          <button type="button" onClick={() => a.setColorTarget('bg')} title="Background (canvas fill)"
            className={`absolute bottom-0 right-0 h-7 w-7 border-2 ${target === 'bg' ? 'border-white' : 'border-ps-line'}`} style={{ background: a.config.backgroundColor }} aria-label="Edit background color" />
          <button type="button" onClick={() => a.setColorTarget('fg')} title="Foreground (active swatch)"
            className={`absolute left-0 top-0 h-7 w-7 border-2 ${target === 'fg' ? 'border-white' : 'border-ps-line'}`} style={{ background: a.fgColor }} aria-label="Edit foreground color" />
        </div>
        <div
          ref={sv.ref} onPointerDown={sv.onPointerDown}
          className="relative min-h-[110px] flex-1 cursor-crosshair touch-none rounded-[1px]"
          style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv[0]} 100% 50%))` }}
          aria-label="Saturation and brightness"
        >
          <span className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.6)]"
            style={{ left: `${hsv[1] * 100}%`, top: `${(1 - hsv[2]) * 100}%` }} />
        </div>
        <div
          ref={hue.ref} onPointerDown={hue.onPointerDown}
          className="relative w-4 shrink-0 cursor-pointer touch-none"
          style={{ background: 'linear-gradient(to bottom, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
          aria-label="Hue"
        >
          <span className="pointer-events-none absolute -right-1.5 h-0 w-0 -translate-y-1/2 border-y-[5px] border-r-[6px] border-y-transparent border-r-white" style={{ top: `${(hsv[0] / 360) * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-ps-dim">{target === 'fg' ? `Swatch ${a.fgIndex + 1}` : 'Background'}</span>
        <span className="text-ps-faint">#</span>
        <input
          value={hexDraft ?? value.slice(1).toUpperCase()}
          onChange={(e) => {
            setHexDraft(e.target.value);
            const v = `#${e.target.value.replace('#', '')}`;
            if (isHex(v) && v.length === 7) a.setTargetColor(normalizeHex(v));
          }}
          onBlur={() => setHexDraft(null)}
          className="ps-input w-[68px] font-mono uppercase" spellCheck={false} aria-label="Hex color"
        />
        <div className="ml-auto flex gap-1">
          {(['R', 'G', 'B'] as const).map((ch, i) => (
            <label key={ch} className="flex items-center gap-1 text-[10px] text-ps-faint">
              {ch}
              <input
                type="number" min={0} max={255} value={Math.round(rgb[i])}
                onChange={(e) => {
                  const next = [...rgb] as [number, number, number];
                  next[i] = Math.max(0, Math.min(255, +e.target.value || 0));
                  a.setTargetColor(rgbToHex(next));
                }}
                className="ps-input w-10 text-right font-mono"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
