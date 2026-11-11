import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Phone, CreditCard, AlertTriangle } from 'lucide-react';
import { Seo } from '../components/ui';
import { TrackerScene, TrackerSteps } from '../components/scenes/OrderTracker';
import { Reveal } from '../components/effects/Interactions';
import { api } from '../lib/api';
import { getDemoOrder, demoStatus } from '../lib/demoStore';
import { useSiteData } from '../context/SiteDataContext';
import { formatGBP } from '../lib/format';
import { useCart } from '../context/CartContext';
import { METHOD_LABELS, pendingPayment, clearPendingPayment } from '../lib/payments';

const MESSAGES = {
  'pending-payment': 'Waiting for your payment to be confirmed…',
  received: 'Your order has landed on the kitchen pass.',
  cooking: 'The chef is cooking — woks are flaming.',
  packing: 'Packing everything up carefully.',
  'out-for-delivery': 'On the way to you.',
  'ready-for-collection': 'Ready! Come and collect from 15 Stoke Newington Church Street.',
  completed: 'Enjoy your meal — いただきます!',
  cancelled: 'This order was cancelled. Please call the restaurant if this is unexpected.',
};

export default function OrderTrack() {
  const { reference } = useParams();
  const { settings } = useSiteData();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [, setTick] = useState(0);
  const isLocal = reference.startsWith('DEMO-');
  const [params] = useSearchParams();
  const { clear: clearCart } = useCart();
  const cameFromPayment = params.has('pay') || params.has('payment_intent');

  useEffect(() => {
    let alive = true;
    let timer;
    if (isLocal) {
      const o = getDemoOrder(reference);
      if (!o) setError('Order not found. Please check the reference.');
      else setOrder(o);
      timer = setInterval(() => setTick((t) => t + 1), 1000);
    } else {
      let syncs = 0;
      const load = async () => {
        try {
          let o = await api(`/orders/${encodeURIComponent(reference)}`);
          // After paying (or returning from Revolut Pay / Klarna), confirm with Stripe via the server
          // in case the webhook hasn't arrived yet. Limited number of attempts.
          if (o.status === 'pending-payment' && o.payment?.method === 'online' && syncs < 6 && (cameFromPayment || syncs === 0)) {
            syncs += 1;
            o = await api(`/orders/${encodeURIComponent(reference)}/payment/sync`, { method: 'POST' }).catch(() => o);
          }
          if (o.payment?.status === 'paid' && pendingPayment()?.reference === reference) {
            clearPendingPayment();
            clearCart();
          }
          if (alive) {
            setOrder(o);
            setError('');
          }
        } catch (e) {
          if (alive) setError(e.status === 404 ? 'Order not found. Please check the reference.' : 'Could not load the order status — retrying…');
        }
      };
      load();
      timer = setInterval(load, cameFromPayment ? 2500 : 5000);
    }
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, isLocal]);

  const live = order && isLocal ? { ...order, ...demoStatus(order) } : order;

  return (
    <>
      <Seo title="Order tracker" description="Track your Fuji order." path={`/order/track/${reference}`} noindex />
      <section className="container-x pb-24 pt-32 sm:pt-40">
        <Link to="/order" className="inline-flex items-center gap-1.5 text-sm text-cream/60 hover:text-white">
          <ArrowLeft size={15} /> Back to ordering
        </Link>
        <Reveal>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="display text-4xl text-cream sm:text-5xl">Order {reference}</h1>
          </div>
        </Reveal>

        {!live && !error && (
          <p className="mt-10 inline-flex items-center gap-2 text-cream/70"><Loader2 className="animate-spin" size={18} /> Loading order…</p>
        )}
        {error && !live && <p className="mt-10 rounded-xl bg-red-500/15 p-4 text-red-200" role="alert">{error}</p>}

        {live && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6">
              {live.status === 'pending-payment' ? (
                <div className="rounded-[24px] border border-hair bg-ink-3 p-8 text-center">
                  {live.payment?.status === 'failed' || live.payment?.status === 'canceled' ? (
                    <>
                      <AlertTriangle className="mx-auto text-saffron" size={36} aria-hidden="true" />
                      <p className="display mt-4 text-3xl">The payment didn&apos;t go through.</p>
                      <p className="mt-2 text-cream/70">Nothing has been charged and the kitchen hasn&apos;t started. Please place the order again or call the restaurant.</p>
                      <Link to="/order#checkout" className="btn btn-primary mt-6">Back to checkout</Link>
                    </>
                  ) : (
                    <>
                      <Loader2 className="mx-auto animate-spin text-saffron" size={36} aria-hidden="true" />
                      <p className="display mt-4 text-3xl">Confirming your payment…</p>
                      <p className="mt-2 text-cream/70">This usually takes a few seconds. The chef starts as soon as Stripe confirms it.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-hidden rounded-[24px] ring-1 ring-gold/15">
                  <TrackerScene status={live.status} fulfilment={live.fulfilment} />
                </div>
              )}
              {!['cancelled', 'pending-payment'].includes(live.status) && <TrackerSteps status={live.status} fulfilment={live.fulfilment} />}
              <p className="text-lg text-cream" aria-live="polite">
                {(() => {
                  const msg = MESSAGES[live.status] || live.status;
                  return live.customerFirstName ? `${live.customerFirstName}, ${msg.charAt(0).toLowerCase()}${msg.slice(1)}` : msg;
                })()}
              </p>
              <p className="rounded-xl border border-dashed border-gold/40 bg-gold/5 p-4 text-sm text-cream/75">
                Status updates appear here automatically as the restaurant prepares your order.
              </p>
            </div>
            <aside className="card h-fit p-6">
              <h2 className="display text-2xl text-cream">Summary</h2>
              <p className="mt-1 text-sm capitalize text-cream/60">{live.fulfilment}</p>
              <ul className="mt-4 divide-y divide-cream/10 text-sm">
                {live.items.map((i) => (
                  <li key={i.itemId} className="flex justify-between gap-3 py-2">
                    <span><span className="text-cream/55">{i.quantity} ×</span> {i.name}</span>
                    <span className="tabular-nums">{formatGBP(i.lineTotal ?? i.price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-1 border-t border-cream/10 pt-3 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatGBP(live.subtotal)}</dd></div>
                {live.fulfilment === 'delivery' && (
                  <div className="flex justify-between"><dt>Delivery</dt><dd>{live.deliveryFee != null ? formatGBP(live.deliveryFee) : 'To be confirmed'}</dd></div>
                )}
                <div className="flex justify-between text-base font-bold text-cream"><dt>Total</dt><dd>{formatGBP(live.total)}</dd></div>
              </dl>
              {live.payment && (
                <p className="mt-4 flex items-center gap-2 rounded-xl border border-hair px-3 py-2 text-sm">
                  <CreditCard size={15} className="text-saffron" aria-hidden="true" />
                  {live.payment.method === 'online'
                    ? {
                        paid: `Paid${live.payment.methodType ? ` · ${METHOD_LABELS[live.payment.methodType] || live.payment.methodType}` : ''}`,
                        pending: 'Payment being confirmed',
                        failed: 'Payment failed',
                        canceled: 'Payment cancelled',
                        refunded: 'Refunded',
                        'partially-refunded': 'Partially refunded',
                      }[live.payment.status] || live.payment.status
                    : 'Pay on collection / delivery'}
                </p>
              )}
              <a href={`tel:${settings.contact.phoneIntl}`} className="btn btn-outline mt-6 w-full">
                <Phone size={16} /> Call {settings.contact.phone}
              </a>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}
