// @vitest-environment node
import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';

// Exercises the same library and options renderQR uses, without needing a canvas.
describe('qrcode library', () => {
  it('produces a valid PNG with custom colors', async () => {
    const buf = await QRCode.toBuffer('https://example.com/?a=1#b', {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 512,
      color: { dark: '#647c64', light: '#ffffff' },
    });
    expect([...buf.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });
  it('throws when content exceeds capacity', () => {
    expect(() => QRCode.create('a'.repeat(5000), { errorCorrectionLevel: 'H' })).toThrow();
  });
});
