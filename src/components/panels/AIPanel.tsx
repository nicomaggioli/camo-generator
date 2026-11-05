import { LoaderCircle, Settings, Sparkles } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { Btn, SubHead } from '../ui';

export function AIPanel() {
  const { ai, logos } = useApp();
  const hasKey = !!ai.settings.apiKey;
  return (
    <div className="ps-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      <p className="text-[11px] leading-relaxed text-ps-dim">
        Looks at your logo and picks a matching tactical palette, background color and blend mode.
      </p>
      <button type="button" onClick={ai.run} disabled={ai.loading || !logos.length}
        className="flex h-8 w-full items-center justify-center gap-2 rounded-full bg-tactical-accent text-[12px] font-semibold text-black hover:brightness-110 disabled:opacity-40">
        {ai.loading ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {ai.loading ? 'Analyzing…' : 'Auto-Tune from Logo'}
      </button>
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-ps-dim">
          <span className={`h-1.5 w-1.5 rounded-full ${hasKey ? 'bg-tactical-accent' : 'bg-amber-400'}`} />
          {hasKey ? `Claude vision · ${ai.settings.model}` : 'No API key: local color analysis'}
        </span>
        <button type="button" onClick={ai.openSettings} className="flex items-center gap-1 text-ps-dim hover:text-white"><Settings size={12} /> Settings</button>
      </div>
      {!logos.length && <p className="text-[11px] text-ps-faint">Place a logo to enable Auto-Tune.</p>}
      {ai.error && <p className="rounded-[3px] border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-200">{ai.error}</p>}
      {ai.result && (
        <div className="space-y-2 rounded-[3px] border border-ps-line bg-ps-input p-2.5">
          <SubHead>Recommendation</SubHead>
          <p className="text-[11px] leading-relaxed text-ps-text">{ai.result.styleDescription}</p>
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 shrink-0 border border-black" style={{ background: ai.result.backgroundColor }} title="Background" />
            <div className="flex h-6 flex-1 overflow-hidden border border-black">
              {ai.result.accentColors.map((c) => <span key={c} className="flex-1" style={{ background: c }} title={c} />)}
            </div>
          </div>
          <div className="font-mono text-[10px] text-ps-dim">bg {ai.result.backgroundColor} · blend {ai.result.recommendedBlendMode}</div>
          <Btn onClick={ai.apply} className="w-full">Re-apply</Btn>
        </div>
      )}
    </div>
  );
}
