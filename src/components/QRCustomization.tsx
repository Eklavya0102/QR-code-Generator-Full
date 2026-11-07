import { useId, type ReactNode } from 'react';
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
  /** Rendered at the top of the Appearance group (the logo upload). */
  children?: ReactNode;
}

const ECL_LEVELS = Object.keys(ECL_INFO) as ECL[];

export function QRCustomization({ options, blocking, warnings, hasLogo, onChange, children }: Props) {
  const id = useId();
  const [eclPercent] = ECL_INFO[options.ecl].split(' – ').slice(1);
  return (
    <>
      <div className="group">
        <h3>Appearance</h3>
        {children}
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
        <fieldset className="field ecl">
          <legend className="label">Error correction</legend>
          <div className="segmented fill">
            {ECL_LEVELS.map((k) => {
              const [letter, detail] = ECL_INFO[k].split(' – ');
              return (
                <label key={k} className={options.ecl === k ? 'seg stack on' : 'seg stack'}>
                  <input type="radio" name="ecl" value={k} checked={options.ecl === k} onChange={() => onChange({ ecl: k })} />
                  <span className="seg-main">{letter}</span>
                  <span className="seg-sub">{detail.split(' ')[0]}</span>
                </label>
              );
            })}
          </div>
          <p className="hint">Higher levels survive more damage or a logo, but make the code denser. Selected: {eclPercent}.</p>
        </fieldset>
        {hasLogo && (options.ecl === 'L' || options.ecl === 'M') && (
          <p className="msg warn">With a logo, level Q or H is safer. Level {options.ecl} leaves little room for recovery.</p>
        )}
      </div>

      <div className="group">
        <h3>Output</h3>
        <div className="grid2">
          <div className="field">
            <label htmlFor={`${id}size`}>Download size</label>
            <select id={`${id}size`} value={options.size} onChange={(e) => onChange({ size: Number(e.target.value) })}>
              {[512, 1024, 2048].map((s) => (
                <option key={s} value={s}>
                  {s} × {s} px
                </option>
              ))}
            </select>
          </div>
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
      </div>
    </>
  );
}
