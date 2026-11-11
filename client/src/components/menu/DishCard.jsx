import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X, Info } from 'lucide-react';
import { TiltCard } from '../effects/Interactions';
import { DishImage, DietaryBadges, QuantityStepper } from '../ui';
import { useCart } from '../../context/CartContext';
import { useSiteData } from '../../context/SiteDataContext';
import { useMotion } from '../../context/MotionContext';
import { formatGBP, cx } from '../../lib/format';

export function AddButton({ item, qty = 1, sourceRef, className = '', compact = false, onAdded }) {
  const { addItem } = useCart();
  const [done, setDone] = useState(false);
  const unavailable = item.available === false;
  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => setDone(false), 1400);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={() => {
        addItem(item, qty, sourceRef?.current);
        setDone(true);
        onAdded?.();
      }}
      className={cx('btn btn-primary', compact ? 'btn-sm !px-3' : 'btn-sm', className)}
    >
      {unavailable ? (
        <>Unavailable<span className="sr-only">: {item.name}</span></>
      ) : done ? (
        <>Added ✓<span className="sr-only"> {item.name}</span></>
      ) : (
        <>
          <Plus size={15} aria-hidden="true" /> Add<span className="sr-only"> {qty} × {item.name}</span>
          {compact ? <span className="sr-only"> to cart</span> : ' to cart'}
        </>
      )}
    </button>
  );
}

export function DishModal({ item, open, onClose }) {
  const { allergenNotice, categories } = useSiteData();
  const { still } = useMotion();
  const [qty, setQty] = useState(1);
  const ref = useRef(null);
  const imgRef = useRef(null);
  const category = categories.find((c) => c.items.some((i) => i.id === item?.id));

  useEffect(() => {
    if (!open) return undefined;
    setQty(1);
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    setTimeout(() => ref.current?.querySelector('button')?.focus(), 40);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div
          className="fixed inset-0 z-[75] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dish-modal-title"
            data-lenis-prevent=""
            className="relative grid max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-hair bg-ink-2 text-cream shadow-2xl md:grid-cols-2"
            initial={{ y: still ? 0 : 40, scale: still ? 1 : 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: still ? 0 : 30, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-ink/70 text-cream" aria-label="Close">
              <X size={18} />
            </button>
            <div ref={imgRef} className="group">
              <DishImage item={item} className="aspect-square w-full md:aspect-auto md:h-full md:min-h-[420px]" strong steamAlways priority float sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
            <div className="flex flex-col gap-4 p-6 sm:p-8">
              {category && <p className="eyebrow">{category.name} <span className="font-display normal-case tracking-normal">{category.jp}</span></p>}
              <h2 id="dish-modal-title" className="font-display text-3xl">{item.name}</h2>
              <p className="text-2xl font-semibold text-gold-soft">{formatGBP(item.price)}</p>
              {item.description && <p className="text-cream/80">{item.description}</p>}
              <DietaryBadges dietary={item.dietary} tags={item.tags} />
              {category?.note && <p className="rounded-xl bg-white/5 p-3 text-sm text-cream/75">{category.note}</p>}
              <p className="flex gap-2 rounded-xl border border-gold/25 p-3 text-xs text-cream/70">
                <Info size={16} className="shrink-0 text-gold" aria-hidden="true" />
                {allergenNotice}
              </p>
              <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                <QuantityStepper value={qty} onChange={setQty} label={`Quantity of ${item.name}`} />
                <AddButton item={item} qty={qty} sourceRef={imgRef} onAdded={() => setTimeout(onClose, 250)} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Menu dish card: tilt, "View" cursor on the image, quantity stepper, flying add-to-cart. */
export default function DishCard({ item, highlight = false, light = false }) {
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  const imgRef = useRef(null);
  const unavailable = item.available === false;

  return (
    <>
      <TiltCard
        as="article"
        id={item.id}
        max={7}
        className={cx(
          'group flex h-full scroll-mt-40 flex-col overflow-hidden rounded-[16px]',
          light ? 'bg-rice text-ink shadow-[var(--shadow-card)]' : 'card',
          highlight && 'ring-2 ring-fuji-red ring-offset-2 ring-offset-ink',
          unavailable && 'opacity-60',
        )}
        aria-labelledby={`${item.id}-name`}
      >
        <button
          type="button"
          ref={imgRef}
          data-cursor="view"
          onClick={() => setOpen(true)}
          className="block w-full text-left"
        >
          <span className="sr-only">View details: </span>
          <DishImage item={item} className="aspect-[4/3] w-full" />
        </button>
        <div className="flex flex-1 flex-col gap-2 p-4 [transform:translateZ(20px)]">
          <div className="flex items-start justify-between gap-3">
            <h3 id={`${item.id}-name`} className={cx('font-display text-lg leading-snug', light ? 'text-ink' : 'text-cream')}>
              {item.name}
            </h3>
            <p className={cx('shrink-0 font-semibold tabular-nums', light ? 'text-fuji-red' : 'text-gold-soft')}>{formatGBP(item.price)}</p>
          </div>
          {item.description && <p className={cx('line-clamp-2 text-sm', light ? 'text-ink/65' : 'text-cream/65')}>{item.description}</p>}
          <DietaryBadges dietary={item.dietary} tags={item.tags} size="xs" />
          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            {unavailable ? (
              <p className="text-sm font-semibold text-red-300">Currently unavailable</p>
            ) : (
              <QuantityStepper value={qty} onChange={setQty} label={`Quantity of ${item.name}`} size="sm" dark={!light} />
            )}
            <AddButton item={item} qty={qty} sourceRef={imgRef} compact />
          </div>
        </div>
      </TiltCard>
      <DishModal item={item} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
