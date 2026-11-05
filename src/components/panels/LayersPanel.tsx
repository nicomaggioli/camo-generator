import type { ReactNode } from 'react';
import { Eye, EyeOff, Grid3x3, ImagePlus, Lock, Stamp, Trash2, WandSparkles } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { BLEND_MODES } from '../../types';
import { BarButton, NumberInput, PanelFooter } from '../ui';

function Row({ eye, onEye, thumb, name, sub, selected, onClick, right }: {
  eye?: boolean; onEye?: () => void; thumb: ReactNode; name: string; sub?: ReactNode; selected?: boolean; onClick?: () => void; right?: ReactNode;
}) {
  return (
    <div onClick={onClick} className={`flex h-11 cursor-default items-center gap-2 border-b border-ps-line pr-2 ${selected ? 'bg-ps-active' : 'hover:bg-ps-hover/60'}`}>
      <button type="button" onClick={(e) => { e.stopPropagation(); onEye?.(); }} className="flex h-full w-8 shrink-0 items-center justify-center border-r border-ps-line text-ps-dim hover:text-white" aria-label={eye ? `Hide ${name}` : `Show ${name}`} disabled={!onEye}>
        {onEye ? (eye ? <Eye size={13} /> : <EyeOff size={13} className="opacity-50" />) : null}
      </button>
      <div className="h-8 w-8 shrink-0 overflow-hidden border border-black/70">{thumb}</div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[12px] ${eye === false ? 'text-ps-faint' : 'text-ps-text'}`}>{name}</div>
        {sub && <div className="truncate text-[10px] text-ps-faint">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function LayersPanel() {
  const a = useApp();
  const c = a.config;
  const needsBg = a.logos.find((l) => l.bgDetected && !l.bgRemoved);
  const active = a.logos.find((l) => l.id === a.activeLogoId) ?? a.logos[0];
  return (
    <>
      <div className="flex items-center gap-2 border-b border-ps-line px-2 py-1.5">
        <select value={c.blendMode} onChange={(e) => a.updateConfig('Blend Mode', { blendMode: e.target.value as GlobalCompositeOperation })} className="ps-input min-w-0 flex-1" aria-label="Blend mode">
          {BLEND_MODES.map((m) => <option key={m} value={m}>{m === 'source-over' ? 'Normal' : m.replace(/-/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase())}</option>)}
        </select>
        <span className="text-[11px] text-ps-dim">Opacity:</span>
        <NumberInput value={Math.round(c.opacity * 100)} min={10} max={100} onChange={(v) => a.updateConfig('Opacity', { opacity: v / 100 })} suffix="%" className="w-14" />
      </div>

      {needsBg && (
        <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <WandSparkles size={14} className="shrink-0 text-amber-300" />
          <span className="min-w-0 flex-1 text-[11px] text-amber-100">“{needsBg.name}” has a solid background.</span>
          <button type="button" onClick={() => a.openBgRemoval(needsBg.id)} className="shrink-0 rounded-[3px] bg-amber-400 px-2 py-1 text-[11px] font-semibold text-black hover:bg-amber-300">Remove</button>
        </div>
      )}

      <div className="ps-scroll min-h-0 flex-1 overflow-y-auto">
        <Row eye={a.stampsVisible} onEye={() => a.setStampsVisible(!a.stampsVisible)}
          thumb={<div className="flex h-full w-full items-center justify-center bg-ps-input text-ps-dim"><Stamp size={14} /></div>}
          name="Stamps" sub={`${a.doc.stamps.length} placed by hand`}
          right={a.doc.stamps.length > 0 && <button type="button" onClick={a.clearStamps} title="Clear stamps" className="text-ps-faint hover:text-white"><Trash2 size={12} /></button>} />
        <Row eye={a.showPattern} onEye={() => a.setShowPattern(!a.showPattern)}
          thumb={<div className="flex h-full w-full items-center justify-center text-white/80" style={{ background: c.palette[0] ?? c.backgroundColor }}><Grid3x3 size={14} /></div>}
          name="Camo Pattern" sub={`${c.density}×${c.layering} · seed ${a.doc.seed.toString(16).slice(0, 6)}`} />
        {a.logos.map((l, i) => (
          <Row key={l.id} eye={l.visible} onEye={() => a.toggleLogoVisible(l.id)} selected={active?.id === l.id} onClick={() => a.setActiveLogoId(l.id)}
            thumb={<div className="checkerboard-dark h-full w-full"><img src={l.dataUrl} alt="" className="h-full w-full object-contain" /></div>}
            name={`L${i + 1} · ${l.name}`}
            sub={l.bgRemoved ? 'Background removed' : l.bgDetected ? 'Solid background detected' : 'Logo source'}
            right={<button type="button" onClick={(e) => { e.stopPropagation(); a.openBgRemoval(l.id); }} title="Remove background" className={`${l.bgDetected && !l.bgRemoved ? 'text-amber-300' : 'text-ps-faint'} hover:text-white`}><WandSparkles size={13} /></button>} />
        ))}
        {!a.logos.length && (
          <button type="button" onClick={a.openFilePicker} className="flex w-full items-center gap-2 border-b border-ps-line px-3 py-3 text-left text-[11px] text-ps-dim hover:bg-ps-hover hover:text-white">
            <ImagePlus size={15} /> Place a logo (PNG, SVG or JPG). A sample star is used until then.
          </button>
        )}
        <Row thumb={<div className="h-full w-full" style={{ background: c.backgroundColor }} />} name="Background" sub={c.backgroundColor.toUpperCase()}
          onClick={() => { a.setColorTarget('bg'); a.setTopPanel('color'); }} right={<Lock size={12} className="text-ps-faint" />} />
      </div>
      <PanelFooter>
        <span className="mr-auto text-[10px] text-ps-faint">{a.logos.length}/2 logos</span>
        <BarButton title="Remove background of active logo" disabled={!active} onClick={() => a.openBgRemoval(active?.id)}><WandSparkles size={14} /></BarButton>
        <BarButton title="Place logo" disabled={a.logos.length >= 2} onClick={a.openFilePicker}><ImagePlus size={14} /></BarButton>
        <BarButton title="Delete active logo" disabled={!active} onClick={() => active && a.removeLogo(active.id)}><Trash2 size={14} /></BarButton>
      </PanelFooter>
    </>
  );
}
