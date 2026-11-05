import { imgSize, makeCanvas } from './camo';
import type { RGB } from '../lib/color';

export interface BgRemoveOptions {
  color: RGB;
  /** 0–100: how far from the background color a pixel can be and still be removed */
  tolerance: number;
  /** 0–50: soft transition band above the tolerance */
  softness: number;
  /** 'edges' removes only background connected to the image border (keeps white inside the logo) */
  mode: 'edges' | 'global';
  /** Un-mix the background color from semi-transparent edge pixels (kills white halos) */
  defringe: boolean;
}

function readPixels(img: HTMLImageElement, max: number) {
  const [w, h] = imgSize(img);
  const r = Math.min(1, max / Math.max(w, h));
  const c = makeCanvas(w * r, h * r);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { canvas: c, ctx, data: ctx.getImageData(0, 0, c.width, c.height) };
}

/** Look at the border pixels: if they're opaque and roughly one color, the logo has a solid background. */
export function detectBackground(img: HTMLImageElement): { opaque: boolean; color: RGB } {
  const { data } = readPixels(img, 160);
  const { width: w, height: h, data: d } = data;
  const samples: number[] = [];
  const push = (x: number, y: number) => samples.push((y * w + x) * 4);
  for (let x = 0; x < w; x += 2) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y += 2) { push(0, y); push(w - 1, y); }

  let opaqueCount = 0, r = 0, g = 0, b = 0;
  for (const i of samples) {
    if (d[i + 3] > 245) { opaqueCount++; r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  }
  if (opaqueCount < samples.length * 0.9) return { opaque: false, color: [255, 255, 255] };
  const avg: RGB = [r / opaqueCount, g / opaqueCount, b / opaqueCount];
  let close = 0;
  for (const i of samples) {
    const dist = Math.hypot(d[i] - avg[0], d[i + 1] - avg[1], d[i + 2] - avg[2]);
    if (dist < 40) close++;
  }
  return { opaque: close > samples.length * 0.75, color: avg.map(Math.round) as RGB };
}

/** Returns a PNG data URL with the background made transparent. */
export function removeBackground(img: HTMLImageElement, opts: BgRemoveOptions, max = 2048): string {
  const { canvas, ctx, data } = readPixels(img, max);
  const { width: w, height: h, data: d } = data;
  const [br, bg, bb] = opts.color;
  const n = w * h;
  const t = opts.tolerance;
  const hard = t + Math.max(0.0001, opts.softness);

  // Distance from background color, 0–100.
  const dist = new Float32Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    dist[p] = (Math.hypot(d[i] - br, d[i + 1] - bg, d[i + 2] - bb) / 441.673) * 100;
  }

  const affected = new Uint8Array(n);
  if (opts.mode === 'global') {
    for (let p = 0; p < n; p++) if (dist[p] < hard) affected[p] = 1;
  } else {
    // Flood fill from every border pixel through pixels close to the background.
    const queue = new Int32Array(n);
    let head = 0, tail = 0;
    const seed = (p: number) => { if (!affected[p] && dist[p] < hard) { affected[p] = 1; queue[tail++] = p; } };
    for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
    while (head < tail) {
      const p = queue[head++];
      const x = p % w, y = (p - x) / w;
      // Only keep spreading through the "definitely background" core, so soft edges don't leak inward.
      if (dist[p] >= t && t > 0) continue;
      if (x > 0) seed(p - 1);
      if (x < w - 1) seed(p + 1);
      if (y > 0) seed(p - w);
      if (y < h - 1) seed(p + w);
    }
  }

  for (let p = 0, i = 0; p < n; p++, i += 4) {
    if (!affected[p]) continue;
    const a = dist[p] <= t ? 0 : Math.min(1, (dist[p] - t) / (hard - t));
    if (a <= 0) { d[i + 3] = 0; continue; }
    if (opts.defringe && a < 1) {
      d[i] = Math.max(0, Math.min(255, (d[i] - br * (1 - a)) / a));
      d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] - bg * (1 - a)) / a));
      d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] - bb * (1 - a)) / a));
    }
    d[i + 3] = Math.round(d[i + 3] * a);
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}
