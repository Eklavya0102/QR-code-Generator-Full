import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { ContentInput } from './components/ContentInput';
import { ImageUpload } from './components/ImageUpload';
import { QRCustomization, type Options } from './components/QRCustomization';
import { QRPreview, type Result } from './components/QRPreview';
import { StepNav, type View } from './components/StepNav';
import { PrivacyNotice } from './components/PrivacyNotice';
import { Footer } from './components/Footer';
import { useLogo } from './hooks/useLogo';
import { assessColors } from './lib/color';
import { canvasToBlob, describeQRError, renderQR, type ECL } from './lib/qr';
import { downloadBlob } from './lib/download';
import { makeGenerated, type GeneratedQR } from './lib/generated';
import { buildPayload, firstError, initialForms, isBuilderMode, type BuilderMode, type ContentMode, type Values } from './lib/payloads';
import { sanitizeFilename, validateInput, type InputResult } from './lib/validate';
import { useDecoration } from './studio/hooks/useDecoration';

// The decorator is loaded on first use, so the plain generator stays as light as before.
const Studio = lazy(() => import('./studio/components/Studio'));

const DEFAULTS: Options = { fg: '#1f2a1f', bg: '#ffffff', ecl: 'M', size: 1024, filename: '' };

export default function App() {
  const [mode, setMode] = useState<ContentMode>('text');
  const [forms, setForms] = useState<Record<BuilderMode, Values>>(initialForms);
  const [text, setText] = useState('');
  const [options, setOptions] = useState<Options>(DEFAULTS);
  const [result, setResult] = useState<Result | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [logoNotice, setLogoNotice] = useState('');
  const [view, setView] = useState<View>('generator');
  const [decoratorOpened, setDecoratorOpened] = useState(false);
  // The original QR handed from step 1 to step 2. Only generate() writes it.
  const [generated, setGenerated] = useState<GeneratedQR | null>(null);
  const generation = useRef(0);
  const deco = useDecoration();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { logo, error: logoError, select, remove } = useLogo();

  // Text and URL use the text box; every other content type is built from a form.
  const built = useMemo(() => (isBuilderMode(mode) ? buildPayload(mode, forms[mode]) : null), [mode, forms]);
  const validation = useMemo<InputResult>(() => {
    if (!built) return validateInput(mode === 'url' ? 'url' : 'text', text);
    return built.ok ? { ok: true, value: built.value } : { ok: false, error: firstError(built) };
  }, [built, mode, text]);
  const colors = useMemo(() => assessColors(options.fg, options.bg), [options.fg, options.bg]);
  const inputError = !built && text.length > 0 && !validation.ok ? validation.error : null;
  const onForm = (m: BuilderMode, key: string, value: string) => {
    setForms((f) => ({ ...f, [m]: { ...f[m], [key]: value } }));
    setGenError(null);
  };
  const canGenerate = validation.ok && !colors.blocking;

  const contentKey = built ? (validation.ok ? validation.value : JSON.stringify(forms[mode as BuilderMode])) : text;
  const signatureFor = (o: Options) => JSON.stringify([mode, contentKey, o.fg, o.bg, o.ecl, o.size, logo?.id ?? null]);
  const signature = signatureFor(options);
  const stale = result !== null && result.signature !== signature;
  /** The Generator has been edited since the QR the Decorator is working on was made. */
  const generatorStale = generated !== null && generated.signature !== signature;

  const patch = (p: Partial<Options>) => {
    setOptions((o) => ({ ...o, ...p }));
    setGenError(null);
    setStatus('');
  };

  /** The only place a QR code is created. `over` lets the Decorator ask for the same data at a higher error correction level. */
  const generate = async (over: Partial<Options> = {}) => {
    setStatus('');
    if (!validation.ok || colors.blocking || !canvasRef.current || busy) return;
    const opts: Options = { ...options, ...over };
    const settings = { fg: opts.fg, bg: opts.bg, ecl: opts.ecl, size: opts.size };
    const sig = signatureFor(opts);
    setBusy(true);
    try {
      await renderQR(canvasRef.current, validation.value, settings, logo?.img);
      if (over.ecl) setOptions(opts);
      setResult({ signature: sig, mode, settings, hasLogo: !!logo });
      setGenerated(makeGenerated({
        id: ++generation.current, payload: validation.value, mode, ecl: opts.ecl, fg: opts.fg, bg: opts.bg, size: opts.size,
        filename: opts.filename, signature: sig, logo, canvas: canvasRef.current,
      }));
      setGenError(null);
      setLogoNotice('');
      setStatus('QR code generated.');
    } catch (err) {
      setResult(null);
      setGenError(describeQRError(err));
    } finally {
      setBusy(false);
    }
  };
  const raiseEcl = (ecl: ECL) => void generate({ ecl });
  const decorate = () => {
    setDecoratorOpened(true);
    setView('decorator');
  };

  const download = async () => {
    if (!canvasRef.current || !result || stale) return;
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const name = sanitizeFilename(options.filename);
      downloadBlob(blob, name);
      setGenError(null);
      setStatus(`Download requested as ${name}. Check your browser's downloads.`);
    } catch {
      setStatus('');
      setGenError('The PNG could not be created. Try generating the code again.');
    }
  };

  const reset = () => {
    setMode('text');
    setText('');
    setForms(initialForms());
    setOptions(DEFAULTS);
    setResult(null);
    setGenerated(null);
    deco.resetAll();
    setGenError(null);
    setStatus('');
    setLogoNotice('');
    remove();
    const c = canvasRef.current;
    if (c) {
      c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
      c.width = 0;
      c.height = 0;
    }
  };

  const onSelectLogo = async (file: File) => {
    const replacing = !!logo;
    const ok = await select(file);
    if (!ok) return;
    const raised = options.ecl === 'L' || options.ecl === 'M';
    if (raised) patch({ ecl: 'H' });
    setLogoNotice(
      `${replacing ? 'Logo replaced.' : 'Logo added.'}${raised ? ' Error correction raised to H.' : ''} Generate again to apply it.`,
    );
  };

  const onRemoveLogo = () => {
    remove();
    setLogoNotice('Logo removed. Generate again to apply the change.');
  };

  const clearText = () => {
    setText('');
    setGenError(null);
    setStatus('');
  };

  return (
    <>
      <Header />
      <div className="wrap intro">
        {view === 'generator' ? (
          <>
            <h2>Turn any text or link into a QR code</h2>
            <p>Add your colors and an optional logo, check the preview, then download a full-resolution PNG, or decorate it in the next step. Everything happens in this tab.</p>
          </>
        ) : (
          <>
            <h2>Decorate your QR code</h2>
            <p>Style the QR code you just generated. Its content stays exactly as it was, and nothing here creates a new one.</p>
          </>
        )}
      </div>
      <StepNav view={view} onView={(v) => { if (v === 'decorator') setDecoratorOpened(true); setView(v); }} generated={generated !== null} />
      <main className="wrap workspace" hidden={view !== 'generator'}>
        <section className="panel" aria-labelledby="input-title">
          <h2 id="input-title">Create</h2>
          <div className="group">
            <h3>Content</h3>
            <ContentInput
              mode={mode}
              onMode={(m) => { setMode(m); setGenError(null); }}
              text={text}
              onText={(v) => { setText(v); setGenError(null); }}
              onClearText={clearText}
              textError={inputError}
              forms={forms}
              onForm={onForm}
              built={built}
            />
          </div>
          <QRCustomization options={options} blocking={colors.blocking} warnings={colors.warnings} hasLogo={!!logo} onChange={patch}>
            <ImageUpload logo={logo} error={logoError} notice={logoNotice} onSelect={onSelectLogo} onRemove={onRemoveLogo} />
          </QRCustomization>
          <div className="actions">
            <button type="button" className="btn primary" onClick={() => void generate()} disabled={!canGenerate || busy}>
              <Sparkles size={16} aria-hidden="true" /> {busy ? 'Generating…' : 'Generate QR code'}
            </button>
            <button type="button" className="btn ghost" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" /> Reset
            </button>
          </div>
          <PrivacyNotice />
        </section>
        <QRPreview
          canvasRef={canvasRef}
          result={result}
          stale={stale}
          error={genError}
          busy={busy}
          status={status}
          onDownload={download}
          onRegenerate={() => void generate()}
          onDecorate={decorate}
        />
      </main>
      {decoratorOpened && (
        <div className="wrap studio-wrap" hidden={view !== 'decorator'}>
          <Suspense fallback={<p className="msg muted" role="status">Loading the decorator…</p>}>
            <Studio generated={generated} generatorStale={generatorStale} onBack={() => setView('generator')} onRaiseEcl={raiseEcl} canRaiseEcl={!generatorStale && validation.ok && !busy} deco={deco} />
          </Suspense>
        </div>
      )}
      <Footer />
    </>
  );
}
