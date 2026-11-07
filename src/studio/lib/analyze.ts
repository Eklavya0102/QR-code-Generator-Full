import type { ECL } from '../../lib/qr';
import { contrastRatio, isHexColor, luminance } from '../../lib/color';
import type { DecorationConfig } from '../types';

export interface Advice {
  level: 'error' | 'warn';
  text: string;
}
const RECOVERY: Record<ECL, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };

/** Heuristic scannability warnings. They complement, and never replace, the decode check and a real-phone test. */
export function analyze(cfg: DecorationConfig, fg: string, bg: string, ecl: ECL, logoCoverage: number, hasLogo: boolean, transparent: boolean): Advice[] {
  const out: Advice[] = [];
  const m = cfg.modules;
  const modColors = (cfg.gradient.enabled ? cfg.gradient.stops.map((s) => s.color) : [fg]).filter(isHexColor);
  const finderColors = m.finderCustomColors || m.finder === 'custom' ? [m.finderOuter, m.finderInner].filter(isHexColor) : [];
  const worst = Math.min(...[...modColors, ...finderColors].map((c) => contrastRatio(c, bg)), 21);
  if (worst < 2.5) out.push({ level: 'error', text: `Contrast between the code and its background is too low (${worst.toFixed(1)}:1). Use darker modules or a lighter background.` });
  else if (worst < 4) out.push({ level: 'warn', text: `Contrast is on the low side (${worst.toFixed(1)}:1). Aim for 4:1 or more, including every gradient stop.` });
  if (modColors.some((c) => luminance(c) > luminance(bg))) out.push({ level: 'warn', text: 'Some modules are lighter than the background (inverted). Many scanners cannot read inverted codes.' });
  if (m.shape === 'circle') out.push({ level: 'warn', text: 'Circle modules read in most scanners but not all. Test the code on more than one phone.' });
  if (m.shape === 'dots') out.push({ level: 'warn', text: 'Dot modules cover little of each cell and are harder to scan. Keep the code large and test it.' });
  if (m.shape === 'diamond') out.push({ level: 'warn', text: 'Diamond modules leave gaps between cells. Test the code before printing.' });
  if (['circular', 'doubleRounded', 'modern'].includes(m.finder)) out.push({ level: 'warn', text: 'Unusual finder shapes are read less reliably by some scanners. Square or rounded finders are the safest.' });
  if (m.scale < 0.85) out.push({ level: 'warn', text: 'Small modules make a code harder to read. Raise the module size toward 100%.' });
  if (m.quietZone < 4) out.push({ level: 'warn', text: 'The quiet zone is below the 4-module standard. Some scanners need more empty space around the code.' });
  if (hasLogo) {
    const rec = RECOVERY[ecl];
    if (logoCoverage > rec * 0.9) out.push({ level: 'error', text: `The logo covers ${(logoCoverage * 100).toFixed(0)}% of the code, more than level ${ecl} can recover. Shrink the logo or raise error correction.` });
    else if (logoCoverage > rec * 0.55) out.push({ level: 'warn', text: `The logo covers ${(logoCoverage * 100).toFixed(0)}% of the code. That is close to what level ${ecl} can recover.` });
    if (ecl === 'L' || ecl === 'M') out.push({ level: 'warn', text: 'Use error correction Q or H when a logo sits on the code.' });
    if (cfg.logo.position !== 'center') out.push({ level: 'warn', text: 'A logo away from the center can cover alignment patterns. Prefer the center position.' });
  }
  if (transparent) out.push({ level: 'warn', text: 'A transparent background depends on what the code is placed on. Keep it light and plain behind dark modules.' });
  return out;
}
