import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { safeStorage, sumPence } from '../lib/format';
import { useSiteData } from './SiteDataContext';
import { useMotion } from './MotionContext';
import { track } from './ConsentContext';

const CartContext = createContext(null);
const KEY = 'fuji:cart:v1';
const MAX_QTY = 20;

function visibleCartTarget() {
  const targets = [...document.querySelectorAll('[data-cart-target]')];
  return targets.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  });
}

/** Flies a clone of the dish illustration from the card into the cart icon on a curved arc. */
async function flyToCart(sourceEl, onArrive) {
  const target = visibleCartTarget();
  const art = sourceEl?.querySelector('[data-dish-art]') || sourceEl;
  if (!art || !target) return onArrive();
  const from = art.getBoundingClientRect();
  const to = target.getBoundingClientRect();

  const ghost = document.createElement('div');
  const size = 72;
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'fixed', left: '0px', top: '0px', width: `${size}px`, height: `${size * 0.75}px`,
    zIndex: 9999, pointerEvents: 'none', borderRadius: '14px', overflow: 'hidden',
    background: 'radial-gradient(circle at 50% 40%, #fff8ec, #f1e6d3)',
    boxShadow: '0 12px 30px -8px rgba(0,0,0,.45)',
  });
  const clone = art.cloneNode(true);
  clone.removeAttribute('id');
  Object.assign(clone.style, { width: '100%', height: '100%' });
  ghost.appendChild(clone);
  document.body.appendChild(ghost);

  const { default: gsap } = await import('gsap');
  const p0 = { x: from.left + from.width / 2 - size / 2, y: from.top + from.height / 2 - (size * 0.75) / 2 };
  const p2 = { x: to.left + to.width / 2 - size / 2, y: to.top + to.height / 2 - (size * 0.75) / 2 };
  const p1 = { x: (p0.x + p2.x) / 2, y: Math.min(p0.y, p2.y) - 180 };
  const s = { t: 0 };
  gsap.to(s, {
    t: 1,
    duration: 0.85,
    ease: 'power1.inOut',
    onUpdate() {
      const t = s.t;
      const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
      const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
      const scale = 1 - 0.7 * t;
      ghost.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${t * 300}deg)`;
      ghost.style.opacity = String(t > 0.9 ? (1 - t) * 10 : 1);
    },
    onComplete() {
      ghost.remove();
      onArrive();
    },
  });
}

export function CartProvider({ children }) {
  const { getItem, settings } = useSiteData();
  const { still } = useMotion();
  const [lines, setLines] = useState(() => safeStorage.get(KEY, { lines: [] }).lines || []);
  const [fulfilment, setFulfilment] = useState(() => safeStorage.get(KEY, {}).fulfilment || 'delivery');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);

  useEffect(() => {
    safeStorage.set(KEY, { lines, fulfilment });
  }, [lines, fulfilment]);

  const bump = useCallback(() => window.dispatchEvent(new CustomEvent('fuji:cart-bump')), []);

  const addItem = useCallback(
    (item, qty = 1, sourceEl) => {
      if (!item || item.available === false) return;
      const commit = () => {
        setLines((prev) => {
          const existing = prev.find((l) => l.id === item.id);
          if (existing) {
            return prev.map((l) => (l.id === item.id ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l));
          }
          return [...prev, { id: item.id, name: item.name, price: item.price, art: item.art, image: item.image || null, qty: Math.min(MAX_QTY, qty) }];
        });
        setLastAdded({ id: item.id, name: item.name, qty, at: Date.now() });
        bump();
      };
      track('add_to_cart', { id: item.id, qty });
      if (still || !sourceEl) commit();
      else flyToCart(sourceEl, commit).catch(commit);
    },
    [still, bump],
  );

  const setQty = useCallback((id, qty) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
    );
  }, []);
  const removeItem = useCallback((id) => setLines((prev) => prev.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    // Always price from the current menu so admin price changes apply to saved carts.
    const priced = lines
      .map((l) => {
        const live = getItem(l.id);
        return live ? { ...l, name: live.name, price: live.price, art: live.art, image: live.image || null, available: live.available } : null;
      })
      .filter(Boolean);
    const subtotal = sumPence(priced);
    const deliveryFee = fulfilment === 'delivery' && settings.deliveryFee != null ? Number(settings.deliveryFee) : null;
    const total = Math.round((subtotal + (deliveryFee || 0)) * 100) / 100;
    const count = priced.reduce((a, l) => a + l.qty, 0);
    return {
      lines: priced,
      count,
      subtotal,
      deliveryFee,
      deliveryFeeKnown: fulfilment === 'collection' || settings.deliveryFee != null,
      minimumOrder: settings.minimumOrder,
      total,
      fulfilment,
      setFulfilment,
      addItem,
      setQty,
      removeItem,
      clear,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      lastAdded,
    };
  }, [lines, getItem, fulfilment, settings, addItem, setQty, removeItem, clear, drawerOpen, lastAdded]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
