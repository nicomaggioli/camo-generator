import { ArrowLeftRight, Grid3x3 } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { TOOLS } from './tools';

export function Toolbar({ horizontal = false }: { horizontal?: boolean }) {
  const a = useApp();
  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 bg-ps-bar ${
        horizontal ? 'no-scrollbar h-12 flex-row overflow-x-auto border-t border-ps-line px-2' : 'w-11 flex-col border-r border-ps-line py-2'
      }`}
      role="toolbar" aria-label="Tools" aria-orientation={horizontal ? 'horizontal' : 'vertical'}
    >
      {!horizontal && <div className="mb-1 h-1 w-5 rounded-full border-y border-ps-edge" aria-hidden />}
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const active = a.tool === t.id;
        return (
          <button
            key={t.id} type="button" onClick={() => a.setTool(t.id)}
            title={`${t.name} (${t.key})`} aria-label={t.name} aria-pressed={active}
            className={`group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] ${active ? 'bg-ps-active text-white' : 'text-ps-dim hover:bg-ps-hover hover:text-ps-text'}`}
          >
            <Icon size={17} strokeWidth={1.7} />
            <span className="absolute bottom-0.5 right-0.5 h-0 w-0 border-l-[3px] border-t-[3px] border-l-transparent border-t-transparent border-b-[3px] border-r-[3px] border-b-ps-faint border-r-ps-faint opacity-60" />
            {!horizontal && (
              <span className="pointer-events-none absolute left-10 top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-[3px] border border-black/60 bg-ps-menu px-2 py-1 text-[11px] text-ps-text shadow-lg group-hover:block">
                {t.name} <span className="text-ps-dim">({t.key})</span>
                <span className="block text-[10px] text-ps-faint">{t.hint}</span>
              </span>
            )}
          </button>
        );
      })}

      <div className={horizontal ? 'mx-1 h-6 w-px bg-ps-edge' : 'my-1.5 h-px w-6 bg-ps-edge'} />

      <button type="button" onClick={() => a.setTileView(!a.tileView)} title="Tile preview (T)" aria-pressed={a.tileView}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] ${a.tileView ? 'bg-ps-active text-white' : 'text-ps-dim hover:bg-ps-hover hover:text-ps-text'}`}>
        <Grid3x3 size={17} strokeWidth={1.7} />
      </button>

      <div className={`relative shrink-0 ${horizontal ? 'ml-2 h-9 w-10' : 'mt-2 h-11 w-9'}`}>
        {/* Foreground / background swatches */}
        <button type="button" title="Background color — the canvas fill" onClick={() => a.setColorTarget('bg')}
          className={`absolute bottom-0 right-0 h-[22px] w-[22px] border ${a.colorTarget === 'bg' ? 'border-white' : 'border-black'} shadow-[0_0_0_1px_rgba(255,255,255,.25)]`}
          style={{ background: a.config.backgroundColor }} aria-label="Background color" />
        <button type="button" title="Foreground color — active palette swatch" onClick={() => a.setColorTarget('fg')}
          className={`absolute left-0 top-0 h-[22px] w-[22px] border ${a.colorTarget === 'fg' ? 'border-white' : 'border-black'} shadow-[0_0_0_1px_rgba(255,255,255,.25)]`}
          style={{ background: a.fgColor }} aria-label="Foreground color" />
        <button type="button" onClick={a.swapColors} title="Swap colors (X)" aria-label="Swap colors" className="absolute -right-1 -top-1 p-0.5 text-ps-dim hover:text-white">
          <ArrowLeftRight size={10} />
        </button>
        <button type="button" onClick={a.resetColors} title="Default colors (D)" aria-label="Default colors" className="absolute -bottom-1 -left-1 p-0.5">
          <span className="relative block h-2.5 w-2.5"><span className="absolute bottom-0 right-0 h-1.5 w-1.5 border border-ps-dim bg-white" /><span className="absolute left-0 top-0 h-1.5 w-1.5 border border-ps-dim bg-black" /></span>
        </button>
      </div>
    </div>
  );
}
