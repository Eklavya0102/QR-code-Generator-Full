import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateInput, validateImageFile, sanitizeFilename, MAX_IMAGE_BYTES, detectImageKind } from './validate';
import { assessColors, contrastRatio } from './color';
import { downloadBlob } from './download';
import { describeQRError } from './qr';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];

describe('validateInput', () => {
  it('rejects empty and whitespace-only input', () => {
    expect(validateInput('text', '').ok).toBe(false);
    expect(validateInput('text', '   \n ').ok).toBe(false);
    expect(validateInput('url', '  ').ok).toBe(false);
  });
  it('keeps query strings and fragments exactly', () => {
    const url = 'https://chat.whatsapp.com/AbC123?x=1&y=%20z#frag';
    expect(validateInput('url', `  ${url}  `)).toEqual({ ok: true, value: url });
  });
  it('rejects invalid and unsafe URLs', () => {
    expect(validateInput('url', 'example.com').ok).toBe(false);
    const js = validateInput('url', 'javascript:alert(1)');
    expect(js.ok).toBe(false);
    expect(validateInput('url', 'data:text/html,hi').ok).toBe(false);
  });
  it('rejects very long input', () => {
    expect(validateInput('text', 'a'.repeat(5000)).ok).toBe(false);
  });
});

describe('image validation', () => {
  it('accepts a PNG by magic bytes', async () => {
    expect(await detectImageKind(new Blob([new Uint8Array(PNG)]))).toBe('png');
  });
  it('rejects a file larger than exactly 1 MiB', async () => {
    const ok = new File([new Uint8Array(MAX_IMAGE_BYTES)], 'a.png', { type: 'image/png' });
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'a.png', { type: 'image/png' });
    expect((await validateImageFile(big)).ok).toBe(false);
    // exactly 1 MiB passes the size check (but fails the type check as it is all zeros)
    const r = await validateImageFile(ok);
    expect(r.ok === false && r.error).toMatch(/Unsupported/);
  });
  it('does not trust the extension', async () => {
    const fake = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])], 'logo.png', { type: 'image/png' });
    expect((await validateImageFile(fake)).ok).toBe(false);
  });
});

describe('helpers', () => {
  it('sanitizes file names', () => {
    expect(sanitizeFilename('../../My QR!.png')).toBe('My-QR.png');
    expect(sanitizeFilename('')).toBe('qr-code.png');
    expect(sanitizeFilename('***')).toBe('qr-code.png');
  });
  it('assesses colors', () => {
    expect(assessColors('#ffffff', '#ffffff').blocking).toBeTruthy();
    expect(assessColors('#cccccc', '#ffffff').warnings.length).toBeGreaterThan(0);
    expect(assessColors('#000000', '#ffffff').warnings).toEqual([]);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('maps capacity errors to a friendly message', () => {
    expect(describeQRError(new Error('The amount of data is too big'))).toMatch(/too long/);
  });
});

describe('downloadBlob', () => {
  afterEach(() => vi.useRealTimers());
  it('creates a download link and revokes the URL afterwards', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob(new Blob(['x']), 'a.png', 500);
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });
});
