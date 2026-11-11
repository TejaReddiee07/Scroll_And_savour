import { useEffect, useMemo, useRef, useState } from 'react';
import {
  dayCount,
  formatCalendarDate,
  formatDayRange,
  formatGBP,
  formatMonth,
  formatShortDay,
  isCalendarDay,
  isoWeekday,
  shiftDay,
} from '../lib/format.js';
import { cx } from '../lib/cx.js';

/*
 * Hand-written SVG charts for the Revenue page (no chart library).
 *
 * Colour: one series → one hue. Brand copper #c06a3a (--color-copper) was run through the
 * dataviz palette validator against the white card surface: inside the lightness band,
 * above the chroma floor, ≥ 3:1 contrast. Text never wears the series colour.
 * Marks: ≤ 24px columns, 4px rounded data-end, square at the baseline; hairline solid grid.
 */
const SERIES = 'var(--color-copper)';
const SERIES_ACTIVE = '#9a4a24'; // darker step of the same hue for the hovered/focused column
const ACTIVE_WASH = 'rgb(10 7 6 / 0.045)';
const GRID = 'rgb(10 7 6 / 0.08)';
const BASELINE = 'rgb(10 7 6 / 0.3)';
const AXIS_TEXT = 'var(--color-muted-dark)';

const PLOT_H = 220;
const TOP_PAD = 26; // room for the peak label
const AXIS_H = 30; // x-axis band (included in the container height)
const RIGHT_PAD = 14;
const MAX_BAR = 24;
const TIP_W = 184;

const tickFmt = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const tickFmtCompact = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const pctFmt = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 0 });
const countFmt = new Intl.NumberFormat('en-GB');
/** "1,787 orders" / "1 order" */
const countOf = (n, noun) => `${countFmt.format(n)} ${n === 1 ? noun : `${noun}s`}`;

/* ── data helpers ─────────────────────────────────────────────── */

const toPence = (v) => Math.round((Number(v) || 0) * 100);

/** One entry per calendar day from → to (fills any gaps the server left out with zeros). */
export function fillDaily(daily, from, to) {
  const rows = Array.isArray(daily) ? daily : [];
  if (!isCalendarDay(from) || !isCalendarDay(to) || from > to || dayCount(from, to) > 4000) {
    return rows.map((d) => ({ date: d.date, earned: Number(d.earned) || 0, orders: Number(d.orders) || 0 }));
  }
  const byDate = new Map(rows.map((d) => [d.date, d]));
  const out = [];
  for (let day = from; day <= to; day = shiftDay(day, 1)) {
    const d = byDate.get(day);
    out.push({ date: day, earned: Number(d?.earned) || 0, orders: Number(d?.orders) || 0 });
  }
  return out;
}

/** Daily up to ~3 months, weekly (Mon–Sun) up to ~2 years, monthly beyond. */
export function chartUnit(days) {
  if (days <= 92) return 'day';
  if (days <= 732) return 'week';
  return 'month';
}

function bucket(daily, unit) {
  const buckets = [];
  for (const d of daily) {
    const key =
      unit === 'day' ? d.date : unit === 'week' ? shiftDay(d.date, 1 - isoWeekday(d.date)) : `${d.date.slice(0, 7)}-01`;
    let b = buckets[buckets.length - 1];
    if (!b || b.key !== key) {
      b = { key, from: d.date, to: d.date, pence: 0, orders: 0 };
      buckets.push(b);
    }
    b.to = d.date;
    b.pence += toPence(d.earned);
    b.orders += d.orders;
  }
  return buckets.map((b) => ({ key: b.key, from: b.from, to: b.to, earned: b.pence / 100, orders: b.orders }));
}

function pointLabel(p, unit) {
  if (unit === 'day') return formatCalendarDate(p.from);
  if (unit === 'month') {
    const fullMonth = p.from.endsWith('-01') && shiftDay(p.to, 1).endsWith('-01');
    return fullMonth ? formatMonth(p.from) : formatDayRange(p.from, p.to);
  }
  return formatDayRange(p.from, p.to);
}

function axisLabel(p, unit) {
  return unit === 'month' ? formatMonth(p.from, { short: true }) : formatShortDay(p.from);
}

/** Clean ticks: steps of 1 / 2 / 5 × 10ⁿ. */
function niceScale(max, target = 4) {
  if (!(max > 0)) return { top: 100, step: 25 };
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const r = raw / mag;
  const step = Math.max(1, (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * mag);
  return { top: Math.ceil(max / step) * step, step };
}

/** Column with a 4px rounded data-end and a square baseline. */
function columnPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`;
}

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    setWidth(node.clientWidth);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(node);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/* ── Earned-over-time column chart ────────────────────────────── */

const UNIT_NOUN = { day: 'day', week: 'week', month: 'month' };

/**
 * Accessible column chart of earned revenue over a date range.
 *  - SVG has role="img" + a summary aria-label; a visually-hidden table carries every value.
 *  - Hover (or tap) a column band, or focus the chart and use ←/→/Home/End, for a tooltip.
 *  - `busy` keeps the previous render at reduced opacity while new data loads.
 */
export function EarnedChart({ daily, from, to, busy = false, title = 'Earned revenue' }) {
  const wrapRef = useRef(null);
  const width = useElementWidth(wrapRef);
  const [active, setActive] = useState(null);
  const [keyboard, setKeyboard] = useState(false);

  const filled = useMemo(() => fillDaily(daily, from, to), [daily, from, to]);
  const unit = chartUnit(filled.length);
  const points = useMemo(() => bucket(filled, unit), [filled, unit]);
  const n = points.length;

  useEffect(() => {
    setActive(null);
  }, [n, from, to]);

  const stats = useMemo(() => {
    let totalPence = 0;
    let orders = 0;
    let peak = -1;
    let zero = 0;
    points.forEach((p, i) => {
      totalPence += toPence(p.earned);
      orders += p.orders;
      if (p.earned > 0 && (peak < 0 || p.earned > points[peak].earned)) peak = i;
      if (!(p.earned > 0)) zero += 1;
    });
    return { total: totalPence / 100, orders, peak, zero };
  }, [points]);

  const noun = UNIT_NOUN[unit];
  const summary =
    n === 0
      ? `${title}: no data.`
      : [
          `Column chart of ${title.toLowerCase()} per ${noun}, ${formatDayRange(from, to)}.`,
          `Total ${formatGBP(stats.total)} from ${countOf(stats.orders, 'order')}.`,
          stats.peak >= 0
            ? `Highest ${noun}: ${pointLabel(points[stats.peak], unit)}, ${formatGBP(points[stats.peak].earned)}.`
            : 'Nothing was earned in this range.',
          stats.zero > 0 && stats.peak >= 0 ? `${countOf(stats.zero, noun)} with no earnings.` : '',
        ]
          .filter(Boolean)
          .join(' ');

  // Geometry
  const { top, step } = niceScale(points.reduce((m, p) => Math.max(m, p.earned), 0));
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  const fmtTick = (v) => (top >= 10_000 ? tickFmtCompact : tickFmt).format(v);
  const gutter = Math.max(...ticks.map((t) => fmtTick(t).length)) * 6.6 + 12;
  const plotW = Math.max(0, width - gutter - RIGHT_PAD);
  const band = n > 0 ? plotW / n : 0;
  let barW = Math.min(MAX_BAR, band * 0.7);
  if (band - barW < 2) barW = Math.max(1, band - 2); // keep a 2px surface gap between neighbours
  const baseY = TOP_PAD + PLOT_H;
  const yOf = (v) => baseY - (v / top) * PLOT_H;
  const heightOf = (v) => (v > 0 ? Math.max(2, (v / top) * PLOT_H) : 0);
  const centerOf = (i) => gutter + band * i + band / 2;

  const maxLabels = Math.max(2, Math.floor(plotW / 58));
  const labelEvery = Math.max(1, Math.ceil(n / maxLabels));

  function indexFromPointer(event) {
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - gutter;
    if (band <= 0) return null;
    return Math.min(n - 1, Math.max(0, Math.floor(x / band)));
  }

  function onKeyDown(event) {
    if (n === 0) return;
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next = null;
    if (event.key in keys) next = Math.min(n - 1, Math.max(0, (active ?? n - 1) + (active == null ? 0 : keys[event.key])));
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = n - 1;
    else if (event.key === 'Escape' && active != null) {
      event.preventDefault();
      setActive(null);
      return;
    }
    if (next == null) return;
    event.preventDefault();
    setKeyboard(true);
    setActive(next);
  }

  const activePoint = active != null ? points[active] : null;
  const activeText = activePoint
    ? `${pointLabel(activePoint, unit)}: ${formatGBP(activePoint.earned)} earned from ${countOf(activePoint.orders, 'order')}.`
    : '';

  // Tooltip sits beside the column (never over it), at the top of the plot, inside the card.
  let tipLeft = 0;
  if (activePoint) {
    const cxActive = centerOf(active);
    const rightSide = cxActive + band / 2 + 8;
    tipLeft = cxActive < width / 2 || rightSide + TIP_W <= width ? rightSide : cxActive - band / 2 - 8 - TIP_W;
    tipLeft = Math.max(0, Math.min(width - TIP_W, tipLeft));
  }

  const height = TOP_PAD + PLOT_H + AXIS_H;

  return (
    <div>
      <div
        ref={wrapRef}
        role="group"
        aria-roledescription="chart"
        aria-label={`${title} chart. Use the left and right arrow keys to read each ${noun}.`}
        tabIndex={n > 0 ? 0 : -1}
        onKeyDown={onKeyDown}
        onFocus={(e) => {
          // Keyboard focus starts on the most recent column; mouse/touch focus keeps the tapped one.
          if (e.target !== e.currentTarget || n === 0) return;
          let visible = true;
          try {
            visible = e.currentTarget.matches(':focus-visible');
          } catch {
            /* old browsers */
          }
          if (!visible) return;
          setKeyboard(true);
          setActive((current) => current ?? n - 1);
        }}
        onBlur={() => {
          setActive(null);
          setKeyboard(false);
        }}
        className={cx(
          'relative rounded-lg outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-fuji-red focus-visible:ring-offset-4 focus-visible:ring-offset-white',
          busy && 'opacity-60',
        )}
        style={{ height }}
      >
        {width > 0 && n > 0 && (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={summary}
            className="block select-none overflow-visible font-sans"
          >
            {/* Grid + y ticks */}
            <g aria-hidden="true">
              {ticks.map((t) => (
                <g key={t}>
                  {t > 0 && <line x1={gutter} x2={gutter + plotW} y1={yOf(t)} y2={yOf(t)} stroke={GRID} strokeWidth="1" shapeRendering="crispEdges" />}
                  <text
                    x={gutter - 8}
                    y={yOf(t)}
                    dy="0.35em"
                    textAnchor="end"
                    fontSize="11"
                    fill={AXIS_TEXT}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {fmtTick(t)}
                  </text>
                </g>
              ))}
            </g>

            {/* Active band wash (also shows for zero days so the hover visibly responds) */}
            {activePoint && (
              <rect x={gutter + band * active} y={TOP_PAD} width={band} height={PLOT_H} fill={ACTIVE_WASH} aria-hidden="true" />
            )}

            {/* Columns */}
            <g aria-hidden="true">
              {points.map((p, i) => {
                const h = heightOf(p.earned);
                if (!h) return null;
                return (
                  <path
                    key={p.key}
                    d={columnPath(centerOf(i) - barW / 2, baseY - h, barW, h)}
                    fill={i === active ? SERIES_ACTIVE : SERIES}
                  />
                );
              })}
            </g>

            {/* Baseline */}
            <line x1={gutter} x2={gutter + plotW} y1={baseY} y2={baseY} stroke={BASELINE} strokeWidth="1" shapeRendering="crispEdges" aria-hidden="true" />

            {/* Selective direct label: the peak only */}
            {stats.peak >= 0 && (
              <text
                aria-hidden="true"
                x={Math.min(gutter + plotW - 4, Math.max(gutter + 4, centerOf(stats.peak)))}
                y={baseY - heightOf(points[stats.peak].earned) - 8}
                textAnchor={
                  centerOf(stats.peak) - 34 < gutter ? 'start' : centerOf(stats.peak) + 34 > gutter + plotW ? 'end' : 'middle'
                }
                fontSize="11"
                fontWeight="600"
                fill="var(--color-ink)"
              >
                {top >= 10_000 ? tickFmtCompact.format(points[stats.peak].earned) : formatGBP(points[stats.peak].earned)}
              </text>
            )}

            {/* X labels */}
            <g aria-hidden="true">
              {points.map((p, i) =>
                (n - 1 - i) % labelEvery === 0 ? (
                  <text
                    key={p.key}
                    x={centerOf(i)}
                    y={baseY + 18}
                    textAnchor={n > 1 && i === 0 && centerOf(i) - 20 < gutter ? 'start' : 'middle'}
                    fontSize="11"
                    fill={AXIS_TEXT}
                  >
                    {axisLabel(p, unit)}
                  </text>
                ) : null,
              )}
            </g>

            {/* Hit layer: the whole column band is the target */}
            <rect
              x={gutter}
              y={TOP_PAD - 8}
              width={plotW}
              height={PLOT_H + 8}
              fill="transparent"
              aria-hidden="true"
              onPointerMove={(e) => {
                setKeyboard(false);
                setActive(indexFromPointer(e));
              }}
              onPointerDown={(e) => {
                setKeyboard(false);
                setActive(indexFromPointer(e));
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === 'mouse') setActive(null);
              }}
            />
          </svg>
        )}

        {activePoint && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 rounded-xl bg-ink px-3 py-2 text-left text-cream shadow-xl ring-1 ring-black/10"
            style={{ left: tipLeft, top: TOP_PAD - 6, width: TIP_W }}
          >
            <p className="text-base font-semibold leading-tight text-white">{formatGBP(activePoint.earned)}</p>
            <p className="mt-0.5 text-xs leading-snug text-cream/80">{pointLabel(activePoint, unit)}</p>
            <p className="text-xs leading-snug text-cream/80">{countOf(activePoint.orders, 'order')}</p>
          </div>
        )}

        {/* Keyboard readout (hover readouts aren't announced to avoid chatter) */}
        <p className="sr-only" aria-live="polite">
          {keyboard ? activeText : ''}
        </p>
      </div>

      {/* Table twin: every value without hover. (sr-only on a wrapper — a display:table element ignores
          the 1px height/overflow clip and would still stretch the page.) */}
      <div className="sr-only">
        <table>
          <caption>
            {title} per {noun}, {formatDayRange(from, to)}
          </caption>
          <thead>
            <tr>
              <th scope="col">{noun === 'day' ? 'Date' : noun === 'week' ? 'Week' : 'Month'}</th>
              <th scope="col">Earned</th>
              <th scope="col">Orders</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key}>
                <th scope="row">{pointLabel(p, unit)}</th>
                <td>{formatGBP(p.earned)}</td>
                <td>{countFmt.format(p.orders)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Share list (part-to-whole as ranked bars, one hue) ────────── */

function formatShare(part, whole) {
  if (!(whole > 0) || !(part > 0)) return '0%';
  const ratio = part / whole;
  return ratio < 0.005 ? '<1%' : pctFmt.format(ratio);
}

/**
 * Ranked rows: name · thin bar (share of `total`) · £ amount with order count and share.
 * The bar is decorative (aria-hidden) — every figure is printed as text beside it.
 */
export function ShareList({ rows, total, label, className = '' }) {
  const sorted = [...(rows ?? [])].sort((a, b) => (Number(b.earned) || 0) - (Number(a.earned) || 0));
  return (
    <ul aria-label={label} className={cx('space-y-4', className)}>
      {sorted.map((row) => {
        const Icon = row.icon;
        const earned = Number(row.earned) || 0;
        const share = total > 0 ? Math.max(0, Math.min(1, earned / total)) : 0;
        return (
          <li
            key={row.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)_7.5rem]"
          >
            <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
              {Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-dark" />}
              <span className="truncate">{row.label}</span>
            </span>
            <span
              aria-hidden="true"
              className="col-span-2 col-start-1 row-start-2 block h-2 overflow-hidden rounded-full bg-copper/15 sm:col-span-1 sm:col-start-2 sm:row-start-1"
            >
              {earned > 0 && (
                <span className="block h-full rounded-full bg-copper" style={{ width: `max(4px, ${(share * 100).toFixed(2)}%)` }} />
              )}
            </span>
            <span className="col-start-2 row-start-1 text-right sm:col-start-3">
              <span className="block text-sm font-semibold tabular-nums text-ink">{formatGBP(earned)}</span>
              <span className="block whitespace-nowrap text-xs tabular-nums text-muted-dark">
                {countOf(Number(row.orders) || 0, 'order')} · {formatShare(earned, total)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
