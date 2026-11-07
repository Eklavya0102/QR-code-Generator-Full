import { useId, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

export function SectionHead({ title, onReset, resetLabel = 'Reset' }: { title: string; onReset?: () => void; resetLabel?: string }) {
  return (
    <div className="sec-head">
      <h3>{title}</h3>
      {onReset && (
        <button type="button" className="link-btn" onClick={onReset} aria-label={`${resetLabel} ${title.toLowerCase()}`}>
          <RotateCcw size={13} aria-hidden="true" /> {resetLabel}
        </button>
      )}
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, unit = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="field slider">
      <div className="slider-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{Math.round(value * 100) / 100}{unit}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="color">
        <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <code>{value}</code>
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="field toggle-row">
      <div className="toggle-text">
        <label htmlFor={id}>{label}</label>
        {hint && <span className="hint">{hint}</span>}
      </div>
      <input id={id} className="switch" type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

export function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function TextField({ label, value, onChange, maxLength = 40, placeholder }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number; placeholder?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const name = useId();
  return (
    <fieldset className="field">
      <legend className="label">{label}</legend>
      <div className="segmented fill">
        {options.map((o) => (
          <label key={o.value} className={value === o.value ? 'seg on' : 'seg'}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A selectable option with a rendered thumbnail. */
export function Tile({ selected, label, src, onClick, wide }: { selected: boolean; label: string; src?: string; onClick: () => void; wide?: boolean }) {
  return (
    <button type="button" className={`tile${selected ? ' on' : ''}${wide ? ' wide' : ''}`} onClick={onClick} aria-pressed={selected}>
      {src && <img src={src} alt="" loading="lazy" decoding="async" />}
      <span>{label}</span>
    </button>
  );
}

export function Notes({ children }: { children: ReactNode }) {
  return <p className="hint note">{children}</p>;
}
