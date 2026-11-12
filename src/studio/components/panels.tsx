import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ImageUpload } from '../../components/ImageUpload';
import type { Logo } from '../../hooks/useLogo';
import { contrastRatio } from '../../lib/color';
import { ECL_INFO, type ECL } from '../../lib/qr';
import { FRAME_CATEGORIES, FRAME_TEMPLATES } from '../data/frameTemplates';
import { BUILT_IN_LOGOS } from '../data/logos';
import { PRESETS, type Preset } from '../data/presets';
import type { DecorationStore } from '../hooks/useDecoration';
import { thumbBorder, thumbCorner, thumbFinder, thumbFrame, thumbLogo, thumbModule, thumbPreset } from '../lib/thumbs';
import {
  FRAME_LABELS, type BorderStyle, type CornerStyle, type DecorConfig, type DecorLayer, type FinderStyle, type FrameCategory, type LabelLayout, type ModuleShape, type PatternType,
} from '../types';
import { ColorField, Notes, SectionHead, SelectField, Segmented, Slider, TextField, Tile, Toggle } from './controls';

type P = Pick<DecorationStore, 'cfg' | 'update' | 'reset'>;

const MODULE_SHAPES: { id: ModuleShape; label: string }[] = [
  { id: 'square', label: 'Square' }, { id: 'rounded', label: 'Rounded' }, { id: 'circle', label: 'Circle' }, { id: 'dots', label: 'Dots' },
  { id: 'extraRounded', label: 'Extra rounded' }, { id: 'diamond', label: 'Diamond' }, { id: 'vertical', label: 'Vertical' }, { id: 'horizontal', label: 'Horizontal' },
];
const FINDERS: { id: FinderStyle; label: string }[] = [
  { id: 'square', label: 'Square' }, { id: 'rounded', label: 'Rounded' }, { id: 'circular', label: 'Circular' },
  { id: 'doubleRounded', label: 'Double rounded' }, { id: 'modern', label: 'Modern' }, { id: 'custom', label: 'Custom color' },
];
const BORDERS: { id: BorderStyle; label: string }[] = [
  { id: 'none', label: 'None' }, { id: 'solid', label: 'Solid' }, { id: 'double', label: 'Double' }, { id: 'dashed', label: 'Dashed' }, { id: 'dotted', label: 'Dotted' },
  { id: 'gradient', label: 'Gradient' }, { id: 'rounded', label: 'Rounded' }, { id: 'shadow', label: 'Shadow' }, { id: 'decorative', label: 'Decorative' }, { id: 'neon', label: 'Neon' }, { id: 'minimal', label: 'Minimal' },
];
const CORNERS: { id: CornerStyle; label: string }[] = [
  { id: 'square', label: 'Square' }, { id: 'rounded', label: 'Rounded' }, { id: 'circular', label: 'Circular' }, { id: 'extraRounded', label: 'Extra rounded' },
  { id: 'brackets', label: 'Brackets' }, { id: 'doubleLine', label: 'Double line' }, { id: 'accents', label: 'Accents' }, { id: 'gradient', label: 'Gradient' }, { id: 'minimal', label: 'Minimal outline' },
];
const LAYOUTS: { value: LabelLayout; label: string }[] = [
  { value: 'none', label: 'No label' }, { value: 'bottomBar', label: 'Bottom bar' }, { value: 'topBar', label: 'Top bar' }, { value: 'dualBar', label: 'Top and bottom bars' },
  { value: 'bottomPill', label: 'Pill on edge' }, { value: 'topTab', label: 'Top tab' }, { value: 'bubble', label: 'Speech bubble' }, { value: 'ribbon', label: 'Ribbon' },
];

export function TemplatesPanel({ activeId, onApply, onResetAll }: { activeId: string | null; onApply: (p: Preset) => void; onResetAll: () => void }) {
  return (
    <>
      <SectionHead title="Templates" onReset={onResetAll} resetLabel="Reset all" />
      <Notes>Pick a starting point. A template sets colors, frame, modules and logo, and you can change anything afterwards.</Notes>
      <div className="tiles preset-tiles">
        {PRESETS.map((p) => (
          <Tile key={p.id} selected={activeId === p.id} label={p.name} src={thumbPreset(p)} onClick={() => onApply(p)} />
        ))}
      </div>
    </>
  );
}

export function FramesPanel({ store }: { store: DecorationStore }) {
  const { cfg, update, reset, applyFrameTemplate } = store;
  const f = cfg.frame;
  const [cat, setCat] = useState<FrameCategory>(FRAME_TEMPLATES.find((t) => t.id === f.templateId)?.category ?? 'minimal');
  const set = (patch: Partial<typeof f>) => update('frame', patch);
  return (
    <>
      <SectionHead title="Frames" onReset={() => reset('frame')} />
      <Toggle label="Show frame" checked={f.enabled} onChange={(v) => set({ enabled: v })} />
      <div className="chips" role="group" aria-label="Frame categories">
        {FRAME_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={cat === c.id ? 'chip-btn on' : 'chip-btn'} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>
        ))}
      </div>
      <div className="tiles">
        {FRAME_TEMPLATES.filter((t) => t.category === cat).map((t) => (
          <Tile key={t.id} selected={f.enabled && f.templateId === t.id} label={t.name} src={thumbFrame(t)} onClick={() => applyFrameTemplate(t.id)} />
        ))}
      </div>
      <h4>Text</h4>
      <TextField label="Frame text" value={f.text} onChange={(v) => set({ text: v })} placeholder="SCAN ME" />
      <div className="chips" role="group" aria-label="Quick labels">
        {FRAME_LABELS.map((l) => (
          <button key={l} type="button" className={f.text === l ? 'chip-btn on' : 'chip-btn'} aria-pressed={f.text === l} onClick={() => set({ text: l })}>{l}</button>
        ))}
      </div>
      <SelectField label="Label style" value={f.layout} options={LAYOUTS} onChange={(v) => set({ layout: v, enabled: true })} />
      <Slider label="Text size" value={f.labelSize} min={14} max={40} onChange={(v) => set({ labelSize: v })} />
      <Segmented label="Alignment" value={f.align} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} onChange={(v) => set({ align: v })} />
      <h4>Colors</h4>
      <div className="grid2">
        <ColorField label="Background" value={f.bg} onChange={(v) => set({ bg: v })} />
        <ColorField label="Border" value={f.borderColor} onChange={(v) => set({ borderColor: v })} />
        <ColorField label="Label background" value={f.labelBg} onChange={(v) => set({ labelBg: v })} />
        <ColorField label="Label text" value={f.textColor} onChange={(v) => set({ textColor: v })} />
      </div>
      <h4>Shape and space</h4>
      <SelectField label="Border line" value={f.lineStyle} options={[{ value: 'solid', label: 'Solid' }, { value: 'double', label: 'Double' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }]} onChange={(v) => set({ lineStyle: v })} />
      <Slider label="Thickness" value={f.thickness} min={0} max={20} unit=" px" onChange={(v) => set({ thickness: v })} />
      <Slider label="Corner radius" value={f.radius} min={0} max={60} unit=" px" onChange={(v) => set({ radius: v })} />
      <Slider label="Padding" value={f.padding} min={8} max={70} unit=" px" onChange={(v) => set({ padding: v })} />
      <Slider label="Extra width" value={f.extraWidth} min={0} max={200} unit=" px" onChange={(v) => set({ extraWidth: v })} />
      <Slider label="Extra height" value={f.extraHeight} min={0} max={200} unit=" px" onChange={(v) => set({ extraHeight: v })} />
      <Slider label="Shadow" value={f.shadow} min={0} max={100} onChange={(v) => set({ shadow: v })} />
      <Slider label="Background opacity" value={f.opacity} min={0} max={100} unit="%" onChange={(v) => set({ opacity: v })} />
    </>
  );
}

export function BordersPanel({ cfg, update, reset }: P) {
  const b = cfg.border;
  const set = (patch: Partial<typeof b>) => update('border', patch);
  const two = ['double', 'gradient', 'decorative', 'neon'].includes(b.style);
  return (
    <>
      <SectionHead title="Borders" onReset={() => reset('border')} />
      <Notes>The border sits just outside the code, never over it.</Notes>
      <div className="tiles">
        {BORDERS.map((s) => (
          <Tile key={s.id} selected={b.style === s.id} label={s.label} src={thumbBorder(s.id)} onClick={() => set({ style: s.id })} />
        ))}
      </div>
      {b.style !== 'none' && (
        <>
          <div className="grid2">
            <ColorField label="Color" value={b.color} onChange={(v) => set({ color: v })} />
            {two && <ColorField label={b.style === 'neon' ? 'Core color' : 'Secondary color'} value={b.color2} onChange={(v) => set({ color2: v })} />}
          </div>
          {b.style !== 'minimal' && <Slider label="Thickness" value={b.thickness} min={2} max={20} unit=" px" onChange={(v) => set({ thickness: v })} />}
          <Slider label="Corner radius" value={b.radius} min={0} max={50} unit=" px" onChange={(v) => set({ radius: v })} />
          <Slider label="Spacing from code" value={b.spacing} min={0} max={30} unit=" px" onChange={(v) => set({ spacing: v })} />
          <Slider label="Opacity" value={b.opacity} min={10} max={100} unit="%" onChange={(v) => set({ opacity: v })} />
          {b.style === 'gradient' && <Slider label="Gradient direction" value={b.gradientAngle} min={0} max={360} unit="°" onChange={(v) => set({ gradientAngle: v })} />}
          {(b.style === 'shadow' || b.style === 'neon') && <Slider label="Shadow intensity" value={b.shadow} min={0} max={100} onChange={(v) => set({ shadow: v })} />}
        </>
      )}
    </>
  );
}

export function CornersPanel({ cfg, update, reset }: P) {
  const c = cfg.corners;
  const set = (patch: Partial<typeof c>) => update('corners', patch);
  const bracket = ['brackets', 'doubleLine', 'accents', 'gradient', 'minimal'].includes(c.style);
  return (
    <>
      <SectionHead title="Corners" onReset={() => reset('corners')} />
      <Notes>Corner styling only shapes the empty margin around the code. The three finder patterns are never touched.</Notes>
      <div className="tiles">
        {CORNERS.map((s) => (
          <Tile key={s.id} selected={c.style === s.id} label={s.label} src={thumbCorner(s.id)} onClick={() => set({ style: s.id })} />
        ))}
      </div>
      {bracket && (
        <>
          <div className="grid2">
            <ColorField label="Color" value={c.color} onChange={(v) => set({ color: v })} />
            {c.style === 'gradient' && <ColorField label="Second color" value={c.color2} onChange={(v) => set({ color2: v })} />}
          </div>
          <Slider label="Length" value={c.size} min={14} max={70} unit=" px" onChange={(v) => set({ size: v })} />
          {c.style !== 'minimal' && <Slider label="Thickness" value={c.thickness} min={2} max={12} unit=" px" onChange={(v) => set({ thickness: v })} />}
        </>
      )}
    </>
  );
}

export function ModulesPanel({ cfg, update, reset }: P) {
  const m = cfg.modules;
  const set = (patch: Partial<typeof m>) => update('modules', patch);
  return (
    <>
      <SectionHead title="Module styles" onReset={() => reset('modules')} />
      <Notes>Every data module is kept. Only its shape changes.</Notes>
      <h4>Data modules</h4>
      <div className="tiles">
        {MODULE_SHAPES.map((s) => (
          <Tile key={s.id} selected={m.shape === s.id} label={s.label} src={thumbModule(s.id)} onClick={() => set({ shape: s.id })} />
        ))}
      </div>
      <Slider label="Module size" value={Math.round(m.scale * 100)} min={70} max={100} unit="%" onChange={(v) => set({ scale: v / 100 })} />
      <h4>Finder patterns</h4>
      <div className="tiles">
        {FINDERS.map((s) => (
          <Tile key={s.id} selected={m.finder === s.id} label={s.label} src={thumbFinder(s.id)} onClick={() => set({ finder: s.id })} />
        ))}
      </div>
      <Toggle label="Custom finder colors" checked={m.finderCustomColors || m.finder === 'custom'} onChange={(v) => set({ finderCustomColors: v })} hint="Keep them dark so the finders stay easy to spot." />
      {(m.finderCustomColors || m.finder === 'custom') && (
        <div className="grid2">
          <ColorField label="Outer ring" value={m.finderOuter} onChange={(v) => set({ finderOuter: v })} />
          <ColorField label="Inner eye" value={m.finderInner} onChange={(v) => set({ finderInner: v })} />
        </div>
      )}
      <h4>Spacing</h4>
      <Slider label="Quiet zone" value={m.quietZone} min={2} max={8} unit=" modules" onChange={(v) => set({ quietZone: v })} />
    </>
  );
}

export function ColorsPanel({ cfg, update, reset, fg, bg, onColors, onResetColors, transparent, onTransparent }: P & {
  fg: string; bg: string; onColors: (p: { fg?: string; bg?: string }) => void; onResetColors: () => void; transparent: boolean; onTransparent: (v: boolean) => void;
}) {
  const g = cfg.gradient;
  const set = (patch: Partial<typeof g>) => update('gradient', patch);
  const setStop = (i: number, patch: Partial<(typeof g.stops)[number]>) => set({ stops: g.stops.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const first = g.enabled ? g.stops[0]?.color ?? fg : fg;
  return (
    <>
      <SectionHead title="Colors" onReset={() => { reset('gradient'); onResetColors(); onTransparent(false); }} />
      <div className="grid2">
        <ColorField label="Foreground" value={fg} onChange={(v) => onColors({ fg: v })} />
        <ColorField label="Background" value={bg} onChange={(v) => onColors({ bg: v })} />
      </div>
      <p className="hint">Contrast {contrastRatio(first, bg).toFixed(1)}:1. Aim for 4:1 or more.</p>
      <Toggle label="Transparent background" checked={transparent} onChange={onTransparent} hint="Removes the frame and code backgrounds. JPEG and PDF fill it with white." />
      <Toggle label="Gradient foreground" checked={g.enabled} onChange={(v) => set({ enabled: v })} hint="Keep every stop dark enough against the background." />
      {g.enabled && (
        <>
          <Segmented label="Type" value={g.type} options={[{ value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }]} onChange={(v) => set({ type: v })} />
          {g.type === 'linear' && <Slider label="Direction" value={g.angle} min={0} max={360} unit="°" onChange={(v) => set({ angle: v })} />}
          <div className="stops">
            {g.stops.map((s, i) => (
              <div className="stop" key={i}>
                <ColorField label={`Stop ${i + 1}`} value={s.color} onChange={(v) => setStop(i, { color: v })} />
                <Slider label="Position" value={s.offset} min={0} max={100} unit="%" onChange={(v) => setStop(i, { offset: v })} />
                {g.stops.length > 2 && (
                  <button type="button" className="icon-btn" aria-label={`Remove stop ${i + 1}`} onClick={() => set({ stops: g.stops.filter((_, k) => k !== i) })}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {g.stops.length < 5 && (
            <button type="button" className="btn ghost small" onClick={() => set({ stops: [...g.stops, { offset: 100, color: g.stops[g.stops.length - 1]?.color ?? '#000000' }] })}>
              <Plus size={15} aria-hidden="true" /> Add color stop
            </button>
          )}
        </>
      )}
    </>
  );
}

type LayerKey = keyof DecorConfig;
const LAYERS: { key: LayerKey; label: string; hint: string }[] = [
  { key: 'shapes', label: 'Geometric shapes', hint: 'Small shapes in the four corners' },
  { key: 'ornaments', label: 'Corner ornaments', hint: 'Curved flourishes' },
  { key: 'lines', label: 'Lines and separators', hint: 'Rules above and below the code' },
  { key: 'sparkles', label: 'Stars and sparkles', hint: 'A few small stars' },
  { key: 'pattern', label: 'Minimal pattern', hint: 'Rows of dots along the sides' },
  { key: 'indicators', label: 'Scan indicators', hint: 'Arrows pointing at the code' },
  { key: 'badge', label: 'Decorative label', hint: 'A small badge in the corner' },
  { key: 'background', label: 'Background pattern', hint: 'Subtle texture behind the code' },
];

export function DecorationsPanel({ cfg, update, reset }: P) {
  const setLayer = (key: LayerKey, patch: Partial<DecorLayer> & { text?: string; type?: PatternType }) =>
    update('decor', { [key]: { ...cfg.decor[key], ...patch } } as Partial<DecorConfig>);
  return (
    <>
      <SectionHead title="Decorations" onReset={() => reset('decor')} />
      <Notes>These sit in the margin around the code and never over it. Turning one on adds frame padding so nothing is clipped.</Notes>
      {LAYERS.map(({ key, label, hint }) => {
        const l = cfg.decor[key];
        return (
          <div className={l.enabled ? 'layer on' : 'layer'} key={key}>
            <Toggle label={label} hint={hint} checked={l.enabled} onChange={(v) => setLayer(key, { enabled: v })} />
            {l.enabled && (
              <div className="layer-body">
                <ColorField label="Color" value={l.color} onChange={(v) => setLayer(key, { color: v })} />
                <Slider label="Opacity" value={l.opacity} min={5} max={100} unit="%" onChange={(v) => setLayer(key, { opacity: v })} />
                <Slider label="Size" value={l.size} min={1} max={10} onChange={(v) => setLayer(key, { size: v })} />
                {key === 'badge' && <TextField label="Label text" value={cfg.decor.badge.text} maxLength={14} onChange={(v) => setLayer('badge', { text: v })} />}
                {key === 'background' && (
                  <SelectField label="Pattern" value={cfg.decor.background.type} options={[{ value: 'dots', label: 'Dots' }, { value: 'lines', label: 'Diagonal lines' }, { value: 'grid', label: 'Grid' }, { value: 'checks', label: 'Checks' }]} onChange={(v) => setLayer('background', { type: v })} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function LogosPanel({ cfg, update, reset, original, logo, logoError, logoNotice, onSelectLogo, onRemoveLogo, ecl, onRaiseEcl, onPickBuiltIn }: P & {
  /** The logo that was applied in the Generator, if any. */
  original: { href: string; name: string } | null;
  /** A logo uploaded here in the Decorator. */
  logo: Logo | null; logoError: string | null; logoNotice: string; onSelectLogo: (f: File) => void | Promise<void>; onRemoveLogo: () => void;
  ecl: ECL; onRaiseEcl?: (ecl: ECL) => void; onPickBuiltIn: (id: string, color: string) => void;
}) {
  const l = cfg.logo;
  const set = (patch: Partial<typeof l>) => update('logo', patch);
  const builtIn = BUILT_IN_LOGOS.some((b) => b.id === l.source);
  const lowEcl = ecl === 'L' || ecl === 'M';
  return (
    <>
      <SectionHead title="Logos" onReset={() => reset('logo')} />
      <Notes>A logo hides part of the code, so keep it small. The built-in tiles are simple generic glyphs, not official brand artwork.</Notes>
      <div className="tiles logo-tiles">
        <Tile selected={l.source === 'none'} label="None" onClick={() => set({ source: 'none' })} />
        {original && <Tile selected={l.source === 'original'} label="From step 1" src={original.href} onClick={() => set({ source: 'original' })} />}
        {logo && <Tile selected={l.source === 'upload'} label="Your logo" src={logo.url} onClick={() => set({ source: 'upload' })} />}
        {BUILT_IN_LOGOS.map((b) => (
          <Tile key={b.id} selected={l.source === b.id} label={b.label} src={thumbLogo(b.id)} onClick={() => onPickBuiltIn(b.id, b.color)} />
        ))}
      </div>
      <ImageUpload logo={logo} error={logoError} notice={logoNotice} onSelect={onSelectLogo} onRemove={onRemoveLogo} />
      <div className="field">
        <span className="label">Error correction</span>
        <p className="hint">{ECL_INFO[ecl]}. This is set when the QR is generated in step 1.</p>
        {l.source !== 'none' && lowEcl && onRaiseEcl && (
          <button type="button" className="btn ghost small" onClick={() => onRaiseEcl('H')}>
            Raise it to H (same data, regenerated in step 1)
          </button>
        )}
      </div>
      {l.source !== 'none' && (
        <>
          <Slider label="Logo size" value={l.size} min={8} max={36} unit="%" onChange={(v) => set({ size: v })} />
          <Segmented label="Plate shape" value={l.shape} options={[{ value: 'square', label: 'Square' }, { value: 'rounded', label: 'Rounded' }, { value: 'circle', label: 'Circle' }]} onChange={(v) => set({ shape: v })} />
          <Segmented label="Position" value={l.position} options={[{ value: 'center', label: 'Center' }, { value: 'bottomRight', label: 'Bottom right' }]} onChange={(v) => set({ position: v })} />
          {!builtIn && <Toggle label="Plate behind logo" checked={l.bgEnabled} onChange={(v) => set({ bgEnabled: v })} />}
          <div className="grid2">
            <ColorField label="Plate color" value={l.bg} onChange={(v) => set({ bg: v })} />
            <ColorField label="Plate border" value={l.borderColor} onChange={(v) => set({ borderColor: v })} />
          </div>
          {l.shape === 'rounded' && <Slider label="Plate radius" value={l.radius} min={0} max={40} unit=" px" onChange={(v) => set({ radius: v })} />}
          <Slider label="Padding" value={l.padding} min={0} max={20} unit=" px" onChange={(v) => set({ padding: v })} />
          <Slider label="Border width" value={l.borderWidth} min={0} max={6} unit=" px" onChange={(v) => set({ borderWidth: v })} />
        </>
      )}
    </>
  );
}
