import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';

export function PanelGroup<T extends string>({
  tabs, active, onChange, children, className = '',
}: { tabs: { id: T; label: string }[]; active: T; onChange: (t: T) => void; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col bg-ps-bar ${className}`}>
      <div className="flex h-8 shrink-0 items-end border-b border-ps-line bg-ps-tab">
        <div className="no-scrollbar flex min-w-0 flex-1 items-end overflow-x-auto" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id} type="button" role="tab" aria-selected={active === t.id} onClick={() => onChange(t.id)}
              className={`h-8 shrink-0 whitespace-nowrap px-3 text-[12px] ${active === t.id ? 'bg-ps-bar font-semibold text-white' : 'text-ps-dim hover:text-ps-text'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="flex h-8 items-center px-2 text-ps-dim"><Menu size={14} /></span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
