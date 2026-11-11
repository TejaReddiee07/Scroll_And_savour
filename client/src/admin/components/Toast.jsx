import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { errorMessage } from '../lib/api.js';
import { cx } from '../lib/cx.js';
import { ICON_SAFE } from './ui.js';

const ToastContext = createContext(null);
let nextId = 0;

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
const ICON_COLOURS = { success: 'text-emerald-400', error: 'text-red-400', info: 'text-gold' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((type, message, options = {}) => {
    nextId += 1;
    const id = nextId;
    const duration = options.duration ?? (type === 'error' ? 7000 : 4000);
    setToasts((list) => [...list.slice(-3), { id, type, message, title: options.title, duration }]);
    return id;
  }, []);

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      info: (message, options) => show('info', message, options),
      /** Show an ApiError's server message (or a fallback). */
      apiError: (err, fallback) => show('error', errorMessage(err, fallback)),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(<ToastViewport toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

function ToastViewport({ toasts, onDismiss }) {
  const polite = toasts.filter((t) => t.type !== 'error');
  const assertive = toasts.filter((t) => t.type === 'error');
  return (
    <div
      className={cx(
        'pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2 p-4 font-sans sm:inset-x-auto sm:right-0 sm:items-end sm:p-6',
        ICON_SAFE,
      )}
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {/* Live regions stay mounted so additions are announced reliably. */}
      <div aria-live="polite" aria-relevant="additions" className="flex w-full flex-col items-center gap-2 sm:items-end">
        <AnimatePresence initial={false}>
          {polite.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
          ))}
        </AnimatePresence>
      </div>
      <div aria-live="assertive" aria-relevant="additions" className="flex w-full flex-col items-center gap-2 sm:items-end">
        <AnimatePresence initial={false}>
          {assertive.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false);
  const Icon = ICONS[toast.type] ?? Info;

  useEffect(() => {
    if (paused || !toast.duration) return undefined;
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [paused, toast.id, toast.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cx(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-ink px-4 py-3 text-sm text-cream shadow-2xl',
        toast.type === 'error' ? 'border-red-400/40' : 'border-gold/25',
      )}
    >
      <Icon aria-hidden="true" className={cx('mt-0.5 size-5 shrink-0', ICON_COLOURS[toast.type])} />
      <div className="min-w-0 flex-1">
        {toast.title && <p className="font-semibold">{toast.title}</p>}
        <p className="break-words leading-snug text-cream/90">
          <span className="sr-only">{toast.type === 'error' ? 'Error: ' : ''}</span>
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 -mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-cream/60 transition hover:bg-white/10 hover:text-cream"
        aria-label="Dismiss notification"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </motion.div>
  );
}
