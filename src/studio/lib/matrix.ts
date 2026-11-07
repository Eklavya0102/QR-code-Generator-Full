import QRCode from 'qrcode';
import type { ECL } from '../../lib/qr';

export interface Matrix {
  size: number;
  get(row: number, col: number): boolean;
}

/** The real QR data matrix from the same library the generator uses. Decoration never edits it. */
export function createMatrix(text: string, ecl: ECL): Matrix {
  const m = QRCode.create(text, { errorCorrectionLevel: ecl }).modules;
  return { size: m.size, get: (r, c) => r >= 0 && c >= 0 && r < m.size && c < m.size && Boolean(m.get(r, c)) };
}

export const isFinderCell = (r: number, c: number, n: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
export const finderOrigins = (n: number): [number, number][] => [[0, 0], [0, n - 7], [n - 7, 0]];
