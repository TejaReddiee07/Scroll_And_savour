import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CircleDollarSign,
  CreditCard,
  Download,
  HandCoins,
  Hourglass,
  Info,
  Link2,
  PoundSterling,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
  Undo2,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { downloadFile } from '../lib/api.js';
import { paymentMethodLabel } from '../lib/constants.js';
import {
  dayCount,
  formatDayRange,
  formatGBP,
  formatTime,
  isCalendarDay,
  monthBounds,
  pluralise,
  shiftDay,
  todayLondon,
} from '../lib/format.js';
import { useApiQuery } from '../lib/hooks.js';
import { cx } from '../lib/cx.js';
import { Card, PageHeader } from '../components/Card.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { EmptyState, ErrorState } from '../components/EmptyState.jsx';
import { FilterChips, Toolbar } from '../components/Filters.jsx';
import { Switch } from '../components/FormControls.jsx';
import { chartUnit, EarnedChart, ShareList } from '../components/RevenueCharts.jsx';
import { Skeleton, Spinner } from '../components/Skeleton.jsx';
import { useToast } from '../components/Toast.jsx';

/* ── range presets (Europe/London calendar days) ───────────────── */

const DEFAULT_PRESET = '30d';
const MAX_DAYS = 1100; // ~3 years

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
];

function presetRange(preset, today) {
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case '7d':
      return { from: shiftDay(today, -6), to: today };
    case 'month':
      return { from: monthBounds(today).from, to: today };
    case 'last-month':
      return monthBounds(today, -1);
    case '30d':
    default:
      return { from: shiftDay(today, -29), to: today };
  }
}

function validateCustom({ from, to }, today) {
  if (!isCalendarDay(from) || !isCalendarDay(to)) return 'Choose a start and an end date.';
  if (from > to) return 'The start date must be on or before the end date.';
  if (to > today) return 'The end date can’t be in the future.';
  if (dayCount(from, to) > MAX_DAYS) return 'Choose a range of up to 3 years.';
  return '';
}

function readParams(params, today) {
  const p = params.get('range');
  const preset = PRESETS.some((o) => o.value === p) ? p : DEFAULT_PRESET;
  const fallback = presetRange(DEFAULT_PRESET, today);
  const from = params.get('from');
  const to = params.get('to');
  return {
    preset,
    custom: {
      from: isCalendarDay(from) ? from : fallback.from,
      to: isCalendarDay(to) ? to : fallback.to,
    },
    includeDemo: params.get('demo') !== '0',
  };
}

/* ── method / fulfilment presentation ──────────────────────────── */

const METHOD_ICONS = {
  card: CreditCard,
  apple_pay: Smartphone,
  google_pay: Smartphone,
  revolut_pay: Wallet,
  klarna: Wallet,
  paypal: Wallet,
  link: Link2,
  in_person: HandCoins,
};

const FULFILMENT = {
  delivery: { label: 'Delivery', icon: Truck },
  collection: { label: 'Collection', icon: Store },
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const nf = new Intl.NumberFormat('en-GB');
const pct = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 0 });
const shareText = (part, whole) => (whole > 0 ? `${pct.format(Math.min(1, Math.max(0, part / whole)))} of earned` : 'nothing earned yet');

/* ── KPI tile ──────────────────────────────────────────────────── */

const TILE_SHADOW = 'shadow-[0_1px_2px_rgb(20_17_16/0.06),0_8px_24px_-16px_rgb(20_17_16/0.25)]';

function KpiTile({ icon: Icon, label, value, context, emphasis = false, to, attention = false }) {
  const content = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-dark">{label}</span>
        <Icon aria-hidden="true" className={cx('size-4 shrink-0', emphasis ? 'text-fuji-red' : 'text-ink/35')} />
      </span>
      {/* Proportional figures for standalone values (tabular-nums only in columns). */}
      <span className="mt-1.5 block break-words font-sans text-xl font-semibold leading-tight text-ink sm:text-2xl">{value}</span>
      {context && (
        <span className="mt-1 flex items-start gap-1.5 text-xs leading-snug text-ink/70 sm:text-sm">
          {attention && <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-fuji-red" />}
          <span className="min-w-0">{context}</span>
        </span>
      )}
      {to && (
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-fuji-red">
          View orders <ArrowRight aria-hidden="true" className="size-3.5 transition group-hover:translate-x-0.5" />
        </span>
      )}
    </>
  );
  const className = cx(
    'card-light group flex min-w-0 flex-col p-4 sm:p-5',
    TILE_SHADOW,
    emphasis && 'shadow-[inset_0_3px_0_var(--color-fuji-red),0_1px_2px_rgb(20_17_16/0.06),0_8px_24px_-16px_rgb(20_17_16/0.25)]',
    to && 'transition hover:-translate-y-0.5 hover:shadow-card',
  );
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={cx('card-light space-y-2.5 p-4 sm:p-5', TILE_SHADOW)}>
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────────── */

export default function RevenuePage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const today = todayLondon();
  const initial = useMemo(() => readParams(params, today), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [preset, setPreset] = useState(initial.preset);
  const [custom, setCustom] = useState(initial.custom);
  const [includeDemo, setIncludeDemo] = useState(initial.includeDemo);
  const [exporting, setExporting] = useState(false);
  const fromId = useId();
  const toId = useId();
  const customErrorId = useId();

  const range = preset === 'custom' ? custom : presetRange(preset, today);
  const customError = preset === 'custom' ? validateCustom(custom, today) : '';
  const query = { from: range.from, to: range.to, includeDemo: includeDemo ? 'true' : 'false' };

  const q = useApiQuery('/admin/revenue', { query, enabled: !customError });

  // Keep the URL shareable (and restore it on back/forward-free reloads).
  useEffect(() => {
    const next = new URLSearchParams();
    if (preset !== DEFAULT_PRESET) next.set('range', preset);
    if (preset === 'custom') {
      next.set('from', custom.from);
      next.set('to', custom.to);
    }
    if (!includeDemo) next.set('demo', '0');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [preset, custom.from, custom.to, includeDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  function choosePreset(value) {
    if (value === 'custom' && preset !== 'custom') setCustom(range);
    setPreset(value);
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const name = await downloadFile('/admin/revenue/export.csv', {
        query,
        accept: 'text/csv',
        filename: `fuji-revenue-${range.from}-to-${range.to}${includeDemo ? '' : '-real-only'}.csv`,
      });
      toast.success(`Downloaded ${name}.`);
    } catch (err) {
      toast.apiError(err, 'The CSV export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const data = q.data;
  const totals = data?.totals ?? {};
  const shown = data?.range?.from && data?.range?.to ? data.range : { ...range, days: dayCount(range.from, range.to) };
  const days = num(shown.days) || dayCount(shown.from, shown.to);
  const earned = num(totals.earned);
  const firstLoad = q.loading && !data;
  const busy = q.loading && Boolean(data);
  // Stale = refetching, or the custom range is invalid so the figures below still belong to the last valid range.
  const stale = busy || Boolean(customError && data);
  const hasActivity =
    earned > 0 || num(totals.orders) > 0 || num(totals.toCollect) > 0 || num(totals.awaitingPayment) > 0 || num(totals.refunded) > 0;
  const unitNoun = { day: 'day', week: 'week', month: 'month' }[chartUnit(days)];

  const methodRows = (data?.byMethod ?? []).map((m) => ({
    key: m.method,
    label: m.label || paymentMethodLabel(m.method),
    icon: METHOD_ICONS[m.method] ?? CircleDollarSign,
    earned: num(m.earned),
    orders: num(m.orders),
  }));
  const fulfilmentRows = (data?.byFulfilment ?? []).map((f) => ({
    key: f.fulfilment,
    label: FULFILMENT[f.fulfilment]?.label ?? f.fulfilment,
    icon: FULFILMENT[f.fulfilment]?.icon,
    earned: num(f.earned),
    orders: num(f.orders),
  }));
  const topItems = (data?.topItems ?? []).map((item, i) => ({ ...item, rank: i + 1 }));

  const dishColumns = [
    { key: 'rank', header: '#', className: 'w-10 tabular-nums text-muted-dark', render: (r) => r.rank },
    { key: 'name', header: 'Dish', className: 'font-medium text-ink', render: (r) => r.name || r.itemId },
    { key: 'quantity', header: 'Qty sold', align: 'right', className: 'tabular-nums', render: (r) => nf.format(num(r.quantity)) },
    { key: 'earned', header: 'Earned', align: 'right', className: 'tabular-nums font-semibold', render: (r) => formatGBP(r.earned) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description="What the restaurant has actually earned from website orders — online payments that went through, plus pay-in-person orders once they’re completed."
        actions={
          <>
            <button type="button" onClick={q.reload} className="btn btn-sm btn-outline-dark" disabled={q.refreshing || Boolean(customError)}>
              {q.refreshing ? <Spinner className="size-4" /> : <RefreshCw aria-hidden="true" className="size-4" />}
              Refresh
            </button>
            <button type="button" onClick={exportCsv} className="btn btn-sm btn-primary" disabled={exporting || Boolean(customError)}>
              {exporting ? <Spinner className="size-4" /> : <Download aria-hidden="true" className="size-4" />}
              Export CSV
            </button>
          </>
        }
      />

      {/* One filter row scopes everything below it. */}
      <section aria-label="Date range and filters" className="space-y-3">
        <Toolbar className="md:items-center">
          <FilterChips label="Date range" options={PRESETS} value={preset} onChange={choosePreset} />
        </Toolbar>

        {preset === 'custom' && (
          <div role="group" aria-label="Custom date range" className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={fromId} className="field-label text-ink">
                From
              </label>
              <input
                id={fromId}
                type="date"
                className="field w-auto"
                value={custom.from}
                max={today}
                aria-invalid={customError ? 'true' : undefined}
                aria-describedby={customError ? customErrorId : undefined}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor={toId} className="field-label text-ink">
                To
              </label>
              <input
                id={toId}
                type="date"
                className="field w-auto"
                value={custom.to}
                max={today}
                aria-invalid={customError ? 'true' : undefined}
                aria-describedby={customError ? customErrorId : undefined}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              />
            </div>
            <p className="pb-3 text-xs text-muted-dark">London dates, inclusive.</p>
            {customError && (
              <p id={customErrorId} role="alert" className="field-error basis-full">
                {customError}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Switch
            label="Include test orders"
            description="Test orders were paid with Stripe test cards while the site was being set up — not real money."
            checked={includeDemo}
            onChange={(e) => setIncludeDemo(e.target.checked)}
          />
          <p className="text-sm text-muted-dark" aria-live="polite">
            {customError && data && <span>Still showing the last valid range: </span>}
            <span className="font-medium text-ink">{formatDayRange(shown.from, shown.to)}</span> · {pluralise(days, 'day')} ·{' '}
            {(data?.range?.includeDemo ?? includeDemo) ? 'test orders included' : 'real orders only'}
            {q.updatedAt && !customError && <span className="hidden sm:inline"> · updated {formatTime(q.updatedAt)}</span>}
          </p>
        </div>
      </section>

      {q.error && !data ? (
        <Card>
          <ErrorState error={q.error} onRetry={q.refetch} title="Couldn’t load revenue" />
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <section aria-labelledby="revenue-kpis" className="space-y-3">
            <h2 id="revenue-kpis" className="sr-only">
              Totals for {formatDayRange(shown.from, shown.to)}
            </h2>
            {firstLoad ? (
              <KpiSkeleton />
            ) : (
              <div className={cx('grid grid-cols-2 gap-3 transition-opacity sm:gap-4 xl:grid-cols-4', stale && 'opacity-60')} aria-busy={busy || undefined}>
                <KpiTile icon={PoundSterling} label="Earned" value={formatGBP(earned)} context="After refunds" emphasis />
                <KpiTile
                  icon={ShoppingBag}
                  label="Orders"
                  value={nf.format(num(totals.orders))}
                  context={
                    num(totals.cancelled) > 0
                      ? `Paid or completed · ${nf.format(num(totals.cancelled))} cancelled (not counted)`
                      : 'Paid or completed'
                  }
                />
                <KpiTile icon={Receipt} label="Average order" value={formatGBP(num(totals.averageOrder))} context="Earned ÷ orders" />
                <KpiTile icon={CreditCard} label="Paid online" value={formatGBP(num(totals.online))} context={shareText(num(totals.online), earned)} />
                <KpiTile
                  icon={HandCoins}
                  label="Paid in person"
                  value={formatGBP(num(totals.inPerson))}
                  context={`${shareText(num(totals.inPerson), earned)} · completed orders`}
                />
                <KpiTile icon={Undo2} label="Refunded" value={formatGBP(num(totals.refunded))} context="Returned to customers" />
                <KpiTile
                  icon={Wallet}
                  label="To collect"
                  value={formatGBP(num(totals.toCollect))}
                  context={`${pluralise(num(totals.toCollectOrders), 'pay-in-person order')} still open`}
                  attention={num(totals.toCollect) > 0}
                  to="/admin/orders?pay=in-person"
                />
                <KpiTile
                  icon={Hourglass}
                  label="Awaiting payment"
                  value={nf.format(num(totals.awaitingPayment))}
                  context="Unfinished online checkouts — not counted"
                  to="/admin/orders?status=pending-payment"
                />
              </div>
            )}
            <p className="flex items-start gap-2 rounded-xl bg-white/60 px-4 py-3 text-xs leading-relaxed text-ink/75 ring-1 ring-ink/[0.07] sm:text-sm">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fuji-red" />
              <span>
                <strong className="font-semibold text-ink">How earnings are counted:</strong> online payments that succeeded (minus any
                refunds) plus pay-in-person orders once they’re marked <em className="not-italic font-medium">Completed</em>. Pay-in-person
                orders still in progress show as <em className="not-italic font-medium">To collect</em>. Unfinished online checkouts and
                cancelled orders never count. Each order belongs to the London calendar day it was placed.
              </span>
            </p>
          </section>

          {/* Earned over time */}
          <Card
            title={`Earned per ${unitNoun}`}
            titleId="revenue-chart-heading"
            description={
              data && earned > 0
                ? `${formatGBP(earned)} across ${pluralise(days, 'day')}${unitNoun === 'day' ? '' : ` · grouped by ${unitNoun}`}`
                : undefined
            }
            bodyClassName="p-4 sm:p-5"
          >
            {firstLoad ? (
              <div aria-hidden="true" className="flex h-[276px] items-end gap-1.5 pb-[30px] pl-12 sm:gap-2">
                {Array.from({ length: 18 }, (_, i) => (
                  <div
                    key={i}
                    className="flex-1 animate-pulse rounded-t-md bg-ink/10"
                    style={{ height: `${25 + ((i * 37) % 60)}%` }}
                  />
                ))}
              </div>
            ) : customError ? (
              <EmptyState icon={Info} title="Choose a valid date range" description={customError} />
            ) : days < 2 ? (
              <p className="py-6 text-center text-sm text-muted-dark">
                The day-by-day chart needs at least two days — pick “Last 7 days” or a longer range. Today’s totals are shown above.
              </p>
            ) : !hasActivity ? (
              <EmptyState
                icon={PoundSterling}
                title="Nothing earned in this range"
                description={
                  includeDemo
                    ? 'No paid or completed orders were placed between these dates.'
                    : 'No real orders were paid or completed between these dates. Switch on “Include test orders” to see test orders.'
                }
              />
            ) : (
              <EarnedChart daily={data?.daily} from={shown.from} to={shown.to} busy={busy} title="Earned revenue" />
            )}
          </Card>

          {/* Breakdowns */}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Card title="By payment method" titleId="revenue-methods" description="Share of earned revenue" bodyClassName="p-5">
              {firstLoad ? (
                <BreakdownSkeleton rows={4} />
              ) : methodRows.length === 0 || earned <= 0 ? (
                <p className="text-sm text-muted-dark">No earned orders in this range yet.</p>
              ) : (
                <ShareList rows={methodRows} total={earned} label="Earned by payment method" className={cx('transition-opacity', stale && 'opacity-60')} />
              )}
            </Card>

            <Card title="By fulfilment" titleId="revenue-fulfilment" description="Delivery vs collection" bodyClassName="p-5">
              {firstLoad ? (
                <BreakdownSkeleton rows={2} />
              ) : fulfilmentRows.length === 0 || earned <= 0 ? (
                <p className="text-sm text-muted-dark">No earned orders in this range yet.</p>
              ) : (
                <ShareList rows={fulfilmentRows} total={earned} label="Earned by fulfilment" className={cx('transition-opacity', stale && 'opacity-60')} />
              )}
            </Card>
          </div>

          <Card title="Top dishes" titleId="revenue-top-dishes" description="Up to 10 dishes by earned revenue (earned orders only)">
            <DataTable
              caption={`Top dishes by earned revenue, ${formatDayRange(shown.from, shown.to)}`}
              columns={dishColumns}
              rows={topItems}
              rowKey={(r) => r.itemId || r.name}
              loading={q.loading && !data}
              busy={stale}
              skeletonRows={5}
              minWidth="300px"
              empty={
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No dishes sold yet"
                  description="Dishes from paid and completed orders in this range will be ranked here."
                />
              }
            />
          </Card>
        </>
      )}
    </div>
  );
}

function BreakdownSkeleton({ rows }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}
