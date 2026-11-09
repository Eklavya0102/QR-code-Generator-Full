import { useId } from 'react';
import { BUILDER_MODES, MODE_LABELS, type ContentMode } from '../lib/payloads';

interface Props {
  mode: ContentMode;
  onChange: (m: ContentMode) => void;
}

const OPTIONS: ContentMode[] = ['text', 'url', ...BUILDER_MODES];

export function InputModeSelector({ mode, onChange }: Props) {
  // A unique group name per instance: the Studio renders a second selector, and same-named radios in one
  // document would otherwise behave as a single group and uncheck each other.
  const name = useId();
  return (
    <fieldset className="segmented wrap">
      <legend>Content type</legend>
      {OPTIONS.map((m) => (
        <label key={m} className={mode === m ? 'seg on' : 'seg'}>
          <input type="radio" name={name} value={m} checked={mode === m} onChange={() => onChange(m)} />
          {MODE_LABELS[m]}
        </label>
      ))}
    </fieldset>
  );
}
