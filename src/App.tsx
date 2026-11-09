import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { ContentInput } from './components/ContentInput';
import { ImageUpload } from './components/ImageUpload';
import { QRCustomization, type Options } from './components/QRCustomization';
import { QRPreview, type Result } from './components/QRPreview';
import { PrivacyNotice } from './components/PrivacyNotice';
import { Footer } from './components/Footer';
import { useLogo } from './hooks/useLogo';
import { assessColors } from './lib/color';
import { canvasToBlob, describeQRError, renderQR } from './lib/qr';
import { downloadBlob } from './lib/download';
import { buildPayload, firstError, initialForms, isBuilderMode, type BuilderMode, type ContentMode, type Values } from './lib/payloads';
import { sanitizeFilename, validateInput, type InputResult } from './lib/validate';
import { useDecoration } from './studio/hooks/useDecoration';

// The decoration studio is loaded on first use, so the plain generator stays as light as before.
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
  const [view, setView] = useState<'generator' | 'studio'>('generator');
  const [studioOpened, setStudioOpened] = useState(false);
  const deco = useDecoration();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { logo, error: logoError, select, remove } = useLogo();

  // Keep the studio's logo source in step with the shared uploaded logo.
  const { update: updateDeco } = deco;
  const uploadSource = deco.cfg.logo.source === 'upload';
  useEffect(() => {
    if (logo) updateDeco('logo', { source: 'upload' });
    else if (uploadSource) updateDeco('logo', { source: 'none' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logo, updateDeco]);

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
  const signature = JSON.stringify([mode, contentKey, options.fg, options.bg, options.ecl, options.size, logo?.id ?? null]);
  const stale = result !== null && result.signature !== signature;

  const patch = (p: Partial<Options>) => {
    setOptions((o) => ({ ...o, ...p }));
    setGenError(null);
    setStatus('');
  };

  const generate = async () => {
    setStatus('');
    if (!validation.ok || colors.blocking || !canvasRef.current || busy) return;
    const settings = { fg: options.fg, bg: options.bg, ecl: options.ecl, size: options.size };
    setBusy(true);
    try {
      await renderQR(canvasRef.current, validation.value, settings, logo?.img);
      setResult({ signature, mode, settings, hasLogo: !!logo });
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
        <h2>Turn any text or link into a QR code</h2>
        <p>Add your colors and an optional logo, check the preview, then download a full-resolution PNG. Everything happens in this tab.</p>
      </div>
      <div className="wrap view-tabs" role="group" aria-label="Choose a mode">
        <button type="button" className={view === 'generator' ? 'view-tab on' : 'view-tab'} aria-pressed={view === 'generator'} onClick={() => setView('generator')}>
          Generator
        </button>
        <button
          type="button"
          className={view === 'studio' ? 'view-tab on' : 'view-tab'}
          aria-pressed={view === 'studio'}
          onClick={() => { setStudioOpened(true); setView('studio'); }}
        >
          Decoration Studio
        </button>
      </div>
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
            <button type="button" className="btn primary" onClick={generate} disabled={!canGenerate || busy}>
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
          onRegenerate={generate}
        />
      </main>
      {studioOpened && (
        <div className="wrap studio-wrap" hidden={view !== 'studio'}>
          <Suspense fallback={<p className="msg muted" role="status">Loading the Decoration Studio…</p>}>
            <Studio
              mode={mode}
              onMode={(m) => { setMode(m); setGenError(null); }}
              text={text}
              onText={(v) => { setText(v); setGenError(null); }}
              onClearText={clearText}
              forms={forms}
              onForm={onForm}
              built={built}
              payload={validation.ok ? validation.value : null}
              inputError={inputError}
              options={options}
              onOptions={patch}
              logo={logo}
              logoError={logoError}
              logoNotice={logoNotice}
              onSelectLogo={onSelectLogo}
              onRemoveLogo={onRemoveLogo}
              deco={deco}
            />
          </Suspense>
        </div>
      )}
      <Footer />
    </>
  );
}
