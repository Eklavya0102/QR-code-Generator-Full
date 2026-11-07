/** Small SVG string helpers shared by the scene builder. All user text goes through esc(); colors through col(). */
export const num = (n: number) => String(Math.round(n * 100) / 100);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
export const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);
export const col = (v: string) => (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : '#000000');
export const FONT = 'Helvetica, Arial, sans-serif';

export function textEl(txt: string, x: number, y: number, anchor: 'start' | 'middle' | 'end', size: number, color: string): string {
  return `<text x="${num(x)}" y="${num(y)}" dy=".35em" text-anchor="${anchor}" font-family="${FONT}" font-weight="700" font-size="${num(size)}" letter-spacing="${num(size * 0.05)}" fill="${col(color)}">${esc(txt)}</text>`;
}
/** Rough text width used to size labels and fit them into the available space. */
export const textWidth = (txt: string, size: number) => txt.length * size * 0.72;
export const fitFont = (txt: string, size: number, maxW: number) => Math.max(8, Math.min(size, maxW / Math.max(1, txt.length * 0.72)));

export interface Stop {
  offset: number;
  color: string;
}
export function gradientDef(id: string, type: 'linear' | 'radial', angle: number, stops: Stop[], x: number, y: number, w: number, h: number): string {
  const sorted = [...stops].sort((a, b) => a.offset - b.offset);
  const list = sorted.length >= 2 ? sorted : [{ offset: 0, color: sorted[0]?.color ?? '#000000' }, { offset: 100, color: sorted[0]?.color ?? '#000000' }];
  const s = list.map((t) => `<stop offset="${num(clamp(t.offset, 0, 100))}%" stop-color="${col(t.color)}"/>`).join('');
  const cx = x + w / 2;
  const cy = y + h / 2;
  if (type === 'radial') return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${num(cx)}" cy="${num(cy)}" r="${num(Math.max(w, h) * 0.72)}">${s}</radialGradient>`;
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const len = (w * Math.abs(dx) + h * Math.abs(dy)) / 2;
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(cx - dx * len)}" y1="${num(cy - dy * len)}" x2="${num(cx + dx * len)}" y2="${num(cy + dy * len)}">${s}</linearGradient>`;
}
