import { useId } from 'react';
import { Search, X } from 'lucide-react';
import { cx } from '../lib/cx.js';
import { CHIP_LIGHT } from './ui.js';

/** Search box with an icon and clear button. */
export function SearchInput({ value, onChange, label = 'Search', placeholder = 'Search…', className = '' }) {
  const id = useId();
  return (
    <div className={cx('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-dark"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="field pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-dark transition hover:bg-ink/[0.06] hover:text-ink"
          aria-label="Clear search"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Single-select chip group (toggle buttons with aria-pressed). */
export function FilterChips({ label, options, value, onChange, className = '' }) {
  return (
    <div role="group" aria-label={label} className={cx('flex flex-wrap gap-2', className)}>
      {options.map((option) => (
        <button
          key={option.value || 'all'}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={CHIP_LIGHT}
        >
          {option.label}
          {typeof option.count === 'number' && option.count > 0 && (
            <span className="rounded-full bg-ink/10 px-1.5 text-[0.7rem] font-bold leading-5">{option.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Row of filter controls that wraps on small screens. */
export function Toolbar({ children, className = '' }) {
  return <div className={cx('flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end', className)}>{children}</div>;
}
