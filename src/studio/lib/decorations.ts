import type { DecorConfig, DecorLayer } from '../types';
import { luminance } from '../../lib/color';
import { FONT, clamp, col, esc, num, textWidth } from './svg';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const star = (cx: number, cy: number, s: number) =>
  `M${num(cx)} ${num(cy - s)}Q${num(cx)} ${num(cy)} ${num(cx + s)} ${num(cy)}Q${num(cx)} ${num(cy)} ${num(cx)} ${num(cy + s)}Q${num(cx)} ${num(cy)} ${num(cx - s)} ${num(cy)}Q${num(cx)} ${num(cy)} ${num(cx)} ${num(cy - s)}Z`;

/**
 * Optional decorative layers. They are drawn only in the margin around the QR border box (the caller draws the QR
 * after them and clips them to the frame), so they can never cover finder patterns, data or the quiet zone.
 */
export function decorations(d: DecorConfig, p: string, area: Rect, box: Rect): { defs: string; body: string } {
  const tb = box.y - area.y;
  const bb = area.y + area.h - (box.y + box.h);
  const lb = box.x - area.x;
  const rb = area.x + area.w - (box.x + box.w);
  const topY = area.y + tb / 2;
  const botY = box.y + box.h + bb / 2;
  const leftX = area.x + lb / 2;
  const rightX = box.x + box.w + rb / 2;
  const midX = box.x + box.w / 2;
  const midY = box.y + box.h / 2;
  const minBand = Math.min(tb, bb, lb, rb);
  const defs: string[] = [];
  const out: string[] = [];
  const g = (l: DecorLayer, inner: string, mode: 'fill' | 'stroke' = 'fill', w = 2) =>
    out.push(`<g opacity="${num(clamp(l.opacity, 0, 100) / 100)}" ${mode === 'fill' ? `fill="${col(l.color)}"` : `fill="none" stroke="${col(l.color)}" stroke-width="${num(w)}" stroke-linecap="round" stroke-linejoin="round"`}>${inner}</g>`);

  if (d.background.enabled) {
    const sp = 8 + d.background.size * 2.6;
    const c = col(d.background.color);
    const shape =
      d.background.type === 'dots' ? `<circle cx="${num(sp / 2)}" cy="${num(sp / 2)}" r="${num(1 + sp * 0.09)}" fill="${c}"/>`
      : d.background.type === 'lines' ? `<path d="M0 ${num(sp)}L${num(sp)} 0" stroke="${c}" stroke-width="1.4" fill="none"/>`
      : d.background.type === 'grid' ? `<path d="M${num(sp)} 0V${num(sp)}M0 ${num(sp)}H${num(sp)}" stroke="${c}" stroke-width="1" fill="none"/>`
      : `<rect width="${num(sp / 2)}" height="${num(sp / 2)}" fill="${c}"/><rect x="${num(sp / 2)}" y="${num(sp / 2)}" width="${num(sp / 2)}" height="${num(sp / 2)}" fill="${c}"/>`;
    defs.push(`<pattern id="${p}pat" patternUnits="userSpaceOnUse" width="${num(sp)}" height="${num(sp)}" x="${num(area.x)}" y="${num(area.y)}">${shape}</pattern>`);
    out.push(`<rect x="${num(area.x)}" y="${num(area.y)}" width="${num(area.w)}" height="${num(area.h)}" fill="url(#${p}pat)" opacity="${num(clamp(d.background.opacity, 0, 100) / 100)}"/>`);
  }

  if (d.shapes.enabled && minBand >= 12) {
    const r = Math.max(2, Math.min(3 + d.shapes.size * 0.9, (minBand - 6) / 2));
    const [x1, x2, y1, y2] = [area.x + lb / 2, area.x + area.w - rb / 2, area.y + tb / 2, area.y + area.h - bb / 2];
    g(d.shapes, `<circle cx="${num(x1)}" cy="${num(y1)}" r="${num(r)}"/><rect x="${num(x2 - r * 0.8)}" y="${num(y1 - r * 0.8)}" width="${num(r * 1.6)}" height="${num(r * 1.6)}" transform="rotate(45 ${num(x2)} ${num(y1)})"/><path d="M${num(x1)} ${num(y2 - r)}L${num(x1 + r)} ${num(y2 + r * 0.8)}L${num(x1 - r)} ${num(y2 + r * 0.8)}Z"/>`);
    g(d.shapes, `<circle cx="${num(x2)}" cy="${num(y2)}" r="${num(r)}"/>`, 'stroke', Math.max(1.5, r * 0.3));
  }

  if (d.ornaments.enabled) {
    const R = Math.min(10 + d.ornaments.size * 2.2, Math.min(tb, lb, bb, rb) - 6);
    if (R >= 10) {
      const corners: [number, number, number, number][] = [
        [area.x + 5, area.y + 5, 1, 1], [area.x + area.w - 5, area.y + 5, -1, 1],
        [area.x + 5, area.y + area.h - 5, 1, -1], [area.x + area.w - 5, area.y + area.h - 5, -1, -1],
      ];
      const one = (x: number, y: number, sx: number, sy: number) =>
        `<g transform="translate(${num(x)} ${num(y)}) scale(${sx} ${sy})"><path d="M${num(R)} 0A${num(R)} ${num(R)} 0 0 1 0 ${num(R)}M${num(R * 0.62)} 0A${num(R * 0.62)} ${num(R * 0.62)} 0 0 1 0 ${num(R * 0.62)}"/><circle cx="${num(R * 0.3)}" cy="${num(R * 0.3)}" r="${num(Math.max(1.4, R * 0.09))}" fill="${col(d.ornaments.color)}" stroke="none"/></g>`;
      g(d.ornaments, corners.map((c) => one(...c)).join(''), 'stroke', 2);
    }
  }

  if (d.lines.enabled && tb >= 16 && bb >= 16) {
    const inset = Math.max(30, Math.min(lb, rb) + 20);
    const seg = (y: number) => {
      const x1 = area.x + inset;
      const x2 = area.x + area.w - inset;
      if (x2 - x1 < 60) return '';
      return `<path d="M${num(x1)} ${num(y)}H${num(midX - 16)}M${num(midX + 16)} ${num(y)}H${num(x2)}"/><path d="M${num(midX)} ${num(y - 4)}L${num(midX + 4)} ${num(y)}L${num(midX)} ${num(y + 4)}L${num(midX - 4)} ${num(y)}Z" fill="${col(d.lines.color)}"/>`;
    };
    g(d.lines, seg(topY) + seg(botY), 'stroke', 1 + d.lines.size * 0.15);
  }

  if (d.sparkles.enabled && minBand >= 14) {
    const s = Math.min(3.5 + d.sparkles.size * 1.3, (minBand - 4) / 2);
    const pts: [number, number, number][] = [
      [area.x + area.w * 0.2, topY, 1], [area.x + area.w * 0.8, topY, 0.65], [area.x + area.w * 0.3, botY, 0.7], [area.x + area.w * 0.72, botY, 1],
      [leftX, box.y + box.h * 0.25, 0.7], [rightX, box.y + box.h * 0.75, 0.9],
    ];
    g(d.sparkles, pts.map(([x, y, k]) => `<path d="${star(x, y, s * k)}"/>`).join(''));
  }

  if (d.pattern.enabled && minBand >= 12) {
    const r = 1.4 + d.pattern.size * 0.18;
    const sp = 9 + d.pattern.size * 0.8;
    const dots: string[] = [];
    for (let x = box.x + 6; x <= box.x + box.w - 6; x += sp) dots.push(`<circle cx="${num(x)}" cy="${num(topY)}" r="${num(r)}"/><circle cx="${num(x)}" cy="${num(botY)}" r="${num(r)}"/>`);
    for (let y = box.y + 6; y <= box.y + box.h - 6; y += sp) dots.push(`<circle cx="${num(leftX)}" cy="${num(y)}" r="${num(r)}"/><circle cx="${num(rightX)}" cy="${num(y)}" r="${num(r)}"/>`);
    g(d.pattern, dots.join(''));
  }

  if (d.indicators.enabled && minBand >= 14) {
    const s = Math.min(5 + d.indicators.size * 1.1, minBand / 2 - 3);
    const chev = (x: number, y: number, dx: number, dy: number) => {
      // points toward the QR code: (dx,dy) is the direction of the arrow tip
      const a = dx === 0 ? [[-s, -dy * s * 0.5], [0, dy * s * 0.5], [s, -dy * s * 0.5]] : [[-dx * s * 0.5, -s], [dx * s * 0.5, 0], [-dx * s * 0.5, s]];
      return `<path d="M${num(x + a[0][0])} ${num(y + a[0][1])}L${num(x + a[1][0])} ${num(y + a[1][1])}L${num(x + a[2][0])} ${num(y + a[2][1])}"/>`;
    };
    g(d.indicators, chev(midX, topY, 0, 1) + chev(midX, botY, 0, -1) + chev(leftX, midY, 1, 0) + chev(rightX, midY, -1, 0), 'stroke', 3);
  }

  if (d.badge.enabled && d.badge.text.trim()) {
    const t = d.badge.text.trim().slice(0, 14);
    const fs = 12 + d.badge.size * 0.6;
    const w = textWidth(t, fs) + 20;
    const h = fs + 12;
    const x = area.x + area.w - w - 6;
    const y = area.y + 6;
    const tc = luminance(col(d.badge.color)) > 0.5 ? '#1b1b1b' : '#ffffff';
    out.push(
      `<g opacity="${num(clamp(d.badge.opacity, 0, 100) / 100)}"><rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" rx="${num(h / 2)}" fill="${col(d.badge.color)}"/>` +
        `<text x="${num(x + w / 2)}" y="${num(y + h / 2)}" dy=".35em" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${num(fs)}" letter-spacing="${num(fs * 0.05)}" fill="${tc}">${esc(t)}</text></g>`,
    );
  }
  return { defs: defs.join(''), body: out.join('') };
}
