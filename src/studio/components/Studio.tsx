import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Frame, Grid3x3, Image as ImageIcon, LayoutTemplate, Palette, QrCode, Shapes, SquareDashed, TriangleAlert, Scan } from 'lucide-react';
import { useLogo } from '../../hooks/useLogo';
import { downloadBlob } from '../../lib/download';
import type { GeneratedQR } from '../../lib/generated';
import { MODE_LABELS } from '../../lib/payloads';
import { ECL_INFO, type ECL } from '../../lib/qr';
import { sanitizeFilename } from '../../lib/validate';
import { logoById } from '../data/logos';
import { presetConfig, type Preset } from '../data/presets';
import type { DecorationStore } from '../hooks/useDecoration';
import { analyze } from '../lib/analyze';
import { autofix, type FixState } from '../lib/autofix';
import { decodeBoth, verdict } from '../lib/decode';
import { EXPORT_FORMATS, MAX_EXPORT, MIN_EXPORT, exportDims, exportScene, renderToCanvas, type ExportFormat } from '../lib/export';
import { logoToDataUrl } from '../lib/logoData';
import { buildScene, type SceneInput, type SceneLogo } from '../lib/scene';
import { FinalPanel, type FinalState } from './FinalPanel';
import { FixSummary, ScanStatus, type Check, type FixReport } from './ScanParts';
import { BordersPanel, ColorsPanel, CornersPanel, DecorationsPanel, FramesPanel, LogosPanel, ModulesPanel, TemplatesPanel } from './panels';
import '../../styles/studio.css';

type Cat = 'templates' | 'frames' | 'borders' | 'corners' | 'modules' | 'colors' | 'decor' | 'logos';
const NAV: { id: Cat; label: string; Icon: typeof Frame }[] = [
  { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
  { id: 'frames', label: 'Frames', Icon: Frame },
  { id: 'borders', label: 'Borders', Icon: SquareDashed },
  { id: 'corners', label: 'Corners', Icon: Scan },
  { id: 'modules', label: 'Modules', Icon: Grid3x3 },
  { id: 'colors', label: 'Colors', Icon: Palette },
  { id: 'decor', label: 'Decorations', Icon: Shapes },
  { id: 'logos', label: 'Logos', Icon: ImageIcon },
];
const ECL_RANK: Record<ECL, number> = { L: 0, M: 1, Q: 2, H: 3 };

export interface StudioProps {
  /** The original QR from step 1. Null until one has been generated. */
  generated: GeneratedQR | null;
  /** The Generator has been edited since `generated` was made. */
  generatorStale: boolean;
  onBack: () => void;
  /** Asks step 1 to regenerate the same data at a higher error correction level. */
  onRaiseEcl: (ecl: ECL) => void;
  canRaiseEcl: boolean;
  deco: DecorationStore;
}

export default function Studio(p: StudioProps) {
  if (!p.generated) return <NoQr onBack={p.onBack} />;
  return <Decorator {...p} generated={p.generated} />;
}

function NoQr({ onBack }: { onBack: () => void }) {
  return (
    <section className="studio" aria-label="QR Decorator">
      <div className="panel no-qr">
        <QrCode size={44} strokeWidth={1.25} aria-hidden="true" />
        <h2>Nothing to decorate yet</h2>
        <p role="status">No QR code available. Please generate a QR code first.</p>
        <button type="button" className="btn primary" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Go to the Generator
        </button>
      </div>
    </section>
  );
}

function summarize(g: GeneratedQR): string {
  if (g.mode === 'wifi') return 'Wi-Fi details are hidden';
  const flat = g.payload.replace(/\s+/g, ' ');
  return flat.length > 80 ? `${flat.slice(0, 80)}…` : flat;
}

function Decorator(p: StudioProps & { generated: GeneratedQR }) {
  const { deco, generated } = p;
  const { cfg } = deco;
  const [cat, setCat] = useState<Cat>('templates');
  const [applied, setApplied] = useState<{ id: string; cfg: typeof cfg } | null>(null);
  const [transparent, setTransparent] = useState(false);
  /** Colors chosen here. While null, the decorated QR uses the colors it was generated with. */
  const [colors, setColors] = useState<{ fg: string; bg: string } | null>(null);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [sizeChoice, setSizeChoice] = useState(String([512, 1024, 2048, 4096].includes(generated.size) ? generated.size : 1024));
  const [customSize, setCustomSize] = useState('1500');
  const [autoCheck, setAutoCheck] = useState(true);
  const [check, setCheck] = useState<Check>({ status: 'idle' });
  const [fixing, setFixing] = useState(false);
  const [fixReport, setFixReport] = useState<FixReport | null>(null);
  const [final, setFinal] = useState<FinalState>({ status: 'idle' });
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [logoNotice, setLogoNotice] = useState('');
  const { logo: ownLogo, error: ownLogoError, select: selectLogo, remove: removeLogo } = useLogo();
  const token = useRef(0);
  const finalRef = useRef<HTMLElement | null>(null);
  const finalButtonRef = useRef<HTMLButtonElement | null>(null);

  const fg = colors?.fg ?? generated.fg;
  const bg = colors?.bg ?? generated.bg;
  const text = generated.payload;
  const exportSize = sizeChoice === 'custom' ? Math.min(MAX_EXPORT, Math.max(MIN_EXPORT, Math.round(Number(customSize)) || 1024)) : Number(sizeChoice);

  // Start from the QR that was generated. A different logo arriving from step 1 is adopted; a regeneration that
  // carries the same logo (or none) leaves the choice made here alone.
  const prevLogo = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const href = generated.logo?.href ?? null;
    const prev = prevLogo.current;
    if (href && href !== prev && (prev !== undefined || cfg.logo.source === 'none')) deco.update('logo', { source: 'original' });
    else if (!href && cfg.logo.source === 'original') deco.update('logo', { source: 'none' });
    prevLogo.current = href;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated.id]);

  const ownLogoHref = useMemo(() => (ownLogo ? logoToDataUrl(ownLogo.img) : null), [ownLogo]);
  const sceneLogo = useMemo<SceneLogo>(() => {
    const s = cfg.logo.source;
    if (s === 'none') return null;
    if (s === 'original') return generated.logo ? { kind: 'image', href: generated.logo.href, aspect: generated.logo.aspect } : null;
    if (s === 'upload') return ownLogo && ownLogoHref ? { kind: 'image', href: ownLogoHref, aspect: ownLogo.img.width / ownLogo.img.height } : null;
    return logoById(s) ? { kind: 'builtin', id: s } : null;
  }, [cfg.logo.source, generated.logo, ownLogo, ownLogoHref]);

  // The matrix comes from step 1; nothing here creates or edits QR data.
  const input = useMemo<SceneInput>(
    () => ({ matrix: generated.matrix, cfg, fg, bg, logo: sceneLogo, idPrefix: 'pv', transparent }),
    [generated.matrix, cfg, fg, bg, sceneLogo, transparent],
  );
  const scene = useMemo(() => buildScene(input), [input]);
  const advice = useMemo(() => analyze(cfg, fg, bg, generated.ecl, scene.logoCoverage, !!sceneLogo, transparent), [cfg, fg, bg, generated.ecl, scene.logoCoverage, sceneLogo, transparent]);

  const runCheck = async (size: number): Promise<Check> => {
    try {
      const dual = await decodeBoth(await renderToCanvas(input, size, '#ffffff'), text);
      return { status: 'done', dual, verdict: verdict(dual) };
    } catch {
      return { status: 'error' };
    }
  };

  // Optional live scan check, debounced so dragging a slider does not decode on every tick.
  useEffect(() => {
    if (!autoCheck) {
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
  }, [scene.svg, autoCheck]);

  const manualCheck = async () => {
    const id = ++token.current;
    setCheck({ status: 'pending' });
    const r = await runCheck(exportSize);
    if (token.current === id) setCheck(r);
  };

  // ---- Fix scannability (decoration settings only; error correction belongs to step 1) ----
  const lowEcl = generated.ecl === 'L' || generated.ecl === 'M';
  const needsFix = advice.length > 0 || (check.status === 'done' && check.verdict !== 'ok');
  const currentState = (): FixState => ({ cfg, fg, bg, ecl: generated.ecl });
  const evaluateFix = async (st: FixState) => {
    const candidate: SceneInput = { matrix: generated.matrix, cfg: st.cfg, fg: st.fg, bg: st.bg, logo: sceneLogo, idPrefix: 'fx', transparent };
    const errors = analyze(st.cfg, st.fg, st.bg, st.ecl, buildScene(candidate).logoCoverage, !!sceneLogo, transparent).filter((a) => a.level === 'error').length;
    const dual = await decodeBoth(await renderToCanvas(candidate, 1024, '#ffffff'), text);
    const okCount = [dual.jsqr.status, dual.zxing.status].filter((x) => x === 'ok' || x === 'unavailable').length;
    return { pass: verdict(dual) === 'ok' && errors === 0, score: okCount * 10 - errors * 4 };
  };
  const runFix = async () => {
    setFixing(true);
    setFixReport(null);
    const before = currentState();
    const beforeColors = colors;
    try {
      const result = await autofix(before, { matrix: () => generated.matrix, logo: sceneLogo }, evaluateFix);
      if (result.outcome === 'fixed' || result.outcome === 'improved') {
        deco.replace(result.state.cfg);
        setColors({ fg: result.state.fg, bg: result.state.bg });
      }
      setFixReport({ result, before, beforeColors });
    } catch {
      setFixReport({ result: { outcome: 'unfixed', state: before, applied: [], evaluation: { pass: false, score: 0 } }, before, beforeColors });
    } finally {
      setFixing(false);
    }
  };
  const undoFix = () => {
    if (!fixReport) return;
    deco.replace(fixReport.before.cfg);
    setColors(fixReport.beforeColors);
    setFixReport(null);
  };
  const reportCurrent = fixReport && (fixReport.result.outcome === 'fixed' || fixReport.result.outcome === 'improved'
    ? deco.cfg === fixReport.result.state.cfg && fg === fixReport.result.state.fg && bg === fixReport.result.state.bg
    : deco.cfg === fixReport.before.cfg && fg === fixReport.before.fg && bg === fixReport.before.bg);

  // ---- Final QR ----
  const finalStale = final.status === 'ready' && final.svg !== scene.svg;
  useEffect(() => {
    if (final.status !== 'ready') return;
    const url = final.url;
    return () => URL.revokeObjectURL(url);
  }, [final]);

  const generateFinal = async () => {
    if (final.status === 'loading') return;
    const snapshot = input;
    const svg = scene.svg;
    setFinal({ status: 'loading' });
    setMessage(null);
    try {
      const shown = await renderToCanvas(snapshot, 1024, null);
      const blob = await new Promise<Blob>((resolve, reject) => shown.toBlob((b) => (b ? resolve(b) : reject(new Error('The preview image could not be created.'))), 'image/png'));
      const checkSize = Math.min(exportSize, 2048);
      const dual = await decodeBoth(await renderToCanvas(snapshot, checkSize, '#ffffff'), text);
      setFinal({ status: 'ready', input: snapshot, svg, url: URL.createObjectURL(blob), width: shown.width, height: shown.height, check: { status: 'done', dual, verdict: verdict(dual) }, checkedAt: checkSize });
    } catch (e) {
      setFinal({ status: 'error', message: e instanceof Error ? e.message : 'The final QR could not be generated. Try again, or use a smaller size.' });
    }
  };

  const doDownload = async () => {
    if (final.status !== 'ready' || finalStale) return;
    setDownloading(true);
    setMessage(null);
    try {
      const blob = await exportScene(final.input, format, exportSize);
      const ext = EXPORT_FORMATS.find((f) => f.id === format)?.ext ?? 'png';
      const name = `${sanitizeFilename(generated.filename).replace(/\.png$/, '')}.${ext}`;
      downloadBlob(blob, name);
      setMessage({ ok: true, text: `Download requested as ${name}. Check your browser's downloads.` });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'The export failed. Try a smaller size.' });
    } finally {
      setDownloading(false);
    }
  };
  const goToFinal = () => {
    finalRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    finalButtonRef.current?.focus({ preventScroll: true });
  };

  const applyPreset = (pr: Preset) => {
    const next = presetConfig(pr);
    deco.replace(next);
    setApplied({ id: pr.id, cfg: next });
    setColors({ fg: pr.fg, bg: pr.bg });
  };
  const pickBuiltIn = (id: string, color: string) => deco.update('logo', { source: id, bg: color });
  const onUploadLogo = async (f: File) => {
    const replacing = !!ownLogo;
    if (await selectLogo(f)) {
      deco.update('logo', { source: 'upload' });
      setLogoNotice(replacing ? 'Logo replaced.' : 'Logo added.');
    }
  };
  const onRemoveOwnLogo = () => {
    removeLogo();
    if (cfg.logo.source === 'upload') deco.update('logo', { source: 'none' });
    setLogoNotice('Logo removed.');
  };

  const finalDims = exportDims(scene.width, scene.height, exportSize);
  const raiseTarget: ECL = 'H';
  const canRaise = p.canRaiseEcl && ECL_RANK[generated.ecl] < ECL_RANK[raiseTarget];
  const panel: Record<Cat, React.ReactNode> = {
    templates: <TemplatesPanel activeId={applied && applied.cfg === cfg ? applied.id : null} onApply={applyPreset} onResetAll={() => { deco.resetAll(); setColors(null); setTransparent(false); }} />,
    frames: <FramesPanel store={deco} />,
    borders: <BordersPanel cfg={cfg} update={deco.update} reset={deco.reset} />,
    corners: <CornersPanel cfg={cfg} update={deco.update} reset={deco.reset} />,
    modules: <ModulesPanel cfg={cfg} update={deco.update} reset={deco.reset} />,
    colors: (
      <ColorsPanel cfg={cfg} update={deco.update} reset={deco.reset} fg={fg} bg={bg} onColors={(c) => setColors((o) => ({ fg, bg, ...(o ?? {}), ...c }))}
        onResetColors={() => setColors(null)} transparent={transparent} onTransparent={setTransparent} />
    ),
    decor: <DecorationsPanel cfg={cfg} update={deco.update} reset={deco.reset} />,
    logos: (
      <LogosPanel cfg={cfg} update={deco.update} reset={deco.reset} original={generated.logo} logo={ownLogo} logoError={ownLogoError} logoNotice={logoNotice}
        onSelectLogo={onUploadLogo} onRemoveLogo={onRemoveOwnLogo} ecl={generated.ecl} onRaiseEcl={canRaise ? p.onRaiseEcl : undefined} onPickBuiltIn={pickBuiltIn} />
    ),
  };

  return (
    <section className="studio" aria-label="QR Decorator">
      <div className="panel original-card">
        <img src={generated.originalUrl} alt="The original QR code from step 1" width={72} height={72} />
        <div className="original-text">
          <p className="original-title"><strong>Your QR from step 1</strong> <span className="badge">{MODE_LABELS[generated.mode]}</span></p>
          <p className="hint original-summary">{summarize(generated)}</p>
          <p className="hint">Error correction {ECL_INFO[generated.ecl].replace(' – ', ', ')}. The content is locked here, and decorating never changes it.</p>
        </div>
        <button type="button" className="btn ghost small" onClick={p.onBack}>
          <ArrowLeft size={15} aria-hidden="true" /> Edit in step 1
        </button>
      </div>
      {p.generatorStale && (
        <p className="msg warn" role="status">
          The Generator has changed since this QR was made. You are still decorating the QR above. Go back and generate again to use the new content.
        </p>
      )}

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
              <div className="scene" role="img" aria-label="Live preview of your decorated QR code" dangerouslySetInnerHTML={{ __html: scene.svg }} />
            </div>
            <p className="hint stage-note">Live preview. It updates as you change anything.</p>
            <ScanStatus check={check} disabled={false} onCheck={manualCheck} auto={autoCheck} onAuto={setAutoCheck} size={exportSize} showFix={needsFix} fixing={fixing} onFix={runFix} />
            {reportCurrent && fixReport && <FixSummary report={fixReport} onUndo={undoFix} onDismiss={() => setFixReport(null)} />}
          </div>
          <button type="button" className="link-btn export-link" onClick={goToFinal}>
            Ready? Generate the final QR <ArrowRight size={13} aria-hidden="true" />
          </button>
          {sceneLogo && lowEcl && (
            <div className="ecl-note">
              <p>
                <TriangleAlert size={15} aria-hidden="true" /> This QR uses error correction {generated.ecl}. A logo works best with Q or H.
              </p>
              <button type="button" className="btn ghost small" disabled={!canRaise} onClick={() => p.onRaiseEcl(raiseTarget)}>
                Raise to {raiseTarget} (same data, regenerated in step 1)
              </button>
              {!p.canRaiseEcl && <p className="hint">Fix the Generator first: it has changes that differ from this QR.</p>}
            </div>
          )}
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

      <FinalPanel
        panelRef={finalRef} buttonRef={finalButtonRef} state={final} stale={finalStale} canGenerate onGenerate={generateFinal} transparent={transparent}
        format={format} onFormat={setFormat} sizeChoice={sizeChoice} onSizeChoice={setSizeChoice} customSize={customSize} onCustomSize={setCustomSize}
        dims={finalDims} onDownload={doDownload} downloading={downloading} message={message}
      />
    </section>
  );
}
