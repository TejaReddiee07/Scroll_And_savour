import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ShoppingBag, Pause, Play, Phone, KeyRound } from 'lucide-react';
import { SITE } from '../../data/site';
import { useCart } from '../../context/CartContext';
import { useMotion } from '../../context/MotionContext';
import { useSiteData } from '../../context/SiteDataContext';
import { RollText } from '../fx';
import { lockScroll } from '../../lib/smooth';
import { openStatus, cx } from '../../lib/format';

const LINKS = [
  { to: '/menu', label: 'Menu' },
  { to: '/order', label: 'Order' },
  { to: '/reservations', label: 'Book' },
  { to: '/catering', label: 'Catering' },
  { to: '/contact', label: 'Visit' },
];

const ALL = [
  { to: '/', label: 'Home', jp: 'ホーム' },
  { to: '/menu', label: 'Menu', jp: 'お品書き' },
  { to: '/order', label: 'Order online', jp: '注文' },
  { to: '/reservations', label: 'Book a table', jp: '予約' },
  { to: '/catering', label: 'Catering', jp: '宴' },
  { to: '/gallery', label: 'Gallery', jp: '写真' },
  { to: '/about', label: 'About', jp: '物語' },
  { to: '/contact', label: 'Visit & contact', jp: 'ご来店' },
];

export function Mark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M13 13 q-3 -4 0 -8 M20 12 q-3 -4 0 -8 M27 13 q-3 -4 0 -8" stroke="#f4e9d8" strokeOpacity=".6" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M4 18 Q6 35 20 36 Q34 35 36 18 Z" fill="#c2361f" />
      <ellipse cx="20" cy="18" rx="16" ry="3.6" fill="#f0a032" />
      <path d="M11 27 L18 21 Q20 19 22 21 L29 27" stroke="#f4e9d8" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className = '', onClick }) {
  return (
    <Link to="/" onClick={onClick} className={cx('group flex items-center gap-2.5', className)}>
      <Mark />
      <span className="flex items-baseline gap-2 whitespace-nowrap leading-none">
        <span className="display text-[1.65rem] italic text-cream">Fuji</span>
        <span className="jp text-sm text-saffron">富士</span>
        <span className="sr-only"> Japanese Restaurant — home</span>
      </span>
    </Link>
  );
}

export function CartButton({ className = '' }) {
  const { count, openDrawer } = useCart();
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
  return (
    <button
      type="button"
      ref={ref}
      data-cart-target=""
      onClick={openDrawer}
      className={cx('relative grid h-11 w-11 place-items-center rounded-full border border-hair text-cream transition hover:border-saffron', className)}
      aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <ShoppingBag size={18} />
      {count > 0 && (
        <span className="mono absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-saffron px-1 text-[10px] text-ink">{count}</span>
      )}
    </button>
  );
}

export function MotionToggle({ className = '', withLabel = false }) {
  const { paused, reduced, togglePaused } = useMotion();
  if (reduced && !withLabel) return null;
  return (
    <button
      type="button"
      onClick={togglePaused}
      aria-pressed={paused}
      className={cx('inline-flex items-center gap-2 rounded-full text-cream/75 transition hover:text-saffron', withLabel ? 'mono text-xs uppercase tracking-[0.14em]' : 'grid h-11 w-11 place-items-center border border-hair', className)}
      title={paused ? 'Play animations' : 'Pause animations'}
    >
      {paused ? <Play size={15} /> : <Pause size={15} />}
      {withLabel ? <span>{paused ? 'Play animations' : 'Pause animations'}</span> : <span className="sr-only">{paused ? 'Play animations' : 'Pause animations'}</span>}
    </button>
  );
}

export function OpenPill({ className = '' }) {
  const { settings } = useSiteData();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const s = openStatus(settings.hours);
  return (
    <span className={cx('mono inline-flex items-center gap-2 rounded-full border border-hair px-3 py-1.5 text-[0.66rem] uppercase tracking-[0.14em] text-cream/75', className)}>
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {s.open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span className={cx('relative inline-flex h-2 w-2 rounded-full', s.open ? 'bg-emerald-400' : 'bg-cream/40')} />
      </span>
      {s.label}
    </span>
  );
}

function Overlay({ open, onClose }) {
  const panel = useRef(null);
  const { still } = useMotion();
  const { settings } = useSiteData();
  useEffect(() => {
    if (!open) return undefined;
    lockScroll(true);
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    setTimeout(() => panel.current?.querySelector('a, button')?.focus(), 80);
    return () => {
      lockScroll(false);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panel}
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          data-lenis-prevent=""
          className="fixed inset-0 z-[60] overflow-y-auto bg-ink text-cream"
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: still ? 0 : 0.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <div aria-hidden="true" className="jp pointer-events-none absolute -right-8 bottom-0 text-[16rem] leading-none text-cream/[0.04]">富士</div>
          <div className="container-x flex h-20 items-center justify-between">
            <Logo onClick={onClose} />
            <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-hair" aria-label="Close menu">
              <X size={20} />
            </button>
          </div>
          <div className="container-x grid gap-12 pb-16 pt-6 lg:grid-cols-[1.4fr_1fr]">
            <nav aria-label="All pages">
              <ol>
                {ALL.map((item, i) => (
                  <motion.li
                    key={item.to}
                    className="overflow-hidden border-b border-hair"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: still ? 0 : 0.25 + i * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <NavLink to={item.to} end={item.to === '/'} onClick={onClose} className={({ isActive }) => cx('group flex items-baseline gap-5 py-3', isActive ? 'text-saffron' : 'text-cream')}>
                      <span className="mono text-xs text-cream/60">{String(i + 1).padStart(2, '0')}</span>
                      <span className="display text-[clamp(2.2rem,6vw,4.4rem)] leading-[1.05]"><RollText>{item.label}</RollText></span>
                      <span className="jp ml-auto text-sm text-cream/60">{item.jp}</span>
                    </NavLink>
                  </motion.li>
                ))}
              </ol>
            </nav>
            <div className="space-y-6 self-end">
              <OpenPill />
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-cream/60">Call to order</p>
                <a href={`tel:${settings.contact.phoneIntl}`} className="display mt-1 block text-3xl"><RollText>{settings.contact.phone}</RollText></a>
              </div>
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-cream/60">Find us</p>
                <p className="mt-1 text-cream/80">{settings.contact.addressLines.join(', ')}</p>
                <a href={SITE.links.maps} target="_blank" rel="noreferrer" className="mono mt-1 inline-block text-sm text-saffron"><RollText>Directions ↗</RollText></a>
              </div>
              <MotionToggle withLabel />
              <Link to="/admin" onClick={onClose} className="btn btn-outline w-full sm:w-auto">
                <KeyRound size={16} aria-hidden="true" /> <RollText>Owner login</RollText>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Header() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { settings } = useSiteData();

  // hide when scrolling down, return on the way up
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 30);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 140);
        last = y;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
    setHidden(false);
  }, [pathname]);
  // lets sticky sub-bars sit under the header only while it is visible
  useEffect(() => {
    document.documentElement.classList.toggle('header-shown', !hidden);
  }, [hidden]);

  return (
    <>
      <header
        className={cx(
          'fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color] duration-500 ease-[cubic-bezier(.16,1,.3,1)]',
          hidden && !open ? '-translate-y-full' : 'translate-y-0',
          scrolled ? 'border-b border-hair bg-ink/80 backdrop-blur-xl' : 'border-b border-transparent',
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="container-x flex h-16 items-center justify-between gap-4 md:h-20">
          <Logo />
          <nav aria-label="Main" className="hidden xl:block">
            <ul className="flex items-center gap-7">
              {LINKS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => cx('mono text-[0.74rem] uppercase tracking-[0.16em]', isActive ? 'text-saffron' : 'text-cream/80 hover:text-cream')}>
                    <RollText>{item.label}</RollText>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <OpenPill className="hidden lg:inline-flex" />
            <span className="hidden md:block"><MotionToggle /></span>
            <a href={`tel:${settings.contact.phoneIntl}`} className="btn btn-primary btn-sm hidden sm:inline-flex">
              <Phone size={14} /> <RollText>Call to order</RollText>
            </a>
            <Link
              to="/admin"
              className="group inline-flex h-11 items-center gap-2 rounded-full border border-hair px-3.5 text-cream transition hover:border-saffron hover:text-saffron"
              title="Owner login"
            >
              <KeyRound size={16} aria-hidden="true" />
              <span className="mono hidden text-[0.68rem] uppercase tracking-[0.14em] 2xl:inline">Owner</span>
              <span className="sr-only 2xl:hidden">Owner login</span>
            </Link>
            <CartButton />
            <button
              type="button"
              className="group grid h-11 w-11 place-items-center rounded-full border border-hair"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label="Open menu"
            >
              <span className="flex w-5 flex-col items-end gap-[5px]" aria-hidden="true">
                <span className="h-px w-5 bg-cream transition-all group-hover:w-3" />
                <span className="h-px w-3.5 bg-cream transition-all group-hover:w-5" />
              </span>
            </button>
          </div>
        </div>
      </header>
      <Overlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}
