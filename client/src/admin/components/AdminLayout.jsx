import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import {
  BadgePercent,
  CalendarDays,
  ChartColumn,
  ChefHat,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  Layers,
  LogOut,
  Mail,
  Menu as MenuIcon,
  Settings,
  ShoppingBag,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { StatsProvider, useStats } from '../lib/stats.jsx';
import { cx } from '../lib/cx.js';
import { useBodyScrollLock, useFocusTrap } from './Dialog.jsx';
import { useToast } from './Toast.jsx';
import { AdminHead } from './AdminHead.jsx';
import { ICON_SAFE } from './ui.js';

export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/revenue', label: 'Revenue', icon: ChartColumn },
    ],
  },
  {
    label: 'Service',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, badge: (s) => s?.pending?.orders, badgeLabel: 'awaiting action' },
      { to: '/admin/reservations', label: 'Reservations', icon: CalendarDays, badge: (s) => s?.pending?.reservations, badgeLabel: 'pending' },
      { to: '/admin/catering', label: 'Catering', icon: ChefHat, badge: (s) => s?.pending?.enquiries, badgeLabel: 'new' },
      { to: '/admin/messages', label: 'Messages', icon: Mail, badge: (s) => s?.pending?.unreadMessages, badgeLabel: 'unread' },
    ],
  },
  {
    label: 'Menu & offers',
    items: [
      { to: '/admin/menu', label: 'Menu items', icon: UtensilsCrossed, badge: (s) => s?.menu?.unavailable, badgeLabel: 'unavailable', badgeTone: 'muted' },
      { to: '/admin/categories', label: 'Categories', icon: Layers },
      { to: '/admin/offers', label: 'Offers', icon: BadgePercent },
    ],
  },
  {
    label: 'Restaurant',
    items: [
      { to: '/admin/settings', label: 'Settings', icon: Settings },
      { to: '/admin/account', label: 'Account', icon: KeyRound },
    ],
  },
];

const PAGE_TITLES = {
  '': 'Dashboard',
  revenue: 'Revenue',
  menu: 'Menu items',
  categories: 'Categories',
  orders: 'Orders',
  reservations: 'Reservations',
  catering: 'Catering enquiries',
  messages: 'Messages',
  offers: 'Offers',
  settings: 'Settings',
  account: 'Account',
};

function pageTitleFor(pathname) {
  const segment = pathname.replace(/^\/admin\/?/, '').split('/')[0] ?? '';
  return PAGE_TITLES[segment] ?? 'Dashboard';
}

export default function AdminLayout() {
  return (
    <StatsProvider>
      <LayoutShell />
    </StatsProvider>
  );
}

function LayoutShell() {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const headingRef = useRef(null);
  const previousPath = useRef(location.pathname);
  const title = pageTitleFor(location.pathname);

  // Close the mobile drawer and move focus to the new page heading on navigation.
  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    setNavOpen(false);
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className={cx('light-surface min-h-dvh bg-cream font-sans text-ink', ICON_SAFE)}>
      <AdminHead />
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="admin-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-hair bg-ink text-cream lg:flex" aria-label="Admin">
        <SidebarContent />
      </aside>

      {/* Mobile off-canvas drawer */}
      <AnimatePresence>
        {navOpen && <MobileNav key="mobile-nav" onClose={() => setNavOpen(false)} />}
      </AnimatePresence>

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <header
          className="sticky top-0 z-20 border-b border-ink/10 bg-cream/90 backdrop-blur supports-[backdrop-filter]:bg-cream/75"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setNavOpen(true)}
              className="-ml-1 inline-flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-ink/[0.06] lg:hidden"
              aria-label="Open navigation"
              aria-expanded={navOpen}
              aria-controls="admin-mobile-nav"
            >
              <MenuIcon aria-hidden="true" className="size-5" />
            </button>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="min-w-0 flex-1 truncate font-display text-xl font-bold outline-none sm:text-2xl"
            >
              {title}
            </h1>
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="btn btn-sm btn-outline-dark shrink-0 px-3 sm:px-4"
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">View site</span>
              <span className="sr-only sm:hidden">View site</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </header>

        <main id="admin-main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function MobileNav({ onClose }) {
  const isPresent = useIsPresent();
  const panelRef = useRef(null);
  useFocusTrap(panelRef, { active: isPresent, onEscape: onClose });
  useBodyScrollLock(isPresent);

  return (
    <div className={cx('fixed inset-0 z-50 lg:hidden', !isPresent && 'pointer-events-none')}>
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        id="admin-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        tabIndex={-1}
        className="admin-sidebar absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-ink text-cream shadow-2xl outline-none"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'tween', duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-full text-cream/70 transition hover:bg-white/10 hover:text-cream"
          aria-label="Close navigation"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        <SidebarContent />
      </motion.div>
    </div>
  );
}

function SidebarContent() {
  const { stats } = useStats();
  const { admin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      toast.success('You have been signed out.');
    } catch (err) {
      toast.apiError(err, 'Sign-out failed on the server, but you have been signed out here.');
    } finally {
      setSigningOut(false);
      navigate('/admin/login', { replace: true, state: { loggedOut: true } });
    }
  }

  return (
    <div className="ink-grain flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.08] px-5">
        <span
          aria-hidden="true"
          className="inline-flex size-9 items-center justify-center rounded-lg bg-fuji-red font-display text-lg font-bold text-white"
        >
          富
        </span>
        <p className="leading-tight">
          <span className="font-display text-base font-bold text-cream">
            <span lang="ja">富士</span> FUJI
          </span>
          <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-gold">Admin</span>
        </p>
      </div>

      <nav aria-label="Admin sections" className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cream/40">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const count = item.badge ? Number(item.badge(stats) || 0) : 0;
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cx(
                          'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-white/[0.08] text-white shadow-[inset_3px_0_0_var(--color-fuji-red)]'
                            : 'text-cream/70 hover:bg-white/[0.05] hover:text-cream',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            aria-hidden="true"
                            className={cx('size-[1.15rem] shrink-0', isActive ? 'text-fuji-red' : 'text-cream/50 group-hover:text-gold')}
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {count > 0 && (
                            <span
                              className={cx(
                                'inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold leading-6',
                                item.badgeTone === 'muted' ? 'bg-white/10 text-cream/80' : 'bg-fuji-red text-white',
                              )}
                            >
                              <span className="sr-only">, </span>
                              {count}
                              <span className="sr-only"> {item.badgeLabel}</span>
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/[0.08] p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {admin && (
          <div className="mb-3 min-w-0 px-1">
            <p className="truncate text-sm font-semibold text-cream">{admin.name || admin.email}</p>
            <p className="truncate text-xs text-cream/50">
              {admin.email}
              {admin.role && <> · {admin.role}</>}
            </p>
          </div>
        )}
        <button type="button" onClick={handleLogout} disabled={signingOut} className="btn btn-sm btn-outline w-full">
          <LogOut aria-hidden="true" className="size-4" />
          {signingOut ? 'Signing out…' : 'Log out'}
        </button>
      </div>
    </div>
  );
}
