import type { RefObject } from 'react';
import { Download, QrCode, RefreshCw } from 'lucide-react';
import { ECL_INFO, type QRSettings } from '../lib/qr';
import type { Mode } from '../lib/validate';
import { PrivacyNotice } from './PrivacyNotice';

export interface Result {
  signature: string;
  mode: Mode;
  settings: QRSettings;
  hasLogo: boolean;
}

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  result: Result | null;
  stale: boolean;
  error: string | null;
  status: string;
  onDownload: () => void;
  onRegenerate: () => void;
}

export function QRPreview({ canvasRef, result, stale, error, status, onDownload, onRegenerate }: Props) {
  return (
    <section className="panel preview" aria-labelledby="preview-title">
      <h2 id="preview-title">Preview</h2>
      <div className="stage">
        {!result && (
          <div className="empty">
            <QrCode size={40} strokeWidth={1.25} aria-hidden="true" />
            <p>
              <strong>Your QR code appears here.</strong>
            </p>
            <p>Enter text or a URL, adjust the style, then choose Generate.</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          hidden={!result}
          className={stale ? 'qr stale' : 'qr'}
          role="img"
          aria-label="Generated QR code preview"
        />
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
              <dd>{result.mode === 'url' ? 'URL' : 'Text'}</dd>
            </div>
            <div>
              <dt>Error correction</dt>
              <dd>{ECL_INFO[result.settings.ecl].split(' – ')[0]}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>
                {result.settings.size} px
              </dd>
            </div>
            <div>
              <dt>Logo</dt>
              <dd>{result.hasLogo ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Colors</dt>
              <dd>
                <span className="chip" style={{ background: result.settings.fg }} />
                <span className="chip" style={{ background: result.settings.bg }} />
              </dd>
            </div>
          </dl>
          <div className="actions">
            <button type="button" className="btn primary" onClick={onDownload} disabled={stale}>
              <Download size={16} aria-hidden="true" /> Download PNG
            </button>
            <button type="button" className="btn ghost" onClick={onRegenerate}>
              <RefreshCw size={16} aria-hidden="true" /> Regenerate
            </button>
          </div>
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
      {status && <p className="msg ok" aria-hidden="true">{status}</p>}
      <PrivacyNotice />
      <p className="msg muted">Always test a code with your own device before printing or sharing it. Scanning cannot be guaranteed in every condition.</p>
    </section>
  );
}
