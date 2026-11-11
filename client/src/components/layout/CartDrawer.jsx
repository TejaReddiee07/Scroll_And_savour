import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useMotion } from '../../context/MotionContext';
import { DishImage, QuantityStepper } from '../ui';
import { formatGBP, cx } from '../../lib/format';
import { lockScroll } from '../../lib/smooth';

export function CartSummary({ compact = false }) {
  const { lines, subtotal, deliveryFee, deliveryFeeKnown, total, fulfilment, setFulfilment, setQty, removeItem } = useCart();
  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-white/6 p-1" role="radiogroup" aria-label="Delivery or collection">
        {['delivery', 'collection'].map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={fulfilment === f}
            onClick={() => setFulfilment(f)}
            className={cx('mono rounded-full py-2 text-xs uppercase tracking-[0.14em] transition', fulfilment === f ? 'bg-saffron text-ink' : 'text-cream/70 hover:text-cream')}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className={cx('mt-4 divide-y divide-cream/10', compact ? 'max-h-[40vh] overflow-y-auto pr-1' : '')}>
        {lines.map((l) => (
          <li key={l.id} className="flex gap-3 py-3">
            <DishImage item={l} className="h-14 w-16 shrink-0 rounded-xl border border-hair" steam={false} compactLabel />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-snug text-cream">{l.name}</p>
                <p className="text-sm tabular-nums text-gold-soft">{formatGBP(l.price * l.qty)}</p>
              </div>
              {l.available === false && <p className="text-xs text-red-300">Currently unavailable — please remove.</p>}
              <div className="mt-1.5 flex items-center justify-between">
                <QuantityStepper value={l.qty} min={0} onChange={(q) => setQty(l.id, q)} label={`Quantity of ${l.name}`} size="sm" />
                <button type="button" onClick={() => removeItem(l.id)} className="inline-flex items-center gap-1 text-xs text-cream/55 hover:text-red-300" aria-label={`Remove ${l.name}`}>
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-1.5 border-t border-cream/10 pt-4 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatGBP(subtotal)}</dd></div>
        <div className="flex justify-between">
          <dt>{fulfilment === 'delivery' ? 'Delivery charge' : 'Collection'}</dt>
          <dd className="tabular-nums">
            {fulfilment === 'collection' ? formatGBP(0) : deliveryFee != null ? formatGBP(deliveryFee) : <span className="text-cream/60">To be confirmed</span>}
          </dd>
        </div>
        <div className="flex justify-between border-t border-cream/10 pt-2 text-base font-bold text-cream">
          <dt>Total{!deliveryFeeKnown && <span className="font-normal text-cream/55"> (excl. delivery)</span>}</dt>
          <dd className="tabular-nums">{formatGBP(total)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function CartDrawer() {
  const { drawerOpen, closeDrawer, lines, count } = useCart();
  const { still } = useMotion();
  const panel = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    lockScroll(true);
    lastFocus.current = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') closeDrawer();
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll('a[href], button:not([disabled]), input, select, textarea');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    setTimeout(() => panel.current?.querySelector('button')?.focus(), 50);
    return () => {
      lockScroll(false);
      window.removeEventListener('keydown', onKey);
      lastFocus.current?.focus?.();
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <motion.aside
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Your order"
            data-lenis-prevent=""
            className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-md flex-col border-l border-hair bg-ink-2 shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: still ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-cream/10 px-5 py-4">
              <h2 className="font-display text-2xl text-cream">Your order <span className="text-base text-cream/55">({count})</span></h2>
              <button type="button" onClick={closeDrawer} className="grid h-10 w-10 place-items-center rounded-full border border-cream/20 text-cream" aria-label="Close cart">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lines.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <ShoppingBag className="mx-auto text-gold" size={40} />
                    <p className="mt-4 font-display text-xl text-cream">Your cart is empty</p>
                    <p className="mt-1 text-sm text-cream/60">Browse the menu and add a few favourites.</p>
                    <Link to="/menu" onClick={closeDrawer} className="btn btn-primary mt-6">Explore the menu</Link>
                  </div>
                </div>
              ) : (
                <CartSummary />
              )}
            </div>
            {lines.length > 0 && (
              <div className="border-t border-cream/10 px-5 py-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
                <Link to="/order#checkout" onClick={closeDrawer} className="btn btn-primary w-full">
                  Continue to checkout
                </Link>
                <p className="mt-2 text-center text-xs text-cream/60">Secure checkout · card, Apple Pay, Google Pay, Revolut Pay, Klarna — or pay in person.</p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function FloatingCartButton() {
  const { count, openDrawer, drawerOpen } = useCart();
  const ref = useRef(null);
  useEffect(() => {
    const onBump = () => {
      const el = ref.current;
      if (!el) return;
      el.classList.remove('animate-bounce-soft');
      void el.offsetWidth;
      el.classList.add('animate-bounce-soft');
    };
    window.addEventListener('fuji:cart-bump', onBump);
    return () => window.removeEventListener('fuji:cart-bump', onBump);
  }, []);
  if (count === 0 || drawerOpen) return null;
  return (
    <button
      ref={ref}
      type="button"
      data-cart-target=""
      onClick={openDrawer}
      className="mono fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-saffron px-5 py-3.5 text-xs uppercase tracking-[0.14em] text-ink shadow-[0_14px_40px_-10px_rgba(240,160,50,.7)] md:hidden"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label={`View cart, ${count} items`}
    >
      <ShoppingBag size={18} /> View cart · {count}
    </button>
  );
}
