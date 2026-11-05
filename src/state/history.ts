import { useCallback, useState } from 'react';

interface Entry<T> { label: string; state: T; t: number }

/**
 * Linear undo history. Consecutive updates with the same label inside a short window
 * (e.g. dragging a slider) collapse into one step, like Photoshop's History panel.
 */
export function useHistory<T>(initial: T, canMerge: (label: string) => boolean = () => true, limit = 60) {
  const [h, setH] = useState<{ entries: Entry<T>[]; index: number }>({
    entries: [{ label: 'Open', state: initial, t: 0 }],
    index: 0,
  });

  const set = useCallback((label: string, updater: (s: T) => T) => {
    setH((prev) => {
      const cur = prev.entries[prev.index];
      const next = updater(cur.state);
      if (next === cur.state) return prev;
      const now = Date.now();
      const base = prev.entries.slice(0, prev.index + 1);
      if (prev.index > 0 && cur.label === label && canMerge(label) && now - cur.t < 900) {
        base[base.length - 1] = { label, state: next, t: now };
        return { entries: base, index: prev.index };
      }
      const entries = [...base, { label, state: next, t: now }].slice(-limit);
      return { entries, index: entries.length - 1 };
    });
  }, [limit, canMerge]);

  const undo = useCallback(() => setH((p) => ({ ...p, index: Math.max(0, p.index - 1) })), []);
  const redo = useCallback(() => setH((p) => ({ ...p, index: Math.min(p.entries.length - 1, p.index + 1) })), []);
  const jump = useCallback((i: number) => setH((p) => ({ ...p, index: Math.max(0, Math.min(p.entries.length - 1, i)) })), []);

  return {
    state: h.entries[h.index].state,
    set,
    undo,
    redo,
    jump,
    entries: h.entries.map((e) => e.label),
    index: h.index,
    canUndo: h.index > 0,
    canRedo: h.index < h.entries.length - 1,
  };
}
