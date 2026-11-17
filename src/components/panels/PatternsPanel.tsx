import { useMemo, useState } from 'react';
import { Dices, LoaderCircle, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { BarButton, Folder, PanelFooter } from '../ui';
import { CATEGORIES, PATTERN_LIBRARY, STYLES, type LibraryPattern } from '../../lib/patternLibrary';
import { variations } from '../../lib/textPattern';
import { PatternThumb } from './PatternThumb';
import type { Preset } from '../../types';

const IDEAS = ['sunset', 'ocean storm', 'neon city', 'autumn forest', 'cotton candy', 'lava', 'midnight gold', 'retro arcade'];

export function PatternsPanel() {
  const a = useApp();
  const tp = a.textPattern;
  const [q, setQ] = useState('');
  const [style, setStyle] = useState<string>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const imgs = useMemo(() => a.renderLogos.map((l) => l.img), [a.renderLogos]);
  const logoKey = useMemo(() => a.renderLogos.map((l) => `${l.id}:${l.dataUrl.length}`).join(','), [a.renderLogos]);

  const ql = q.trim().toLowerCase();
  const match = (p: LibraryPattern) => (style === 'all' || p.style.id === style) && (!ql ||
    `${p.name} ${p.theme.tags} ${p.theme.category} ${p.style.name}`.toLowerCase().includes(ql));
  const filtered = useMemo(() => PATTERN_LIBRARY.filter(match),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ql, style]);

  const apply = (p: Preset) => { setSelected(p.id); a.applyPreset(p); };
  const grid = (list: Preset[]) => (
    <div className="grid grid-cols-4 gap-1.5 pr-1">
      {list.map((p) => (
        <PatternThumb key={p.id} id={p.id} config={p.config} imgs={imgs} logoKey={logoKey} label={p.name} selected={selected === p.id} onClick={() => apply(p)} />
      ))}
      {!list.length && <span className="col-span-4 text-[11px] text-ps-faint">Nothing here yet.</span>}
    </div>
  );

  const vars = tp.result ? variations(tp.result) : [];
  const surprise = () => {
    const pool = filtered.length ? filtered : PATTERN_LIBRARY;
    const p = pool[Math.floor(Math.random() * pool.length)];
    apply(p);
    a.regenerate();
  };
  const userSelected = a.presets.some((p) => p.id === selected);

  return (
    <>
      <div className="ps-scroll min-h-0 flex-1 overflow-y-auto">
        {/* Text to pattern */}
        <div className="space-y-2 border-b border-ps-line p-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ps-faint">Create from words</span>
            <span className="text-[10px] text-ps-faint">{a.ai.settings.apiKey ? 'Claude' : 'Offline'} · <button type="button" className="hover:text-white" onClick={a.ai.openSettings}>Settings</button></span>
          </div>
          <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); tp.run(); }}>
            <input value={tp.text} onChange={(e) => tp.setText(e.target.value)} placeholder="Type a word or idea, e.g. sunset"
              className="ps-input h-7 min-w-0 flex-1" aria-label="Pattern idea" />
            <button type="submit" disabled={tp.loading || !tp.text.trim()}
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-tactical-accent px-3 text-[11px] font-semibold text-black hover:brightness-110 disabled:opacity-40">
              {tp.loading ? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate
            </button>
          </form>
          {!tp.result && !tp.loading && (
            <div className="flex flex-wrap gap-1">
              {IDEAS.map((w) => (
                <button key={w} type="button" onClick={() => tp.run(w)} className="rounded-full border border-ps-edge px-2 py-0.5 text-[10px] text-ps-dim hover:border-ps-dim hover:text-white">{w}</button>
              ))}
            </div>
          )}
          {tp.error && <p className="text-[10px] text-amber-200">{tp.error}</p>}
          {tp.result && (
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold text-white">{tp.result.name}</div>
                  <p className="text-[10px] leading-snug text-ps-dim">{tp.result.description}</p>
                </div>
                <button type="button" title="Clear" onClick={tp.clear} className="rounded p-0.5 text-ps-faint hover:bg-ps-hover hover:text-white"><X size={12} /></button>
              </div>
              <div className="flex h-3 overflow-hidden rounded-[2px] border border-black/50">
                <span className="w-5" style={{ background: tp.result.config.backgroundColor }} />
                {tp.result.config.palette.map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {vars.map((v, i) => {
                  const id = `text-${tp.result!.name}-${i}`;
                  return <PatternThumb key={id} id={id} config={v.config} imgs={imgs} logoKey={logoKey} label={v.label} selected={selected === id}
                    onClick={() => apply({ id, name: `${tp.result!.name} ${v.label}`, timestamp: 0, config: v.config })} />;
                })}
              </div>
            </div>
          )}
        </div>

        {/* Library */}
        <div className="sticky top-0 z-10 space-y-1.5 bg-ps-bar p-2 pb-1.5">
          <div className="flex gap-1.5">
            <label className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-[3px] border border-ps-line bg-ps-input px-2 focus-within:border-ps-blue">
              <Search size={13} className="text-ps-dim" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${PATTERN_LIBRARY.length} patterns`} className="min-w-0 flex-1 bg-transparent text-[12px] text-ps-text outline-none placeholder:text-ps-faint" />
              {q && <button type="button" onClick={() => setQ('')} className="text-ps-faint hover:text-white" aria-label="Clear search"><X size={12} /></button>}
            </label>
            <button type="button" onClick={surprise} title="Surprise me: random pattern" className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-ps-edge text-ps-dim hover:border-ps-dim hover:text-white"><Dices size={14} /></button>
          </div>
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {[{ id: 'all', name: 'All' }, ...STYLES].map((s) => (
              <button key={s.id} type="button" onClick={() => setStyle(s.id)}
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${style === s.id ? 'bg-ps-active text-white' : 'text-ps-dim hover:text-white'}`}>{s.name}</button>
            ))}
          </div>
        </div>
        <div className="px-2 pb-2">
          {ql ? (
            <>
              <div className="mb-1.5 text-[10px] text-ps-faint">{filtered.length} matches</div>
              {grid(filtered)}
            </>
          ) : (
            <>
              <Folder name={`My Presets (${a.presets.length})`} defaultOpen={a.presets.length > 0}>{grid(a.presets)}</Folder>
              {CATEGORIES.map((cat, i) => {
                const list = filtered.filter((p) => p.theme.category === cat);
                return <Folder key={cat} name={`${cat} (${list.length})`} defaultOpen={i === 0}>{grid(list)}</Folder>;
              })}
            </>
          )}
        </div>
      </div>
      <PanelFooter>
        <span className="mr-auto text-[10px] text-ps-faint">{PATTERN_LIBRARY.length} patterns · click to apply</span>
        <BarButton title="Save current settings as preset" onClick={() => a.openDialog('savePreset')}><Plus size={14} /></BarButton>
        <BarButton title="Delete selected preset" disabled={!userSelected} onClick={() => { if (selected) a.deletePreset(selected); setSelected(null); }}><Trash2 size={14} /></BarButton>
      </PanelFooter>
    </>
  );
}
