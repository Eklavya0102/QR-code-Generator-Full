import type { FinderStyle, ModuleShape } from '../types';
import { isFinderCell, finderOrigins, type Matrix } from './matrix';

const f = (n: number) => String(Math.round(n * 100) / 100);

/** Rounded rectangle path with an individual radius per corner (clockwise from top-left). */
export function rrect(x: number, y: number, w: number, h: number, tl = 0, tr = 0, br = 0, bl = 0): string {
  const m = Math.min(w, h) / 2;
  [tl, tr, br, bl] = [tl, tr, br, bl].map((r) => Math.max(0, Math.min(r, m))) as [number, number, number, number];
  const arc = (r: number, ex: number, ey: number) => (r > 0 ? `A${f(r)} ${f(r)} 0 0 1 ${f(ex)} ${f(ey)}` : '');
  return (
    `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}${arc(tr, x + w, y + tr)}V${f(y + h - br)}${arc(br, x + w - br, y + h)}` +
    `H${f(x + bl)}${arc(bl, x, y + h - bl)}V${f(y + tl)}${arc(tl, x + tl, y)}Z`
  );
}

export const circlePath = (cx: number, cy: number, r: number) =>
  `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

/**
 * One compound path holding every data module (finder regions are skipped and drawn separately).
 * Every dark module of the matrix produces exactly one subpath, so no data is dropped.
 */
export function modulesPath(shape: ModuleShape, m: Matrix, ox: number, oy: number, U: number, scale: number): string {
  const n = m.size;
  const s = U * scale;
  const off = (U - s) / 2;
  const on = (r: number, c: number) => m.get(r, c) && !isFinderCell(r, c, n);
  const parts: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!on(r, c)) continue;
      const x = ox + c * U + off;
      const y = oy + r * U + off;
      const up = on(r - 1, c), down = on(r + 1, c), left = on(r, c - 1), right = on(r, c + 1);
      switch (shape) {
        case 'square':
          parts.push(rrect(x, y, s, s));
          break;
        case 'rounded':
          parts.push(rrect(x, y, s, s, s * 0.3, s * 0.3, s * 0.3, s * 0.3));
          break;
        case 'circle':
          parts.push(circlePath(x + s / 2, y + s / 2, s / 2));
          break;
        case 'dots':
          parts.push(circlePath(x + s / 2, y + s / 2, s * 0.34));
          break;
        case 'extraRounded': {
          const R = s * 0.5;
          parts.push(rrect(x, y, s, s, !up && !left ? R : 0, !up && !right ? R : 0, !down && !right ? R : 0, !down && !left ? R : 0));
          break;
        }
        case 'diamond': {
          const h = s * 0.62, cx = x + s / 2, cy = y + s / 2;
          parts.push(`M${f(cx)} ${f(cy - h)}L${f(cx + h)} ${f(cy)}L${f(cx)} ${f(cy + h)}L${f(cx - h)} ${f(cy)}Z`);
          break;
        }
        case 'vertical': {
          const top = up ? oy + r * U : y;
          const bottom = down ? oy + (r + 1) * U : y + s;
          const rt = up ? 0 : s / 2, rb = down ? 0 : s / 2;
          parts.push(rrect(x, top, s, bottom - top, rt, rt, rb, rb));
          break;
        }
        case 'horizontal': {
          const l = left ? ox + c * U : x;
          const rgt = right ? ox + (c + 1) * U : x + s;
          const rl = left ? 0 : s / 2, rr = right ? 0 : s / 2;
          parts.push(rrect(l, y, rgt - l, s, rl, rr, rr, rl));
          break;
        }
      }
    }
  }
  return parts.join('');
}

interface FinderShape {
  outer: number[]; // corner radii (tl,tr,br,bl) of the 7x7 ring, in modules
  eye: number[]; // corner radii of the 3x3 eye
  round?: boolean;
}
const FINDERS: Record<FinderStyle, FinderShape> = {
  square: { outer: [0, 0, 0, 0], eye: [0, 0, 0, 0] },
  custom: { outer: [0, 0, 0, 0], eye: [0, 0, 0, 0] },
  rounded: { outer: [1.1, 1.1, 1.1, 1.1], eye: [0.5, 0.5, 0.5, 0.5] },
  circular: { outer: [3.5, 3.5, 3.5, 3.5], eye: [1.5, 1.5, 1.5, 1.5], round: true },
  doubleRounded: { outer: [2, 2, 2, 2], eye: [1.1, 1.1, 1.1, 1.1] },
  modern: { outer: [2.2, 0.4, 2.2, 0.4], eye: [1, 0.2, 1, 0.2] },
};

/** Paths for the three finder patterns: `ring` needs fill-rule evenodd (7x7 ring with a 5x5 hole), `eye` is the 3x3 center. */
export function finderPaths(style: FinderStyle, m: Matrix, ox: number, oy: number, U: number): { ring: string; eye: string } {
  const shape = FINDERS[style];
  const ring: string[] = [];
  const eye: string[] = [];
  for (const [r, c] of finderOrigins(m.size)) {
    const x = ox + c * U;
    const y = oy + r * U;
    const [a, b, d, e] = shape.outer.map((v) => v * U);
    ring.push(rrect(x, y, 7 * U, 7 * U, a, b, d, e));
    ring.push(rrect(x + U, y + U, 5 * U, 5 * U, Math.max(0, a - U), Math.max(0, b - U), Math.max(0, d - U), Math.max(0, e - U)));
    const [p, q, s2, t] = shape.eye.map((v) => v * U);
    eye.push(rrect(x + 2 * U, y + 2 * U, 3 * U, 3 * U, p, q, s2, t));
  }
  return { ring: ring.join(''), eye: eye.join('') };
}
