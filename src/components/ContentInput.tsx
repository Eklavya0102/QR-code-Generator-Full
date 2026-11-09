import { BUILDERS, isBuilderMode, type BuildResult, type ContentMode, type BuilderMode, type Values } from '../lib/payloads';
import { BuilderForm } from './BuilderForm';
import { InputModeSelector } from './InputModeSelector';
import { TextInputPanel } from './TextInputPanel';

export interface ContentInputProps {
  mode: ContentMode;
  onMode: (m: ContentMode) => void;
  text: string;
  onText: (v: string) => void;
  onClearText: () => void;
  textError: string | null;
  forms: Record<BuilderMode, Values>;
  onForm: (mode: BuilderMode, key: string, value: string) => void;
  /** Result of the active builder (null in Text and URL modes). */
  built: BuildResult | null;
}

/** Content type picker plus the matching input: a text box for Text/URL, or a guided form for everything else. */
export function ContentInput(p: ContentInputProps) {
  const { mode } = p;
  return (
    <>
      <InputModeSelector mode={mode} onChange={p.onMode} />
      {isBuilderMode(mode) && p.built ? (
        <BuilderForm def={BUILDERS[mode]} values={p.forms[mode]} result={p.built} onChange={(k, v) => p.onForm(mode, k, v)} />
      ) : (
        <TextInputPanel mode={mode === 'url' ? 'url' : 'text'} value={p.text} error={p.textError} onChange={p.onText} onClear={p.onClearText} />
      )}
    </>
  );
}
