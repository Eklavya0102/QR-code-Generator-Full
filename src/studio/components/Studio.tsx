import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleX, Download, Frame, Grid3x3, Image as ImageIcon, LayoutTemplate, Loader, Palette, ScanLine, Shapes, SquareDashed, TriangleAlert, Scan, Undo2, WandSparkles } from 'lucide-react';
import { ContentInput } from '../../components/ContentInput';
import type { Options } from '../../components/QRCustomization';
import type { Logo } from '../../hooks/useLogo';
import { downloadBlob } from '../../lib/download';
import type { ECL } from '../../lib/qr';
import { MODE_LABELS, type BuildResult, type BuilderMode, type ContentMode, type Values } from '../../lib/payloads';
import { sanitizeFilename } from '../../lib/validate';
import { logoById } from '../data/logos';
import { presetConfig, type Preset } from '../data/presets';
import type { DecorationStore } from '../hooks/useDecoration';
import { analyze } from '../lib/analyze';
import { autofix, type FixResult, type FixState } from '../lib/autofix';
import { decodeBoth, verdict, type DualDecode, type Verdict } from '../lib/decode';
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
type Check = { status: 'idle' } | { status: 'pending' } | { status: 'error' } | { status: 'done'; dual: DualDecode; verdict: Verdict };
interface FixReport { result: FixResult; before: FixState }

export interface StudioProps {
  mode: ContentMode;
  onMode: (m: ContentMode) => void;
  text: string;
  onText: (v: string) => void;
  onClearText: () => void;
  forms: Record<BuilderMode, Values>;
  onForm: (mode: BuilderMode, key: string, value: string) => void;
  built: BuildResult | null;
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
  const [contentOpen, setContentOpen] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [fixReport, setFixReport] = useState<FixReport | null>(null);
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
      const dual = await decodeBoth(canvas, text);
      return { status: 'done', dual, verdict: verdict(dual) };
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

  const hasErrorAdvice = advice.some((a) => a.level === 'error');
  const needsFix = !isSample && !!input && (hasErrorAdvice || advice.length > 0 || (check.status === 'done' && check.verdict !== 'ok'));

  /** Renders a candidate design, decodes it with both decoders and applies the same advice rules as the live panel. */
  const evaluateFix = async (st: FixState) => {
    let matrixFor;
    try {
      matrixFor = createMatrix(text, st.ecl);
    } catch {
      return { pass: false, score: -100 }; // too long for this error correction level
    }
    const candidate: SceneInput = { matrix: matrixFor, cfg: st.cfg, fg: st.fg, bg: st.bg, logo: sceneLogo, idPrefix: 'fx', transparent };
    const coverage = buildScene(candidate).logoCoverage;
    const errors = analyze(st.cfg, st.fg, st.bg, st.ecl, coverage, !!sceneLogo, transparent).filter((a) => a.level === 'error').length;
    const dual = await decodeBoth(await renderToCanvas(candidate, 1024, '#ffffff'), text);
    const okCount = [dual.jsqr.status, dual.zxing.status].filter((x) => x === 'ok' || x === 'unavailable').length;
    return { pass: verdict(dual) === 'ok' && errors === 0, score: okCount * 10 - errors * 4 };
  };

  const runFix = async () => {
    if (!input || isSample) return;
    setFixing(true);
    setFixReport(null);
    const before: FixState = { cfg, fg: options.fg, bg: options.bg, ecl: options.ecl };
    try {
      const result = await autofix(before, { matrix: (e) => createMatrix(text, e), logo: sceneLogo }, evaluateFix);
      if (result.outcome === 'fixed' || result.outcome === 'improved') {
        deco.replace(result.state.cfg);
        onOptions({ fg: result.state.fg, bg: result.state.bg, ecl: result.state.ecl });
      }
      setFixReport({ result, before });
    } catch {
      setFixReport({ result: { outcome: 'unfixed', state: before, applied: [], evaluation: { pass: false, score: 0 } }, before });
    } finally {
      setFixing(false);
    }
  };
  const undoFix = () => {
    if (!fixReport) return;
    deco.replace(fixReport.before.cfg);
    onOptions({ fg: fixReport.before.fg, bg: fixReport.before.bg, ecl: fixReport.before.ecl });
    setFixReport(null);
  };
  // The report only describes the design it produced; hide it as soon as anything else changes.
  const reportCurrent = fixReport && (fixReport.result.outcome === 'fixed' || fixReport.result.outcome === 'improved'
    ? deco.cfg === fixReport.result.state.cfg && options.fg === fixReport.result.state.fg && options.bg === fixReport.result.state.bg && options.ecl === fixReport.result.state.ecl
    : deco.cfg === fixReport.before.cfg && options.fg === fixReport.before.fg && options.bg === fixReport.before.bg && options.ecl === fixReport.before.ecl);

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
        <div className="studio-content-head">
          <h2 className="visually-hidden">Content</h2>
          <div className="content-summary">
            <strong>{MODE_LABELS[p.mode]}</strong>
            <span className="hint">{p.mode === 'wifi' ? 'Wi-Fi details hidden' : isSample ? 'No content yet. A sample is shown.' : text.length > 70 ? `${text.slice(0, 70).replace(/\s+/g, ' ')}…` : text.replace(/\s+/g, ' ')}</span>
          </div>
          <button type="button" className="btn ghost small" aria-expanded={contentOpen} aria-controls="studio-content-body" onClick={() => setContentOpen((o) => !o)}>
            {contentOpen ? 'Hide content' : 'Edit content'}
          </button>
        </div>
        <div id="studio-content-body" className="studio-content-body" hidden={!contentOpen}>
          <ContentInput mode={p.mode} onMode={p.onMode} text={p.text} onText={p.onText} onClearText={p.onClearText} textError={p.inputError} forms={p.forms} onForm={p.onForm} built={p.built} />
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

        <div className={reportCurrent ? 'studio-stage has-report' : 'studio-stage'}>
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
            <ScanStatus check={check} disabled={isSample || !input} onCheck={manualCheck} auto={autoCheck} onAuto={setAutoCheck} size={exportSize}
              showFix={needsFix} fixing={fixing} onFix={runFix} />
            {reportCurrent && fixReport && <FixSummary report={fixReport} onUndo={undoFix} onDismiss={() => setFixReport(null)} />}
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

const DEC_NAMES = { jsqr: 'jsQR', zxing: 'ZXing' } as const;

function ScanStatus({ check, disabled, onCheck, auto, onAuto, size, showFix, fixing, onFix }: {
  check: Check; disabled: boolean; onCheck: () => void; auto: boolean; onAuto: (v: boolean) => void; size: number; showFix: boolean; fixing: boolean; onFix: () => void;
}) {
  let body: React.ReactNode;
  let tone = 'idle';
  let chips: React.ReactNode = null;
  if (disabled) body = <span>Add content to run the scan check.</span>;
  else if (check.status === 'pending') {
    tone = 'pending';
    body = <><Loader size={16} className="spin" aria-hidden="true" /> <span>Checking with two decoders…</span></>;
  } else if (check.status === 'done') {
    const { dual, verdict: v } = check;
    const states = [['jsqr', dual.jsqr.status], ['zxing', dual.zxing.status]] as const;
    chips = (
      <ul className="dec-list" aria-label="Decoder results">
        {states.map(([k, st]) => (
          <li key={k} className={st === 'ok' ? 'dec ok' : st === 'unavailable' ? 'dec' : 'dec bad'}>
            {DEC_NAMES[k]}: {st === 'ok' ? 'read it' : st === 'unavailable' ? 'not loaded' : st === 'mismatch' ? 'read different data' : 'could not read it'}
          </li>
        ))}
      </ul>
    );
    const wrong = dual.jsqr.status === 'mismatch' || dual.zxing.status === 'mismatch';
    if (v === 'ok') {
      tone = 'ok';
      body = <><CircleCheck size={16} aria-hidden="true" /> <span><strong>QR validation successful.</strong> {dual.zxing.status === 'unavailable' ? 'jsQR read this design back correctly.' : 'Two independent decoders (jsQR and ZXing) both read this design back correctly.'} Still test it with your own phone before printing; this is not a guarantee.</span></>;
    } else if (v === 'partial') {
      tone = 'warn';
      body = <><TriangleAlert size={16} aria-hidden="true" /> <span><strong>Potential scannability warning.</strong> {wrong ? 'One decoder read different data than expected.' : 'Only one of the two decoders could read this design.'} Some phones may struggle with it. Simplify the design or use Fix scannability, and test on a phone.</span></>;
    } else {
      tone = 'fail';
      body = <><CircleX size={16} aria-hidden="true" /> <span><strong>QR validation failed.</strong> {wrong ? 'A decoder read different data than expected.' : 'Neither decoder could read this design.'} Try square modules, higher contrast, a smaller logo or higher error correction, or use Fix scannability.</span></>;
    }
  } else if (check.status === 'error') {
    tone = 'fail';
    body = <><TriangleAlert size={16} aria-hidden="true" /> <span>The scan check could not run in this browser.</span></>;
  } else body = <span>No scan check yet.</span>;
  return (
    <div className={`scan-status ${tone}`}>
      <div className="scan-line" role="status" aria-live="polite">{body}</div>
      {chips}
      <div className="scan-actions">
        <div className="scan-buttons">
          {showFix && (
            <button type="button" className="btn primary small" onClick={onFix} disabled={disabled || fixing || check.status === 'pending'}>
              {fixing ? <Loader size={15} className="spin" aria-hidden="true" /> : <WandSparkles size={15} aria-hidden="true" />} {fixing ? 'Fixing…' : 'Fix scannability'}
            </button>
          )}
          <button type="button" className="btn ghost small" onClick={onCheck} disabled={disabled || check.status === 'pending' || fixing}>
            <ScanLine size={15} aria-hidden="true" /> Check at {size}px
          </button>
        </div>
        <label className="auto-check"><input type="checkbox" checked={auto} onChange={(e) => onAuto(e.target.checked)} /> Check automatically</label>
      </div>
    </div>
  );
}

function FixSummary({ report, onUndo, onDismiss }: { report: FixReport; onUndo: () => void; onDismiss: () => void }) {
  const { outcome, applied } = report.result;
  const changed = outcome === 'fixed' || outcome === 'improved';
  const title =
    outcome === 'fixed' ? 'Fixed. Both decoders now read this design.'
    : outcome === 'improved' ? 'Improved, but not fully fixed. Test it on a phone before using it.'
    : outcome === 'already-ok' ? 'Nothing to change. Both decoders already read this design.'
    : 'I could not fix this automatically, so nothing was changed.';
  return (
    <div className={`fix-summary ${outcome}`} role="status">
      <p><strong>{title}</strong></p>
      {changed && (
        <details className="fix-changes">
          <summary>{applied.length} {applied.length === 1 ? 'change' : 'changes'} made</summary>
          <ul>
            {applied.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </details>
      )}
      {outcome === 'unfixed' && <p className="hint">Your logo, frame and colors were left alone. Try a smaller logo, a plainer module shape, or higher contrast by hand.</p>}
      {outcome === 'already-ok' && <p className="hint">Any notes below are advice only.</p>}
      <div className="fix-actions">
        {changed && (
          <button type="button" className="btn ghost small" onClick={onUndo}>
            <Undo2 size={15} aria-hidden="true" /> Undo changes
          </button>
        )}
        <button type="button" className="link-btn" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
