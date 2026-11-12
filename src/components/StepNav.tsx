import { Check } from 'lucide-react';

export type View = 'generator' | 'decorator';

interface Props {
  view: View;
  onView: (v: View) => void;
  /** A QR code has been generated, so step 1 is complete. */
  generated: boolean;
}

/** The two-step workflow: generate the original QR, then decorate it. */
export function StepNav({ view, onView, generated }: Props) {
  return (
    <nav className="wrap steps" aria-label="Workflow steps">
      <button type="button" className={view === 'generator' ? 'step on' : generated ? 'step done' : 'step'} aria-current={view === 'generator' ? 'step' : undefined} onClick={() => onView('generator')}>
        <span className="step-num" aria-hidden="true">{generated && view !== 'generator' ? <Check size={14} /> : 1}</span>
        <span>Generate QR</span>
      </button>
      <span className="steps-sep" aria-hidden="true" />
      <button type="button" className={view === 'decorator' ? 'step on' : 'step'} aria-current={view === 'decorator' ? 'step' : undefined} onClick={() => onView('decorator')}>
        <span className="step-num" aria-hidden="true">2</span>
        <span>Decorate QR</span>
      </button>
      <span className="steps-note">{view === 'generator' ? 'Step 1 of 2: create your QR code.' : 'Step 2 of 2: decorate it, then generate the final QR.'}</span>
    </nav>
  );
}
