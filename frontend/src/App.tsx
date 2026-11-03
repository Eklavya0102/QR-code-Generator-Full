import { useMemo, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { InputModeSelector } from './components/InputModeSelector';
import { TextInputPanel } from './components/TextInputPanel';
import { ImageUpload } from './components/ImageUpload';
import { QRCustomization, type Options } from './components/QRCustomization';
import { QRPreview, type Result } from './components/QRPreview';
import { PrivacyNotice } from './components/PrivacyNotice';
import { Footer } from './components/Footer';
import { useLogo } from './hooks/useLogo';
import { assessColors } from './lib/color';
import { canvasToBlob, describeQRError, renderQR } from './lib/qr';
import { downloadBlob } from './lib/download';
import { sanitizeFilename, validateInput, type Mode } from './lib/validate';

const DEFAULTS: Options = { fg: '#1f2a1f', bg: '#ffffff', ecl: 'M', size: 1024, filename: '' };

export default function App() {
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [options, setOptions] = useState<Options>(DEFAULTS);
  const [result, setResult] = useState<Result | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { logo, error: logoError, select, remove } = useLogo();

  const validation = useMemo(() => validateInput(mode, text), [mode, text]);
  const colors = useMemo(() => assessColors(options.fg, options.bg), [options.fg, options.bg]);
  const inputError = text.length > 0 && !validation.ok ? validation.error : null;
  const canGenerate = validation.ok && !colors.blocking;

  const signature = JSON.stringify([mode, text, options.fg, options.bg, options.ecl, options.size, logo?.id ?? null]);
  const stale = result !== null && result.signature !== signature;

  const patch = (p: Partial<Options>) => {
    setOptions((o) => ({ ...o, ...p }));
    setGenError(null);
    setStatus('');
  };

  const generate = async () => {
    setStatus('');
    if (!validation.ok || colors.blocking || !canvasRef.current) return;
    const settings = { fg: options.fg, bg: options.bg, ecl: options.ecl, size: options.size };
    try {
      await renderQR(canvasRef.current, validation.value, settings, logo?.img);
      setResult({ signature, mode, settings, hasLogo: !!logo });
      setGenError(null);
      setStatus('QR code generated.');
    } catch (err) {
      setResult(null);
      setGenError(describeQRError(err));
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
    setOptions(DEFAULTS);
    setResult(null);
    setGenError(null);
    setStatus('');
    remove();
    const c = canvasRef.current;
    if (c) {
      c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
      c.width = 0;
      c.height = 0;
    }
  };

  const onSelectLogo = async (file: File) => {
    const ok = await select(file);
    if (ok && (options.ecl === 'L' || options.ecl === 'M')) patch({ ecl: 'H' });
  };

  return (
    <>
      <Header />
      <main className="wrap workspace">
        <section className="panel" aria-labelledby="input-title">
          <h2 id="input-title">Create</h2>
          <InputModeSelector mode={mode} onChange={(m) => { setMode(m); setGenError(null); }} />
          <TextInputPanel mode={mode} value={text} error={inputError} onChange={(v) => { setText(v); setGenError(null); }} />
          <ImageUpload logo={logo} error={logoError} onSelect={onSelectLogo} onRemove={remove} />
          <QRCustomization options={options} blocking={colors.blocking} warnings={colors.warnings} hasLogo={!!logo} onChange={patch} />
          <div className="actions">
            <button type="button" className="btn primary" onClick={generate} disabled={!canGenerate}>
              <Sparkles size={16} aria-hidden="true" /> Generate QR code
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
          status={status}
          onDownload={download}
          onRegenerate={generate}
        />
      </main>
      <Footer />
    </>
  );
}
