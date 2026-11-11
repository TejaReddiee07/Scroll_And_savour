import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import staticMenu from '../data/menu.json';
import { SITE, DEFAULT_OFFERS } from '../data/site';
import { api } from '../lib/api';

const SiteDataContext = createContext(null);

const DEFAULT_SETTINGS = {
  contact: {
    phone: SITE.phone,
    phoneIntl: SITE.phoneIntl,
    email: SITE.email,
    addressLines: [SITE.address.street, SITE.address.locality, SITE.address.postcode],
  },
  hours: SITE.hours,
  hoursNote: SITE.hoursNote,
  deliveryFee: null,
  minimumOrder: null,
  orderingMode: 'demo',
  bookingMode: 'demo',
  announcement: '',
};

/**
 * Loads menu / settings / offers.
 * The bundled menu (transcribed from the owner's PDF) renders instantly; if the
 * Express API is reachable it replaces the bundled data so admin edits show up.
 */
export function SiteDataProvider({ children }) {
  const [backend, setBackend] = useState('checking'); // checking | online | offline
  const [menu, setMenu] = useState(staticMenu);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [offers, setOffers] = useState(DEFAULT_OFFERS);
  const backendRef = useRef('checking');

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const [m, o] = await Promise.all([api('/menu'), api('/offers')]);
        if (!alive) return;
        if (m?.categories?.length) setMenu(m);
        if (Array.isArray(o)) setOffers(o);
      } catch {
        /* keep what we have */
      }
    };
    // re-check the menu when the visitor comes back to the tab, and every 2 minutes
    const onVisible = () => document.visibilityState === 'visible' && backendRef.current === 'online' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => backendRef.current === 'online' && document.visibilityState === 'visible' && refresh(), 120000);
    (async () => {
      try {
        const health = await api('/health', { timeout: 4000 });
        if (!health?.ok || health.db !== 'connected') throw new Error('db offline');
        const [m, s, o] = await Promise.allSettled([api('/menu'), api('/settings'), api('/offers')]);
        if (!alive) return;
        if (m.status === 'fulfilled' && m.value?.categories?.length) setMenu(m.value);
        if (s.status === 'fulfilled' && s.value) setSettings({ ...DEFAULT_SETTINGS, ...s.value });
        if (o.status === 'fulfilled' && Array.isArray(o.value)) setOffers(o.value);
        setBackend('online');
        backendRef.current = 'online';
      } catch {
        if (alive) setBackend('offline');
      }
    })();
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const value = useMemo(() => {
    const items = [];
    const byId = new Map();
    menu.categories.forEach((c) =>
      c.items.forEach((it) => {
        const full = { ...it, available: it.available !== false, categorySlug: c.slug, categoryName: c.name };
        items.push(full);
        byId.set(it.id, full);
      }),
    );
    return {
      backend,
      isOnline: backend === 'online',
      menu,
      categories: menu.categories,
      items,
      getItem: (id) => byId.get(id),
      allergenNotice: menu.allergenNotice || staticMenu.allergenNotice,
      settings,
      offers,
      liveOrdering: backend === 'online' && settings.orderingMode === 'live',
      liveBooking: backend === 'online' && settings.bookingMode === 'live',
    };
  }, [backend, menu, settings, offers]);

  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export const useSiteData = () => useContext(SiteDataContext);
