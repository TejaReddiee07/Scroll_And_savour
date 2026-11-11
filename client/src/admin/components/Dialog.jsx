import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { X } from 'lucide-react';
import { cx } from '../lib/cx.js';
import { ICON_BTN, ICON_SAFE } from './ui.js';

/* ── Focus trap ───────────────────────────────────────────────── */

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, summary, [tabindex], [contenteditable="true"]';

export function getFocusable(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.closest('[inert]') &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.getClientRects().length > 0,
  );
}

/** Only the top-most trap handles keyboard events (nested confirm over drawer). */
const trapStack = [];

/**
 * Trap Tab focus inside `ref`, close on Escape, restore focus on deactivate.
 */
export function useFocusTrap(ref, { active = true, onEscape, initialFocusRef, restoreFocus = true } = {}) {
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    const token = {};
    trapStack.push(token);
    const previous = document.activeElement;

    const frame = requestAnimationFrame(() => {
      if (node.contains(document.activeElement)) return;
      const target =
        initialFocusRef?.current || node.querySelector('[data-autofocus]') || getFocusable(node)[0] || node;
      target.focus({ preventScroll: true });
    });

    const onKeyDown = (event) => {
      if (trapStack[trapStack.length - 1] !== token) return;
      if (event.key === 'Escape') {
        if (escapeRef.current) {
          event.preventDefault();
          event.stopPropagation();
          escapeRef.current();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable(node);
      if (items.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !node.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !node.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      const index = trapStack.indexOf(token);
      if (index >= 0) trapStack.splice(index, 1);
      if (!restoreFocus) return;
      // Don't steal focus if something outside the dialog already took it (e.g. route change).
      const current = document.activeElement;
      const focusWasInside = !current || current === document.body || node.contains(current);
      if (!focusWasInside) return;
      if (previous instanceof HTMLElement && previous.isConnected && previous !== document.body) {
        previous.focus({ preventScroll: true });
      } else {
        document.getElementById('admin-main')?.focus({ preventScroll: true });
      }
    };
  }, [active, ref, initialFocusRef, restoreFocus]);
}

let scrollLocks = 0;
let savedOverflow = '';

export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    if (scrollLocks === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    scrollLocks += 1;
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = savedOverflow;
    };
  }, [active]);
}

/* ── Modal / Drawer ───────────────────────────────────────────── */

const MODAL_SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };
const DRAWER_SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl' };

/**
 * Accessible dialog rendered in a portal.
 *  variant="modal" (centred; bottom sheet on phones) | "drawer" (slides from the right)
 *  Focus is trapped, Esc / backdrop close (unless `dismissible={false}`), focus is restored.
 */
export function Modal({ open, onClose, ...props }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>{open && <DialogPanel key="dialog" onClose={onClose} {...props} />}</AnimatePresence>,
    document.body,
  );
}

export function Drawer(props) {
  return <Modal variant="drawer" {...props} />;
}

function DialogPanel({
  onClose,
  title,
  description,
  children,
  footer,
  headerExtra,
  variant = 'modal',
  size = 'md',
  role = 'dialog',
  initialFocusRef,
  dismissible = true,
  bodyClassName = '',
}) {
  const isPresent = useIsPresent();
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const bodyId = useId();
  const isDrawer = variant === 'drawer';

  useFocusTrap(panelRef, { active: isPresent, onEscape: dismissible ? onClose : undefined, initialFocusRef });
  useBodyScrollLock(isPresent);

  const describedBy = description ? descriptionId : role === 'alertdialog' && children ? bodyId : undefined;
  const transition = { type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] };
  const panelMotion = isDrawer
    ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
    : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 } };

  return (
    <div
      className={cx(
        'light-surface fixed inset-0 flex font-sans text-ink',
        ICON_SAFE,
        role === 'alertdialog' ? 'z-[120]' : 'z-[100]',
        isDrawer ? 'justify-end' : 'items-end justify-center sm:items-center sm:p-4',
        !isPresent && 'pointer-events-none',
      )}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={dismissible ? onClose : undefined}
      />
      <motion.div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cx(
          'relative flex w-full flex-col bg-rice text-ink shadow-2xl outline-none',
          isDrawer
            ? cx('h-full', DRAWER_SIZES[size] ?? DRAWER_SIZES.md)
            : cx('max-h-[92dvh] rounded-t-card sm:rounded-card', MODAL_SIZES[size] ?? MODAL_SIZES.md),
        )}
        {...panelMotion}
        transition={transition}
      >
        <div className="flex items-start gap-3 border-b border-ink/10 px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-xl leading-tight text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-muted-dark">
                {description}
              </p>
            )}
          </div>
          {headerExtra}
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            className={cx(ICON_BTN, '-mr-2 -mt-1')}
            aria-label="Close"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {children != null && children !== false && (
          <div id={bodyId} className={cx('flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6', bodyClassName)}>
            {children}
          </div>
        )}

        {footer && (
          <div
            className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/10 bg-cream/50 px-5 py-3 sm:px-6"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}
