import { useId } from 'react';
import { checkEmvPayload } from '../lib/payloads';
import { MAX_TEXT_LENGTH, type Mode } from '../lib/validate';

interface Props {
  mode: Mode;
  value: string;
  error: string | null;
  onChange: (v: string) => void;
  onClear: () => void;
}

export function TextInputPanel({ mode, value, error, onChange, onClear }: Props) {
  const id = useId();
  const errId = `${id}-err`;
  const emv = mode === 'text' ? checkEmvPayload(value) : null;
  return (
    <div className="field">
      <label htmlFor={id}>{mode === 'url' ? 'Web address or link' : 'Text to encode'}</label>
      <textarea
        id={id}
        rows={mode === 'url' ? 3 : 6}
        value={value}
        spellCheck={mode === 'text'}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder={mode === 'url' ? 'https://example.com/page?ref=qr#section' : 'Type or paste anything'}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="meta-row">
        <span className={value.length > MAX_TEXT_LENGTH ? 'count over' : 'count'}>
          {value.length} / {MAX_TEXT_LENGTH}
        </span>
        {value.length > 0 && (
          <button type="button" className="link-btn" onClick={onClear}>
            Clear text
          </button>
        )}
      </div>
      {mode === 'url' && <p className="hint">WhatsApp invite links work too. The URL is encoded exactly as typed.</p>}
      {emv && (
        <p className={emv.valid ? 'msg ok' : 'msg warn'} role="status">
          {emv.valid
            ? 'This looks like an EMVCo payment QR (the format Fonepay, NepalPay and many banks use) and its checksum is valid. Keep the text exactly as issued; only change the styling.'
            : 'This looks like an EMVCo payment QR, but its checksum does not match. Payment apps will probably reject it. Paste the text exactly as your bank or wallet issued it.'}
        </p>
      )}
      {error && (
        <p id={errId} className="msg error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
