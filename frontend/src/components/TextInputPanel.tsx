import { useId } from 'react';
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
        {mode === 'url' && <span className="hint">WhatsApp invite links work too. The URL is encoded exactly as typed.</span>}
        {value.length > 0 && (
          <button type="button" className="link-btn" onClick={onClear}>
            Clear text
          </button>
        )}
      </div>
      {error && (
        <p id={errId} className="msg error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
