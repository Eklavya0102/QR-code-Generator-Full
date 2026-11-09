export type DecodeStatus = 'ok' | 'mismatch' | 'fail';
export type ZxingStatus = DecodeStatus | 'unavailable';
export interface DecodeResult {
  status: DecodeStatus;
  decoded?: string;
}
export interface DualDecode {
  jsqr: DecodeResult;
  zxing: { status: ZxingStatus; decoded?: string };
}
export type Verdict = 'ok' | 'partial' | 'fail';

const classify = (decoded: string | undefined, expected: string): DecodeResult =>
  decoded === undefined ? { status: 'fail' } : { status: decoded === expected ? 'ok' : 'mismatch', decoded };

/**
 * Reads the rendered design back with jsQR (loaded on demand). The canvas must be opaque, because transparent pixels
 * read as black. A pass is a good sign, not a guarantee: always test with a phone.
 */
export async function decodeCanvas(canvas: HTMLCanvasElement, expected: string): Promise<DecodeResult> {
  const { default: jsQR } = await import('jsqr');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { status: 'fail' };
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hit = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
  return classify(hit?.data, expected);
}

/** Second opinion from ZXing, a separate implementation with different detection and binarising code. */
export async function decodeZxing(canvas: HTMLCanvasElement, expected: string): Promise<DualDecode['zxing']> {
  try {
    // Deep imports keep the lazy chunk to the QR reader instead of every barcode format in the package.
    const [{ default: QRCodeReader }, { default: BinaryBitmap }, { default: HybridBinarizer }, { default: DecodeHintType }, { default: BarcodeFormat }, { HTMLCanvasElementLuminanceSource: CanvasSource }] = await Promise.all([
      import('@zxing/library/esm/core/qrcode/QRCodeReader'),
      import('@zxing/library/esm/core/BinaryBitmap'),
      import('@zxing/library/esm/core/common/HybridBinarizer'),
      import('@zxing/library/esm/core/DecodeHintType'),
      import('@zxing/library/esm/core/BarcodeFormat'),
      import('@zxing/library/esm/browser/HTMLCanvasElementLuminanceSource'),
    ]);
    const reader = new QRCodeReader();
    const hints = new Map<number, unknown>([[DecodeHintType.TRY_HARDER, true], [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]]]);
    const source = new CanvasSource(canvas);
    for (const src of [source, source.invert()]) {
      try {
        const result = reader.decode(new BinaryBitmap(new HybridBinarizer(src)), hints as Map<never, never>);
        return classify(result.getText(), expected);
      } catch {
        // not found with this polarity; try the other
      }
    }
    return { status: 'fail' };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function decodeBoth(canvas: HTMLCanvasElement, expected: string): Promise<DualDecode> {
  const [jsqr, zxing] = await Promise.all([decodeCanvas(canvas, expected), decodeZxing(canvas, expected)]);
  return { jsqr, zxing };
}

/** ok: every available decoder read it; partial: some did; fail: none did. */
export function verdict(d: DualDecode): Verdict {
  const results = [d.jsqr.status, d.zxing.status].filter((s) => s !== 'unavailable');
  const ok = results.filter((s) => s === 'ok').length;
  return ok === results.length ? 'ok' : ok > 0 ? 'partial' : 'fail';
}
