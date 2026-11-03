import QRCode from 'qrcode';

export type ECL = 'L' | 'M' | 'Q' | 'H';
export interface QRSettings {
  fg: string;
  bg: string;
  ecl: ECL;
  size: number;
}
export type LogoSource = CanvasImageSource & { width: number; height: number };

export const ECL_INFO: Record<ECL, string> = {
  L: 'L – about 7% recoverable',
  M: 'M – about 15% recoverable',
  Q: 'Q – about 25% recoverable',
  H: 'H – about 30% recoverable',
};
export const LOGO_RATIO = 0.22; // longest logo edge as a share of the QR width

export function describeQRError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (/too big|capacity|overflow/i.test(msg)) {
    return 'This content is too long for a QR code at the selected error correction level. Shorten it or choose a lower level.';
  }
  return 'The QR code could not be generated. Check the content and try again.';
}

export function drawLogo(canvas: HTMLCanvasElement, logo: LogoSource): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  const box = canvas.width * LOGO_RATIO;
  const scale = Math.min(box / logo.width, box / logo.height);
  const w = logo.width * scale;
  const h = logo.height * scale;
  const pad = canvas.width * 0.025;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
  ctx.drawImage(logo, x, y, w, h);
}

export async function renderQR(
  canvas: HTMLCanvasElement,
  text: string,
  s: QRSettings,
  logo?: LogoSource | null,
): Promise<void> {
  await QRCode.toCanvas(canvas, text, {
    errorCorrectionLevel: s.ecl,
    margin: 2,
    width: s.size,
    color: { dark: s.fg, light: s.bg },
  });
  if (logo) drawLogo(canvas, logo);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed.'))), 'image/png');
  });
}
