import { cx } from '../lib/cx.js';

/** White card on the cream content area. */
export function Card({ title, description, actions, children, className = '', bodyClassName = '', as: Tag = 'section', titleId }) {
  const hasHeader = title || actions;
  return (
    <Tag className={cx('card-light min-w-0 overflow-hidden shadow-[0_1px_2px_rgb(20_17_16/0.06),0_8px_24px_-16px_rgb(20_17_16/0.25)]', className)} aria-labelledby={title && titleId ? titleId : undefined}>
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/[0.07] px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="font-display text-lg font-bold text-ink">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-sm text-muted-dark">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}

/** Intro line + primary actions under the top bar title. */
export function PageHeader({ description, actions, children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-2xl text-sm text-muted-dark">{description}</div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      {children}
    </div>
  );
}

/** Small definition list used in detail drawers. */
export function DetailList({ items, className = '' }) {
  return (
    <dl className={cx('grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {items
        .filter((item) => item && !item.hidden)
        .map((item) => (
          <div key={item.label} className={cx('min-w-0', item.full && 'sm:col-span-2')}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-dark">{item.label}</dt>
            <dd className="mt-0.5 break-words text-sm text-ink">{item.value ?? '—'}</dd>
          </div>
        ))}
    </dl>
  );
}
