import { env } from '../config/env.js';
import { getStripe } from '../config/stripe.js';
import { Order, paymentOf } from '../models/Order.js';
import { HttpError } from '../utils/httpError.js';
import { fromPence, toPence } from '../utils/money.js';

export const METHOD_LABELS = {
  card: 'Card',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  revolut_pay: 'Revolut Pay',
  klarna: 'Klarna',
  paypal: 'PayPal',
  link: 'Link',
  pay_by_bank: 'Pay by Bank',
  amazon_pay: 'Amazon Pay',
  in_person: 'Pay in person',
  other: 'Other',
};

export function requireStripe() {
  const stripe = getStripe();
  if (!stripe) throw new HttpError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payments are not set up yet. Please choose to pay on collection or delivery.');
  return stripe;
}

export function publicConfig() {
  return {
    enabled: env.paymentsEnabled,
    publishableKey: env.paymentsEnabled ? env.stripe.publishableKey : null,
    mode: env.paymentsEnabled ? env.stripe.mode : null,
    currency: 'gbp',
    methods: env.stripe.methods,
    inPerson: env.paymentsInPerson,
  };
}

/** Creates the PaymentIntent for an already-saved order (amount from the DB total, never the client). */
export async function createIntentForOrder(order) {
  const stripe = requireStripe();
  const amount = toPence(order.total);
  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency: 'gbp',
      automatic_payment_methods: { enabled: true },
      description: `Fuji Japanese Restaurant — order ${order.reference}`,
      receipt_email: order.customer?.email || undefined,
      metadata: { reference: order.reference, orderId: String(order._id), fulfilment: order.fulfilment, demo: String(order.isDemo) },
    },
    { idempotencyKey: `fuji-order-${order.reference}` },
  );
  order.payment = {
    ...paymentOf(order),
    method: 'online',
    status: 'pending',
    provider: 'stripe',
    intentId: intent.id,
    amount: fromPence(amount),
    currency: 'gbp',
    livemode: Boolean(intent.livemode),
  };
  await order.save();
  return intent;
}

/** Extracts display details (method type, wallet, brand, last4, receipt) from a charge. */
function chargeDetails(charge) {
  if (!charge || typeof charge !== 'object') return {};
  const d = charge.payment_method_details ?? {};
  let methodType = d.type ?? null;
  let brand = null;
  let last4 = null;
  if (d.type === 'card' && d.card) {
    brand = d.card.brand ?? null;
    last4 = d.card.last4 ?? null;
    const wallet = d.card.wallet?.type;
    if (wallet === 'apple_pay' || wallet === 'google_pay' || wallet === 'link') methodType = wallet;
  }
  return {
    methodType,
    brand,
    last4,
    receiptUrl: charge.receipt_url ?? null,
    amountRefunded: fromPence(charge.amount_refunded ?? 0),
    paidAt: charge.created ? new Date(charge.created * 1000) : null,
  };
}

/**
 * Applies the state of a Stripe PaymentIntent (with latest_charge expanded) to an order.
 * Returns true if anything changed.
 */
export function applyIntentToOrder(order, intent) {
  const before = JSON.stringify({ s: order.status, p: order.payment });
  const pay = { ...paymentOf(order), method: 'online', provider: 'stripe', intentId: intent.id, livemode: Boolean(intent.livemode) };
  const details = chargeDetails(intent.latest_charge);

  switch (intent.status) {
    case 'succeeded': {
      const amount = fromPence(intent.amount_received ?? intent.amount);
      const refunded = details.amountRefunded ?? 0;
      pay.amount = amount;
      pay.amountRefunded = refunded;
      pay.status = refunded <= 0 ? 'paid' : refunded >= amount ? 'refunded' : 'partially-refunded';
      pay.methodType = details.methodType ?? pay.methodType ?? 'card';
      pay.brand = details.brand ?? pay.brand ?? null;
      pay.last4 = details.last4 ?? pay.last4 ?? null;
      pay.receiptUrl = details.receiptUrl ?? pay.receiptUrl ?? null;
      pay.paidAt = pay.paidAt ?? details.paidAt ?? new Date();
      pay.failureMessage = null;
      if (order.status === 'pending-payment') {
        order.status = 'received';
        order.statusHistory.push({ status: 'received', at: new Date() });
      }
      break;
    }
    case 'processing':
      pay.status = 'pending';
      break;
    case 'canceled':
      pay.status = 'canceled';
      break;
    case 'requires_payment_method':
      if (intent.last_payment_error) {
        pay.status = 'failed';
        pay.failureMessage = intent.last_payment_error.message ?? 'The payment was declined.';
      } else {
        pay.status = 'pending';
      }
      break;
    default:
      pay.status = 'pending';
  }
  order.payment = pay;
  return JSON.stringify({ s: order.status, p: order.payment }) !== before;
}

export async function retrieveIntent(intentId) {
  return requireStripe().paymentIntents.retrieve(intentId, { expand: ['latest_charge'] });
}

/** Re-reads the order's PaymentIntent from Stripe and saves any change. */
export async function syncOrderPayment(order) {
  const pay = paymentOf(order);
  if (pay.method !== 'online' || !pay.intentId) {
    throw new HttpError(409, 'NOT_ONLINE_PAYMENT', 'This order is not paid online.');
  }
  const intent = await retrieveIntent(pay.intentId);
  if (intent.metadata?.reference && intent.metadata.reference !== order.reference) {
    throw new HttpError(409, 'PAYMENT_MISMATCH', 'The payment does not belong to this order.');
  }
  if (applyIntentToOrder(order, intent)) await order.save();
  return order;
}

/** Finds the order that a PaymentIntent belongs to. */
export async function findOrderForIntent(intent) {
  const byId = await Order.findOne({ 'payment.intentId': intent.id });
  if (byId) return byId;
  const ref = intent.metadata?.reference;
  return ref ? Order.findOne({ reference: ref }) : null;
}

/** Refunds all or part of an online payment, then syncs from Stripe. */
export async function refundOrder(order, amountGbp) {
  const pay = paymentOf(order);
  if (pay.method !== 'online' || !['paid', 'partially-refunded'].includes(pay.status) || !pay.intentId) {
    throw new HttpError(409, 'NOT_REFUNDABLE', 'Only paid online orders can be refunded.');
  }
  const remainingPence = toPence(pay.amount) - toPence(pay.amountRefunded);
  const amountPence = amountGbp == null ? remainingPence : toPence(amountGbp);
  if (amountPence <= 0 || amountPence > remainingPence) {
    throw new HttpError(400, 'INVALID_REFUND_AMOUNT', `You can refund up to £${fromPence(remainingPence).toFixed(2)}.`, { remaining: fromPence(remainingPence) });
  }
  const stripe = requireStripe();
  await stripe.refunds.create(
    { payment_intent: pay.intentId, amount: amountPence, metadata: { reference: order.reference } },
    { idempotencyKey: `fuji-refund-${order.reference}-${toPence(pay.amountRefunded)}-${amountPence}` },
  );
  return syncOrderPayment(order);
}

/** Best effort: cancel an unpaid PaymentIntent when staff cancel the order. */
export async function cancelIntentQuietly(order) {
  const pay = paymentOf(order);
  if (pay.method !== 'online' || !pay.intentId || !['pending', 'failed'].includes(pay.status)) return;
  try {
    await requireStripe().paymentIntents.cancel(pay.intentId);
    order.payment = { ...pay, status: 'canceled' };
  } catch {
    /* already succeeded/canceled — the webhook or a sync will reconcile */
  }
}

/* ── revenue rules (shared by /revenue and /stats) ───────────────── */

/** Earned pence for one order (see docs/API-PAYMENTS-REVENUE.md). */
export function earnedPence(o) {
  const pay = paymentOf(o);
  if (pay.method === 'online') {
    if (['paid', 'partially-refunded', 'refunded'].includes(pay.status)) {
      return Math.max(0, toPence(pay.amount || o.total) - toPence(pay.amountRefunded || 0));
    }
    return 0;
  }
  return o.status === 'completed' ? toPence(o.total) : 0;
}

export const isEarnedOrder = (o) => {
  const pay = paymentOf(o);
  if (pay.method === 'online') return ['paid', 'partially-refunded'].includes(pay.status);
  return o.status === 'completed';
};

export const isToCollect = (o) => paymentOf(o).method === 'in-person' && !['completed', 'cancelled', 'pending-payment'].includes(o.status);

export function methodKey(o) {
  const pay = paymentOf(o);
  if (pay.method !== 'online') return 'in_person';
  return METHOD_LABELS[pay.methodType] ? pay.methodType : pay.methodType ? 'other' : 'card';
}
