import { Redo2, Undo2 } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { BarButton, PanelFooter } from '../ui';

export function HistoryPanel() {
  const { history: h, mod } = useApp();
  return (
    <>
      <div className="ps-scroll min-h-0 flex-1 overflow-y-auto">
        {h.entries.map((label, i) => (
          <button key={i} type="button" onClick={() => h.jump(i)}
            className={`flex h-7 w-full items-center gap-2 border-b border-ps-line px-3 text-left text-[12px] ${i === h.index ? 'bg-ps-active text-white' : i > h.index ? 'text-ps-faint hover:bg-ps-hover' : 'text-ps-text hover:bg-ps-hover'}`}>
            <span className={`h-3 w-3 shrink-0 rounded-[2px] border ${i === 0 ? 'border-ps-dim bg-ps-dim/40' : 'border-ps-edge'}`} />
            {i === 0 ? 'camo-pattern.png' : label}
          </button>
        ))}
      </div>
      <PanelFooter>
        <span className="mr-auto text-[10px] text-ps-faint">{h.index} / {h.entries.length - 1} steps</span>
        <BarButton title={`Undo (${mod}Z)`} onClick={h.undo} disabled={!h.canUndo}><Undo2 size={14} /></BarButton>
        <BarButton title={`Redo (⇧${mod}Z)`} onClick={h.redo} disabled={!h.canRedo}><Redo2 size={14} /></BarButton>
      </PanelFooter>
    </>
  );
}
