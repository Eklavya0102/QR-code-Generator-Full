import { useId, useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { BuildResult, BuilderDef, FieldSpec, Values } from '../lib/payloads';

interface Props {
  def: BuilderDef;
  values: Values;
  result: BuildResult;
  onChange: (key: string, value: string) => void;
}

/** Renders a content builder from its field list. Errors appear once a field has been used. */
export function BuilderForm({ def, values, result, onChange }: Props) {
  const base = useId();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = result.ok ? {} : result.errors;
  const visible = def.fields.filter((f) => !f.showIf || f.showIf(values));

  const rows: ReactNode[] = [];
  let pair: FieldSpec[] = [];
  const flush = () => {
    if (pair.length) rows.push(<div className="grid2" key={`g-${pair[0].key}`}>{pair.map(renderField)}</div>);
    pair = [];
  };
  function renderField(f: FieldSpec) {
    const used = touched[f.key] || (values[f.key] ?? '').trim() !== '';
    return (
      <FieldView key={f.key} spec={f} id={`${base}-${f.key}`} value={values[f.key] ?? ''} error={used ? errors[f.key] : undefined}
        onChange={(v) => onChange(f.key, v)} onBlur={() => setTouched((t) => ({ ...t, [f.key]: true }))} />
    );
  }
  for (const f of visible) {
    if (f.half) pair.push(f);
    else {
      flush();
      rows.push(renderField(f));
    }
    if (pair.length === 2) flush();
  }
  flush();

  return (
    <div className="builder">
      <p className="hint builder-summary">{def.summary}</p>
      {rows}
      {errors._form && (
        <p className="msg error" role="alert">
          {errors._form}
        </p>
      )}
      {result.ok && def.id !== 'wifi' && (
        <details className="encoded">
          <summary>Show the encoded text</summary>
          <code>{result.value}</code>
        </details>
      )}
    </div>
  );
}

function FieldView({ spec, id, value, error, onChange, onBlur }: { spec: FieldSpec; id: string; value: string; error?: string; onChange: (v: string) => void; onBlur: () => void }) {
  const [show, setShow] = useState(false);
  const errId = `${id}-err`;
  const aria = { 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? errId : undefined };
  const err = error && (
    <p id={errId} className="msg error" role="alert">
      {error}
    </p>
  );
  if (spec.type === 'note') return <p className="hint note">{spec.hint}</p>;
  if (spec.type === 'checkbox') {
    return (
      <div className="field">
        <label className="check" htmlFor={id}>
          <input id={id} type="checkbox" checked={value === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : '')} /> {spec.label}
        </label>
        {spec.hint && <span className="hint">{spec.hint}</span>}
      </div>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id}>{spec.label}</label>
      {spec.type === 'select' ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {spec.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : spec.type === 'textarea' ? (
        <textarea id={id} rows={3} value={value} maxLength={spec.maxLength} placeholder={spec.placeholder} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} {...aria} />
      ) : spec.type === 'password' ? (
        <div className="pw">
          <input id={id} type={show ? 'text' : 'password'} value={value} maxLength={spec.maxLength} autoComplete="off" autoCapitalize="off" spellCheck={false}
            placeholder={spec.placeholder} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} {...aria} />
          <button type="button" className="icon-btn" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((s) => !s)}>
            {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      ) : (
        <input id={id} type={spec.type === 'text' ? 'text' : spec.type} inputMode={spec.type === 'tel' ? 'tel' : undefined} value={value} maxLength={spec.maxLength}
          autoComplete={spec.autoComplete} autoCapitalize="off" spellCheck={false} placeholder={spec.placeholder} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} {...aria} />
      )}
      {spec.hint && !error && <span className="hint">{spec.hint}</span>}
      {err}
    </div>
  );
}
