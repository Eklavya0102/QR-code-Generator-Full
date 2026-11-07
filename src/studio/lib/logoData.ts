/** Downscales an uploaded logo into a PNG data URL so it can be embedded in the SVG scene (and exported with it). */
export function logoToDataUrl(img: HTMLImageElement, max = 320): string {
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * k));
  canvas.height = Math.max(1, Math.round(img.height * k));
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}
