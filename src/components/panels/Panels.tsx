import { History, Layers, Palette, SlidersHorizontal, Sparkles, Grid3x3 } from 'lucide-react';
import { useApp, type BottomPanel } from '../../state/AppContext';
import { PanelGroup } from './PanelGroup';
import { ColorPanel } from './ColorPanel';
import { SwatchesPanel } from './SwatchesPanel';
import { PatternsPanel } from './PatternsPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { LayersPanel } from './LayersPanel';
import { AIPanel } from './AIPanel';
import { HistoryPanel } from './HistoryPanel';

export function Panels({ stacked = false }: { stacked?: boolean }) {
  const a = useApp();
  return (
    <>
      <PanelGroup
        className={stacked ? `${a.topPanel === 'patterns' ? 'h-[620px]' : 'h-[360px]'} shrink-0 border-b-4 border-ps-line` : `${a.topPanel === 'patterns' ? 'h-[64%]' : 'h-[42%]'} min-h-[240px] border-b-4 border-ps-line`}
        tabs={[{ id: 'color', label: 'Color' }, { id: 'swatches', label: 'Swatches' }, { id: 'patterns', label: 'Patterns' }]}
        active={a.topPanel} onChange={a.setTopPanel}
      >
        {a.topPanel === 'color' && <ColorPanel />}
        {a.topPanel === 'swatches' && <SwatchesPanel />}
        {a.topPanel === 'patterns' && <PatternsPanel />}
      </PanelGroup>
      <PanelGroup
        className={stacked ? 'min-h-[560px] flex-1' : 'flex-1'}
        tabs={[{ id: 'properties', label: 'Properties' }, { id: 'layers', label: 'Layers' }, { id: 'ai', label: 'AI Tune' }, { id: 'history', label: 'History' }]}
        active={a.bottomPanel} onChange={a.setBottomPanel}
      >
        {a.bottomPanel === 'properties' && <PropertiesPanel />}
        {a.bottomPanel === 'layers' && <LayersPanel />}
        {a.bottomPanel === 'ai' && <AIPanel />}
        {a.bottomPanel === 'history' && <HistoryPanel />}
      </PanelGroup>
    </>
  );
}

/** Collapsed-panel icon column, like Photoshop's narrow dock. */
export function IconDock() {
  const a = useApp();
  const items: { id: BottomPanel; icon: typeof History; label: string }[] = [
    { id: 'history', icon: History, label: 'History' },
    { id: 'properties', icon: SlidersHorizontal, label: 'Properties' },
    { id: 'layers', icon: Layers, label: 'Layers' },
    { id: 'ai', icon: Sparkles, label: 'AI Auto-Tune' },
  ];
  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-x border-ps-line bg-ps-bar py-2">
      {items.map(({ id, icon: Icon, label }) => (
        <button key={id} type="button" title={label} aria-label={label} onClick={() => a.setBottomPanel(id)}
          className={`flex h-8 w-8 items-center justify-center rounded-[3px] ${a.bottomPanel === id ? 'bg-ps-active text-white' : 'text-ps-dim hover:bg-ps-hover hover:text-white'}`}>
          <Icon size={16} strokeWidth={1.7} />
        </button>
      ))}
      <div className="my-1 h-px w-6 bg-ps-edge" />
      <button type="button" title="Swatches" onClick={() => a.setTopPanel('swatches')} className={`flex h-8 w-8 items-center justify-center rounded-[3px] ${a.topPanel === 'swatches' ? 'bg-ps-active text-white' : 'text-ps-dim hover:bg-ps-hover hover:text-white'}`}><Palette size={16} strokeWidth={1.7} /></button>
      <button type="button" title="Patterns" onClick={() => a.setTopPanel('patterns')} className={`flex h-8 w-8 items-center justify-center rounded-[3px] ${a.topPanel === 'patterns' ? 'bg-ps-active text-white' : 'text-ps-dim hover:bg-ps-hover hover:text-white'}`}><Grid3x3 size={16} strokeWidth={1.7} /></button>
    </div>
  );
}
