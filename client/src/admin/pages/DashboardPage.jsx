import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgePercent,
  CalendarDays,
  ChartColumn,
  ChefHat,
  Clock,
  ExternalLink,
  Mail,
  PlusCircle,
  PoundSterling,
  RefreshCw,
  ShoppingBag,
  Truck,
  Store,
  UtensilsCrossed,
  Users,
} from 'lucide-react';
import { useStats, STATS_REFRESH_MS } from '../lib/stats.jsx';
import { formatGBP, formatPlaced, formatTime, friendlyDay, pluralise } from '../lib/format.js';
import { Card } from '../components/Card.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { EmptyState, ErrorState } from '../components/EmptyState.jsx';
import { Skeleton, Spinner } from '../components/Skeleton.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { LINK } from '../components/ui.js';

const nf = new Intl.NumberFormat('en-GB');

function StatTile({ to, icon: Icon, label, value, context, attention = false }) {
  return (
    <Link
      to={to}
      className="card-light group flex min-w-0 items-start gap-4 p-5 shadow-[0_1px_2px_rgb(20_17_16/0.06),0_8px_24px_-16px_rgb(20_17_16/0.25)] transition hover:-translate-y-0.5 hover:shadow-card"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-cream text-fuji-red ring-1 ring-ink/5"
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-muted-dark">{label}</span>
        <span className="mt-1 block font-sans text-3xl font-semibold tabular-nums leading-tight text-ink">{value}</span>
        {context && (
          <span className="mt-1 flex items-center gap-1.5 text-sm text-ink/70">
            {attention && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-fuji-red" />}
            {context}
          </span>
        )}
      </span>
      <ArrowRight
        aria-hidden="true"
        className="mt-1 size-4 shrink-0 text-ink/25 transition group-hover:translate-x-0.5 group-hover:text-fuji-red"
      />
    </Link>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="card-light flex gap-4 p-5">
          <Skeleton className="size-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>
      ))}
    </div>
  );
}

const QUICK_LINKS = [
  { to: '/admin/revenue', label: 'Revenue & payments', icon: ChartColumn },
  { to: '/admin/menu?new=1', label: 'Add a dish', icon: PlusCircle },
  { to: '/admin/menu?available=false', label: 'Unavailable dishes', icon: UtensilsCrossed },
  { to: '/admin/offers', label: 'Manage offers', icon: BadgePercent },
  { to: '/admin/settings', label: 'Opening hours & settings', icon: Clock },
];

export default function DashboardPage() {
  const { stats, error, loading, refreshing, updatedAt, reload } = useStats();

  if (!stats && error) {
    return (
      <Card>
        <ErrorState error={error} onRetry={reload} title="Couldn’t load the dashboard" />
      </Card>
    );
  }

  const today = stats?.today ?? {};
  const pending = stats?.pending ?? {};
  const menu = stats?.menu ?? {};
  const recentOrders = stats?.recentOrders ?? [];
  const upcoming = stats?.upcomingReservations ?? [];

  const orderColumns = [
    {
      key: 'reference',
      header: 'Order',
      render: (o) => (
        <Link to={`/admin/orders?search=${encodeURIComponent(o.reference)}`} className={`${LINK} whitespace-nowrap font-mono text-[0.8rem]`}>
          {o.reference}
        </Link>
      ),
    },
    { key: 'customer', header: 'Customer', render: (o) => o.customer?.name || '—' },
    {
      key: 'fulfilment',
      header: 'Type',
      render: (o) => (
        <span className="inline-flex items-center gap-1.5 text-ink/80">
          {o.fulfilment === 'collection' ? (
            <Store aria-hidden="true" className="size-4" />
          ) : (
            <Truck aria-hidden="true" className="size-4" />
          )}
          {o.fulfilment === 'collection' ? 'Collection' : 'Delivery'}
        </span>
      ),
    },
    { key: 'total', header: 'Total', align: 'right', className: 'tabular-nums', render: (o) => formatGBP(o.total) },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge kind="order" status={o.status} /> },
    {
      key: 'createdAt',
      header: 'Placed',
      className: 'whitespace-nowrap text-ink/70',
      render: (o) => <time dateTime={o.createdAt}>{formatPlaced(o.createdAt)}</time>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-dark">
          Today at a glance (Europe/London).{' '}
          {updatedAt && (
            <span>
              Updated {formatTime(updatedAt, { seconds: true })} · refreshes every {STATS_REFRESH_MS / 1000} s.
            </span>
          )}
        </p>
        <button type="button" onClick={reload} className="btn btn-sm btn-outline-dark" disabled={refreshing}>
          {refreshing ? <Spinner className="size-4" /> : <RefreshCw aria-hidden="true" className="size-4" />}
          Refresh
        </button>
      </div>

      {stats?.periods && (
        <section aria-label="Earnings by period" className="card-light grid grid-cols-2 divide-ink/10 overflow-hidden sm:grid-cols-4 sm:divide-x">
          {[
            ['Today', stats.periods.today, 'today'],
            ['Last 7 days', stats.periods.last7, '7d'],
            ['Last 30 days', stats.periods.last30, '30d'],
            ['All time', stats.periods.allTime, null],
          ].map(([label, p, range]) => (
            <Link
              key={label}
              to={range ? `/admin/revenue?range=${range}` : '/admin/revenue'}
              className="group p-5 transition hover:bg-ink/[0.04]"
            >
              <p className="mono text-[0.68rem] uppercase tracking-[0.16em] text-ink/60">Earned · {label}</p>
              <p className="mt-1 font-display text-3xl text-ink">{formatGBP(p?.earned ?? 0)}</p>
              <p className="text-sm text-ink/60">{pluralise(p?.orders ?? 0, 'paid order')}</p>
            </Link>
          ))}
        </section>
      )}
      {stats?.periods?.lastEarnedAt && (stats.periods.today?.orders ?? 0) === 0 && (
        <p className="-mt-2 text-sm text-ink/60">
          No paid orders yet today (London time). The last one was on {new Date(stats.periods.lastEarnedAt).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.
        </p>
      )}

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Key figures
        </h2>
        {!stats && loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatTile
              to="/admin/orders"
              icon={ShoppingBag}
              label="Today’s orders"
              value={nf.format(today.orders ?? 0)}
              context={`${pluralise(pending.orders ?? 0, 'order')} awaiting action`}
              attention={(pending.orders ?? 0) > 0}
            />
            <StatTile
              to="/admin/revenue?range=today"
              icon={PoundSterling}
              label="Earned today"
              value={formatGBP(today.revenue ?? 0)}
              context={
                today.toCollect != null
                  ? `${formatGBP(today.toCollect)} to collect`
                  : 'Paid online + completed pay-in-person orders'
              }
              attention={Number(today.toCollect) > 0}
            />
            <StatTile
              to="/admin/reservations"
              icon={CalendarDays}
              label="Reservations today"
              value={nf.format(today.reservations ?? 0)}
              context={`${nf.format(pending.reservations ?? 0)} pending confirmation`}
              attention={(pending.reservations ?? 0) > 0}
            />
            <StatTile
              to="/admin/catering"
              icon={ChefHat}
              label="Catering enquiries"
              value={nf.format(pending.enquiries ?? 0)}
              context={`awaiting reply · ${nf.format(today.enquiries ?? 0)} received today`}
              attention={(pending.enquiries ?? 0) > 0}
            />
            <StatTile
              to="/admin/messages"
              icon={Mail}
              label="Unread messages"
              value={nf.format(pending.unreadMessages ?? 0)}
              context={`${nf.format(today.messages ?? 0)} received today`}
              attention={(pending.unreadMessages ?? 0) > 0}
            />
            <StatTile
              to="/admin/menu"
              icon={UtensilsCrossed}
              label="Menu items"
              value={nf.format(menu.items ?? 0)}
              context={`${nf.format(menu.unavailable ?? 0)} unavailable · ${pluralise(menu.categories ?? 0, 'category', 'categories')}`}
              attention={(menu.unavailable ?? 0) > 0}
            />
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card
          title="Recent orders"
          titleId="recent-orders-heading"
          actions={
            <Link to="/admin/orders" className="btn btn-sm btn-outline-dark">
              All orders <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          }
        >
          <DataTable
            caption="Recent orders"
            columns={orderColumns}
            rows={recentOrders}
            loading={!stats && loading}
            skeletonRows={5}
            minWidth="600px"
            empty={<EmptyState icon={ShoppingBag} title="No orders yet" description="New online orders will appear here." />}
          />
        </Card>

        <div className="space-y-6">
          <Card
            title="Upcoming reservations"
            titleId="upcoming-heading"
            actions={
              <Link to="/admin/reservations?view=upcoming" className="btn btn-sm btn-outline-dark">
                All <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            }
          >
            {!stats && loading ? (
              <div className="space-y-3 p-5" aria-hidden="true">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming reservations" description="New bookings will appear here." />
            ) : (
              <ul className="divide-y divide-ink/[0.07]">
                {upcoming.map((r) => (
                  <li key={r._id}>
                    <Link
                      to={`/admin/reservations?view=upcoming&search=${encodeURIComponent(r.reference || r.name || '')}`}
                      className="flex items-center gap-4 px-5 py-3 transition hover:bg-cream/50"
                    >
                      <span className="w-20 shrink-0 text-sm leading-tight">
                        <span className="block font-semibold text-ink">{friendlyDay(r.date)}</span>
                        <span className="block tabular-nums text-muted-dark">{r.time}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{r.name}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-dark">
                          <Users aria-hidden="true" className="size-3.5" />
                          {pluralise(r.guests ?? 0, 'guest')}
                        </span>
                      </span>
                      <StatusBadge kind="reservation" status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Quick links" titleId="quick-links-heading" bodyClassName="p-3">
            <ul className="grid gap-1 sm:grid-cols-2 xl:grid-cols-1">
              {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink transition hover:bg-cream hover:text-fuji-red"
                  >
                    <Icon aria-hidden="true" className="size-4 text-fuji-red" />
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="/"
                  target="_blank"
                  rel="noopener"
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink transition hover:bg-cream hover:text-fuji-red"
                >
                  <ExternalLink aria-hidden="true" className="size-4 text-fuji-red" />
                  View the public site<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
