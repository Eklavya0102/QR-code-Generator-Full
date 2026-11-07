import { describe, expect, it } from 'vitest';
import { FRAME_CATEGORIES, FRAME_TEMPLATES } from './data/frameTemplates';
import { BUILT_IN_LOGOS } from './data/logos';
import { PRESETS, presetConfig } from './data/presets';
import { analyze } from './lib/analyze';
import { jpegToPdf, exportDims } from './lib/export';
import { createMatrix, isFinderCell } from './lib/matrix';
import { buildScene } from './lib/scene';
import { makeDefaultConfig, mergeConfig, type BorderStyle, type CornerStyle, type FinderStyle, type ModuleShape } from './types';

const matrix = createMatrix('https://example.com/studio?x=1', 'M');
const cfg = (patch = {}) => mergeConfig(makeDefaultConfig(), patch);
const scene = (patch = {}, extra: Partial<Parameters<typeof buildScene>[0]> = {}) => buildScene({ matrix, cfg: cfg(patch), fg: '#1f2a1f', bg: '#ffffff', ...extra });
const isXml = (svg: string) => !new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror');
const darkDataCells = (() => {
  let n = 0;
  for (let r = 0; r < matrix.size; r++) for (let c = 0; c < matrix.size; c++) if (matrix.get(r, c) && !isFinderCell(r, c, matrix.size)) n++;
  return n;
})();
const modulePath = (svg: string) => /<path d="([^"]*)" fill="[^"]*"\/><path d="[^"]*" fill-rule="evenodd"/.exec(svg)?.[1] ?? '';

describe('QR data is never altered by decoration', () => {
  const shapes: ModuleShape[] = ['square', 'rounded', 'circle', 'dots', 'extraRounded', 'diamond', 'vertical', 'horizontal'];
  it.each(shapes)('%s draws exactly one subpath per dark data module', (shape) => {
    const d = modulePath(scene({ modules: { shape } }).svg);
    expect(d.split('M').length - 1).toBe(darkDataCells);
  });
  it('draws all three finder patterns for every finder style', () => {
    for (const finder of ['square', 'rounded', 'circular', 'doubleRounded', 'modern', 'custom'] as FinderStyle[]) {
      const svg = scene({ modules: { finder } }).svg;
      const ring = /d="([^"]*)" fill-rule="evenodd"/.exec(svg)?.[1] ?? '';
      expect(ring.split('M').length - 1).toBe(6); // 3 rings x (outer + hole)
    }
  });
  it('matches the generator matrix (finder rows are fixed by the QR standard)', () => {
    expect([0, 1, 2, 3, 4, 5, 6].every((i) => matrix.get(0, i) && matrix.get(6, i))).toBe(true);
  });
});

describe('every option renders valid, finite SVG', () => {
  const borders: BorderStyle[] = ['solid', 'double', 'dashed', 'dotted', 'gradient', 'rounded', 'shadow', 'decorative', 'neon', 'minimal'];
  const corners: CornerStyle[] = ['square', 'rounded', 'circular', 'extraRounded', 'brackets', 'doubleLine', 'accents', 'gradient', 'minimal'];
  it('has 8 frame categories with several templates each', () => {
    expect(FRAME_CATEGORIES).toHaveLength(8);
    for (const c of FRAME_CATEGORIES) expect(FRAME_TEMPLATES.filter((t) => t.category === c.id).length).toBeGreaterThanOrEqual(3);
  });
  it.each(FRAME_TEMPLATES.map((t) => [t.id, t] as const))('frame template %s', (_id, t) => {
    const r = scene({ frame: { enabled: true, templateId: t.id, ...t.values } });
    expect(r.svg).not.toMatch(/NaN|undefined|Infinity/);
    expect(isXml(r.svg)).toBe(true);
  });
  it.each(borders)('border %s', (style) => expect(isXml(scene({ border: { style } }).svg)).toBe(true));
  it.each(corners)('corner %s', (style) => expect(isXml(scene({ corners: { style } }).svg)).toBe(true));
  it('every decoration layer together', () => {
    const on = { enabled: true };
    const r = scene({ frame: { enabled: true }, decor: { shapes: on, ornaments: on, lines: on, sparkles: on, pattern: on, indicators: on, badge: on, background: on } });
    expect(r.svg).not.toMatch(/NaN|undefined|Infinity/);
    expect(isXml(r.svg)).toBe(true);
  });
  it('gradients: linear, radial and multi-stop', () => {
    expect(scene({ gradient: { enabled: true, type: 'linear' } }).svg).toContain('<linearGradient');
    expect(scene({ gradient: { enabled: true, type: 'radial' } }).svg).toContain('<radialGradient');
    const stops = [{ offset: 0, color: '#111111' }, { offset: 50, color: '#222222' }, { offset: 100, color: '#333333' }];
    expect((scene({ gradient: { enabled: true, stops } }).svg.match(/<stop /g) ?? []).length).toBe(3);
  });
  it('built-in logos render and report coverage', () => {
    for (const l of BUILT_IN_LOGOS) {
      const r = scene({ logo: { source: l.id, bg: l.color } }, { logo: { kind: 'builtin', id: l.id } });
      expect(isXml(r.svg)).toBe(true);
      expect(r.logoCoverage).toBeGreaterThan(0);
    }
  });
});

describe('layout keeps decorations inside the canvas and the QR clear', () => {
  it('grows the canvas for labels, shadows and ribbons instead of clipping', () => {
    const plain = scene();
    const ribbon = scene({ frame: { enabled: true, layout: 'ribbon', text: 'SCAN ME', shadow: 80 } });
    expect(ribbon.height).toBeGreaterThan(plain.height);
    expect(ribbon.width).toBeGreaterThan(plain.width);
  });
  it('adds frame padding when decorations are enabled', () => {
    expect(scene({ decor: { sparkles: { enabled: true } } }).width).toBeGreaterThan(scene().width);
  });
  it('keeps the requested quiet zone', () => {
    const w2 = scene({ modules: { quietZone: 2 } }).width;
    const w8 = scene({ modules: { quietZone: 8 } }).width;
    expect(w8 - w2).toBe(6 * 2 * 10);
  });
  it('transparent mode drops background fills', () => {
    expect(scene({}, { transparent: true }).svg).not.toContain('fill="#ffffff"');
  });
});

describe('safety of user-controlled text and colors', () => {
  it('escapes frame and badge text', () => {
    const r = scene({ frame: { enabled: true, layout: 'bottomBar', text: '<script>alert(1)</script>&"' }, decor: { badge: { enabled: true, text: '<b>' } } });
    expect(r.svg).not.toContain('<script');
    expect(r.svg).toContain('&lt;script&gt;');
    expect(isXml(r.svg)).toBe(true);
  });
  it('rejects non-hex colors', () => {
    const r = scene({ frame: { enabled: true, borderColor: 'red" onload="x' as string } });
    expect(r.svg).not.toContain('onload');
  });
});

describe('presets', () => {
  it('provides 15 presets that all build', () => {
    expect(PRESETS).toHaveLength(15);
    for (const p of PRESETS) {
      const c = presetConfig(p);
      const logo = c.logo.source !== 'none' ? ({ kind: 'builtin', id: c.logo.source } as const) : null;
      const r = buildScene({ matrix, cfg: c, fg: p.fg, bg: p.bg, logo });
      expect(isXml(r.svg)).toBe(true);
    }
  });
  it('a preset can be modified afterwards without touching the defaults', () => {
    const c = presetConfig(PRESETS[0]);
    const edited = { ...c, frame: { ...c.frame, text: 'CHANGED' } };
    expect(makeDefaultConfig().frame.text).toBe('SCAN ME');
    expect(edited.frame.text).toBe('CHANGED');
  });
});

describe('scannability advice', () => {
  const base = makeDefaultConfig();
  it('flags low contrast and inverted colors', () => {
    expect(analyze(base, '#cccccc', '#ffffff', 'M', 0, false, false).some((a) => a.level === 'error')).toBe(true);
    expect(analyze(base, '#ffffff', '#000000', 'M', 0, false, false).some((a) => /inverted/i.test(a.text))).toBe(true);
  });
  it('checks every gradient stop', () => {
    const g = { ...base, gradient: { ...base.gradient, enabled: true, stops: [{ offset: 0, color: '#000000' }, { offset: 100, color: '#eeeeee' }] } };
    expect(analyze(g, '#000000', '#ffffff', 'M', 0, false, false).some((a) => a.level === 'error')).toBe(true);
  });
  it('flags a logo that is too large for the error correction level', () => {
    expect(analyze(base, '#000000', '#ffffff', 'M', 0.2, true, false).some((a) => a.level === 'error')).toBe(true);
    expect(analyze(base, '#000000', '#ffffff', 'H', 0.05, true, false).some((a) => a.level === 'error')).toBe(false);
  });
  it('is quiet for a plain, high-contrast code', () => {
    expect(analyze(base, '#111111', '#ffffff', 'M', 0, false, false)).toHaveLength(0);
  });
});

describe('export helpers', () => {
  it('keeps the aspect ratio for the requested longest side', () => {
    expect(exportDims(400, 500, 1000)).toEqual({ width: 800, height: 1000 });
  });
  it('writes a structurally valid PDF with correct xref offsets', async () => {
    const blob = jpegToPdf(new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]), 100, 150);
    // read as a binary string so byte offsets match the xref table (jsdom's Blob has no stream())
    const text = await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.readAsBinaryString(blob);
    });
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    const start = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(start, start + 4)).toBe('xref');
    const offsets = [...text.matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => expect(text.slice(o, o + 6)).toBe(`${i + 1} 0 ob`));
  });
});
