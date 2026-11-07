import { useCallback, useMemo, useReducer } from 'react';
import { FRAME_TEMPLATES } from '../data/frameTemplates';
import { makeDefaultConfig, type DecorationCategory, type DecorationConfig } from '../types';

type Action =
  | { type: 'update'; category: DecorationCategory; patch: Partial<DecorationConfig[DecorationCategory]> }
  | { type: 'reset'; category: DecorationCategory }
  | { type: 'replace'; config: DecorationConfig };

function reducer(state: DecorationConfig, action: Action): DecorationConfig {
  switch (action.type) {
    case 'update':
      return { ...state, [action.category]: { ...state[action.category], ...action.patch } };
    case 'reset':
      return { ...state, [action.category]: makeDefaultConfig()[action.category] };
    case 'replace':
      return action.config;
  }
}

/** Decoration settings, independent of the QR content and generation settings. Lives in App so it survives tab switches. */
export function useDecoration() {
  const [cfg, dispatch] = useReducer(reducer, undefined, makeDefaultConfig);
  const update = useCallback(<K extends DecorationCategory>(category: K, patch: Partial<DecorationConfig[K]>) => dispatch({ type: 'update', category, patch }), []);
  const reset = useCallback((category: DecorationCategory) => dispatch({ type: 'reset', category }), []);
  const replace = useCallback((config: DecorationConfig) => dispatch({ type: 'replace', config }), []);
  const resetAll = useCallback(() => dispatch({ type: 'replace', config: makeDefaultConfig() }), []);
  const applyFrameTemplate = useCallback((id: string) => {
    const t = FRAME_TEMPLATES.find((x) => x.id === id);
    if (t) dispatch({ type: 'update', category: 'frame', patch: { ...t.values, templateId: id, enabled: true } });
  }, []);
  return useMemo(() => ({ cfg, update, reset, replace, resetAll, applyFrameTemplate }), [cfg, update, reset, replace, resetAll, applyFrameTemplate]);
}
export type DecorationStore = ReturnType<typeof useDecoration>;
