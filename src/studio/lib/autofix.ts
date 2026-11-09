import { contrastRatio, luminance } from '../../lib/color';
import type { ECL } from '../../lib/qr';
import type { DecorationConfig } from '../types';
import type { Matrix } from './matrix';
import { buildScene, type SceneLogo } from './scene';

/** The settings that decide whether a code scans. Everything else (frame, label, decorations) is left alone. */
export interface FixState {
  cfg: DecorationConfig;
  fg: string;
  bg: string;
  ecl: ECL;
}
export interface FixContext {
  matrix: (ecl: ECL) => Matrix;
  logo: SceneLogo;
}
export interface Evaluation {
  pass: boolean;
  /** Higher is better; lets a partial improvement be recognised. */
  score: number;
}
export interface FixStep {
  id: string;
  /** Past-tense description shown to the user. */
  label: string;
  /** Returns the changed state, or null when this step has nothing to change. */
  apply: (s: FixState, ctx: FixContext) => FixState | null;
}
export type FixOutcome = 'already-ok' | 'fixed' | 'improved' | 'unfixed';
export interface FixResult {
  outcome: FixOutcome;
  state: FixState;
  applied: string[];
  evaluation: Evaluation;
}

const RECOVERY: Record<ECL, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };
const clone = (s: FixState): FixState => ({ ...s, cfg: structuredClone(s.cfg) });

const hexToRgb = (h: string): [number, number, number] => {
  const x = h.replace('#', '');
  const f = x.length === 3 ? x.split('').map((c) => c + c).join('') : x;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};
const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
/** Mixes toward black (amount > 0 darkens) or white (amount < 0 lightens). */
export function shade(hex: string, amount: number): string {
  const target = amount >= 0 ? 0 : 255;
  const k = Math.abs(amount);
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (target - r) * k, g + (target - g) * k, b + (target - b) * k);
}
/** Darkens `color` until it reaches `ratio` against `bg`; returns null when it cannot. */
function darkenToContrast(color: string, bg: string, ratio: number): string | null {
  let c = color;
  for (let i = 0; i < 30 && contrastRatio(c, bg) < ratio; i++) c = shade(c, 0.12);
  return contrastRatio(c, bg) >= ratio ? c : null;
}

export const FIX_STEPS: FixStep[] = [
  {
    id: 'contrast',
    label: 'Raised the contrast between the code and its background',
    apply(s) {
      const n = clone(s);
      if (luminance(n.fg) > luminance(n.bg)) [n.fg, n.bg] = [n.bg, n.fg]; // inverted colors are hard for many scanners
      for (let i = 0; i < 8 && darkenToContrast(n.fg, n.bg, 4.5) === null; i++) n.bg = shade(n.bg, -0.15); // lighten the background if black is not enough
      n.fg = darkenToContrast(n.fg, n.bg, 4.5) ?? n.fg;
      n.cfg.gradient.stops = n.cfg.gradient.stops.map((st) => ({ ...st, color: darkenToContrast(st.color, n.bg, 4.5) ?? st.color }));
      const m = n.cfg.modules;
      if (m.finderCustomColors || m.finder === 'custom') {
        m.finderOuter = darkenToContrast(m.finderOuter, n.bg, 4.5) ?? m.finderOuter;
        m.finderInner = darkenToContrast(m.finderInner, n.bg, 4.5) ?? m.finderInner;
      }
      return JSON.stringify([n.fg, n.bg, n.cfg.gradient.stops, m.finderOuter, m.finderInner]) === JSON.stringify([s.fg, s.bg, s.cfg.gradient.stops, s.cfg.modules.finderOuter, s.cfg.modules.finderInner]) ? null : n;
    },
  },
  {
    id: 'ecl',
    label: 'Raised error correction so the code can recover from the logo',
    apply(s) {
      const hasLogo = s.cfg.logo.source !== 'none';
      if (hasLogo && (s.ecl === 'L' || s.ecl === 'M')) return { ...clone(s), ecl: 'H' };
      if (s.ecl === 'L') return { ...clone(s), ecl: 'M' };
      return null;
    },
  },
  {
    id: 'spacing',
    label: 'Restored full-size modules and the standard 4-module quiet zone',
    apply(s) {
      if (s.cfg.modules.quietZone >= 4 && s.cfg.modules.scale >= 1) return null;
      const n = clone(s);
      n.cfg.modules.quietZone = Math.max(4, n.cfg.modules.quietZone);
      n.cfg.modules.scale = 1;
      return n;
    },
  },
  {
    id: 'logo',
    label: 'Made the logo smaller and centered it',
    apply(s, ctx) {
      if (s.cfg.logo.source === 'none' || !ctx.logo) return null;
      const n = clone(s);
      n.cfg.logo.position = 'center';
      const target = RECOVERY[n.ecl] * 0.5;
      const coverage = () => buildScene({ matrix: ctx.matrix(n.ecl), cfg: n.cfg, fg: n.fg, bg: n.bg, logo: ctx.logo }).logoCoverage;
      while (n.cfg.logo.size > 10 && coverage() > target) n.cfg.logo.size -= 1;
      return n.cfg.logo.size === s.cfg.logo.size && s.cfg.logo.position === 'center' ? null : n;
    },
  },
  {
    id: 'finder',
    label: 'Switched the finder patterns to plain squares',
    apply(s) {
      const m = s.cfg.modules;
      if (m.finder === 'square' && !m.finderCustomColors) return null;
      const n = clone(s);
      n.cfg.modules.finder = 'square';
      n.cfg.modules.finderCustomColors = false;
      return n;
    },
  },
  {
    id: 'shape',
    label: 'Changed the module shape to rounded squares',
    apply(s) {
      if (!['dots', 'diamond', 'circle'].includes(s.cfg.modules.shape)) return null;
      const n = clone(s);
      n.cfg.modules.shape = 'rounded';
      return n;
    },
  },
  {
    id: 'shape-square',
    label: 'Changed the module shape to plain squares',
    apply(s) {
      if (s.cfg.modules.shape === 'square') return null;
      const n = clone(s);
      n.cfg.modules.shape = 'square';
      return n;
    },
  },
  {
    id: 'gradient',
    label: 'Replaced the gradient with a solid color',
    apply(s) {
      if (!s.cfg.gradient.enabled) return null;
      const n = clone(s);
      const darkest = [...n.cfg.gradient.stops].sort((a, b) => luminance(a.color) - luminance(b.color))[0];
      n.fg = darkest?.color ?? n.fg;
      n.cfg.gradient.enabled = false;
      return n;
    },
  },
  {
    id: 'outer',
    label: 'Removed the border and corner decorations around the code',
    apply(s) {
      if (s.cfg.border.style === 'none' && s.cfg.corners.style === 'square') return null;
      const n = clone(s);
      n.cfg.border.style = 'none';
      n.cfg.corners.style = 'square';
      return n;
    },
  },
];

/**
 * Applies the least intrusive fixes first, re-checking after each real change, and stops at the first design that
 * passes. If none passes, the best partial improvement is kept; otherwise the original is returned untouched.
 * The logo, frame, label and decorations are never removed.
 */
export async function autofix(start: FixState, ctx: FixContext, evaluate: (s: FixState) => Promise<Evaluation>, onStep?: (label: string) => void): Promise<FixResult> {
  const first = await evaluate(start);
  if (first.pass) return { outcome: 'already-ok', state: start, applied: [], evaluation: first };
  let cur = start;
  const applied: string[] = [];
  let best: FixResult = { outcome: 'unfixed', state: start, applied: [], evaluation: first };
  for (const step of FIX_STEPS) {
    const next = step.apply(cur, ctx);
    if (!next) continue;
    cur = next;
    applied.push(step.label);
    onStep?.(step.label);
    const ev = await evaluate(cur);
    if (ev.pass) return { outcome: 'fixed', state: cur, applied: [...applied], evaluation: ev };
    if (ev.score > best.evaluation.score) best = { outcome: 'improved', state: cur, applied: [...applied], evaluation: ev };
  }
  return best;
}
