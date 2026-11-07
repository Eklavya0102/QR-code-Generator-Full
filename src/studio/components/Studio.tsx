import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleX, Download, Frame, Grid3x3, Image as ImageIcon, LayoutTemplate, Loader, Palette, ScanLine, Shapes, SquareDashed, TriangleAlert, Scan } from 'lucide-react';
import { InputModeSelector } from '../../components/InputModeSelector';
import type { Options } from '../../components/QRCustomization';
import { TextInputPanel } from '../../components/TextInputPanel';
import type { Logo } from '../../hooks/useLogo';
import { downloadBlob } from '../../lib/download';
import type { ECL } from '../../lib/qr';
import { sanitizeFilename, type Mode } from '../../lib/validate';
import { logoById } from '../data/logos';
import { presetConfig, type Preset } from '../data/presets';
import type { DecorationStore } from '../hooks/useDecoration';
import { analyze } from '../lib/analyze';
import { decodeCanvas, type DecodeStatus } from '../lib/decode';
import { EXPORT_FORMATS, MAX_EXPORT, MIN_EXPORT, exportDims, exportScene, renderToCanvas, type ExportFormat } from '../lib/export';
import { logoToDataUrl } from '../lib/logoData';
import { createMatrix } from '../lib/matrix';
import { buildScene, type SceneInput, type SceneLogo } from '../lib/scene';
import { Notes, Segmented, SelectField, Toggle } from './controls';
import { BordersPanel, ColorsPanel, CornersPanel, DecorationsPanel, FramesPanel, LogosPanel, ModulesPanel, TemplatesPanel } from './panels';
import '../../styles/studio.css';

const SAMPLE = 'https://example.com';
type Cat = 'templates' | 'frames' | 'borders' | 'corners' | 'modules' | 'colors' | 'decor' | 'logos' | 'export';
const NAV: { id: Cat; label: string; Icon: typeof Frame }[] = [
  { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
  { id: 'frames', label: 'Frames', Icon: Frame },
  { id: 'borders', label: 'Borders', Icon: SquareDashed },
  { id: 'corners', label: 'Corners', Icon: Scan },
  { id: 'modules', label: 'Modules', Icon: Grid3x3 },
  { id: 'colors', label: 'Colors', Icon: Palette },
  { id: 'decor', label: 'Decorations', Icon: Shapes },
  { id: 'logos', label: 'Logos', Icon: ImageIcon },
  { id: 'export', label: 'Export', Icon: Download },
];
type Check = { status: 'idle' } | { status: 'pending' } | { status: 'error' } | { status: DecodeStatus };

export interface StudioProps {
  mode: Mode;
  onMode: (m: Mode) => void;
  text: string;
  onText: (v: string) => void;
  onClearText: () => void;
  payload: string | null;
  inputError: string | null;
  options: Options;
  onOptions: (p: Partial<Options>) => void;
  logo: Logo | null;
  logoError: string | null;
  logoNotice: string;
  onSelectLogo: (f: File) => void | Promise<void>;
  onRemoveLogo: () => void;
  deco: DecorationStore;
}

export default function Studio(p: StudioProps) {
  const { deco, options, onOptions, logo } = p;
  const { cfg } = deco;
  const [cat, setCat] = useState<Cat>('templates');
  const [applied, setApplied] = useState<{ id: string; cfg: typeof cfg } | null>(null);
  const [transparent, setTransparent] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [sizeChoice, setSizeChoice] = useState(String([512, 1024, 2048, 4096].includes(options.size) ? options.size : 1024));
  const [customSize, setCustomSize] = useState('1500');
  const [autoCheck, setAutoCheck] = useState(true);
  const [check, setCheck] = useState<Check>({ status: 'idle' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const token = useRef(0);

  const exportSize = sizeChoice === 'custom' ? Math.min(MAX_EXPORT, Math.max(MIN_EXPORT, Math.round(Number(customSize)) || 1024)) : Number(sizeChoice);
  const isSample = p.payload === null;
  const text = p.payload ?? SAMPLE;

  const matrix = useMemo(() => {
    try {
      return { m: createMatrix(text, options.ecl), error: null as string | null };
    } catch {
      return { m: null, error: 'This content is too long for the selected error correction level. Shorten it or lower the level.' };
    }
  }, [text, options.ecl]);

  const uploadHref = useMemo(() => (logo ? logoToDataUrl(logo.img) : null), [logo]);
  const sceneLogo = useMemo<SceneLogo>(() => {
    const s = cfg.logo.source;
    if (s === 'none') return null;
    if (s === 'upload') return logo && uploadHref ? { kind: 'image', href: uploadHref, aspect: logo.img.width / logo.img.height } : null;
    return logoById(s) ? { kind: 'builtin', id: s } : null;
  }, [cfg.logo.source, logo, uploadHref]);

  const input = useMemo<SceneInput | null>(
    () => (matrix.m ? { matrix: matrix.m, cfg, fg: options.fg, bg: options.bg, logo: sceneLogo, idPrefix: 'pv', transparent } : null),
    [matrix.m, cfg, options.fg, options.bg, sceneLogo, transparent],
  );
  const scene = useMemo(() => (input ? buildScene(input) : null), [input]);
  const advice = useMemo(
    () => (scene ? analyze(cfg, options.fg, options.bg, options.ecl, scene.logoCoverage, !!sceneLogo, transparent) : []),
    [scene, cfg, options.fg, options.bg, options.ecl, sceneLogo, transparent],
  );

  const runCheck = async (size: number): Promise<Check> => {
    if (!input) return { status: 'idle' };
    try {
      const canvas = await renderToCanvas(input, size, '#ffffff');
      return { status: (await decodeCanvas(canvas, text)).status };
    } catch {
      return { status: 'error' };
    }
  };

  // Optional automatic scan check, debounced so dragging a slider does not decode on every tick.
  useEffect(() => {
    if (!autoCheck || isSample || !input) {
      setCheck({ status: 'idle' });
      return;
    }
    const id = ++token.current;
    setCheck({ status: 'pending' });
    const t = setTimeout(async () => {
      const r = await runCheck(1024);
      if (token.current === id) setCheck(r);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene?.svg, autoCheck, isSample]);

  const manualCheck = async () => {
    const id = ++token.current;
    setCheck({ status: 'pending' });
    const r = await runCheck(exportSize);
    if (token.current === id) setCheck(r);
  };

  const doExport = async () => {
    if (!input || isSample) return;
    setBusy(true);
    setMessage(null);
    try {
      const blob = await exportScene(input, format, exportSize);
      const ext = EXPORT_FORMATS.find((f) => f.id === format)?.ext ?? 'png';
      const name = `${sanitizeFilename(options.filename).replace(/\.png$/, '')}.${ext}`;
      downloadBlob(blob, name);
      setMessage({ ok: true, text: `Download requested as ${name}. Check your browser's downloads.` });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'The export failed. Try a smaller size.' });
    } finally {
      setBusy(false);
    }
  };

  const applyPreset = (pr: Preset) => {
    const next = presetConfig(pr);
    deco.replace(next);
    setApplied({ id: pr.id, cfg: next });
    const ecl: ECL | undefined = pr.ecl ?? (next.logo.source !== 'none' && (options.ecl === 'L' || options.ecl === 'M') ? 'H' : undefined);
    onOptions({ fg: pr.fg, bg: pr.bg, ...(ecl ? { ecl } : {}) });
  };
  const pickBuiltIn = (id: string, color: string) => {
    deco.update('logo', { source: id, bg: color });
    if (options.ecl === 'L' || options.ecl === 'M') onOptions({ ecl: 'H' });
  };

  const dims = scene ? exportDims(scene.width, scene.height, exportSize) : null;
  const canExport = !!input && !isSample && !busy;
  const panel: Record<Cat, React.ReactNode> = {
    templates: <TemplatesPanel activeId={applied && applied.cfg === cfg ? applied.id : null} onApply={applyPreset} onResetAll={deco.resetAll} />,
    frames: <FramesPanel store={deco} />,
    borders: <BordersPanel cfg={cfg} update={deco.update} reset={deco.reset} />,
    corners: <CornersPanel cfg={cfg} update={deco.update} reset={deco.reset} />,
    modules: <ModulesPanel cfg={cfg} update={deco.update} reset={deco.reset} />,
    colors: <ColorsPanel cfg={cfg} update={deco.update} reset={deco.reset} fg={options.fg} bg={options.bg} onColors={onOptions} />,
    decor: <DecorationsPanel cfg={cfg} update={deco.update} reset={deco.reset} />,
    export: (
      <>
        <div className="sec-head"><h3>Export</h3></div>
        <Notes>The file is drawn from the same design you see in the preview, at the size you choose.</Notes>
        <Segmented label="Format" value={format} options={EXPORT_FORMATS.map((f) => ({ value: f.id, label: f.label }))} onChange={setFormat} />
        <SelectField label="Size (longest side)" value={sizeChoice} options={[{ value: '512', label: '512 px' }, { value: '1024', label: '1024 px' }, { value: '2048', label: '2048 px' }, { value: '4096', label: '4096 px' }, { value: 'custom', label: 'Custom' }]} onChange={setSizeChoice} />
        {sizeChoice === 'custom' && (
          <div className="field">
            <label htmlFor="studio-custom">Custom size (px, {MIN_EXPORT} to {MAX_EXPORT})</label>
            <input id="studio-custom" type="number" inputMode="numeric" min={MIN_EXPORT} max={MAX_EXPORT} value={customSize} onChange={(e) => setCustomSize(e.target.value)} />
          </div>
        )}
        <Toggle label="Transparent background" checked={transparent} onChange={setTransparent} hint={format === 'jpeg' || format === 'pdf' ? 'JPEG and PDF fill transparent areas with white.' : 'Removes the frame and code backgrounds.'} />
        {format === 'svg' && <p className="hint">SVG keeps frame text as live text, so it uses a common system font. Use PNG or PDF when the exact lettering matters.</p>}
        {dims && <p className="hint">Output: {dims.width} × {dims.height} px.</p>}
      </>
    ),
    logos: (
      <LogosPanel cfg={cfg} update={deco.update} reset={deco.reset} logo={logo} logoError={p.logoError} logoNotice={p.logoNotice}
        onSelectLogo={p.onSelectLogo} onRemoveLogo={p.onRemoveLogo} ecl={options.ecl} onEcl={(v) => onOptions({ ecl: v })} onPickBuiltIn={pickBuiltIn} />
    ),
  };

  return (
    <section className="studio" aria-label="QR Decoration Studio">
      <div className="panel studio-content">
        <h2 className="visually-hidden">Content</h2>
        <div className="studio-content-body">
          <InputModeSelector mode={p.mode} onChange={p.onMode} />
          <TextInputPanel mode={p.mode} value={p.text} error={p.inputError} onChange={p.onText} onClear={p.onClearText} />
        </div>
      </div>

      <div className="studio-grid">
        <nav className="studio-nav" aria-label="Decoration categories">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} type="button" className={cat === id ? 'nav-btn on' : 'nav-btn'} aria-current={cat === id ? 'true' : undefined} onClick={() => setCat(id)}>
              <Icon size={17} aria-hidden="true" /> <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="studio-stage">
          <div className="preview-pin">
            <div className={transparent ? 'studio-preview checker' : 'studio-preview'} aria-busy={check.status === 'pending'}>
              {scene ? (
                <div className="scene" role="img" aria-label="Decorated QR code preview" dangerouslySetInnerHTML={{ __html: scene.svg }} />
              ) : (
                <p className="msg error" role="alert">{matrix.error}</p>
              )}
              {isSample && <span className="sample-badge">Sample preview</span>}
            </div>
            <p className="hint stage-note">
              {isSample ? 'Enter text or a URL above to export your own code. This sample shows the design.' : dims ? `Exports at ${dims.width} × ${dims.height} px.` : ''}
            </p>
            <ScanStatus check={check} disabled={isSample || !input} onCheck={manualCheck} auto={autoCheck} onAuto={setAutoCheck} size={exportSize} />
          </div>

          <button type="button" className="btn primary wide" onClick={doExport} disabled={!canExport}>
            {busy ? <Loader size={16} className="spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />} {busy ? 'Exporting…' : `Download ${EXPORT_FORMATS.find((f) => f.id === format)?.label}`}
          </button>
          <button type="button" className="link-btn export-link" onClick={() => setCat('export')}>Format, size and transparency</button>
          {message && <p className={message.ok ? 'msg ok' : 'msg error'} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}
          {advice.length > 0 && (
            <ul className="advice" aria-label="Scannability notes">
              {advice.map((a) => (
                <li key={a.text} className={a.level}>
                  <TriangleAlert size={15} aria-hidden="true" /> <span>{a.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel studio-controls">{panel[cat]}</div>
      </div>
    </section>
  );
}

function ScanStatus({ check, disabled, onCheck, auto, onAuto, size }: { check: Check; disabled: boolean; onCheck: () => void; auto: boolean; onAuto: (v: boolean) => void; size: number }) {
  let body: React.ReactNode;
  let tone = 'idle';
  if (disabled) body = <span>Add content to run the scan check.</span>;
  else if (check.status === 'pending') {
    tone = 'pending';
    body = <><Loader size={16} className="spin" aria-hidden="true" /> <span>Checking…</span></>;
  } else if (check.status === 'ok') {
    tone = 'ok';
    body = <><CircleCheck size={16} aria-hidden="true" /> <span><strong>QR validation successful.</strong> A decoder read this design back correctly. Still test it with your own phone before printing; this is not a guarantee.</span></>;
  } else if (check.status === 'mismatch') {
    tone = 'fail';
    body = <><CircleX size={16} aria-hidden="true" /> <span><strong>QR validation failed.</strong> The decoder read different data than expected. Simplify the design and check again.</span></>;
  } else if (check.status === 'fail') {
    tone = 'fail';
    body = <><CircleX size={16} aria-hidden="true" /> <span><strong>QR validation failed.</strong> This decoder could not read the design. Try square modules, higher contrast, a smaller logo or higher error correction. Some decoders are stricter than phone cameras, so test on a phone too.</span></>;
  } else if (check.status === 'error') {
    tone = 'fail';
    body = <><TriangleAlert size={16} aria-hidden="true" /> <span>The scan check could not run in this browser.</span></>;
  } else body = <span>No scan check yet.</span>;
  return (
    <div className={`scan-status ${tone}`}>
      <div className="scan-line" role="status" aria-live="polite">{body}</div>
      <div className="scan-actions">
        <button type="button" className="btn ghost small" onClick={onCheck} disabled={disabled || check.status === 'pending'}>
          <ScanLine size={15} aria-hidden="true" /> Check at {size}px
        </button>
        <label className="auto-check"><input type="checkbox" checked={auto} onChange={(e) => onAuto(e.target.checked)} /> Check automatically</label>
      </div>
    </div>
  );
}
