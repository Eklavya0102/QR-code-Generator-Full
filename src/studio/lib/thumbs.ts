import { PRESETS, presetConfig, type Preset } from '../data/presets';
import type { FrameTemplate } from '../data/frameTemplates';
import { logoById } from '../data/logos';
import { makeDefaultConfig, mergeConfig, type BorderStyle, type CornerStyle, type DeepPartial, type DecorationConfig, type FinderStyle, type ModuleShape } from '../types';
import { createMatrix, type Matrix } from './matrix';
import { buildScene, type SceneLogo } from './scene';

let sample: Matrix | null = null;
const cache = new Map<string, string>();
let counter = 0;

const toUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function render(key: string, cfg: DecorationConfig, fg = '#2f2d28', bg = '#ffffff', logo: SceneLogo = null): string {
  const hit = cache.get(key);
  if (hit) return hit;
  sample ??= createMatrix('QR STUDIO', 'M');
  const url = toUrl(buildScene({ matrix: sample, cfg, fg, bg, logo, idPrefix: `t${counter++}` }).svg);
  cache.set(key, url);
  return url;
}
const base = (patch: DeepPartial<DecorationConfig>) => mergeConfig(makeDefaultConfig(), patch);

/** Static, cached thumbnails drawn by the same renderer as the preview. They show the option, not the user's current colors. */
export const thumbFrame = (t: FrameTemplate) => render(`f:${t.id}`, base({ frame: { enabled: true, templateId: t.id, ...t.values } }));
export const thumbBorder = (s: BorderStyle) => render(`b:${s}`, base({ border: { style: s } }));
export const thumbCorner = (s: CornerStyle) => render(`c:${s}`, base({ corners: { style: s } }));
export const thumbModule = (s: ModuleShape) => render(`m:${s}`, base({ modules: { shape: s } }));
export const thumbFinder = (s: FinderStyle) => render(`fi:${s}`, base({ modules: { finder: s } }));
export function thumbPreset(p: Preset): string {
  const cfg = presetConfig(p);
  const logo: SceneLogo = cfg.logo.source !== 'none' && logoById(cfg.logo.source) ? { kind: 'builtin', id: cfg.logo.source } : null;
  return render(`p:${p.id}`, cfg, p.fg, p.bg, logo);
}
export function thumbLogo(id: string): string {
  const meta = logoById(id);
  if (!meta) return '';
  return toUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="${meta.color}"/>${meta.glyph.replace(/\{c\}/g, '#ffffff')}</svg>`);
}
export { PRESETS };
