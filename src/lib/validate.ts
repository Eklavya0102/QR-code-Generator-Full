export type Mode = 'text' | 'url';

export const MAX_TEXT_LENGTH = 1500;
export const MAX_IMAGE_BYTES = 1_048_576; // exactly 1 MiB
export const ALLOWED_URL_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

export type InputResult = { ok: true; value: string } | { ok: false; error: string };

export function validateInput(mode: Mode, raw: string): InputResult {
  if (raw.trim().length === 0) {
    return { ok: false, error: mode === 'url' ? 'Enter a URL.' : 'Enter some text.' };
  }
  if (raw.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Input is ${raw.length} characters. The limit here is ${MAX_TEXT_LENGTH}; QR codes hold less as error correction rises.`,
    };
  }
  if (mode === 'text') return { ok: true, value: raw };

  // Only surrounding whitespace is removed. The URL itself is encoded exactly as typed.
  const value = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: 'Enter a full URL that starts with a scheme, such as https://example.com.' };
  }
  if (!ALLOWED_URL_SCHEMES.includes(parsed.protocol)) {
    return {
      ok: false,
      error: `The ${parsed.protocol} scheme is not supported. Use http, https, mailto or tel, or switch to Text mode.`,
    };
  }
  if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && !parsed.hostname) {
    return { ok: false, error: 'The URL is missing a host name.' };
  }
  return { ok: true, value };
}

export type ImageKind = 'png' | 'jpeg' | 'webp';

function readHead(file: Blob, length = 12): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, length));
  });
}

/** Detects the real image type from magic bytes instead of trusting the file name. */
export async function detectImageKind(file: Blob): Promise<ImageKind | null> {
  const b = await readHead(file);
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}

export type FileResult = { ok: true } | { ok: false; error: string };

export async function validateImageFile(file: File): Promise<FileResult> {
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'This image is larger than 1 MiB (1,048,576 bytes). Choose a smaller file.' };
  }
  if (file.size === 0) return { ok: false, error: 'This file is empty.' };
  try {
    if (!(await detectImageKind(file))) {
      return { ok: false, error: 'Unsupported file. Use a PNG, JPEG or WebP image.' };
    }
  } catch {
    return { ok: false, error: 'This file could not be read.' };
  }
  return { ok: true };
}

export function sanitizeFilename(input: string, fallback = 'qr-code'): string {
  const base = input
    .trim()
    .replace(/\.png$/i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 60);
  return `${base || fallback}.png`;
}
