import { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { BarButton, Folder, PanelFooter } from '../ui';
import { BUILTIN_PRESETS } from '../../lib/presets';
import { makeCanvas, renderCamo } from '../../engine/camo';
import type { Preset } from '../../types';

export function PatternsPanel() {
  const a = useApp();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const imgs = a.renderLogos.map((l) => l.img);

  const all = useMemo(() => [...BUILTIN_PRESETS, ...a.presets], [a.presets]);
  // Thumbnails use the current logos so presets preview exactly what you'll get.
  const thumbs = useMemo(() => {
    const out: Record<string, string> = {};
    const c = makeCanvas(96, 96);
    for (const p of all) {
      renderCamo(c, imgs, p.config, 1337, 96);
      out[p.id] = c.toDataURL();
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, a.renderLogos]);

  const match = (p: Preset) => p.name.toLowerCase().includes(q.toLowerCase());
  const Grid = ({ list }: { list: Preset[] }) => (
    <div className="grid grid-cols-3 gap-1.5 pr-1">
      {list.map((p) => (
        <button key={p.id} type="button" title={p.name}
          onClick={() => { setSelected(p.id); a.applyPreset(p); }}
          className={`group relative aspect-square overflow-hidden rounded-[2px] ${selected === p.id ? 'outline outline-2 outline-ps-blue' : 'hover:outline hover:outline-1 hover:outline-ps-dim'}`}>
          <img src={thumbs[p.id]} alt="" className="h-full w-full" />
          <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 text-[9px] text-white opacity-0 group-hover:opacity-100">{p.name}</span>
        </button>
      ))}
      {!list.length && <span className="col-span-3 text-[11px] text-ps-faint">Nothing here yet.</span>}
    </div>
  );

  const userSelected = a.presets.some((p) => p.id === selected);
  return (
    <>
      <div className="p-2 pb-1">
        <label className="flex h-7 items-center gap-2 rounded-[3px] border border-ps-line bg-ps-input px-2 focus-within:border-ps-blue">
          <Search size={13} className="text-ps-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Patterns" className="min-w-0 flex-1 bg-transparent text-[12px] text-ps-text outline-none placeholder:text-ps-faint" />
        </label>
      </div>
      <div className="ps-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <Folder name="Tactical" defaultOpen><Grid list={BUILTIN_PRESETS.filter(match)} /></Folder>
        <Folder name={`My Presets (${a.presets.length})`} defaultOpen={a.presets.length > 0}><Grid list={a.presets.filter(match)} /></Folder>
      </div>
      <PanelFooter>
        <span className="mr-auto text-[10px] text-ps-faint">Click a pattern to apply</span>
        <BarButton title="Save current settings as preset" onClick={() => a.openDialog('savePreset')}><Plus size={14} /></BarButton>
        <BarButton title="Delete selected preset" disabled={!userSelected} onClick={() => { if (selected) a.deletePreset(selected); setSelected(null); }}><Trash2 size={14} /></BarButton>
      </PanelFooter>
    </>
  );
}
