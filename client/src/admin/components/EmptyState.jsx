import { CircleAlert, Inbox, RefreshCw } from 'lucide-react';
import { errorMessage } from '../lib/api.js';
import { cx } from '../lib/cx.js';

export function EmptyState({ icon: Icon = Inbox, title, description, action, className = '' }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span
        aria-hidden="true"
        className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-cream text-fuji-red ring-1 ring-ink/5"
      >
        <Icon className="size-6" />
      </span>
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-dark">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Couldn’t load this data', className = '' }) {
  return (
    <div role="alert" className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span
        aria-hidden="true"
        className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-red-50 text-red-700"
      >
        <CircleAlert className="size-6" />
      </span>
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-dark">{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-sm btn-outline-dark mt-5">
          <RefreshCw aria-hidden="true" className="size-4" />
          Try again
        </button>
      )}
    </div>
  );
}
