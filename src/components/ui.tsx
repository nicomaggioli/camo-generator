import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

/** The CG app mark, styled like a creative-suite tile. */
export function CgLogo({ size = 22 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 select-none items-center justify-center rounded-[4px] font-bold leading-none text-tactical-accent"
      style={{ width: size, height: size, fontSize: size * 0.48, background: '#092415', boxShadow: 'inset 0 0 0 1.5px #4ade80', fontFamily: 'Arial, Helvetica, sans-serif' }}
      aria-label="CG"
    >
      Cg
    </span>
  );
}

export function NumberInput({
  value, min, max, step = 1, decimals = 0, onChange, className = 'w-12', suffix,
}: { value: number; min: number; max: number; step?: number; decimals?: number; onChange: (v: number) => void; className?: string; suffix?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = parseFloat(draft);
    if (!Number.isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
    setDraft(null);
  };
  return (
    <span className={`relative inline-flex ${className}`}>
      <input
        type="number" step={step}
        value={draft ?? value.toFixed(decimals)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const d = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
            onChange(Math.max(min, Math.min(max, +(value + d).toFixed(4))));
          }
        }}
        className={`ps-input w-full text-right font-mono ${suffix ? 'pr-4' : ''}`}
      />
      {suffix && <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-ps-faint">{suffix}</span>}
    </span>
  );
}

export function PropSlider({
  label, value, min, max, step = 1, decimals = 0, onChange, suffix,
}: { label: string; value: number; min: number; max: number; step?: number; decimals?: number; onChange: (v: number) => void; suffix?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="w-[78px] shrink-0 truncate text-[11px] text-ps-dim">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        style={{ ['--fill' as string]: `${pct}%` }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
      />
      <NumberInput value={value} min={min} max={max} step={step} decimals={decimals} onChange={onChange} suffix={suffix} className="w-[52px] shrink-0" />
    </div>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-ps-text">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border border-ps-edge bg-ps-input peer-checked:border-ps-blue peer-checked:bg-ps-blue peer-focus-visible:ring-1 peer-focus-visible:ring-ps-blue">
        {checked && <svg viewBox="0 0 10 10" className="h-2.5 w-2.5"><path d="M1.5 5.2l2.3 2.3 4.7-5" stroke="#fff" strokeWidth="1.6" fill="none" /></svg>}
      </span>
      {label}
    </label>
  );
}

/** Small color chip that opens the native picker. */
export function ColorChip({ value, onChange, title, size = 20 }: { value: string; onChange: (v: string) => void; title: string; size?: number }) {
  return (
    <label className="relative inline-block shrink-0 cursor-pointer rounded-[2px] border border-ps-line shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" style={{ width: size, height: size, background: value }} title={title}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full opacity-0" aria-label={title} />
    </label>
  );
}

export function SubHead({ children }: { children: ReactNode }) {
  return <div className="mb-2 mt-1 text-[10px] font-semibold uppercase tracking-wider text-ps-faint">{children}</div>;
}

export function Folder({ name, children, defaultOpen = false, right }: { name: string; children: ReactNode; defaultOpen?: boolean; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div className="group flex items-center gap-1.5 rounded-[2px] px-1 py-1 hover:bg-ps-hover">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-1.5 text-left">
          {open ? <ChevronDown size={12} className="text-ps-dim" /> : <ChevronRight size={12} className="text-ps-dim" />}
          <svg viewBox="0 0 16 12" className="h-3 w-4"><path d="M0 1.5C0 .7.7 0 1.5 0H6l1.5 1.5h7c.8 0 1.5.7 1.5 1.5v7.5c0 .8-.7 1.5-1.5 1.5h-13C.7 12 0 11.3 0 10.5z" fill="#c8c8c8" /></svg>
          <span className="text-[12px] text-ps-text">{name}</span>
        </button>
        {right}
      </div>
      {open && <div className="pb-2 pl-6 pt-1">{children}</div>}
    </div>
  );
}

export function BarButton({ title, onClick, children, disabled, active }: { title: string; onClick?: () => void; children: ReactNode; disabled?: boolean; active?: boolean }) {
  return (
    <button
      type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled}
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-[3px] px-1 text-ps-dim hover:bg-ps-hover hover:text-ps-text disabled:pointer-events-none disabled:opacity-35 ${active ? 'bg-ps-active text-white' : ''}`}
    >
      {children}
    </button>
  );
}

/** Bottom action strip found under most Photoshop panels. */
export function PanelFooter({ children }: { children: ReactNode }) {
  return <div className="flex h-8 shrink-0 items-center justify-end gap-1 border-t border-ps-line bg-ps-bar px-2">{children}</div>;
}

export function Dialog({
  title, children, onClose, footer, width = 'max-w-md',
}: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3" onMouseDown={onClose}>
      <div role="dialog" aria-label={title} className={`flex max-h-[92dvh] w-full ${width} flex-col overflow-hidden rounded-md border border-black/60 bg-ps-bar shadow-[0_20px_60px_rgba(0,0,0,.6)]`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex h-8 shrink-0 items-center justify-between border-b border-ps-line bg-ps-menu px-3">
          <span className="text-[12px] font-semibold text-ps-text">{title}</span>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-0.5 text-ps-dim hover:bg-ps-hover hover:text-white"><X size={14} /></button>
        </div>
        <div className="ps-scroll min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex shrink-0 items-center justify-end gap-2 border-t border-ps-line px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Btn({ children, onClick, primary, disabled, className = '' }: { children: ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-full px-4 text-[12px] font-semibold transition disabled:opacity-40 ${
        primary ? 'bg-ps-blue text-white hover:bg-[#0d66d0]' : 'border border-ps-edge text-ps-text hover:border-ps-dim hover:bg-ps-hover'
      } ${className}`}
    >
      {children}
    </button>
  );
}
