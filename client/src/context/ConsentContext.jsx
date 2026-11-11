import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { safeStorage } from '../lib/format';

const KEY = 'fuji:consent:v1';
const ConsentContext = createContext(null);

/**
 * Cookie / storage consent. Non-essential categories are OFF by default.
 * - analytics: anonymous usage measurement (no provider is wired up yet — events stay local)
 * - thirdParty: embedded Google Maps (sets Google cookies)
 */
export function ConsentProvider({ children }) {
  const [consent, setConsent] = useState(() => safeStorage.get(KEY, null));
  const [panelOpen, setPanelOpen] = useState(false);

  const save = useCallback((next) => {
    const value = { analytics: !!next.analytics, thirdParty: !!next.thirdParty, decidedAt: new Date().toISOString() };
    safeStorage.set(KEY, value);
    setConsent(value);
    setPanelOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      consent,
      decided: !!consent,
      analytics: !!consent?.analytics,
      thirdParty: !!consent?.thirdParty,
      acceptAll: () => save({ analytics: true, thirdParty: true }),
      rejectAll: () => save({ analytics: false, thirdParty: false }),
      save,
      allowThirdParty: () => save({ ...(consent || {}), thirdParty: true }),
      panelOpen,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
    }),
    [consent, panelOpen, save],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export const useConsent = () => useContext(ConsentContext);

/** Consent-aware event tracking stub. Wire a real provider here once approved. */
export function track(event, props = {}) {
  const c = safeStorage.get(KEY, null);
  if (!c?.analytics) return;
  if (import.meta.env.DEV) console.debug('[analytics]', event, props);
  window.dispatchEvent(new CustomEvent('fuji:track', { detail: { event, props } }));
}
