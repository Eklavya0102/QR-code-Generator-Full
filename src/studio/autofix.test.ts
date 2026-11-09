import { describe, expect, it } from 'vitest';
import { contrastRatio, luminance } from '../lib/color';
import { autofix, shade, FIX_STEPS, type Evaluation, type FixContext, type FixState } from './lib/autofix';
import { verdict, type DualDecode } from './lib/decode';
import { createMatrix } from './lib/matrix';
import { makeDefaultConfig, mergeConfig, type DeepPartial, type DecorationConfig } from './types';

const ctx: FixContext = { matrix: (ecl) => createMatrix('https://example.com/studio', ecl), logo: { kind: 'builtin', id: 'whatsapp' } };
const state = (patch: DeepPartial<DecorationConfig> = {}, over: Partial<FixState> = {}): FixState => ({
  cfg: mergeConfig(makeDefaultConfig(), patch), fg: '#1f2a1f', bg: '#ffffff', ecl: 'M', ...over,
});
const ev = (pass: boolean, score = pass ? 20 : 0): Evaluation => ({ pass, score });
const run = (start: FixState, ok: (s: FixState) => boolean) => autofix(start, ctx, async (s) => ev(ok(s)));

describe('autofix', () => {
  it('leaves a design that already passes untouched', async () => {
    const start = state();
    const r = await run(start, () => true);
    expect(r.outcome).toBe('already-ok');
    expect(r.state).toBe(start);
    expect(r.applied).toEqual([]);
  });

  it('changes only what is needed (contrast) and stops at the first pass', async () => {
    const start = state({ modules: { shape: 'circle', finder: 'modern' }, gradient: { enabled: false } }, { fg: '#cccccc' });
    const r = await run(start, (s) => contrastRatio(s.fg, s.bg) >= 4.5);
    expect(r.outcome).toBe('fixed');
    expect(r.applied).toHaveLength(1);
    expect(r.state.cfg.modules.shape).toBe('circle'); // later steps never ran
    expect(r.state.cfg.modules.finder).toBe('modern');
  });

  it('un-inverts light-on-dark colors', async () => {
    const r = await run(state({}, { fg: '#ffffff', bg: '#000000' }), (s) => luminance(s.fg) < luminance(s.bg) && contrastRatio(s.fg, s.bg) >= 4.5);
    expect(r.outcome).toBe('fixed');
  });

  it('lightens a mid-grey background when darkening the foreground is not enough', async () => {
    // black on #555555 is only ~2.8:1, so the background has to get lighter too
    const r = await run(state({}, { fg: '#222222', bg: '#555555' }), (s) => contrastRatio(s.fg, s.bg) >= 4.5);
    expect(r.outcome).toBe('fixed');
    expect(luminance(r.state.bg)).toBeGreaterThan(luminance('#555555'));
  });

  it('raises error correction for a logo, then shrinks it', async () => {
    const start = state({ logo: { source: 'whatsapp', size: 40 } });
    const r = await run(start, (s) => s.ecl === 'H' && s.cfg.logo.size < 40);
    expect(r.outcome).toBe('fixed');
    expect(r.state.ecl).toBe('H');
    expect(r.state.cfg.logo.size).toBeLessThan(40);
    expect(r.state.cfg.logo.source).toBe('whatsapp'); // never removed
  });

  it('moves an off-center logo to the center', async () => {
    const r = await run(state({ logo: { source: 'whatsapp', position: 'bottomRight' } }, { ecl: 'H' }), (s) => s.cfg.logo.position === 'center');
    expect(r.outcome).toBe('fixed');
  });

  it('walks shape fixes in order: weak shapes become rounded before plain squares', async () => {
    const r1 = await run(state({ modules: { shape: 'dots' } }), (s) => s.cfg.modules.shape === 'rounded');
    expect(r1.outcome).toBe('fixed');
    const r2 = await run(state({ modules: { shape: 'dots' } }), (s) => s.cfg.modules.shape === 'square');
    expect(r2.outcome).toBe('fixed');
    expect(r2.applied).toHaveLength(2);
  });

  it('replaces a gradient with its darkest stop', async () => {
    const stops = [{ offset: 0, color: '#0f766e' }, { offset: 100, color: '#5b21b6' }];
    const r = await run(state({ gradient: { enabled: true, stops } }), (s) => !s.cfg.gradient.enabled);
    expect(r.outcome).toBe('fixed');
    expect(luminance(r.state.fg)).toBeLessThanOrEqual(Math.min(luminance('#0f766e'), luminance('#5b21b6')) + 1e-9);
  });

  it('keeps the logo, frame text and decorations even when it has to strip the border', async () => {
    const start = state({
      frame: { enabled: true, text: 'SCAN ME' }, border: { style: 'neon' }, corners: { style: 'brackets' },
      decor: { sparkles: { enabled: true } }, logo: { source: 'whatsapp' },
    }, { ecl: 'H' });
    const r = await run(start, (s) => s.cfg.border.style === 'none');
    expect(r.outcome).toBe('fixed');
    expect(r.state.cfg.frame.enabled).toBe(true);
    expect(r.state.cfg.frame.text).toBe('SCAN ME');
    expect(r.state.cfg.decor.sparkles.enabled).toBe(true);
    expect(r.state.cfg.logo.source).toBe('whatsapp');
  });

  it('returns the original, unchanged, when nothing helps', async () => {
    const start = state({ modules: { shape: 'dots', finder: 'modern' } }, { fg: '#cccccc' });
    const r = await run(start, () => false);
    expect(r.outcome).toBe('unfixed');
    expect(r.state).toBe(start);
    expect(r.applied).toEqual([]);
  });

  it('keeps the best partial improvement', async () => {
    const start = state({ modules: { shape: 'dots' } });
    const r = await autofix(start, ctx, async (s) => ({ pass: false, score: s.cfg.modules.shape === 'dots' ? 0 : 10 }));
    expect(r.outcome).toBe('improved');
    expect(r.state.cfg.modules.shape).toBe('rounded');
    expect(r.applied).toEqual([FIX_STEPS.find((s) => s.id === 'shape')!.label]);
  });

  it('does not mutate the starting state', async () => {
    const start = state({ modules: { shape: 'dots' }, gradient: { enabled: true } });
    const snapshot = JSON.stringify(start);
    await run(start, () => false);
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});

describe('shade', () => {
  it('darkens toward black and lightens toward white', () => {
    expect(shade('#808080', 1)).toBe('#000000');
    expect(shade('#808080', -1)).toBe('#ffffff');
    expect(luminance(shade('#3366cc', 0.3))).toBeLessThan(luminance('#3366cc'));
  });
});

describe('two-decoder verdict', () => {
  const d = (a: DualDecode['jsqr']['status'], b: DualDecode['zxing']['status']): DualDecode => ({ jsqr: { status: a }, zxing: { status: b } });
  it('is ok only when every available decoder reads the code', () => {
    expect(verdict(d('ok', 'ok'))).toBe('ok');
    expect(verdict(d('ok', 'unavailable'))).toBe('ok');
  });
  it('is partial when decoders disagree', () => {
    expect(verdict(d('ok', 'fail'))).toBe('partial');
    expect(verdict(d('fail', 'ok'))).toBe('partial');
  });
  it('treats wrong data as a failure, not a pass', () => {
    expect(verdict(d('mismatch', 'mismatch'))).toBe('fail');
    expect(verdict(d('fail', 'fail'))).toBe('fail');
    expect(verdict(d('ok', 'mismatch'))).toBe('partial');
  });
});
