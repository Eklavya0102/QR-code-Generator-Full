export function isHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export interface ColorAssessment {
  blocking: string | null;
  warnings: string[];
}

export function assessColors(fg: string, bg: string): ColorAssessment {
  if (!isHexColor(fg) || !isHexColor(bg)) return { blocking: 'Choose valid colors.', warnings: [] };
  if (fg.toLowerCase() === bg.toLowerCase()) {
    return { blocking: 'Foreground and background are the same color, so the code would be blank.', warnings: [] };
  }
  const warnings: string[] = [];
  const ratio = contrastRatio(fg, bg);
  if (ratio < 3) warnings.push(`Contrast is low (${ratio.toFixed(1)}:1). Many scanners will struggle; aim for 4:1 or more.`);
  if (luminance(fg) > luminance(bg)) warnings.push('Light modules on a dark background (inverted). Some scanners cannot read inverted codes.');
  return { blocking: null, warnings };
}
