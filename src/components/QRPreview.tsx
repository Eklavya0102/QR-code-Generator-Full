import type { RefObject } from 'react';
import { ArrowRight, CircleCheck, Download, QrCode, RefreshCw } from 'lucide-react';
import { ECL_INFO, type QRSettings } from '../lib/qr';
import { MODE_LABELS, type ContentMode } from '../lib/payloads';

export interface Result {
  signature: string;
  mode: ContentMode;
  settings: QRSettings;
  hasLogo: boolean;
}

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  result: Result | null;
  stale: boolean;
  error: string | null;
  busy: boolean;
  status: string;
  onDownload: () => void;
  onRegenerate: () => void;
  /** Hands the generated QR to step 2. */
  onDecorate?: () => void;
}

export function QRPreview({ canvasRef, result, stale, error, busy, status, onDownload, onRegenerate, onDecorate }: Props) {
  return (
    <section className="panel preview" aria-labelledby="preview-title">
      <div className="panel-head">
        <h2 id="preview-title">Preview</h2>
        {result && <span className={stale ? 'badge warn' : 'badge ok'}>{stale ? 'Out of date' : 'Up to date'}</span>}
      </div>

      {/*
        Fixed preview box. The frame is always square and its size depends only on the available width,
        never on the QR code. The canvas keeps its full export resolution (its width/height attributes,
        which is what "Download PNG" exports) and is only scaled down visually inside the stage.
      */}
      <div className={result ? 'qr-frame' : 'qr-frame is-empty'} aria-busy={busy}>
        <div className="qr-stage">
          <canvas
            ref={canvasRef}
            hidden={!result}
            className={stale ? 'qr stale' : 'qr'}
            role="img"
            aria-label="Generated QR code preview"
          />
        </div>
        {!result && (
          <div className="empty">
            <QrCode size={40} strokeWidth={1.25} aria-hidden="true" />
            <p>
              <strong>{busy ? 'Generating…' : 'Your QR code appears here.'}</strong>
            </p>
            {!busy && <p>Enter text or a URL, adjust the style, then choose Generate.</p>}
          </div>
        )}
      </div>

      {result && (
        <>
          {stale && (
            <p className="msg warn" role="status">
              Settings changed since this code was generated. Regenerate before downloading.
            </p>
          )}
          <dl className="facts">
            <div>
              <dt>Type</dt>
              <dd>{MODE_LABELS[result.mode]}</dd>
            </div>
            <div>
              <dt>Error correction</dt>
              <dd>{ECL_INFO[result.settings.ecl].split(' – ')[0]}</dd>
            </div>
            <div>
              <dt>Download size</dt>
              <dd>
                {result.settings.size} × {result.settings.size} px
              </dd>
            </div>
            <div>
              <dt>Logo</dt>
              <dd>{result.hasLogo ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Colors</dt>
              <dd>
                <span className="swatch">
                  <span className="chip" style={{ background: result.settings.fg }} />
                  {result.settings.fg}
                </span>
                <span className="swatch">
                  <span className="chip" style={{ background: result.settings.bg }} />
                  {result.settings.bg}
                </span>
              </dd>
            </div>
          </dl>
          <div className="actions">
            <button type="button" className="btn primary" onClick={onDownload} disabled={stale}>
              <Download size={16} aria-hidden="true" /> Download PNG
            </button>
            <button type="button" className="btn ghost" onClick={onRegenerate} disabled={busy}>
              <RefreshCw size={16} aria-hidden="true" /> Regenerate
            </button>
          </div>
          {onDecorate && (
            <button type="button" className="btn ghost wide next-step" onClick={onDecorate} disabled={stale}>
              Decorate this QR <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </>
      )}
      {error && (
        <p className="msg error" role="alert">
          {error}
        </p>
      )}
      <p className="visually-hidden" role="status" aria-live="polite">
        {status}
      </p>
      {status && (
        <p className="msg ok with-icon" aria-hidden="true">
          <CircleCheck size={16} /> {status}
        </p>
      )}
      <p className="msg muted">Always test a code with your own device before printing or sharing it. Scanning cannot be guaranteed in every condition.</p>
    </section>
  );
}
