export type DecodeStatus = 'ok' | 'mismatch' | 'fail';
export interface DecodeResult {
  status: DecodeStatus;
  decoded?: string;
}

/**
 * Tries to read the rendered design back with a QR decoder (jsQR, loaded on demand). The canvas must be opaque,
 * because transparent pixels read as black. A pass is a good sign, not a guarantee: always test with a phone.
 */
export async function decodeCanvas(canvas: HTMLCanvasElement, expected: string): Promise<DecodeResult> {
  const { default: jsQR } = await import('jsqr');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { status: 'fail' };
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hit = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
  if (!hit) return { status: 'fail' };
  return { status: hit.data === expected ? 'ok' : 'mismatch', decoded: hit.data };
}
