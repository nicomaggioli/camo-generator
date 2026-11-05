import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { BarButton, Folder, PanelFooter, SubHead } from '../ui';
import { randomTacticalColor } from '../../lib/color';

export const SWATCH_LIBRARIES: { name: string; colors: string[] }[] = [
  { name: 'Woodland', colors: ['#4b5320', '#2e3326', '#6b5a3e', '#1f2118', '#556b2f', '#3d4a2a'] },
  { name: 'Desert', colors: ['#c2a878', '#a88b5a', '#8a6f45', '#d8c39a', '#6e5a3b', '#e3d3b0'] },
  { name: 'Urban', colors: ['#3a3d40', '#6b6f72', '#8e9295', '#1f2124', '#b5b8ba', '#54585b'] },
  { name: 'Arctic', colors: ['#e8ecef', '#c3cad0', '#9aa5ad', '#ffffff', '#6f7c86', '#d6dde2'] },
  { name: 'Jungle', colors: ['#1e3d1a', '#2f5d2a', '#4c7a34', '#14250f', '#6b8f3e', '#3a2b1a'] },
  { name: 'Navy', colors: ['#1b2a3a', '#2c4257', '#3f5b75', '#0f1720', '#6a7f93', '#4b5d6e'] },
  { name: 'Night Ops', colors: ['#14171a', '#1f2a33', '#2c3a44', '#0a0c0e', '#3b4a3f', '#4ade80'] },
  { name: 'Blaze', colors: ['#ff6a00', '#c44f00', '#3b2a1a', '#6b4a2a', '#1f1a14', '#e58a3a'] },
];

function Chip({ c, selected, onClick, title }: { c: string; selected?: boolean; onClick: () => void; title?: string }) {
  return (
    <button type="button" onClick={onClick} title={title ?? c.toUpperCase()} aria-label={title ?? c}
      className={`h-6 w-6 shrink-0 rounded-[2px] ${selected ? 'outline outline-2 outline-offset-1 outline-white' : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)] hover:outline hover:outline-1 hover:outline-ps-dim'}`}
      style={{ background: c }} />
  );
}

export function SwatchesPanel() {
  const a = useApp();
  const pal = a.config.palette;
  return (
    <>
      <div className="ps-scroll min-h-0 flex-1 overflow-y-auto p-3">
        <SubHead>Active palette — click to make foreground</SubHead>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {pal.map((c, i) => <Chip key={i} c={c} selected={i === a.fgIndex} onClick={() => { a.setFgIndex(i); a.setColorTarget('fg'); }} title={`Swatch ${i + 1} ${c.toUpperCase()}`} />)}
          {pal.length < 6 && (
            <button type="button" onClick={() => a.addSwatch(randomTacticalColor())} title="Add swatch"
              className="flex h-6 w-6 items-center justify-center rounded-[2px] border border-dashed border-ps-edge text-ps-dim hover:border-ps-dim hover:text-white"><Plus size={12} /></button>
          )}
        </div>
        <SubHead>Swatch libraries</SubHead>
        {SWATCH_LIBRARIES.map((lib, li) => (
          <Folder key={lib.name} name={lib.name} defaultOpen={li < 2}
            right={<button type="button" onClick={() => a.updateConfig(`Swatches: ${lib.name}`, { palette: lib.colors.slice(0, 4), useCustomColors: true })} className="rounded px-1.5 text-[10px] text-ps-dim opacity-0 hover:bg-ps-active hover:text-white group-hover:opacity-100">Use set</button>}>
            <div className="flex flex-wrap gap-1">
              {lib.colors.map((c) => <Chip key={c} c={c} onClick={() => a.setTargetColor(c, 'fg')} />)}
            </div>
          </Folder>
        ))}
      </div>
      <PanelFooter>
        <span className="mr-auto text-[10px] text-ps-faint">{pal.length}/6 swatches</span>
        <BarButton title="Add foreground as new swatch" onClick={() => a.addSwatch(a.fgColor)} disabled={pal.length >= 6}><Plus size={14} /></BarButton>
        <BarButton title="Delete selected swatch" disabled={pal.length <= 1}
          onClick={() => { a.updateConfig('Delete Swatch', (c) => ({ palette: c.palette.filter((_, i) => i !== a.fgIndex) })); a.setFgIndex(Math.max(0, a.fgIndex - 1)); }}>
          <Trash2 size={14} />
        </BarButton>
      </PanelFooter>
    </>
  );
}
