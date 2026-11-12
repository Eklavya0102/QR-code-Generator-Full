import type { RefObject } from 'react';
import { CircleCheck, Download, Loader, Sparkles, TriangleAlert } from 'lucide-react';
import { EXPORT_FORMATS, MAX_EXPORT, MIN_EXPORT, type ExportFormat } from '../lib/export';
import type { SceneInput } from '../lib/scene';
import { DecoderChips, type Check } from './ScanParts';
import { Segmented, SelectField } from './controls';

export type FinalState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; input: SceneInput; svg: string; url: string; width: number; height: number; check: Check; checkedAt: number };

interface Props {
  panelRef: RefObject<HTMLElement | null>;
  buttonRef: RefObject<HTMLButtonElement | null>;
  state: FinalState;
  /** The design was changed after the final QR was generated. */
  stale: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  transparent: boolean;
  format: ExportFormat;
  onFormat: (f: ExportFormat) => void;
  sizeChoice: string;
  onSizeChoice: (v: string) => void;
  customSize: string;
  onCustomSize: (v: string) => void;
  dims: { width: number; height: number } | null;
  onDownload: () => void;
  downloading: boolean;
  message: { ok: boolean; text: string } | null;
}

/** Step 2's last stage: generate the final decorated QR, see what will be exported, and download it. */
export function FinalPanel(p: Props) {
  const ready = p.state.status === 'ready';
  const current = ready && !p.stale;
  const label =
    p.state.status === 'loading' ? 'Generating…'
    : p.state.status === 'error' ? 'Try again'
    : ready && p.stale ? 'Update Final QR'
    : ready ? 'Regenerate Final QR'
    : 'Generate Final QR';
  return (
    <section ref={p.panelRef} className="panel final" aria-labelledby="final-title" tabIndex={-1}>
      <div className="panel-head">
        <h2 id="final-title">Final QR</h2>
        {current && <span className="badge ok">Ready</span>}
        {ready && p.stale && <span className="badge warn">Out of date</span>}
      </div>
      <div className="final-layout">
        <div className={p.transparent ? 'final-box checker' : 'final-box'} aria-busy={p.state.status === 'loading'}>
          {p.state.status === 'ready' ? (
            <img src={p.state.url} alt="Final decorated QR code" className={p.stale ? 'stale' : undefined} />
          ) : (
            <p className="final-empty">{p.state.status === 'loading' ? 'Rendering your design…' : 'Your final QR appears here.'}</p>
          )}
        </div>

        <div className="final-controls">
          {p.state.status === 'idle' && <p>Happy with the live preview? Generate the final QR to check it with two decoders and unlock the download.</p>}
          <button
            type="button"
            className={current ? 'btn ghost wide' : 'btn primary wide big'}
            onClick={p.onGenerate}
            disabled={!p.canGenerate || p.state.status === 'loading'}
            ref={p.buttonRef}
          >
            {p.state.status === 'loading' ? <Loader size={17} className="spin" aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />} {label}
          </button>

          {p.state.status === 'error' && (
            <p className="msg error" role="alert">
              <TriangleAlert size={15} aria-hidden="true" /> {p.state.message}
            </p>
          )}
          {current && p.state.status === 'ready' && (
            <div className="final-check" role="status">
              <p className="msg ok with-icon">
                <CircleCheck size={16} aria-hidden="true" /> <span>Final QR generated and checked at {p.state.checkedAt} px.</span>
              </p>
              <DecoderChips dual={p.state.check.status === 'done' ? p.state.check.dual : { jsqr: { status: 'fail' }, zxing: { status: 'unavailable' } }} />
              {p.state.check.status === 'done' && p.state.check.verdict !== 'ok' && (
                <p className="msg warn">One or both decoders could not read this design. You can still download it, but test it on a phone first, or go back and use Fix scannability.</p>
              )}
              <p className="hint">A pass is a good sign, not a guarantee. Always test the printed or on-screen code with your own phone.</p>
            </div>
          )}
          {ready && p.stale && <p className="msg warn" role="status">You changed the design after generating the final QR. Update it before downloading.</p>}

          <h3>Download</h3>
          <Segmented label="Format" value={p.format} options={EXPORT_FORMATS.map((f) => ({ value: f.id, label: f.label }))} onChange={p.onFormat} />
          <div className="grid2">
            <SelectField label="Size (longest side)" value={p.sizeChoice} options={[{ value: '512', label: '512 px' }, { value: '1024', label: '1024 px' }, { value: '2048', label: '2048 px' }, { value: '4096', label: '4096 px' }, { value: 'custom', label: 'Custom' }]} onChange={p.onSizeChoice} />
            {p.sizeChoice === 'custom' && (
              <div className="field">
                <label htmlFor="final-custom">Custom size (px, {MIN_EXPORT} to {MAX_EXPORT})</label>
                <input id="final-custom" type="number" inputMode="numeric" min={MIN_EXPORT} max={MAX_EXPORT} value={p.customSize} onChange={(e) => p.onCustomSize(e.target.value)} />
              </div>
            )}
          </div>
          {p.dims && <p className="hint">Output: {p.dims.width} × {p.dims.height} px.{p.format === 'jpeg' || p.format === 'pdf' ? ' Transparent areas become white.' : ''}</p>}
          {p.format === 'svg' && <p className="hint">SVG keeps frame text as live text, so it uses a common system font. Use PNG or PDF when the exact lettering matters.</p>}
          <button type="button" className="btn primary wide" onClick={p.onDownload} disabled={!current || p.downloading}>
            {p.downloading ? <Loader size={16} className="spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />} {p.downloading ? 'Preparing…' : `Download ${EXPORT_FORMATS.find((f) => f.id === p.format)?.label}`}
          </button>
          {!current && !ready && <p className="hint">The download unlocks after you generate the final QR.</p>}
          {p.message && (
            <p className={p.message.ok ? 'msg ok with-icon' : 'msg error'} role={p.message.ok ? 'status' : 'alert'}>
              {p.message.ok && <CircleCheck size={16} aria-hidden="true" />} {p.message.text}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
