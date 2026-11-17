import { useEffect, useRef, useState } from 'react';
import { makeCanvas, renderCamo } from '../../engine/camo';
import type { CamoConfig } from '../../types';

const SIZE = 112;
const cache = new Map<string, string>();
let cacheOwner = '';

type Job = { key: string; config: CamoConfig; imgs: HTMLImageElement[]; done: (url: string) => void };
const queue: Job[] = [];
let running = false;
let canvas: HTMLCanvasElement | null = null;

/** Render queued thumbnails a few at a time so scrolling through hundreds stays smooth. */
function pump() {
  if (running) return;
  running = true;
  const step = () => {
    const t0 = performance.now();
    while (queue.length && performance.now() - t0 < 12) {
      const job = queue.shift()!;
      const hit = cache.get(job.key);
      if (hit) { job.done(hit); continue; }
      canvas ??= makeCanvas(SIZE, SIZE);
      renderCamo(canvas, job.imgs, job.config, 1337, SIZE);
      const url = canvas.toDataURL('image/png');
      cache.set(job.key, url);
      job.done(url);
    }
    if (queue.length) requestAnimationFrame(step);
    else running = false;
  };
  requestAnimationFrame(step);
}

interface Props {
  id: string;
  config: CamoConfig;
  imgs: HTMLImageElement[];
  /** Changes whenever the logos change, so thumbnails re-render with the new logo */
  logoKey: string;
  label: string;
  selected?: boolean;
  onClick: () => void;
}

export function PatternThumb({ id, config, imgs, logoKey, label, selected, onClick }: Props) {
  if (cacheOwner !== logoKey) { cache.clear(); cacheOwner = logoKey; }
  const key = `${logoKey}|${id}|${JSON.stringify(config)}`;
  const [url, setUrl] = useState<string | null>(() => cache.get(key) ?? null);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const cached = cache.get(key);
    if (cached) { setUrl(cached); return; }
    setUrl(null);
    const el = ref.current;
    if (!el) return;
    let job: Job | null = null;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || job) return;
      job = { key, config, imgs, done: setUrl };
      queue.push(job);
      pump();
      io.disconnect();
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => {
      io.disconnect();
      if (job) { const i = queue.indexOf(job); if (i >= 0) queue.splice(i, 1); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <button ref={ref} type="button" title={label} onClick={onClick}
      className={`group relative aspect-square overflow-hidden rounded-[2px] ${selected ? 'outline outline-2 outline-ps-blue' : 'hover:outline hover:outline-1 hover:outline-ps-dim'}`}
      style={{ background: config.backgroundColor }}>
      {url && <img src={url} alt="" className="h-full w-full" draggable={false} />}
      <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 text-left text-[9px] leading-[14px] text-white opacity-0 group-hover:opacity-100">{label}</span>
    </button>
  );
}
