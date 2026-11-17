import { useState } from 'react';
import { Eye } from 'lucide-react';
import { DEFAULT_MODEL, type AISettings } from '../../lib/ai';
import { Btn, CgLogo, Dialog } from '../ui';
import { TOOLS } from '../tools';

export function SettingsDialog({ settings, onSave, onClose }: { settings: AISettings; onSave: (s: AISettings) => void; onClose: () => void }) {
  const [d, setD] = useState(settings);
  const [show, setShow] = useState(false);
  return (
    <Dialog title="AI Settings" onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn primary onClick={() => onSave(d)}>OK</Btn></>}>
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-[11px] text-ps-dim">Anthropic API key</span>
          <div className="flex items-center gap-1">
            <input type={show ? 'text' : 'password'} value={d.apiKey} autoComplete="off" spellCheck={false} placeholder="sk-ant-…"
              onChange={(e) => setD({ ...d, apiKey: e.target.value.trim() })} className="ps-input h-7 flex-1 font-mono" />
            <button type="button" onClick={() => setShow((s) => !s)} className="rounded p-1.5 text-ps-dim hover:bg-ps-hover hover:text-white" aria-label="Toggle key visibility"><Eye size={14} /></button>
          </div>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] text-ps-dim">Vision model</span>
          <input value={d.model} onChange={(e) => setD({ ...d, model: e.target.value })} placeholder={DEFAULT_MODEL} className="ps-input h-7 w-full font-mono" />
        </label>
        <p className="text-[11px] leading-relaxed text-ps-faint">
          The key stays in this browser's local storage and is sent only to api.anthropic.com. Without a key, Auto-Tune uses offline color clustering.
        </p>
      </div>
    </Dialog>
  );
}

export function SavePresetDialog({ defaultName, onSave, onClose }: { defaultName: string; onSave: (n: string) => void; onClose: () => void }) {
  const [name, setName] = useState(defaultName);
  const submit = () => onSave(name.trim() || defaultName);
  return (
    <Dialog title="Save Preset" onClose={onClose} width="max-w-sm" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn primary onClick={submit}>OK</Btn></>}>
      <label className="block space-y-1.5">
        <span className="text-[11px] text-ps-dim">Name</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} onFocus={(e) => e.target.select()} className="ps-input h-7 w-full" />
      </label>
      <p className="mt-3 text-[11px] text-ps-faint">Saves all pattern settings and palette. Logos and stamps are not included.</p>
    </Dialog>
  );
}

export function ShortcutsDialog({ mod, onClose }: { mod: string; onClose: () => void }) {
  const groups: [string, [string, string][]][] = [
    ['Tools', TOOLS.map((t) => [t.name, t.key])],
    ['Canvas', [['Pan temporarily', 'Space'], ['Zoom in / out', `${mod}+ / ${mod}−`], ['Fit on screen', `${mod}0`], ['Actual pixels', `${mod}1`], ['Tile preview', 'T']]],
    ['Edit', [['Undo', `${mod}Z`], ['Redo', `⇧${mod}Z`], ['Regenerate layout', 'N'], ['Swap colors', 'X'], ['Default colors', 'D'], ['Brush / stamp size', '[  ]'], ['Delete selected stamp', 'Del'], ['Nudge stamp', 'Arrows']]],
    ['File', [['Place logo', `${mod}O`], ['Export vector SVG', `${mod}E`], ['Export PNG', `⇧${mod}E`], ['Save preset', `${mod}S`], ['Remove background', `${mod}B`]]],
  ];
  return (
    <Dialog title="Keyboard Shortcuts" onClose={onClose} width="max-w-2xl" footer={<Btn primary onClick={onClose}>OK</Btn>}>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {groups.map(([g, rows]) => (
          <div key={g}>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ps-faint">{g}</div>
            {rows.map(([l, k]) => (
              <div key={l} className="flex items-center justify-between border-b border-ps-line py-1 text-[12px]">
                <span className="text-ps-text">{l}</span>
                <kbd className="rounded-[3px] bg-ps-input px-1.5 py-0.5 font-mono text-[10px] text-ps-dim">{k}</kbd>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Dialog>
  );
}

export function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="About Camo Generator" onClose={onClose} width="max-w-sm" footer={<Btn primary onClick={onClose}>OK</Btn>}>
      <div className="flex items-start gap-3">
        <CgLogo size={48} />
        <div className="space-y-1.5 text-[12px]">
          <div className="font-semibold text-white">Camo Generator</div>
          <p className="text-ps-dim">Turns your logo into tactical, seamlessly tiling camouflage, with AI palette tuning.</p>
          <p className="text-ps-faint">Everything renders locally in your browser.</p>
        </div>
      </div>
    </Dialog>
  );
}
