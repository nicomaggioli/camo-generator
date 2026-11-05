import { Eye, EyeOff, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { BLEND_MODES, DEFAULT_CONFIG } from '../../types';
import { BarButton, Check, ColorChip, PanelFooter, PropSlider, SubHead } from '../ui';

export function PropertiesPanel() {
  const a = useApp();
  const c = a.config;
  const u = a.updateConfig;
  return (
    <>
      <div className="flex items-center gap-2 border-b border-ps-line px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-[2px] bg-ps-active"><SlidersHorizontal size={13} /></span>
        <span className="text-[12px] text-ps-text">Camo Pattern</span>
      </div>
      <div className="ps-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        <SubHead>Distribution</SubHead>
        <PropSlider label="Density" value={c.density} min={10} max={200} onChange={(v) => u('Density', { density: v })} />
        <PropSlider label="Scale min" value={c.scaleMin} min={0.1} max={2} step={0.05} decimals={2} onChange={(v) => u('Scale', (cc) => ({ scaleMin: v, scaleMax: Math.max(cc.scaleMax, v) }))} />
        <PropSlider label="Scale max" value={c.scaleMax} min={0.1} max={3} step={0.05} decimals={2} onChange={(v) => u('Scale', (cc) => ({ scaleMax: v, scaleMin: Math.min(cc.scaleMin, v) }))} />
        <PropSlider label="Rotation" value={c.rotationJitter} min={0} max={360} suffix="°" onChange={(v) => u('Rotation', { rotationJitter: v })} />
        <PropSlider label="Passes" value={c.layering} min={1} max={5} onChange={(v) => u('Layer Passes', { layering: v })} />
        <div className="flex gap-4 pl-[86px]">
          <Check label="Seamless" checked={c.seamless} onChange={(v) => u('Seamless', { seamless: v })} />
        </div>

        <div className="pt-2"><SubHead>Appearance</SubHead></div>
        <div className="flex items-center gap-2">
          <span className="w-[78px] text-[11px] text-ps-dim">Blend</span>
          <select value={c.blendMode} onChange={(e) => u('Blend Mode', { blendMode: e.target.value as GlobalCompositeOperation })} className="ps-input min-w-0 flex-1">
            {BLEND_MODES.map((m) => <option key={m} value={m}>{m === 'source-over' ? 'Normal' : m.replace(/-/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase())}</option>)}
          </select>
        </div>
        <PropSlider label="Opacity" value={Math.round(c.opacity * 100)} min={10} max={100} suffix="%" onChange={(v) => u('Opacity', { opacity: v / 100 })} />
        <PropSlider label="Blur" value={c.blur} min={0} max={10} step={0.5} decimals={1} suffix="px" onChange={(v) => u('Blur', { blur: v })} />
        <div className="flex items-center gap-2">
          <span className="w-[78px] text-[11px] text-ps-dim">Background</span>
          <ColorChip value={c.backgroundColor} onChange={(v) => u('Background Color', { backgroundColor: v })} title="Background color" />
          <span className="font-mono text-[11px] uppercase text-ps-dim">{c.backgroundColor}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-[78px] text-[11px] text-ps-dim">Colors</span>
          <Check label="Tint with palette" checked={c.useCustomColors} onChange={(v) => u('Tint', { useCustomColors: v })} />
        </div>
        <div className="flex items-center gap-2 pl-[86px]">
          <div className="flex h-4 flex-1 overflow-hidden rounded-[2px] border border-ps-line">
            {c.palette.map((p, i) => <button type="button" key={i} className="flex-1" style={{ background: p }} title={p} onClick={() => { a.setFgIndex(i); a.setTopPanel('color'); a.setColorTarget('fg'); }} />)}
          </div>
        </div>

        <div className="pt-2"><SubHead>Outline</SubHead></div>
        <PropSlider label="Width" value={c.outlineWidth} min={0} max={20} step={0.5} decimals={1} suffix="px" onChange={(v) => u('Outline', { outlineWidth: v })} />
        <PropSlider label="Chance" value={Math.round(c.outlineChance * 100)} min={0} max={100} suffix="%" onChange={(v) => u('Outline', { outlineChance: v / 100 })} />
        <div className="flex items-center gap-2">
          <span className="w-[78px] text-[11px] text-ps-dim">Color</span>
          <ColorChip value={c.outlineColor} onChange={(v) => u('Outline Color', { outlineColor: v })} title="Outline color" />
          <span className="font-mono text-[11px] uppercase text-ps-dim">{c.outlineColor}</span>
        </div>

        <div className="pt-2"><SubHead>Document</SubHead></div>
        <div className="flex items-center gap-2">
          <span className="w-[78px] text-[11px] text-ps-dim">Canvas size</span>
          <select value={a.size} onChange={(e) => a.setSize(+e.target.value)} className="ps-input flex-1">
            {[512, 1024, 2048].map((s) => <option key={s} value={s}>{s} × {s} px</option>)}
          </select>
        </div>
      </div>
      <PanelFooter>
        <BarButton title="Reset pattern settings" onClick={() => u('Reset Settings', () => ({ ...DEFAULT_CONFIG }))}><RotateCcw size={14} /></BarButton>
        <BarButton title={a.showPattern ? 'Hide pattern layer' : 'Show pattern layer'} onClick={() => a.setShowPattern(!a.showPattern)}>
          {a.showPattern ? <Eye size={14} /> : <EyeOff size={14} />}
        </BarButton>
      </PanelFooter>
    </>
  );
}
