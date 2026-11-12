import type { Logo } from '../hooks/useLogo';
import { createMatrix, type Matrix } from '../studio/lib/matrix';
import { logoToDataUrl } from '../studio/lib/logoData';
import type { ContentMode } from './payloads';
import type { ECL } from './qr';

/**
 * The original QR code produced by the Generator (step 1) and handed to the Decorator (step 2).
 * It is a frozen snapshot: decorating never edits it, and the Decorator never creates QR data of its own.
 */
export interface GeneratedQR {
  /** Increases with every generation, so the Decorator can tell a new QR from a re-render. */
  id: number;
  payload: string;
  mode: ContentMode;
  ecl: ECL;
  fg: string;
  bg: string;
  /** Output size chosen in the Generator; the Decorator's default export size. */
  size: number;
  filename: string;
  /** The Generator's input at the time, to notice when the Generator has since moved on. */
  signature: string;
  /** The QR's module matrix, created once by the Generator. */
  matrix: Matrix;
  /** The logo applied in the Generator, as an embeddable image. */
  logo: { href: string; aspect: number; name: string } | null;
  /** Small picture of the original code, for reference. */
  originalUrl: string;
}

export function thumbnailFromCanvas(canvas: HTMLCanvasElement, side = 192): string {
  const out = document.createElement('canvas');
  out.width = side;
  out.height = side;
  out.getContext('2d')?.drawImage(canvas, 0, 0, side, side);
  return out.toDataURL('image/png');
}

export function makeGenerated(a: {
  id: number;
  payload: string;
  mode: ContentMode;
  ecl: ECL;
  fg: string;
  bg: string;
  size: number;
  filename: string;
  signature: string;
  logo: Logo | null;
  canvas: HTMLCanvasElement;
}): GeneratedQR {
  return {
    id: a.id,
    payload: a.payload,
    mode: a.mode,
    ecl: a.ecl,
    fg: a.fg,
    bg: a.bg,
    size: a.size,
    filename: a.filename,
    signature: a.signature,
    matrix: createMatrix(a.payload, a.ecl),
    logo: a.logo ? { href: logoToDataUrl(a.logo.img), aspect: a.logo.img.width / a.logo.img.height, name: a.logo.name } : null,
    originalUrl: thumbnailFromCanvas(a.canvas),
  };
}
