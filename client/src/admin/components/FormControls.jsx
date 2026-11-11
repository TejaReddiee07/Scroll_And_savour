import { useId } from 'react';
import { cx } from '../lib/cx.js';

/**
 * Accessible form controls built on the design-system `.field` classes.
 * All accept react-hook-form's `register()` spread (React 19 passes `ref` as a prop).
 */

function useFieldIds(id, { error, hint }) {
  const autoId = useId();
  const fieldId = id || autoId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return { fieldId, errorId, hintId, describedBy };
}

function Label({ htmlFor, children, required, optional }) {
  return (
    <label htmlFor={htmlFor} className="field-label text-ink">
      {children}
      {required && (
        <span className="text-fuji-red" aria-hidden="true">
          {' '}
          *
        </span>
      )}
      {optional && <span className="font-normal text-muted-dark"> (optional)</span>}
    </label>
  );
}

export function FieldMessages({ hint, hintId, error, errorId }) {
  return (
    <>
      {hint && (
        <p id={hintId} className="mt-1 text-xs leading-snug text-muted-dark">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </>
  );
}

export function TextInput({
  label,
  error,
  hint,
  id,
  required,
  optional,
  prefix,
  suffix,
  className = '',
  inputClassName = '',
  type = 'text',
  ...props
}) {
  const { fieldId, errorId, hintId, describedBy } = useFieldIds(id, { error, hint });
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={fieldId} required={required} optional={optional}>
          {label}
        </Label>
      )}
      <div className="relative">
        {prefix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-muted-dark"
          >
            {prefix}
          </span>
        )}
        <input
          id={fieldId}
          type={type}
          className={cx('field', prefix && 'pl-8', suffix && 'pr-12', inputClassName)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          {...props}
        />
        {suffix && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-1.5">{suffix}</span>
        )}
      </div>
      <FieldMessages hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

export function TextArea({ label, error, hint, id, required, optional, className = '', rows = 4, maxLength, value, ...props }) {
  const { fieldId, errorId, hintId, describedBy } = useFieldIds(id, { error, hint });
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={fieldId} required={required} optional={optional}>
          {label}
        </Label>
      )}
      <textarea
        id={fieldId}
        rows={rows}
        maxLength={maxLength}
        value={value}
        className="field resize-y leading-relaxed"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        {...props}
      />
      <FieldMessages hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

export function SelectInput({ label, error, hint, id, required, className = '', children, hideLabel = false, ...props }) {
  const { fieldId, errorId, hintId, describedBy } = useFieldIds(id, { error, hint });
  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : 'field-label text-ink'}>
          {label}
          {required && !hideLabel && (
            <span className="text-fuji-red" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <select
        id={fieldId}
        className="field"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        {...props}
      >
        {children}
      </select>
      <FieldMessages hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

/** Checkbox with label (and optional description). */
export function Checkbox({ label, description, id, className = '', error, ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  const descId = description ? `${fieldId}-desc` : undefined;
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          id={fieldId}
          type="checkbox"
          className="mt-1 size-4 shrink-0 cursor-pointer rounded accent-fuji-red"
          aria-describedby={descId}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        <label htmlFor={fieldId} className="cursor-pointer text-sm leading-snug">
          <span className="font-medium text-ink">{label}</span>
          {description && (
            <span id={descId} className="mt-0.5 block text-xs text-muted-dark">
              {description}
            </span>
          )}
        </label>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

/**
 * Toggle switch — a native checkbox with role="switch" so it works with
 * react-hook-form's register() *or* controlled `checked` / `onChange`.
 */
export function Switch({ label, description, hideLabel = false, id, className = '', size = 'md', ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  const descId = description ? `${fieldId}-desc` : undefined;
  const small = size === 'sm';
  return (
    <div className={cx('flex items-start gap-3', className)}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={fieldId}
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          aria-describedby={descId}
          {...props}
        />
        <span
          aria-hidden="true"
          className={cx(
            'rounded-full bg-ink/20 transition-colors peer-checked:bg-emerald-600 peer-disabled:opacity-50',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fuji-red',
            small ? 'h-5 w-9' : 'h-6 w-11',
          )}
        />
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute left-0.5 top-0.5 rounded-full bg-white shadow-sm transition-transform',
            small ? 'size-4 peer-checked:translate-x-4' : 'size-5 peer-checked:translate-x-5',
          )}
        />
      </span>
      <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : 'cursor-pointer text-sm leading-snug'}>
        <span className={hideLabel ? undefined : 'font-medium text-ink'}>{label}</span>
        {description && (
          <span id={descId} className={hideLabel ? undefined : 'mt-0.5 block text-xs text-muted-dark'}>
            {description}
          </span>
        )}
      </label>
    </div>
  );
}

/** Titled group of fields inside a form card. */
export function FormSection({ title, description, children, className = '' }) {
  return (
    <fieldset className={cx('min-w-0 space-y-4', className)}>
      <legend className="mb-1 w-full">
        <span className="block font-display text-lg font-bold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-muted-dark">{description}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/** Banner for errors that aren't tied to a single field. */
export function FormAlert({ children, tone = 'error', className = '' }) {
  if (!children) return null;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'rounded-xl border px-4 py-3 text-sm',
        tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900',
        className,
      )}
    >
      {children}
    </div>
  );
}
