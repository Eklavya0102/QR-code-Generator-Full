import { buildScene, type SceneInput } from './scene';

export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf';
export const EXPORT_FORMATS: { id: ExportFormat; label: string; ext: string }[] = [
  { id: 'png', label: 'PNG', ext: 'png' },
  { id: 'svg', label: 'SVG', ext: 'svg' },
  { id: 'jpeg', label: 'JPEG', ext: 'jpg' },
  { id: 'pdf', label: 'PDF', ext: 'pdf' },
];
export const MIN_EXPORT = 256;
export const MAX_EXPORT = 4096;

/** Pixel size for an export whose longest side is `longSide`, keeping the scene's aspect ratio. */
export function exportDims(sceneW: number, sceneH: number, longSide: number) {
  const k = longSide / Math.max(sceneW, sceneH);
  return { width: Math.max(1, Math.round(sceneW * k)), height: Math.max(1, Math.round(sceneH * k)) };
}

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The design could not be rendered to an image.'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** Rasterises the exact same SVG the preview shows. `fill` paints an opaque backdrop (JPEG/PDF/validation). */
export async function renderToCanvas(input: SceneInput, longSide: number, fill: string | null): Promise<HTMLCanvasElement> {
  const base = buildScene(input);
  const { width, height } = exportDims(base.width, base.height, longSide);
  const { svg } = buildScene({ ...input, pixelSize: { width, height } });
  const img = await loadSvg(svg);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The image could not be created. Try a smaller export size.'))), type, quality);
  });
}

/** Minimal single-page PDF that embeds a JPEG. Written by hand to avoid a PDF dependency. */
export function jpegToPdf(jpeg: Uint8Array, width: number, height: number): Blob {
  const pageW = 420;
  const pageH = Math.round(((pageW * height) / width) * 100) / 100;
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (b: string | Uint8Array) => {
    const u = typeof b === 'string' ? enc.encode(b) : b;
    chunks.push(u);
    len += u.length;
  };
  const obj = (n: number, body: string, stream?: Uint8Array) => {
    offsets[n] = len;
    push(`${n} 0 obj\n${body}`);
    if (stream) {
      push('\nstream\n');
      push(stream);
      push('\nendstream');
    }
    push('\nendobj\n');
  };
  push('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
  const content = enc.encode(`q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`);
  obj(5, `<< /Length ${content.length} >>`, content);
  const xref = len;
  let table = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) table += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  push(`${table}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

export async function exportScene(input: SceneInput, format: ExportFormat, longSide: number): Promise<Blob> {
  const side = Math.min(MAX_EXPORT, Math.max(MIN_EXPORT, Math.round(longSide)));
  if (format === 'svg') {
    const base = buildScene(input);
    const { width, height } = exportDims(base.width, base.height, side);
    return new Blob([buildScene({ ...input, pixelSize: { width, height } }).svg], { type: 'image/svg+xml' });
  }
  if (format === 'png') return toBlob(await renderToCanvas(input, side, null), 'image/png');
  const canvas = await renderToCanvas(input, side, '#ffffff'); // JPEG and PDF have no transparency
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.95);
  if (format === 'jpeg') return jpeg;
  return jpegToPdf(new Uint8Array(await jpeg.arrayBuffer()), canvas.width, canvas.height);
}
