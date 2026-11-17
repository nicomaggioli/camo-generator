import type { CamoConfig } from '../types';
import { BASE_FRACTION, layoutPattern, type RenderStamp } from './camo';
import { TRACE_UNITS, traceLogo, type TracedLogo } from './trace';

export type SvgUnit = 'in' | 'cm' | 'mm' | 'px';

export interface SvgExportOptions {
  /** Physical width/height of the artboard */
  width: number;
  unit: SvgUnit;
  includeBackground: boolean;
  /** Clip shapes to the square tile (seamless edges); off leaves overhanging shapes */
  clipToTile: boolean;
  /** Reference one shared path per logo with <use> (smaller file) instead of a full copy per shape */
  useSymbols: boolean;
  showPattern: boolean;
  stamps: RenderStamp[];
}

export interface SvgExportResult {
  svg: string;
  shapes: number;
  colors: string[];
  notes: string[];
}

/** Everything is laid out in a 1024-unit square, matching the raster engine's reference tile. */
const VB = 1024;

const n = (v: number, d = 3) => {
  const p = 10 ** d;
  const r = Math.round(v * p) / p;
  return (Object.is(r, -0) ? 0 : r).toString();
};
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!);
const blendCss = (b: GlobalCompositeOperation) => (b === 'source-over' ? '' : ` style="mix-blend-mode:${b}"`);

interface Logo { img: HTMLImageElement; dataUrl: string }

export function exportSvg(logos: Logo[], cfg: CamoConfig, seed: number, opts: SvgExportOptions): SvgExportResult {
  const traced: TracedLogo[] = logos.map((l) => traceLogo(l.img));
  const notes: string[] = [];
  const colors = new Set<string>();
  const outlineW = cfg.outlineWidth; // already in 1024-reference units
  const base = VB * BASE_FRACTION;
  const offsets = cfg.seamless ? [-VB, 0, VB] : [0];
  let shapes = 0;
  let rasterFallback = false;

  const shapeMarkup = (li: number, cx: number, cy: number, scale: number, rot: number, flip: number, color: string | null, outlined: boolean, opacity: number) => {
    const t = traced[li];
    const k = (base * scale) / TRACE_UNITS;
    const cos = Math.cos(rot * flip), sin = Math.sin(rot * flip);
    const radius = (Math.hypot(t.w, t.h) / 2) * k + (outlined ? outlineW : 0);
    const parts: string[] = [];
    for (const ox of offsets) {
      for (const oy of offsets) {
        const x = cx + ox, y = cy + oy;
        if (x + radius < 0 || y + radius < 0 || x - radius > VB || y - radius > VB) continue;
        const m = `matrix(${n(flip * cos * k, 5)} ${n(sin * k, 5)} ${n(-flip * sin * k, 5)} ${n(cos * k, 5)} ${n(x)} ${n(y)})`;
        const op = opacity < 1 ? ` opacity="${n(opacity, 3)}"` : '';
        let body = '';
        if (color === null) {
          // Original colors can't be expressed as one flat vector fill — embed the logo image itself.
          rasterFallback = true;
          body = `<image xlink:href="${logos[li].dataUrl}" x="${n(-t.w / 2)}" y="${n(-t.h / 2)}" width="${n(t.w)}" height="${n(t.h)}"/>`;
        } else {
          colors.add(color.toLowerCase());
          const stroke = outlined ? n((outlineW * 2) / k, 2) : '';
          if (outlined) colors.add(cfg.outlineColor.toLowerCase());
          if (opts.useSymbols) {
            if (outlined) body += `<use xlink:href="#logo${li}" fill="${cfg.outlineColor}" stroke="${cfg.outlineColor}" stroke-width="${stroke}" stroke-linejoin="round"/>`;
            body += `<use xlink:href="#logo${li}" fill="${color}"/>`;
          } else {
            if (outlined) body += `<path d="${t.d}" fill="${cfg.outlineColor}" stroke="${cfg.outlineColor}" stroke-width="${stroke}" stroke-linejoin="round"/>`;
            body += `<path d="${t.d}" fill="${color}"/>`;
          }
        }
        parts.push(`<g transform="${m}"${op}>${body}</g>`);
        shapes++;
      }
    }
    return parts.join('\n');
  };

  const pattern: string[] = [];
  if (opts.showPattern && logos.length) {
    layoutPattern(logos.length, cfg, seed).forEach((pass, pi) => {
      const items = pass.map((s) => shapeMarkup(s.logoIndex, s.x * VB, s.y * VB, s.scale, s.rotation, s.flip, s.color, s.outlined, cfg.opacity)).filter(Boolean);
      pattern.push(`<g id="Pattern_Pass_${pi + 1}"${blendCss(cfg.blendMode)}>\n${items.join('\n')}\n</g>`);
    });
  }
  const stampItems = opts.stamps
    .filter((s) => logos[s.logoIndex])
    .map((s) => shapeMarkup(s.logoIndex, s.x * VB, s.y * VB, s.scale, (s.rotation * Math.PI) / 180, 1, s.color, s.outlined && outlineW > 0, cfg.opacity));

  if (cfg.blur > 0) notes.push('Blur is a raster effect and was left out of the vector file.');
  if (rasterFallback) notes.push('Shapes using original logo colors are embedded as images. Turn on palette tinting for 100% vector.');
  if (cfg.blendMode !== 'source-over') notes.push(`Blend mode “${cfg.blendMode}” is kept as a transparency blend mode.`);

  const defs: string[] = [`<clipPath id="tile"><rect width="${VB}" height="${VB}"/></clipPath>`];
  if (opts.useSymbols) traced.forEach((t, i) => defs.push(`<path id="logo${i}" d="${t.d}"/>`));

  const clip = opts.clipToTile ? ' clip-path="url(#tile)"' : '';
  const palette = [...colors];
  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${n(opts.width, 4)}${opts.unit}" height="${n(opts.width, 4)}${opts.unit}" viewBox="0 0 ${VB} ${VB}" fill-rule="evenodd">`,
    `<title>Camo Generator pattern</title>`,
    `<desc>${esc(`Seed ${seed.toString(16)}. Background ${cfg.backgroundColor}. Colors: ${palette.join(', ')}. ${cfg.seamless ? 'Seamless repeat tile.' : ''}`)}</desc>`,
    `<defs>${defs.join('')}</defs>`,
    opts.includeBackground ? `<rect id="Background" width="${VB}" height="${VB}" fill="${cfg.backgroundColor}"/>` : '',
    `<g id="Pattern"${clip}>`,
    ...pattern,
    stampItems.length ? `<g id="Stamps"${blendCss(cfg.blendMode)}>\n${stampItems.join('\n')}\n</g>` : '',
    '</g>',
    '</svg>',
  ].filter(Boolean).join('\n');

  if (opts.includeBackground) palette.unshift(cfg.backgroundColor.toLowerCase());
  return { svg, shapes, colors: [...new Set(palette)], notes };
}
