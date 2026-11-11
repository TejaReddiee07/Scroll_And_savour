import { Loader2 } from 'lucide-react';
import { cx } from '../lib/cx.js';

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-md bg-ink/10', className)} />;
}

export function Spinner({ className = 'size-4', label }) {
  return (
    <>
      <Loader2 aria-hidden="true" className={cx('animate-spin shrink-0', className)} />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}

/** Inline block loader with an announced label. */
export function LoadingBlock({ label = 'Loading…', className = '' }) {
  return (
    <div role="status" className={cx('flex items-center justify-center gap-3 py-12 text-sm text-muted-dark', className)}>
      <Spinner className="size-5 text-fuji-red" />
      <span>{label}</span>
    </div>
  );
}

/** Full-screen loader used by the auth guard. */
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream text-ink">
      <span className="font-display text-3xl text-fuji-red" aria-hidden="true">
        富士
      </span>
      <span className="flex items-center gap-2 text-sm text-muted-dark">
        <Spinner className="size-4" />
        {label}
      </span>
    </div>
  );
}

/** Stack of skeleton cards (stats, lists). */
export function SkeletonList({ rows = 4, className = '' }) {
  return (
    <div className={cx('space-y-3', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
