import { CircleCheck, CircleX, Loader, ScanLine, TriangleAlert, Undo2, WandSparkles } from 'lucide-react';
import type { FixResult, FixState } from '../lib/autofix';
import type { DualDecode, Verdict } from '../lib/decode';

export type Check = { status: 'idle' } | { status: 'pending' } | { status: 'error' } | { status: 'done'; dual: DualDecode; verdict: Verdict };
export interface FixReport {
  result: FixResult;
  before: FixState;
  /** The Decorator's color override before the fix, so Undo restores it exactly. */
  beforeColors: { fg: string; bg: string } | null;
}

const DEC_NAMES = { jsqr: 'jsQR', zxing: 'ZXing' } as const;

/** Per-decoder results as small chips. */
export function DecoderChips({ dual }: { dual: DualDecode }) {
  const states = [['jsqr', dual.jsqr.status], ['zxing', dual.zxing.status]] as const;
  return (
    <ul className="dec-list" aria-label="Decoder results">
      {states.map(([k, st]) => (
        <li key={k} className={st === 'ok' ? 'dec ok' : st === 'unavailable' ? 'dec' : 'dec bad'}>
          {DEC_NAMES[k]}: {st === 'ok' ? 'read it' : st === 'unavailable' ? 'not loaded' : st === 'mismatch' ? 'read different data' : 'could not read it'}
        </li>
      ))}
    </ul>
  );
}

export function ScanStatus({ check, disabled, onCheck, auto, onAuto, size, showFix, fixing, onFix }: {
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
    chips = <DecoderChips dual={dual} />;
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

export function FixSummary({ report, onUndo, onDismiss }: { report: FixReport; onUndo: () => void; onDismiss: () => void }) {
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
