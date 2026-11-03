import { useId } from 'react';
import { ECL_INFO, type ECL } from '../lib/qr';

export interface Options {
  fg: string;
  bg: string;
  ecl: ECL;
  size: number;
  filename: string;
}

interface Props {
  options: Options;
  blocking: string | null;
  warnings: string[];
  hasLogo: boolean;
  onChange: (patch: Partial<Options>) => void;
}

export function QRCustomization({ options, blocking, warnings, hasLogo, onChange }: Props) {
  const id = useId();
  return (
    <div className="custom">
      <div className="grid2">
        <div className="field">
          <label htmlFor={`${id}fg`}>Foreground color</label>
          <div className="color">
            <input id={`${id}fg`} type="color" value={options.fg} onChange={(e) => onChange({ fg: e.target.value })} />
            <code>{options.fg}</code>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${id}bg`}>Background color</label>
          <div className="color">
            <input id={`${id}bg`} type="color" value={options.bg} onChange={(e) => onChange({ bg: e.target.value })} />
            <code>{options.bg}</code>
          </div>
        </div>
      </div>
      {blocking && (
        <p className="msg error" role="alert">
          {blocking}
        </p>
      )}
      {warnings.map((w) => (
        <p key={w} className="msg warn">
          {w}
        </p>
      ))}
      <div className="grid2">
        <div className="field">
          <label htmlFor={`${id}ecl`}>Error correction</label>
          <select id={`${id}ecl`} value={options.ecl} onChange={(e) => onChange({ ecl: e.target.value as ECL })}>
            {(Object.keys(ECL_INFO) as ECL[]).map((k) => (
              <option key={k} value={k}>
                {ECL_INFO[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}size`}>Output size</label>
          <select id={`${id}size`} value={options.size} onChange={(e) => onChange({ size: Number(e.target.value) })}>
            {[512, 1024, 2048].map((s) => (
              <option key={s} value={s}>
                {s} × {s} px
              </option>
            ))}
          </select>
        </div>
      </div>
      {hasLogo && (options.ecl === 'L' || options.ecl === 'M') && (
        <p className="msg warn">With a logo, level Q or H is safer. Level {options.ecl} leaves little room for recovery.</p>
      )}
      <div className="field">
        <label htmlFor={`${id}name`}>File name (optional)</label>
        <input
          id={`${id}name`}
          type="text"
          maxLength={60}
          placeholder="qr-code"
          value={options.filename}
          onChange={(e) => onChange({ filename: e.target.value })}
        />
      </div>
    </div>
  );
}
