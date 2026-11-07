import type { Mode } from '../lib/validate';

interface Props {
  mode: Mode;
  onChange: (m: Mode) => void;
}

const OPTIONS: { value: Mode; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'url', label: 'URL' },
];

export function InputModeSelector({ mode, onChange }: Props) {
  return (
    <fieldset className="segmented">
      <legend>Content type</legend>
      {OPTIONS.map((o) => (
        <label key={o.value} className={mode === o.value ? 'seg on' : 'seg'}>
          <input type="radio" name="mode" value={o.value} checked={mode === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
