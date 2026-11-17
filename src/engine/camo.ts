import type { CamoConfig } from '../types';

/** Deterministic PRNG so a given seed always reproduces the same pattern. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** All px-based settings are authored against a 1024px tile and scaled to the output size. */
export const REFERENCE_SIZE = 1024;
/** A shape at scale 1.0 has its longest side equal to this fraction of the tile. */
export const BASE_FRACTION = 0.16;

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function imgSize(img: HTMLImageElement): [number, number] {
  const w = img.naturalWidth || img.width || 512;
  const h = img.naturalHeight || img.height || 512;
  return [w, h];
}

function silhouette(img: HTMLImageElement, w: number, h: number, color: string | null) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  if (color) {
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  }
  return c;
}

interface Sprite {
  canvas: HTMLCanvasElement;
  /** sprite pixels per output pixel at scale 1.0 */
  k: number;
}

/** Pre-render a logo, optionally tinted, optionally outlined by dilating its silhouette. */
function buildSprite(
  img: HTMLImageElement, longest: number, k: number, color: string | null, outlinePx: number, outlineColor: string,
): Sprite {
  const [iw, ih] = imgSize(img);
  const ratio = longest / Math.max(iw, ih);
  const w = Math.max(1, Math.round(iw * ratio));
  const h = Math.max(1, Math.round(ih * ratio));
  const ow = outlinePx * k;
  const pad = Math.ceil(ow) + 2;
  const c = makeCanvas(w + pad * 2, h + pad * 2);
  const ctx = c.getContext('2d')!;
  if (ow > 0) {
    const sil = silhouette(img, w, h, outlineColor);
    const steps = Math.max(16, Math.ceil(ow * 3));
    for (const r of [ow, ow * 0.66, ow * 0.33]) {
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        ctx.drawImage(sil, pad + Math.cos(a) * r, pad + Math.sin(a) * r);
      }
    }
  }
  ctx.drawImage(silhouette(img, w, h, color), pad, pad);
  return { canvas: c, k };
}

export interface RenderStamp {
  logoIndex: number;
  x: number;
  y: number;
  scale: number;
  rotation: number; // degrees
  color: string | null;
  outlined: boolean;
}

export interface RenderOptions {
  stamps?: RenderStamp[];
  showPattern?: boolean;
}

export interface RenderStats {
  shapes: number;
  ms: number;
}

/** One generated shape. x/y are 0–1 of the tile, rotation in radians, flip is ±1. */
export interface PatternShape {
  logoIndex: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flip: number;
  color: string | null;
  outlined: boolean;
}

/**
 * The seeded layout shared by the raster renderer and the vector exporter, so both
 * produce the same pattern. Returns one array of shapes per layering pass.
 */
export function layoutPattern(logoCount: number, cfg: CamoConfig, seed: number): PatternShape[][] {
  if (!logoCount) return [];
  const sMin = Math.min(cfg.scaleMin, cfg.scaleMax);
  const sMax = Math.max(cfg.scaleMin, cfg.scaleMax);
  const colors: (string | null)[] = cfg.useCustomColors && cfg.palette.length ? cfg.palette : [null];
  const canOutline = cfg.outlineWidth > 0;
  const rng = mulberry32(seed);
  const passes = Math.max(1, Math.round(cfg.layering));
  const out: PatternShape[][] = [];
  for (let p = 0; p < passes; p++) {
    const passScale = 1 - (p / passes) * 0.35;
    const list: PatternShape[] = [];
    for (let i = 0; i < cfg.density; i++) {
      const logoIndex = Math.floor(rng() * logoCount);
      const color = colors[Math.floor(rng() * colors.length)];
      const outlined = canOutline && rng() < cfg.outlineChance;
      const scale = (sMin + rng() * (sMax - sMin)) * passScale;
      const rotation = ((rng() - 0.5) * cfg.rotationJitter * Math.PI) / 180;
      const x = rng();
      const y = rng();
      const flip = rng() < 0.5 ? -1 : 1;
      list.push({ logoIndex, x, y, scale, rotation, flip, color, outlined });
    }
    out.push(list);
  }
  return out;
}

export function renderCamo(
  target: HTMLCanvasElement,
  logos: HTMLImageElement[],
  cfg: CamoConfig,
  seed: number,
  size: number,
  opts: RenderOptions = {},
): RenderStats {
  const t0 = performance.now();
  const stamps = (opts.stamps ?? []).filter((s) => logos[s.logoIndex]);
  const showPattern = opts.showPattern !== false;
  if (target.width !== size || target.height !== size) {
    target.width = size;
    target.height = size;
  }
  const ctx = target.getContext('2d', { willReadFrequently: true })!;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = cfg.backgroundColor;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  if (!logos.length) return { shapes: 0, ms: performance.now() - t0 };

  const unit = size / REFERENCE_SIZE;
  const baseSize = size * BASE_FRACTION;
  const sMax = Math.max(cfg.scaleMin, cfg.scaleMax);
  const outlinePx = cfg.outlineWidth * unit;
  const blurPx = cfg.blur * unit;
  const maxScale = Math.max(sMax, ...stamps.map((s) => s.scale));

  const spriteLongest = Math.min(1024, Math.max(64, Math.ceil(baseSize * maxScale)));
  const k = spriteLongest / baseSize;
  const cache = new Map<string, Sprite>();
  const sprite = (li: number, color: string | null, outlined: boolean) => {
    const key = `${li}|${color}|${outlined}`;
    let s = cache.get(key);
    if (!s) {
      s = buildSprite(logos[li], spriteLongest, k, color, outlined ? outlinePx : 0, cfg.outlineColor);
      cache.set(key, s);
    }
    return s;
  };

  /** Draw a sprite centred at (x,y), repeating across edges when seamless. */
  const place = (
    c: CanvasRenderingContext2D, s: Sprite, x: number, y: number, scale: number, rot: number, flip: number,
    offset: number, bound: number,
  ) => {
    const dw = (s.canvas.width / s.k) * scale;
    const dh = (s.canvas.height / s.k) * scale;
    const radius = Math.hypot(dw, dh) / 2;
    const offsets = cfg.seamless ? [-size, 0, size] : [0];
    for (const ox of offsets) {
      for (const oy of offsets) {
        const cx = x + ox + offset;
        const cy = y + oy + offset;
        if (cx + radius < 0 || cy + radius < 0 || cx - radius > bound || cy - radius > bound) continue;
        c.setTransform(flip, 0, 0, 1, cx, cy);
        c.rotate(rot * flip);
        c.drawImage(s.canvas, -dw / 2, -dh / 2, dw, dh);
      }
    }
  };

  let shapes = 0;
  if (showPattern) {
    // Each pass draws into a padded layer so blur and seamless wrapping see the wrapped neighbours.
    const margin = Math.ceil(blurPx * 3 + 2);
    const layer = makeCanvas(size + margin * 2, size + margin * 2);
    const lctx = layer.getContext('2d')!;
    for (const pass of layoutPattern(logos.length, cfg, seed)) {
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'source-over';
      lctx.clearRect(0, 0, layer.width, layer.height);
      lctx.globalCompositeOperation = cfg.blendMode;
      lctx.globalAlpha = cfg.opacity;
      for (const sh of pass) {
        place(lctx, sprite(sh.logoIndex, sh.color, sh.outlined), sh.x * size, sh.y * size, sh.scale, sh.rotation, sh.flip, margin, layer.width);
        shapes++;
      }
      ctx.save();
      ctx.globalCompositeOperation = cfg.blendMode;
      ctx.globalAlpha = 1;
      ctx.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
      ctx.drawImage(layer, -margin, -margin);
      ctx.restore();
    }
  }

  if (stamps.length) {
    ctx.save();
    ctx.globalCompositeOperation = cfg.blendMode;
    ctx.globalAlpha = cfg.opacity;
    ctx.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
    for (const st of stamps) {
      const s = sprite(st.logoIndex, st.color, st.outlined && outlinePx > 0);
      place(ctx, s, st.x * size, st.y * size, st.scale, (st.rotation * Math.PI) / 180, 1, 0, size);
      shapes++;
    }
    ctx.restore();
  }

  return { shapes, ms: performance.now() - t0 };
}

/** Load an image from a data/object URL and wait for decode. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (!img.naturalWidth) {
        img.width = 512;
        img.height = 512;
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}

/** Rasterise any loaded logo (incl. SVG) to a PNG data URL, longest side ≤ max. */
export function imageToPng(img: HTMLImageElement, max = 512): string {
  const [w, h] = imgSize(img);
  const r = Math.min(1, max / Math.max(w, h));
  const c = makeCanvas(w * r, h * r);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

export function samplePixels(img: HTMLImageElement, max = 96): Uint8ClampedArray {
  const [w, h] = imgSize(img);
  const r = Math.min(1, max / Math.max(w, h));
  const c = makeCanvas(w * r, h * r);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return ctx.getImageData(0, 0, c.width, c.height).data;
}
