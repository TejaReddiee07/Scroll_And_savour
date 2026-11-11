import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pluralise } from '../lib/format.js';

function pageWindow(page, pages) {
  const wanted = [1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages);
  const sorted = [...new Set(wanted)].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

const PAGE_BASE =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium transition disabled:opacity-40';
const PAGE_BTN = `${PAGE_BASE} text-ink/75 hover:bg-ink/[0.06] hover:text-ink disabled:hover:bg-transparent`;
const PAGE_CURRENT = `${PAGE_BASE} bg-ink text-cream`;

export function Pagination({ page = 1, pages = 1, total, onPageChange, label = 'Pagination', noun = 'result' }) {
  const summary = typeof total === 'number' ? pluralise(total, noun) : null;

  if (!pages || pages <= 1) {
    return summary ? <p className="text-sm text-muted-dark">{summary}</p> : null;
  }

  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-dark">
        Page {page} of {pages}
        {summary && <> · {summary}</>}
      </p>
      <ul className="flex items-center gap-1">
        <li>
          <button
            type="button"
            className={PAGE_BTN}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
        </li>
        {pageWindow(page, pages).map((p) =>
          typeof p === 'string' ? (
            <li key={p} aria-hidden="true" className="hidden px-1 text-muted-dark sm:block">
              …
            </li>
          ) : (
            <li key={p} className="hidden sm:block">
              <button
                type="button"
                className={p === page ? PAGE_CURRENT : PAGE_BTN}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className={PAGE_BTN}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            aria-label="Next page"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
