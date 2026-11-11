import { Skeleton } from './Skeleton.jsx';
import { cx } from '../lib/cx.js';

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' };

/**
 * Responsive data table. On narrow screens the table scrolls horizontally
 * inside its own focusable region (keyboard users can scroll with arrows).
 *
 * columns: [{ key, header, render?(row), align?, className?, headerClassName? }]
 */
export function DataTable({
  columns,
  rows,
  rowKey = (row) => row._id,
  caption,
  loading = false,
  skeletonRows = 6,
  empty = null,
  rowClassName,
  minWidth = '720px',
  busy = false,
}) {
  const showSkeleton = loading && (!rows || rows.length === 0);
  const isEmpty = !loading && (!rows || rows.length === 0);

  return (
    <div>
      <div
        className={cx('relative overflow-x-auto transition-opacity', busy && 'opacity-60')}
        role="region"
        aria-label={caption}
        aria-busy={loading || busy || undefined}
        tabIndex={0}
      >
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-ink/10 bg-cream/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cx(
                    'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-dark',
                    ALIGN[col.align] ?? ALIGN.left,
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.07]">
            {showSkeleton
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={`skeleton-${i}`}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-4">
                        <Skeleton className="h-4 w-full max-w-[10rem]" />
                      </td>
                    ))}
                  </tr>
                ))
              : (rows ?? []).map((row) => (
                  <tr
                    key={rowKey(row)}
                    className={cx(
                      'align-middle transition-colors hover:bg-cream/40',
                      typeof rowClassName === 'function' ? rowClassName(row) : rowClassName,
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cx('px-4 py-3', ALIGN[col.align] ?? ALIGN.left, col.className)}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {showSkeleton && <span className="sr-only" role="status">Loading…</span>}
      </div>
      {isEmpty && empty}
    </div>
  );
}
