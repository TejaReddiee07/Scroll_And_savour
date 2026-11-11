import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Dialog.jsx';
import { cx } from '../lib/cx.js';

/**
 * In-app confirmation dialog (never window.confirm).
 * Focus starts on the safe "Cancel" button.
 */
export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      role="alertdialog"
      size="sm"
      initialFocusRef={cancelRef}
      footer={
        <>
          <button ref={cancelRef} type="button" className="btn btn-sm btn-outline-dark" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cx('btn btn-sm', tone === 'danger' ? 'btn-primary' : 'btn-dark')}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {message ? (
        <div className="flex gap-3">
          {tone === 'danger' && (
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700"
            >
              <AlertTriangle className="size-5" />
            </span>
          )}
          <div className="text-sm leading-relaxed text-ink/80">{message}</div>
        </div>
      ) : null}
    </Modal>
  );
}

const ConfirmContext = createContext(null);

/**
 * Provides a promise-based confirm:
 *   const confirm = useConfirm();
 *   if (await confirm({ title, message, confirmLabel })) { … }
 */
export function ConfirmProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState({});
  const resolverRef = useRef(null);

  const confirm = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setOptions(opts);
        setOpen(true);
      }),
    [],
  );

  const settle = useCallback((result) => {
    setOpen(false);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog {...options} open={open} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
