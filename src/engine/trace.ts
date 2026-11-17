import { imgSize, makeCanvas } from './camo';

/**
 * Turns a logo's silhouette (its alpha channel) into smooth vector outlines.
 *
 * 1. Render the logo large and read its alpha.
 * 2. Marching squares with linear interpolation finds the 50%-alpha contour to sub-pixel accuracy.
 * 3. Ramer–Douglas–Peucker removes redundant points.
 * 4. Smooth vertices become quadratic curves; sharp corners stay sharp.
 *
 * Output coordinates are centred on the logo image, with its longest side spanning 1000 units.
 */

export const TRACE_UNITS = 1000;

type Pt = [number, number];

export interface TracedLogo {
  /** SVG path data, fill-rule evenodd */
  d: string;
  /** Image width/height in trace units (longest side = 1000) */
  w: number;
  h: number;
  points: number;
}

function alphaGrid(img: HTMLImageElement, longest: number) {
  const [iw, ih] = imgSize(img);
  const r = longest / Math.max(iw, ih);
  const w = Math.max(1, Math.round(iw * r));
  const h = Math.max(1, Math.round(ih * r));
  const pad = 2;
  const c = makeCanvas(w + pad * 2, h + pad * 2);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, pad, pad, w, h);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const W = c.width, H = c.height;
  const a = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = data[i * 4 + 3] / 255;
  return { a, W, H, pad, w, h };
}

/** Marching squares → closed polylines in grid coordinates. */
function contours(a: Float32Array, W: number, H: number): Pt[][] {
  const ISO = 0.5;
  // Edge keys: horizontal edge (x,y)-(x+1,y) = 2*(y*W+x); vertical edge (x,y)-(x,y+1) = 2*(y*W+x)+1
  const pts = new Map<number, Pt>();
  const lerp = (va: number, vb: number) => {
    const d = vb - va;
    return d === 0 ? 0.5 : Math.min(1, Math.max(0, (ISO - va) / d));
  };
  const hEdge = (x: number, y: number) => {
    const k = 2 * (y * W + x);
    if (!pts.has(k)) pts.set(k, [x + lerp(a[y * W + x], a[y * W + x + 1]), y]);
    return k;
  };
  const vEdge = (x: number, y: number) => {
    const k = 2 * (y * W + x) + 1;
    if (!pts.has(k)) pts.set(k, [x, y + lerp(a[y * W + x], a[(y + 1) * W + x])]);
    return k;
  };

  const segA: number[] = [];
  const segB: number[] = [];
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const tl = a[y * W + x], tr = a[y * W + x + 1], br = a[(y + 1) * W + x + 1], bl = a[(y + 1) * W + x];
      const idx = (tl >= ISO ? 8 : 0) | (tr >= ISO ? 4 : 0) | (br >= ISO ? 2 : 0) | (bl >= ISO ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = () => hEdge(x, y), B = () => hEdge(x, y + 1), L = () => vEdge(x, y), R = () => vEdge(x + 1, y);
      const add = (e1: number, e2: number) => { segA.push(e1); segB.push(e2); };
      const centre = (tl + tr + br + bl) / 4 >= ISO;
      switch (idx) {
        case 1: case 14: add(L(), B()); break;
        case 2: case 13: add(B(), R()); break;
        case 3: case 12: add(L(), R()); break;
        case 4: case 11: add(T(), R()); break;
        case 6: case 9: add(T(), B()); break;
        case 7: case 8: add(L(), T()); break;
        case 5: if (centre) { add(L(), T()); add(B(), R()); } else { add(T(), R()); add(L(), B()); } break;
        case 10: if (centre) { add(T(), R()); add(L(), B()); } else { add(L(), T()); add(B(), R()); } break;
      }
    }
  }

  // Link segments that share an edge point into closed loops.
  const adj = new Map<number, number[]>();
  for (let i = 0; i < segA.length; i++) {
    for (const e of [segA[i], segB[i]]) {
      const l = adj.get(e);
      if (l) l.push(i); else adj.set(e, [i]);
    }
  }
  const used = new Uint8Array(segA.length);
  const loops: Pt[][] = [];
  for (let s = 0; s < segA.length; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const start = segA[s];
    let cur = segB[s];
    const loop: Pt[] = [pts.get(start)!];
    let guard = segA.length + 1;
    while (cur !== start && guard-- > 0) {
      loop.push(pts.get(cur)!);
      const next = (adj.get(cur) ?? []).find((i) => !used[i]);
      if (next === undefined) break;
      used[next] = 1;
      cur = segA[next] === cur ? segB[next] : segA[next];
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

function area(p: Pt[]) {
  let s = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += (p[j][0] - p[i][0]) * (p[j][1] + p[i][1]);
  return s / 2;
}

function rdp(points: Pt[], eps: number): Pt[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    const [ax, ay] = points[s], [bx, by] = points[e];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let maxD = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps && idx > 0) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return points.filter((_, i) => keep[i]);
}

/** Simplify a closed loop: split it at its two farthest-apart points so RDP has stable anchors. */
function simplifyClosed(loop: Pt[], eps: number): Pt[] {
  let far = 0, fd = 0;
  for (let i = 1; i < loop.length; i++) {
    const d = (loop[i][0] - loop[0][0]) ** 2 + (loop[i][1] - loop[0][1]) ** 2;
    if (d > fd) { fd = d; far = i; }
  }
  const a = rdp(loop.slice(0, far + 1), eps);
  const b = rdp([...loop.slice(far), loop[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

const f = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return (Object.is(r, -0) ? 0 : r).toString();
};

function loopToPath(p: Pt[]): string {
  const n = p.length;
  if (n < 3) return '';
  const mid = (i: number): Pt => {
    const a = p[i % n], b = p[(i + 1) % n];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  const isCorner = (i: number) => {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
    const v1x = b[0] - a[0], v1y = b[1] - a[1], v2x = c[0] - b[0], v2y = c[1] - b[1];
    const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
    if (!l1 || !l2) return true;
    const turn = Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (l1 * l2))));
    // Long straight runs meeting at an angle are real corners; short steps are a sampled curve.
    const longest = Math.max(l1, l2);
    return turn > 0.7 || (longest > 12 && turn > 0.26);
  };
  const m0 = mid(n - 1);
  let d = `M${f(m0[0])} ${f(m0[1])}`;
  for (let i = 0; i < n; i++) {
    const m = mid(i);
    if (isCorner(i)) d += `L${f(p[i][0])} ${f(p[i][1])}L${f(m[0])} ${f(m[1])}`;
    else d += `Q${f(p[i][0])} ${f(p[i][1])} ${f(m[0])} ${f(m[1])}`;
  }
  return d + 'Z';
}

const cache = new WeakMap<HTMLImageElement, TracedLogo>();

/** Trace a logo's silhouette. Results are cached per image. */
export function traceLogo(img: HTMLImageElement, resolution = 1600): TracedLogo {
  const hit = cache.get(img);
  if (hit) return hit;
  const { a, W, H, pad, w, h } = alphaGrid(img, resolution);
  const k = TRACE_UNITS / Math.max(w, h);
  const minArea = 6; // px² — drops specks and stray anti-aliasing
  const parts: string[] = [];
  let points = 0;
  for (const loop of contours(a, W, H)) {
    if (Math.abs(area(loop)) < minArea) continue;
    const simple = simplifyClosed(loop, 0.35);
    if (simple.length < 3) continue;
    points += simple.length;
    const local = simple.map(([x, y]): Pt => [(x + 0.5 - pad - w / 2) * k, (y + 0.5 - pad - h / 2) * k]);
    parts.push(loopToPath(local));
  }
  const out = { d: parts.join(''), w: w * k, h: h * k, points };
  cache.set(img, out);
  return out;
}
