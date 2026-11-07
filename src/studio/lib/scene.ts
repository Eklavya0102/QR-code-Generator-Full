import type { DecorationConfig, LabelLayout } from '../types';
import { luminance } from '../../lib/color';
import { logoById } from '../data/logos';
import { decorations } from './decorations';
import type { Matrix } from './matrix';
import { circlePath, finderPaths, modulesPath, rrect } from './shapes';
import { clamp, col, fitFont, gradientDef, num, textEl, textWidth } from './svg';

/** Design units per QR module. All geometry is in these units, so the same SVG scales to any export size. */
export const UNIT = 10;

export type SceneLogo = { kind: 'image'; href: string; aspect: number } | { kind: 'builtin'; id: string } | null;

export interface SceneInput {
  matrix: Matrix;
  cfg: DecorationConfig;
  fg: string;
  bg: string;
  logo?: SceneLogo;
  /** Prefix for gradient/filter ids so several scenes can live on one page. */
  idPrefix?: string;
  /** Drops every background fill (frame, QR light color, pattern). */
  transparent?: boolean;
  /** Writes explicit pixel dimensions on the root element (used for export). */
  pixelSize?: { width: number; height: number };
}

export interface SceneResult {
  svg: string;
  width: number;
  height: number;
  /** Share of the QR data area covered by the logo plate (0..1). */
  logoCoverage: number;
}

const BRACKETS = ['brackets', 'doubleLine', 'accents', 'gradient', 'minimal'];
const BOX_RADIUS: Record<string, number> = { rounded: 2.2, circular: 7, extraRounded: 4.5 };

export function buildScene(input: SceneInput): SceneResult {
  const { matrix, cfg, fg, bg, logo = null, transparent = false, pixelSize } = input;
  const p = `${input.idPrefix ?? 'q'}-`;
  const U = UNIT;
  const N = matrix.size;
  const { frame, border, corners, modules, gradient, decor, logo: lc } = cfg;
  const qz = clamp(Math.round(modules.quietZone), 2, 8);
  const dataSide = N * U;
  const codeSide = (N + 2 * qz) * U;
  const defs: string[] = [];

  // ---- Border and corner-bracket metrics (they live in the ring just outside the QR box) ----
  const hasBorder = border.style !== 'none';
  const bT = !hasBorder ? 0 : border.style === 'minimal' ? 2 : clamp(border.thickness, 1, 30);
  const hasBrackets = BRACKETS.includes(corners.style);
  const cT = corners.style === 'minimal' ? 1.5 : clamp(corners.thickness, 1, 14);
  const cTotal = corners.style === 'doubleLine' ? cT * 2.4 : cT;
  let gap = hasBorder ? clamp(border.spacing, 0, 40) : 0;
  if (hasBrackets) gap = Math.max(gap, cTotal + 12);
  const bb = codeSide + 2 * (gap + bT);

  // ---- Frame metrics ----
  const fe = frame.enabled;
  const label = frame.text.trim().slice(0, 40);
  const layout: LabelLayout = fe && label ? frame.layout : 'none';
  const lh = clamp(frame.labelSize, 12, 44);
  const barH = lh * 2.3;
  let inTop = 0, inBot = 0, outTop = 0, outBot = 0;
  const pillH = barH * 0.9;
  const ribH = barH * 0.95;
  if (layout === 'topBar') inTop = barH;
  else if (layout === 'bottomBar') inBot = barH;
  else if (layout === 'dualBar') { inTop = barH; inBot = barH * 0.4; }
  else if (layout === 'topTab') outTop = barH * 0.85;
  else if (layout === 'bottomPill') { inBot = pillH / 2; outBot = pillH / 2; }
  else if (layout === 'ribbon') { inBot = ribH / 2; outBot = ribH / 2 + 8; }
  else if (layout === 'bubble') outBot = pillH + 12;

  const anyDecor = Object.values(decor).some((l) => l.enabled);
  const ft = fe ? clamp(frame.thickness, 0, 24) : 0;
  const pad = Math.max(fe ? clamp(frame.padding, 0, 80) : 0, anyDecor ? 36 : 0);
  const fw = bb + 2 * pad + 2 * ft + (fe ? clamp(frame.extraWidth, 0, 300) : 0);
  const fh = bb + 2 * pad + 2 * ft + (fe ? clamp(frame.extraHeight, 0, 300) : 0) + inTop + inBot;
  const fShadow = fe ? clamp(frame.shadow, 0, 100) : 0;
  const bShadow = border.style === 'neon' || border.style === 'shadow' ? clamp(border.shadow, 0, 100) : 0;
  const bleed = Math.round((layout === 'ribbon' ? 18 : 8) + Math.max(fShadow * 0.35, bShadow * 0.4));
  const W = fw + 2 * bleed;
  const H = outTop + fh + outBot + 2 * bleed;
  const fx = bleed;
  const fy = bleed + outTop;
  const R = Math.min(fe ? clamp(frame.radius, 0, 80) : 0, fw / 2, fh / 2);
  const innerX = fx + ft, innerY = fy + ft, innerW = fw - 2 * ft, innerH = fh - 2 * ft;
  const areaX = innerX, areaY = innerY + inTop, areaW = innerW, areaH = innerH - inTop - inBot;
  let bx = areaX + (areaW - bb) / 2;
  if (fe && frame.align === 'left') bx = areaX + pad;
  if (fe && frame.align === 'right') bx = areaX + areaW - pad - bb;
  const by = areaY + (areaH - bb) / 2;
  const cx0 = bx + bT + gap;
  const cy0 = by + bT + gap;
  const dx0 = cx0 + qz * U;
  const dy0 = cy0 + qz * U;

  const parts: string[] = [];
  const innerClip = `${p}clip`;
  defs.push(`<clipPath id="${innerClip}"><rect x="${num(innerX)}" y="${num(innerY)}" width="${num(innerW)}" height="${num(innerH)}" rx="${num(Math.max(0, R - ft))}"/></clipPath>`);

  // ---- Frame body, outline and label bars ----
  if (fe) {
    if (!transparent) {
      let attr = '';
      if (fShadow > 0) {
        defs.push(`<filter id="${p}fsh" x="-25%" y="-25%" width="150%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="${num(2 + fShadow * 0.1)}"/><feOffset dy="${num(2 + fShadow * 0.06)}" result="o"/><feComponentTransfer in="o" result="sh"><feFuncA type="linear" slope="0.38"/></feComponentTransfer><feMerge><feMergeNode in="sh"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
        attr = ` filter="url(#${p}fsh)"`;
      }
      parts.push(`<rect x="${num(fx)}" y="${num(fy)}" width="${num(fw)}" height="${num(fh)}" rx="${num(R)}" fill="${col(frame.bg)}" fill-opacity="${num(clamp(frame.opacity, 0, 100) / 100)}"${attr}/>`);
    }
    const bc = col(frame.borderColor);
    const line = (inset: number, sw: number, extra = '') =>
      `<rect x="${num(fx + inset)}" y="${num(fy + inset)}" width="${num(fw - 2 * inset)}" height="${num(fh - 2 * inset)}" rx="${num(Math.max(0, R - inset))}" fill="none" stroke="${bc}" stroke-width="${num(sw)}"${extra}/>`;
    if (ft > 0) {
      if (frame.lineStyle === 'double') parts.push(line(ft / 6, ft / 3) + line(ft - ft / 6, ft / 3));
      else if (frame.lineStyle === 'dashed') parts.push(line(ft / 2, ft, ` stroke-dasharray="${num(ft * 2.6)} ${num(ft * 1.8)}"`));
      else if (frame.lineStyle === 'dotted') parts.push(line(ft / 2, ft, ` stroke-dasharray="0 ${num(ft * 2)}" stroke-linecap="round"`));
      else parts.push(line(ft / 2, ft));
    }
    if (inTop || inBot) {
      const lb = col(frame.labelBg);
      const x = frame.align === 'left' ? innerX + 24 : frame.align === 'right' ? innerX + innerW - 24 : innerX + innerW / 2;
      const anchor = frame.align === 'left' ? 'start' : frame.align === 'right' ? 'end' : 'middle';
      const fs = fitFont(label, lh, innerW - 48);
      let bars = '';
      if (layout === 'topBar' || layout === 'dualBar') bars += `<rect x="${num(innerX)}" y="${num(innerY)}" width="${num(innerW)}" height="${num(barH)}" fill="${lb}"/>` + textEl(label, x, innerY + barH / 2, anchor, fs, frame.textColor);
      if (layout === 'bottomBar') bars += `<rect x="${num(innerX)}" y="${num(innerY + innerH - barH)}" width="${num(innerW)}" height="${num(barH)}" fill="${lb}"/>` + textEl(label, x, innerY + innerH - barH / 2, anchor, fs, frame.textColor);
      if (layout === 'dualBar') bars += `<rect x="${num(innerX)}" y="${num(innerY + innerH - inBot)}" width="${num(innerW)}" height="${num(inBot)}" fill="${lb}"/>`;
      if (!transparent || layout !== 'none') parts.push(`<g clip-path="url(#${innerClip})">${bars}</g>`);
    }
  }

  // ---- Decorative layers (outside the QR box, clipped to the frame) ----
  if (anyDecor) {
    const d = decorations(decor, p, { x: areaX, y: areaY, w: areaW, h: areaH }, { x: bx, y: by, w: bb, h: bb });
    if (d.defs) defs.push(d.defs);
    parts.push(`<g clip-path="url(#${innerClip})">${d.body}</g>`);
  }

  // ---- Border around the QR box ----
  if (hasBorder) {
    const op = num(clamp(border.opacity, 0, 100) / 100);
    const c1 = col(border.color), c2 = col(border.color2);
    const ins = (i: number, sw: number, stroke: string, extra = '', rr = border.radius) =>
      `<rect x="${num(bx + i)}" y="${num(by + i)}" width="${num(bb - 2 * i)}" height="${num(bb - 2 * i)}" rx="${num(Math.max(0, Math.min(rr - i, (bb - 2 * i) / 2)))}" fill="none" stroke="${stroke}" stroke-width="${num(sw)}"${extra}/>`;
    let g = '';
    switch (border.style) {
      case 'solid': case 'minimal': g = ins(bT / 2, bT, c1); break;
      case 'rounded': g = ins(bT / 2, bT, c1, '', Math.max(border.radius, 18)); break;
      case 'double': g = ins(bT / 6, bT / 3, c1) + ins(bT - bT / 6, bT / 3, c2); break;
      case 'dashed': g = ins(bT / 2, bT, c1, ` stroke-dasharray="${num(bT * 3)} ${num(bT * 2)}"`); break;
      case 'dotted': g = ins(bT / 2, bT, c1, ` stroke-dasharray="0 ${num(bT * 2)}" stroke-linecap="round"`); break;
      case 'gradient':
        defs.push(gradientDef(`${p}bg`, 'linear', border.gradientAngle, [{ offset: 0, color: c1 }, { offset: 100, color: c2 }], bx, by, bb, bb));
        g = ins(bT / 2, bT, `url(#${p}bg)`);
        break;
      case 'shadow':
        defs.push(`<filter id="${p}bsh" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="${num(1 + bShadow * 0.09)}"/><feOffset dy="${num(1 + bShadow * 0.05)}" result="o"/><feComponentTransfer in="o" result="sh"><feFuncA type="linear" slope="0.45"/></feComponentTransfer><feMerge><feMergeNode in="sh"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
        g = `<g filter="url(#${p}bsh)">${ins(bT / 2, bT, c1)}</g>`;
        break;
      case 'decorative': {
        const k = bT * 1.1;
        const dots = [[bx, by], [bx + bb, by], [bx, by + bb], [bx + bb, by + bb]].map(([x, y]) => `<path d="M${num(x)} ${num(y - k)}L${num(x + k)} ${num(y)}L${num(x)} ${num(y + k)}L${num(x - k)} ${num(y)}Z" fill="${c2}"/>`).join('');
        g = ins(bT * 0.2, bT * 0.4, c1) + ins(bT * 0.75, bT * 0.3, c2, ` stroke-dasharray="${num(bT * 1.2)} ${num(bT * 0.9)}"`) + dots;
        break;
      }
      case 'neon':
        defs.push(`<filter id="${p}neon" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="${num(1.5 + bShadow * 0.05)}" result="b1"/><feGaussianBlur in="SourceGraphic" stdDeviation="${num(4 + bShadow * 0.12)}" result="b2"/><feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
        g = `<g filter="url(#${p}neon)">${ins(bT / 2, bT * 0.7, c1)}${ins(bT / 2, bT * 0.25, c2)}</g>`;
        break;
    }
    parts.push(`<g opacity="${op}">${g}</g>`);
  }

  // ---- QR box background and rounded outline ----
  const boxR = Math.min((BOX_RADIUS[corners.style] ?? 0) * U, 3.2 * qz * U);
  if (!transparent) parts.push(`<rect x="${num(cx0)}" y="${num(cy0)}" width="${num(codeSide)}" height="${num(codeSide)}" rx="${num(boxR)}" fill="${col(bg)}"/>`);

  // ---- Corner brackets (outside the QR box, inside the border ring) ----
  if (hasBrackets) {
    const off = 4 + cTotal / 2;
    const arm = clamp(corners.size, 10, 80);
    const c1 = col(corners.color);
    let stroke = c1;
    if (corners.style === 'gradient') {
      defs.push(gradientDef(`${p}cg`, 'linear', 45, [{ offset: 0, color: corners.color }, { offset: 100, color: corners.color2 }], cx0 - off, cy0 - off, codeSide + 2 * off, codeSide + 2 * off));
      stroke = `url(#${p}cg)`;
    }
    const L = (px: number, py: number, sx: number, sy: number, len: number, w: number, color = stroke) =>
      `<path d="M${num(px)} ${num(py + sy * len)}V${num(py)}H${num(px + sx * len)}" fill="none" stroke="${color}" stroke-width="${num(w)}" stroke-linecap="${corners.style === 'minimal' ? 'butt' : 'round'}" stroke-linejoin="round"/>`;
    const cs: [number, number, number, number][] = [
      [cx0 - off, cy0 - off, 1, 1], [cx0 + codeSide + off, cy0 - off, -1, 1], [cx0 - off, cy0 + codeSide + off, 1, -1], [cx0 + codeSide + off, cy0 + codeSide + off, -1, -1],
    ];
    parts.push(
      cs.map(([px, py, sx, sy]) => {
        if (corners.style === 'doubleLine') return L(px, py, sx, sy, arm, cT) + L(px - sx * cT * 1.4, py - sy * cT * 1.4, sx, sy, arm * 0.7, cT * 0.8);
        if (corners.style === 'accents') return L(px, py, sx, sy, arm * 0.55, cT) + `<circle cx="${num(px - sx * cT * 0.6)}" cy="${num(py - sy * cT * 0.6)}" r="${num(cT * 0.9)}" fill="${c1}"/>`;
        if (corners.style === 'minimal') return L(px, py, sx, sy, arm * 0.8, 1.5);
        return L(px, py, sx, sy, arm, cT);
      }).join(''),
    );
  }

  // ---- Data modules and finder patterns ----
  const fillRef = gradient.enabled
    ? (defs.push(gradientDef(`${p}mg`, gradient.type, gradient.angle, gradient.stops, dx0, dy0, dataSide, dataSide)), `url(#${p}mg)`)
    : col(fg);
  const scale = clamp(modules.scale, 0.6, 1);
  parts.push(`<path d="${modulesPath(modules.shape, matrix, dx0, dy0, U, scale)}" fill="${fillRef}"/>`);
  const fp = finderPaths(modules.finder, matrix, dx0, dy0, U);
  const custom = modules.finderCustomColors || modules.finder === 'custom';
  parts.push(`<path d="${fp.ring}" fill-rule="evenodd" fill="${custom ? col(modules.finderOuter) : fillRef}"/>`);
  parts.push(`<path d="${fp.eye}" fill="${custom ? col(modules.finderInner) : fillRef}"/>`);

  // ---- Logo ----
  let logoCoverage = 0;
  if (logo) {
    const maxDim = (clamp(lc.size, 8, 40) / 100) * dataSide;
    const aspect = logo.kind === 'image' ? logo.aspect : 1;
    const w = aspect >= 1 ? maxDim : maxDim * aspect;
    const h = aspect >= 1 ? maxDim / aspect : maxDim;
    const pd = clamp(lc.padding, 0, 24);
    const circle = lc.shape === 'circle';
    const plateW = circle ? Math.hypot(w, h) + 2 * pd : w + 2 * pd;
    const plateH = circle ? plateW : h + 2 * pd;
    const mid = lc.position === 'center'
      ? [dx0 + dataSide / 2, dy0 + dataSide / 2]
      : [dx0 + dataSide - plateW / 2 - U * 0.5, dy0 + dataSide - plateH / 2 - U * 0.5];
    const px = mid[0] - plateW / 2, py = mid[1] - plateH / 2;
    const stroke = lc.borderWidth > 0 ? ` stroke="${col(lc.borderColor)}" stroke-width="${num(clamp(lc.borderWidth, 0, 10))}"` : '';
    const plate = circle
      ? `<circle cx="${num(mid[0])}" cy="${num(mid[1])}" r="${num(plateW / 2)}" fill="${lc.bgEnabled || logo.kind === 'builtin' ? col(lc.bg) : 'none'}"${stroke}/>`
      : `<path d="${rrect(px, py, plateW, plateH, lc.shape === 'square' ? 0 : clamp(lc.radius, 0, 60), lc.shape === 'square' ? 0 : clamp(lc.radius, 0, 60), lc.shape === 'square' ? 0 : clamp(lc.radius, 0, 60), lc.shape === 'square' ? 0 : clamp(lc.radius, 0, 60))}" fill="${lc.bgEnabled || logo.kind === 'builtin' ? col(lc.bg) : 'none'}"${stroke}/>`;
    logoCoverage = (circle ? Math.PI * (plateW / 2) ** 2 : plateW * plateH) / (dataSide * dataSide);
    let art = '';
    if (logo.kind === 'image') {
      art = `<image href="${logo.href}" x="${num(mid[0] - w / 2)}" y="${num(mid[1] - h / 2)}" width="${num(w)}" height="${num(h)}" preserveAspectRatio="xMidYMid meet"/>`;
    } else {
      const meta = logoById(logo.id);
      const glyphColor = luminance(col(lc.bg)) > 0.55 ? '#1b1b1b' : '#ffffff';
      if (meta) art = `<g transform="translate(${num(mid[0] - w / 2)} ${num(mid[1] - h / 2)}) scale(${num(w / 24)})">${meta.glyph.replace(/\{c\}/g, glyphColor)}</g>`;
    }
    parts.push(plate + art);
  }

  // ---- Labels that sit outside the frame (drawn last so they overlap the frame edge cleanly) ----
  if (fe && (outTop || outBot)) {
    const lb = col(frame.labelBg);
    const fs = fitFont(label, lh, fw - 60);
    const tw = Math.min(fw - 20, textWidth(label, fs) + lh * 1.8);
    const tx = frame.align === 'left' ? fx + 14 : frame.align === 'right' ? fx + fw - 14 - tw : fx + (fw - tw) / 2;
    const ccx = tx + tw / 2;
    const bottom = fy + fh;
    if (layout === 'topTab') {
      const ty = fy - outTop;
      parts.push(`<path d="${rrect(tx, ty, tw, outTop + ft + 1, Math.min(14, outTop / 2), Math.min(14, outTop / 2), 0, 0)}" fill="${lb}"/>` + textEl(label, ccx, ty + outTop / 2, 'middle', fs, frame.textColor));
    } else if (layout === 'bottomPill') {
      parts.push(`<rect x="${num(tx)}" y="${num(bottom - pillH / 2)}" width="${num(tw)}" height="${num(pillH)}" rx="${num(pillH / 2)}" fill="${lb}" stroke="${col(frame.bg)}" stroke-width="3"/>` + textEl(label, ccx, bottom, 'middle', fs, frame.textColor));
    } else if (layout === 'bubble') {
      const top = bottom + 12;
      parts.push(`<path d="M${num(ccx - 9)} ${num(top)}L${num(ccx)} ${num(bottom - ft / 2)}L${num(ccx + 9)} ${num(top)}Z" fill="${lb}"/><rect x="${num(tx)}" y="${num(top - 1)}" width="${num(tw)}" height="${num(pillH)}" rx="${num(Math.min(pillH / 2, 20))}" fill="${lb}"/>` + textEl(label, ccx, top - 1 + pillH / 2, 'middle', fs, frame.textColor));
    } else if (layout === 'ribbon') {
      const rw = fw + 28;
      const x0 = fx - 14;
      const y0 = bottom - ribH / 2;
      parts.push(
        `<path d="M${num(x0 + 14)} ${num(y0 + ribH)}L${num(x0 + 14)} ${num(y0 + ribH + 8)}L${num(x0 + 28)} ${num(y0 + ribH)}Z" fill="${lb}" opacity=".65"/>` +
        `<path d="M${num(x0 + rw - 14)} ${num(y0 + ribH)}L${num(x0 + rw - 14)} ${num(y0 + ribH + 8)}L${num(x0 + rw - 28)} ${num(y0 + ribH)}Z" fill="${lb}" opacity=".65"/>` +
        `<path d="M${num(x0)} ${num(y0)}H${num(x0 + rw)}L${num(x0 + rw - 10)} ${num(y0 + ribH / 2)}L${num(x0 + rw)} ${num(y0 + ribH)}H${num(x0)}L${num(x0 + 10)} ${num(y0 + ribH / 2)}Z" fill="${lb}"/>` +
        textEl(label, fx + fw / 2, bottom, 'middle', fitFont(label, lh, fw - 60), frame.textColor),
      );
    }
  }

  const size = pixelSize ? ` width="${pixelSize.width}" height="${pixelSize.height}"` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(W)} ${num(H)}"${size} role="img" aria-label="Decorated QR code"><defs>${defs.join('')}</defs>${parts.join('')}</svg>`;
  return { svg, width: W, height: H, logoCoverage };
}

/** Circle helper re-exported for tests and thumbnails. */
export { circlePath };
