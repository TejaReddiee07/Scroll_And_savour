import { useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, Check, ChevronRight, ExternalLink, Eye, Hourglass, Info, RefreshCw, ShoppingBag, Store, Truck, Undo2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { normalizeList, patchInList } from '../lib/data.js';
import {
  canCancelOrder,
  canRefundOrder,
  canSyncPayment,
  cardBrandLabel,
  nextOrderStatus,
  ORDER_ACTION_LABELS,
  ORDER_STATUSES,
  orderFlow,
  PAYMENT_FILTERS,
  paymentMethodLabel,
  paymentOf,
  paymentSummary,
  refundableAmount,
  STATUS_META,
  statusLabel,
} from '../lib/constants.js';
import { MONEY_RE, parseMoney } from '../lib/forms.js';
import { formatDateTime, formatGBP, formatPlaced, mailtoHref, pluralise, telHref } from '../lib/format.js';
import { useApiQuery, useDebouncedValue } from '../lib/hooks.js';
import { useStats } from '../lib/stats.jsx';
import { Card, DetailList, PageHeader } from '../components/Card.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Drawer, Modal } from '../components/Dialog.jsx';
import { EmptyState, ErrorState } from '../components/EmptyState.jsx';
import { FilterChips, SearchInput, Toolbar } from '../components/Filters.jsx';
import { FormAlert, TextInput } from '../components/FormControls.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Spinner } from '../components/Skeleton.jsx';
import { DemoBadge, PaymentBadge, StatusBadge, StripeModeBadge } from '../components/StatusBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import { BTN_DANGER, ICON_BTN, LINK } from '../components/ui.js';
import { cx } from '../lib/cx.js';

const PAGE_SIZE = 20;
const REFRESH_MS = 20_000;

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_META.order[s].label })),
];

const PAYMENT_CHIPS = PAYMENT_FILTERS.map(({ value, label }) => ({ value, label }));

const itemCount = (order) => (order.items ?? []).reduce((n, line) => n + (Number(line.quantity) || 0), 0);

function cancelMessage(order) {
  const pay = paymentOf(order);
  if (pay.method === 'online' && ['pending', 'failed', 'unpaid'].includes(pay.status)) {
    return 'The customer hasn’t finished paying. Cancelling stops the payment from being taken, and their order tracker will show the order as cancelled.';
  }
  if (pay.method === 'online' && ['paid', 'partially-refunded'].includes(pay.status)) {
    return 'This order was paid online. Cancelling does NOT refund the customer — use “Refund” in the order’s Payment section if they should get their money back. Cancelled orders can’t be moved back into the kitchen flow.';
  }
  return 'The customer’s order tracker will show this order as cancelled. Cancelled orders can’t be moved back into the kitchen flow.';
}

export default function OrdersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { reload: reloadStats } = useStats();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(() => {
    const s = params.get('status');
    return ORDER_STATUSES.includes(s) ? s : '';
  });
  const [pay, setPay] = useState(() => {
    const p = params.get('pay');
    return PAYMENT_FILTERS.some((f) => f.value === p) ? p : '';
  });
  const [search, setSearch] = useState(() => params.get('search') ?? '');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(null); // `${orderId}:${status | 'sync'}`
  const [refundOrder, setRefundOrder] = useState(null);

  const payQuery = PAYMENT_FILTERS.find((f) => f.value === pay)?.query ?? {};
  const q = useApiQuery('/admin/orders', {
    query: { status, search: debouncedSearch, ...payQuery, page, limit: PAGE_SIZE },
    interval: REFRESH_MS,
  });
  const list = normalizeList(q.data);
  const current = selected ? list.data.find((o) => o._id === selected._id) ?? selected : null;
  const filtersActive = Boolean(status || pay || debouncedSearch);

  function applyUpdate(order, merged) {
    q.setData((d) => patchInList(d, order._id, merged));
    setSelected((s) => (s && s._id === order._id ? merged : s));
    q.reload();
    reloadStats();
  }

  async function changeStatus(order, nextStatus) {
    if (nextStatus === 'cancelled') {
      const ok = await confirm({
        title: `Cancel order ${order.reference}?`,
        message: cancelMessage(order),
        confirmLabel: 'Cancel order',
        cancelLabel: 'Keep order',
      });
      if (!ok) return;
    }
    setUpdating(`${order._id}:${nextStatus}`);
    try {
      const updated = await api.patch(`/admin/orders/${order._id}/status`, { status: nextStatus });
      const merged = { ...order, ...(updated ?? {}), status: updated?.status ?? nextStatus };
      applyUpdate(order, merged);
      toast.success(`${order.reference} → ${statusLabel('order', merged.status)}`);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setUpdating(null);
    }
  }

  /** POST /admin/orders/:id/payment/sync — re-reads the PaymentIntent from Stripe. */
  async function syncPayment(order) {
    setUpdating(`${order._id}:sync`);
    try {
      const updated = await api.post(`/admin/orders/${order._id}/payment/sync`);
      const merged = { ...order, ...(updated ?? {}) };
      applyUpdate(order, merged);
      const after = paymentOf(merged);
      const summary = paymentSummary(merged);
      if (order.status === 'pending-payment' && merged.status !== 'pending-payment' && merged.status !== 'cancelled') {
        toast.success(`${order.reference} is paid — moved to ${statusLabel('order', merged.status)}.`);
      } else if (after.status === 'failed') {
        toast.error(`${order.reference}: payment failed${after.failureMessage ? ` — ${after.failureMessage}` : '.'}`);
      } else if (after.status === 'pending') {
        toast.info(`${order.reference}: still awaiting payment. Stripe hasn’t confirmed it yet.`);
      } else {
        toast.info(`${order.reference}: ${summary.label}. Payment details are up to date.`);
      }
    } catch (err) {
      toast.apiError(err);
    } finally {
      setUpdating(null);
    }
  }

  function handleRefunded(order, updated) {
    const merged = { ...order, ...(updated ?? {}) };
    applyUpdate(order, merged);
    setRefundOrder(null);
  }

  const columns = [
    {
      key: 'reference',
      header: 'Order',
      render: (o) => (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setSelected(o)} className={cx(LINK, 'whitespace-nowrap font-mono text-[0.8rem]')}>
            {o.reference}
            <span className="sr-only">, view details</span>
          </button>
          {o.isDemo && <DemoBadge />}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Placed',
      className: 'whitespace-nowrap text-ink/75',
      render: (o) => (
        <time dateTime={o.createdAt} title={formatDateTime(o.createdAt)}>
          {formatPlaced(o.createdAt)}
        </time>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => (
        <div className="min-w-[7rem]">
          <p className="font-medium text-ink">{o.customer?.name || '—'}</p>
          {o.customer?.phone && <p className="text-xs text-muted-dark">{o.customer.phone}</p>}
        </div>
      ),
    },
    {
      key: 'fulfilment',
      header: 'Type',
      render: (o) => (
        <div className="whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 text-ink/80">
            {o.fulfilment === 'collection' ? <Store aria-hidden="true" className="size-4" /> : <Truck aria-hidden="true" className="size-4" />}
            {o.fulfilment === 'collection' ? 'Collection' : 'Delivery'}
          </span>
          <span className="block text-xs tabular-nums text-muted-dark">{pluralise(itemCount(o), 'item')}</span>
        </div>
      ),
    },
    { key: 'total', header: 'Total', align: 'right', className: 'tabular-nums font-medium', render: (o) => formatGBP(o.total) },
    {
      key: 'status',
      header: 'Status & payment',
      render: (o) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge kind="order" status={o.status} />
          <PaymentBadge order={o} />
        </div>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (o) => {
        const next = nextOrderStatus(o);
        const busy = updating === `${o._id}:${next}`;
        const showSync = o.status === 'pending-payment' && canSyncPayment(o);
        return (
          <div className="flex items-center justify-end gap-1">
            {next && (
              <button
                type="button"
                className="btn btn-sm btn-dark whitespace-nowrap px-3"
                onClick={() => changeStatus(o, next)}
                disabled={Boolean(updating)}
                aria-label={`${ORDER_ACTION_LABELS[next]} — order ${o.reference}`}
              >
                {busy ? <Spinner className="size-4" /> : <ChevronRight aria-hidden="true" className="size-4" />}
                {ORDER_ACTION_LABELS[next]}
              </button>
            )}
            {showSync && (
              <button
                type="button"
                className="btn btn-sm btn-outline-dark whitespace-nowrap px-3"
                onClick={() => syncPayment(o)}
                disabled={Boolean(updating)}
                aria-label={`Check payment — order ${o.reference}`}
              >
                {updating === `${o._id}:sync` ? <Spinner className="size-4" /> : <RefreshCw aria-hidden="true" className="size-4" />}
                Check payment
              </button>
            )}
            <button
              type="button"
              className={ICON_BTN}
              onClick={() => setSelected(o)}
              aria-label={`View order ${o.reference}`}
              title="View order"
            >
              <Eye aria-hidden="true" className="size-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          <span className="inline-flex items-start gap-2">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fuji-red" />
            <span>
              Status changes drive the customer’s animated order tracker on the website, so move orders along as the kitchen
              works. Orders paid online start as “Awaiting payment” and move to Received by themselves once Stripe confirms the
              payment. This list refreshes every 20 seconds.
            </span>
          </span>
        }
      />

      <div className="space-y-3">
        <Toolbar className="md:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            label="Search orders"
            placeholder="Reference, name or phone…"
            className="md:w-80"
          />
        </Toolbar>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          <span className="field-label shrink-0 pt-2 text-ink sm:w-20" aria-hidden="true">
            Status
          </span>
          <FilterChips
            label="Filter by order status"
            options={STATUS_FILTERS}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          <span className="field-label shrink-0 pt-2 text-ink sm:w-20" aria-hidden="true">
            Payment
          </span>
          <FilterChips
            label="Filter by payment"
            options={PAYMENT_CHIPS}
            value={pay}
            onChange={(v) => {
              setPay(v);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Card>
        {q.error && !q.data ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : (
          <DataTable
            caption="Orders, newest first"
            columns={columns}
            rows={list.data}
            loading={q.loading}
            busy={q.loading && list.data.length > 0}
            minWidth="900px"
            rowClassName={(o) => (o.status === 'cancelled' ? 'opacity-60' : undefined)}
            empty={
              <EmptyState
                icon={ShoppingBag}
                title={filtersActive ? 'No orders match these filters' : 'No orders yet'}
                description={filtersActive ? 'Try another status, payment filter or search.' : 'Online orders will appear here as soon as they are placed.'}
              />
            }
          />
        )}
      </Card>

      <Pagination page={list.page} pages={list.pages} total={list.total} onPageChange={setPage} noun="order" label="Orders pages" />

      <OrderDrawer
        order={current}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onChangeStatus={changeStatus}
        onSyncPayment={syncPayment}
        onRefund={(o) => setRefundOrder(o)}
        updating={updating}
      />

      <RefundDialog
        order={refundOrder}
        open={Boolean(refundOrder)}
        onClose={() => setRefundOrder(null)}
        onRefunded={handleRefunded}
      />
    </div>
  );
}

function OrderDrawer({ order, open, onClose, onChangeStatus, onSyncPayment, onRefund, updating }) {
  if (!order) return <Drawer open={false} onClose={onClose} title="" />;
  const next = nextOrderStatus(order);
  const flow = orderFlow(order.fulfilment);
  const flowIndex = flow.indexOf(order.status);
  const history = order.statusHistory ?? [];
  const address = order.customer?.address;
  const cancelBusy = updating === `${order._id}:cancelled`;
  const nextBusy = updating === `${order._id}:${next}`;
  const syncBusy = updating === `${order._id}:sync`;
  const awaitingPayment = order.status === 'pending-payment';
  const footerSync = awaitingPayment && canSyncPayment(order);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={`Order ${order.reference}`}
      description={`Placed ${formatDateTime(order.createdAt)}`}
      headerExtra={order.isDemo ? <DemoBadge className="mt-1" /> : null}
      footer={
        <>
          {canCancelOrder(order) && (
            <button
              type="button"
              className={cx(BTN_DANGER, 'mr-auto')}
              onClick={() => onChangeStatus(order, 'cancelled')}
              disabled={Boolean(updating)}
            >
              {cancelBusy ? <Spinner className="size-4" /> : <Ban aria-hidden="true" className="size-4" />}
              Cancel order
            </button>
          )}
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={onClose}>
            Close
          </button>
          {footerSync && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => onSyncPayment(order)} disabled={Boolean(updating)}>
              {syncBusy ? <Spinner className="size-4" /> : <RefreshCw aria-hidden="true" className="size-4" />}
              Check payment
            </button>
          )}
          {next && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => onChangeStatus(order, next)} disabled={Boolean(updating)}>
              {nextBusy ? <Spinner className="size-4" /> : <ChevronRight aria-hidden="true" className="size-4" />}
              {ORDER_ACTION_LABELS[next]}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-7">
        {/* Progress */}
        <section aria-labelledby="order-progress">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 id="order-progress" className="font-display text-base font-bold">
              Progress
            </h3>
            <StatusBadge kind="order" status={order.status} />
          </div>
          {order.status === 'cancelled' ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">This order was cancelled.</p>
          ) : (
            <>
              {awaitingPayment && (
                <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
                  <Hourglass aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Waiting for the customer to finish paying online — don’t start cooking yet. The order moves to{' '}
                    <strong className="font-semibold">Received</strong> by itself once Stripe confirms the payment. If it seems stuck,
                    use <strong className="font-semibold">Check payment</strong>.
                  </span>
                </p>
              )}
              <ol className="grid grid-cols-5 gap-1.5" aria-label="Order progress">
                {flow.map((step, i) => {
                  const done = i < flowIndex;
                  const isCurrent = i === flowIndex;
                  return (
                    <li key={step} className="min-w-0" aria-current={isCurrent ? 'step' : undefined}>
                      <span
                        aria-hidden="true"
                        className={cx('block h-1.5 rounded-full', done || isCurrent ? 'bg-fuji-red' : 'bg-ink/10')}
                      />
                      <span
                        className={cx(
                          'mt-1.5 flex items-center gap-1 text-[0.7rem] leading-tight',
                          isCurrent ? 'font-semibold text-ink' : done ? 'text-ink/70' : 'text-muted-dark',
                        )}
                      >
                        {done && <Check aria-hidden="true" className="size-3 shrink-0 text-fuji-red" />}
                        {statusLabel('order', step)}
                        <span className="sr-only">{done ? ' (done)' : isCurrent ? ' (current)' : ''}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-dark">
            <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            Each change is shown immediately on the customer’s animated order tracker.
          </p>
        </section>

        {/* Payment */}
        <PaymentSection
          order={order}
          showSync={!footerSync && canSyncPayment(order)}
          syncBusy={syncBusy}
          disabled={Boolean(updating)}
          onSync={() => onSyncPayment(order)}
          onRefund={() => onRefund(order)}
        />

        {/* Items */}
        <section aria-labelledby="order-items">
          <h3 id="order-items" className="mb-2 font-display text-base font-bold">
            Items <span className="font-sans text-sm font-normal text-muted-dark">({pluralise(itemCount(order), 'item')})</span>
          </h3>
          <div className="relative overflow-x-auto rounded-xl ring-1 ring-ink/10">
            <table className="w-full min-w-[22rem] text-sm">
              <caption className="sr-only">Items in order {order.reference}</caption>
              <thead className="bg-cream/60 text-xs uppercase tracking-wider text-muted-dark">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Dish</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Qty</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Price</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.07]">
                {(order.items ?? []).map((line, i) => (
                  <tr key={`${line.itemId}-${i}`}>
                    <td className="px-3 py-2 text-ink">{line.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{line.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink/75">{formatGBP(line.price)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{formatGBP(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-ink/10 text-sm">
                <tr>
                  <th scope="row" colSpan={3} className="px-3 pt-2 text-right font-medium text-ink/75">Subtotal</th>
                  <td className="px-3 pt-2 text-right tabular-nums">{formatGBP(order.subtotal)}</td>
                </tr>
                {order.fulfilment !== 'collection' && (
                  <tr>
                    <th scope="row" colSpan={3} className="px-3 text-right font-medium text-ink/75">Delivery fee</th>
                    <td className="px-3 text-right tabular-nums">
                      {order.deliveryFee == null ? <span className="text-muted-dark">To be confirmed</span> : formatGBP(order.deliveryFee)}
                    </td>
                  </tr>
                )}
                <tr>
                  <th scope="row" colSpan={3} className="px-3 pb-2 text-right font-semibold">Total</th>
                  <td className="px-3 pb-2 text-right text-base font-semibold tabular-nums">{formatGBP(order.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Customer */}
        <section aria-labelledby="order-customer">
          <h3 id="order-customer" className="mb-3 font-display text-base font-bold">
            Customer & {order.fulfilment === 'collection' ? 'collection' : 'delivery'}
          </h3>
          <DetailList
            items={[
              { label: 'Name', value: order.customer?.name },
              {
                label: 'Phone',
                value: order.customer?.phone ? (
                  <a href={telHref(order.customer.phone)} className={LINK}>
                    {order.customer.phone}
                  </a>
                ) : null,
              },
              {
                label: 'Email',
                value: order.customer?.email ? (
                  <a href={mailtoHref(order.customer.email, `Your Fuji order ${order.reference}`)} className={LINK}>
                    {order.customer.email}
                  </a>
                ) : null,
              },
              { label: 'Fulfilment', value: order.fulfilment === 'collection' ? 'Collection' : 'Delivery' },
              {
                label: 'Delivery address',
                full: true,
                hidden: order.fulfilment === 'collection',
                value: address ? (
                  <span className="whitespace-pre-line">{[address.line1, address.line2, address.postcode].filter(Boolean).join('\n')}</span>
                ) : null,
              },
              {
                label: 'Notes',
                full: true,
                value: order.customer?.notes ? <span className="whitespace-pre-line">{order.customer.notes}</span> : 'None',
              },
            ]}
          />
        </section>

        {/* History */}
        <section aria-labelledby="order-history">
          <h3 id="order-history" className="mb-3 font-display text-base font-bold">
            Status history
          </h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-dark">No status changes recorded yet.</p>
          ) : (
            <ol className="relative ml-1.5 border-l border-ink/15">
              {history.map((entry, i) => (
                <li key={`${entry.status}-${entry.at}-${i}`} className="relative pb-4 pl-5 last:pb-0">
                  <span
                    aria-hidden="true"
                    className={cx(
                      'absolute -left-[5px] top-1.5 size-2.5 rounded-full ring-2 ring-rice',
                      i === history.length - 1 ? 'bg-fuji-red' : 'bg-ink/30',
                    )}
                  />
                  <p className="text-sm font-medium text-ink">{statusLabel('order', entry.status)}</p>
                  <p className="text-xs text-muted-dark">
                    <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Drawer>
  );
}

function stripeDashboardUrl(pay) {
  if (!pay.intentId || !/^pi_[A-Za-z0-9_]+$/.test(pay.intentId)) return null;
  return `https://dashboard.stripe.com/${pay.livemode ? '' : 'test/'}payments/${pay.intentId}`;
}

function safeHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

function PaymentSection({ order, showSync, syncBusy, disabled, onSync, onRefund }) {
  const pay = paymentOf(order);
  const online = pay.method === 'online';
  const refundable = canRefundOrder(order);
  const refunded = Number(pay.amountRefunded) || 0;
  const paidWith = [
    pay.methodType ? paymentMethodLabel(pay.methodType) : null,
    pay.brand || pay.last4 ? [cardBrandLabel(pay.brand), pay.last4 ? `•••• ${pay.last4}` : ''].filter(Boolean).join(' ') : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const receiptUrl = pay.receiptUrl ? safeHttpUrl(pay.receiptUrl) : null;
  const dashboardUrl = stripeDashboardUrl(pay);
  const where = order.fulfilment === 'collection' ? 'on collection' : 'on delivery';

  const items = online
    ? [
        { label: 'Method', value: 'Online (Stripe)' },
        { label: 'Status', value: <PaymentBadge order={order} /> },
        { label: 'Paid with', value: paidWith || null },
        {
          label: 'Amount',
          value:
            Number(pay.amount) > 0 ? (
              <span className="tabular-nums">{formatGBP(pay.amount)}</span>
            ) : (
              <span>
                <span className="tabular-nums">{formatGBP(order.total)}</span> <span className="text-muted-dark">(not charged yet)</span>
              </span>
            ),
        },
        { label: 'Refunded', hidden: refunded <= 0, value: <span className="tabular-nums">{formatGBP(refunded)}</span> },
        { label: 'Paid at', value: pay.paidAt ? <time dateTime={pay.paidAt}>{formatDateTime(pay.paidAt)}</time> : null },
        { label: 'Stripe mode', value: <StripeModeBadge livemode={Boolean(pay.livemode)} /> },
        {
          label: 'PaymentIntent',
          value: pay.intentId ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <code className="break-all font-mono text-[0.78rem] text-ink/85">{pay.intentId}</code>
              {dashboardUrl && (
                <a href={dashboardUrl} target="_blank" rel="noopener noreferrer" className={cx(LINK, 'inline-flex items-center gap-1 text-xs')}>
                  Open in Stripe
                  <ExternalLink aria-hidden="true" className="size-3" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </span>
          ) : null,
        },
        {
          label: 'Receipt',
          value: receiptUrl ? (
            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className={cx(LINK, 'inline-flex items-center gap-1')}>
              View Stripe receipt
              <ExternalLink aria-hidden="true" className="size-3.5" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null,
        },
      ]
    : [
        { label: 'Method', value: `Pay in person (${where})` },
        { label: 'Status', value: <PaymentBadge order={order} /> },
        {
          label: order.status === 'completed' ? 'Collected' : 'To collect',
          value:
            order.status === 'cancelled' ? (
              'Nothing — order cancelled'
            ) : (
              <span className="tabular-nums">{formatGBP(order.total)}</span>
            ),
        },
      ];

  return (
    <section aria-labelledby="order-payment">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id="order-payment" className="font-display text-base font-bold">
          Payment
        </h3>
        {(showSync || refundable) && (
          <div className="flex flex-wrap gap-2">
            {showSync && (
              <button type="button" className="btn btn-sm btn-outline-dark" onClick={onSync} disabled={disabled}>
                {syncBusy ? <Spinner className="size-4" /> : <RefreshCw aria-hidden="true" className="size-4" />}
                Check payment
              </button>
            )}
            {refundable && (
              <button type="button" className={BTN_DANGER} onClick={onRefund} disabled={disabled}>
                <Undo2 aria-hidden="true" className="size-4" />
                Refund…
              </button>
            )}
          </div>
        )}
      </div>

      {pay.failureMessage && (
        <p role="note" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-200">
          <strong className="font-semibold">Payment failed:</strong> {pay.failureMessage}
        </p>
      )}

      <DetailList items={items} />

      {online && !pay.livemode && (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-dark">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Stripe test mode — no real money was taken.
        </p>
      )}
      {!online && order.status !== 'completed' && order.status !== 'cancelled' && (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-dark">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Take payment {where}. It counts as earned once the order is marked Completed.
        </p>
      )}
    </section>
  );
}

/* ── Refund dialog ────────────────────────────────────────────── */

function RefundDialog({ order, open, onClose, onRefunded }) {
  const toast = useToast();
  const confirm = useConfirm();
  const formId = useId();
  const amountRef = useRef(null);
  const [mode, setMode] = useState('full');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const orderId = order?._id;

  useEffect(() => {
    if (!open) return;
    setMode('full');
    setAmount('');
    setError('');
  }, [open, orderId]);

  useEffect(() => {
    if (mode === 'partial') requestAnimationFrame(() => amountRef.current?.focus());
  }, [mode]);

  const pay = paymentOf(order);
  const remaining = order ? refundableAmount(order) : 0;
  const methodText = pay.methodType ? paymentMethodLabel(pay.methodType) : 'original payment method';

  async function submit(event) {
    event.preventDefault();
    if (!order || submitting) return;
    setError('');
    let value = null;
    if (mode === 'partial') {
      const raw = amount.trim().replace(/^£/, '');
      if (!MONEY_RE.test(raw)) {
        setError('Enter an amount in pounds, e.g. 5.50.');
        amountRef.current?.focus();
        return;
      }
      value = parseMoney(raw);
      if (!(value > 0)) {
        setError('Enter an amount greater than £0.00.');
        amountRef.current?.focus();
        return;
      }
      if (Math.round(value * 100) > Math.round(remaining * 100)) {
        setError(`You can refund up to ${formatGBP(remaining)}.`);
        amountRef.current?.focus();
        return;
      }
    }
    const refundValue = value ?? remaining;
    const ok = await confirm({
      title: `Refund ${formatGBP(refundValue)} on ${order.reference}?`,
      message: (
        <>
          <p>
            The money goes back to the customer’s {methodText} and can’t be taken back.
            {pay.livemode ? ' This is a live payment — real money will be returned.' : ' This is a Stripe test payment — no real money moves.'}
          </p>
          <p className="mt-2">Refunding doesn’t change the order status — cancel the order separately if it won’t be made.</p>
        </>
      ),
      confirmLabel: `Refund ${formatGBP(refundValue)}`,
      cancelLabel: 'Go back',
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const updated = await api.post(`/admin/orders/${order._id}/refund`, value == null ? {} : { amount: value });
      toast.success(`Refunded ${formatGBP(refundValue)} on ${order.reference}. It usually reaches the customer in 5–10 working days.`);
      onRefunded(order, updated);
    } catch (err) {
      if (err?.status === 400 || err?.status === 409) {
        setError(err.message);
        if (mode === 'partial') amountRef.current?.focus();
      } else {
        toast.apiError(err);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={order ? `Refund order ${order.reference}` : 'Refund'}
      description={order ? `Paid ${formatGBP(pay.amount)}${Number(pay.amountRefunded) > 0 ? ` · ${formatGBP(pay.amountRefunded)} already refunded` : ''}` : undefined}
      size="sm"
      dismissible={!submitting}
      footer={
        <>
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn btn-sm btn-primary" disabled={submitting || remaining <= 0}>
            {submitting ? <Spinner className="size-4" /> : <Undo2 aria-hidden="true" className="size-4" />}
            {mode === 'full' ? `Refund ${formatGBP(remaining)}` : 'Refund amount'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {/* Partial-amount errors sit on the amount field; anything else (e.g. server 409) shows here. */}
        <FormAlert>{mode === 'full' ? error : ''}</FormAlert>
        <fieldset className="space-y-2">
          <legend className="field-label text-ink">How much should go back to the customer?</legend>
          <label
            className={cx(
              'flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition',
              mode === 'full' ? 'bg-white ring-fuji-red/60' : 'ring-ink/10 hover:ring-ink/25',
            )}
          >
            <input
              type="radio"
              name={`${formId}-mode`}
              value="full"
              checked={mode === 'full'}
              onChange={() => {
                setMode('full');
                setError('');
              }}
              className="mt-1 size-4 shrink-0 accent-fuji-red"
              data-autofocus
            />
            <span className="text-sm leading-snug">
              <span className="block font-medium text-ink">Full refund — {formatGBP(remaining)}</span>
              <span className="block text-xs text-muted-dark">Everything that hasn’t been refunded yet.</span>
            </span>
          </label>
          <label
            className={cx(
              'flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition',
              mode === 'partial' ? 'bg-white ring-fuji-red/60' : 'ring-ink/10 hover:ring-ink/25',
            )}
          >
            <input
              type="radio"
              name={`${formId}-mode`}
              value="partial"
              checked={mode === 'partial'}
              onChange={() => {
                setMode('partial');
                setError('');
              }}
              className="mt-1 size-4 shrink-0 accent-fuji-red"
            />
            <span className="text-sm leading-snug">
              <span className="block font-medium text-ink">Partial refund</span>
              <span className="block text-xs text-muted-dark">For example a missing dish or a goodwill gesture.</span>
            </span>
          </label>
        </fieldset>

        {mode === 'partial' && (
          <TextInput
            ref={amountRef}
            label="Amount to refund"
            required
            prefix="£"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            hint={`Up to ${formatGBP(remaining)}.`}
            error={error || undefined}
            className="max-w-[14rem]"
          />
        )}
        <p className="text-xs text-muted-dark">
          Refunds go back to the customer’s {methodText} through Stripe and usually take 5–10 working days to appear.
        </p>
      </form>
    </Modal>
  );
}
