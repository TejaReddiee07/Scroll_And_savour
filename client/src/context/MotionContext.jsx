import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { safeStorage } from '../lib/format';

const MotionContext = createContext({ reduced: false, paused: false, still: false, togglePaused: () => {} });

const query = '(prefers-reduced-motion: reduce)';

/**
 * `reduced`  – OS-level prefers-reduced-motion.
 * `paused`   – visitor pressed the "Pause animations" toggle.
 * `still`    – either of the above: render static illustrations, keep only simple fades.
 */
export function MotionProvider({ children }) {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false,
  );
  const [paused, setPaused] = useState(() => safeStorage.get('fuji:motion-paused', false));

  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('motion-paused', paused);
    safeStorage.set('fuji:motion-paused', paused);
  }, [paused]);

  const togglePaused = useCallback(() => setPaused((p) => !p), []);
  const value = useMemo(
    () => ({ reduced, paused, still: reduced || paused, togglePaused }),
    [reduced, paused, togglePaused],
  );
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export const useMotion = () => useContext(MotionContext);
