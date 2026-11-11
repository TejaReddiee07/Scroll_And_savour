/** Domain constants shared by admin pages (mirrors docs/API.md + docs/API-PAYMENTS-REVENUE.md). */

export const ORDER_STATUSES = [
  'pending-payment',
  'received',
  'cooking',
  'packing',
  'out-for-delivery',
  'ready-for-collection',
  'completed',
  'cancelled',
];

export const RESERVATION_STATUSES = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'];
export const CATERING_STATUSES = ['new', 'contacted', 'quoted', 'booked', 'closed'];
export const MESSAGE_STATUSES = ['unread', 'read', 'archived'];

/** label + tone for <StatusBadge kind="…" status="…" /> */
export const STATUS_META = {
  order: {
    'pending-payment': { label: 'Awaiting payment', tone: 'neutral' },
    received: { label: 'Received', tone: 'info' },
    cooking: { label: 'Cooking', tone: 'warning' },
    packing: { label: 'Packing', tone: 'amber' },
    'out-for-delivery': { label: 'Out for delivery', tone: 'violet' },
    'ready-for-collection': { label: 'Ready for collection', tone: 'violet' },
    completed: { label: 'Completed', tone: 'success' },
    cancelled: { label: 'Cancelled', tone: 'danger' },
  },
  reservation: {
    pending: { label: 'Pending', tone: 'warning' },
    confirmed: { label: 'Confirmed', tone: 'info' },
    seated: { label: 'Seated', tone: 'violet' },
    completed: { label: 'Completed', tone: 'success' },
    cancelled: { label: 'Cancelled', tone: 'neutral' },
    'no-show': { label: 'No-show', tone: 'danger' },
  },
  catering: {
    new: { label: 'New', tone: 'info' },
    contacted: { label: 'Contacted', tone: 'warning' },
    quoted: { label: 'Quoted', tone: 'violet' },
    booked: { label: 'Booked', tone: 'success' },
    closed: { label: 'Closed', tone: 'neutral' },
  },
  message: {
    unread: { label: 'Unread', tone: 'info' },
    read: { label: 'Read', tone: 'neutral' },
    archived: { label: 'Archived', tone: 'muted' },
  },
};

export function statusLabel(kind, status) {
  return STATUS_META[kind]?.[status]?.label ?? status;
}

/**
 * Kitchen flow shown in the order drawer: received → cooking → packing → out-for-delivery | ready-for-collection → completed.
 * Online orders start one step earlier in `pending-payment` and move to `received` only when Stripe confirms payment
 * (webhook or "Check payment"), so staff never advance them by hand.
 */
export function orderFlow(fulfilment) {
  return [
    'received',
    'cooking',
    'packing',
    fulfilment === 'collection' ? 'ready-for-collection' : 'out-for-delivery',
    'completed',
  ];
}

export function nextOrderStatus(order) {
  if (!order) return null;
  switch (order.status) {
    case 'received':
      return 'cooking';
    case 'cooking':
      return 'packing';
    case 'packing':
      return order.fulfilment === 'collection' ? 'ready-for-collection' : 'out-for-delivery';
    case 'out-for-delivery':
    case 'ready-for-collection':
      return 'completed';
    default:
      return null;
  }
}

export const ORDER_ACTION_LABELS = {
  cooking: 'Start cooking',
  packing: 'Mark packing',
  'out-for-delivery': 'Out for delivery',
  'ready-for-collection': 'Ready for collection',
  completed: 'Mark completed',
};

export function canCancelOrder(order) {
  return Boolean(order) && !['completed', 'cancelled'].includes(order.status);
}

/* ── Payments (Stripe) ───────────────────────────────────────── */

export const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially-refunded', 'canceled'];

/** Stripe payment method types (+ `in_person`) → display label. */
export const PAYMENT_METHOD_LABELS = {
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

export function paymentMethodLabel(methodType) {
  if (!methodType) return PAYMENT_METHOD_LABELS.other;
  return PAYMENT_METHOD_LABELS[methodType] ?? PAYMENT_METHOD_LABELS.other;
}

const CARD_BRANDS = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  diners: 'Diners',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  cartes_bancaires: 'Cartes Bancaires',
};

export function cardBrandLabel(brand) {
  if (!brand) return '';
  return CARD_BRANDS[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

/** Orders created before payments existed have no `payment` field: they are pay-in-person, unpaid. */
export function paymentOf(order) {
  return { method: 'in-person', status: 'unpaid', ...(order?.payment ?? {}) };
}

export const isOnlinePayment = (order) => paymentOf(order).method === 'online';

/** Pence-safe remaining refundable amount (GBP). */
export function refundableAmount(order) {
  const pay = paymentOf(order);
  const pence = Math.round(Number(pay.amount || 0) * 100) - Math.round(Number(pay.amountRefunded || 0) * 100);
  return Math.max(0, pence) / 100;
}

export function canRefundOrder(order) {
  const pay = paymentOf(order);
  return pay.method === 'online' && ['paid', 'partially-refunded'].includes(pay.status) && refundableAmount(order) > 0;
}

/** Re-reading the PaymentIntent only makes sense for online orders that have one. */
export function canSyncPayment(order) {
  const pay = paymentOf(order);
  return pay.method === 'online' && Boolean(pay.intentId || pay.status === 'pending');
}

/**
 * Short payment summary for badges: { label, tone, title }.
 * e.g. "Paid · Apple Pay", "Pay in person", "Refunded", "Failed", "Awaiting payment".
 */
export function paymentSummary(order) {
  const pay = paymentOf(order);
  if (pay.method !== 'online') {
    if (order?.status === 'completed') {
      return { label: 'Paid in person', tone: 'success', title: 'Pay on collection / delivery — counted once the order was completed' };
    }
    if (order?.status === 'cancelled') return { label: 'Pay in person', tone: 'muted', title: 'Cancelled — nothing to collect' };
    return { label: 'Pay in person', tone: 'gold', title: 'To collect on collection / delivery' };
  }
  const method = pay.methodType ? paymentMethodLabel(pay.methodType) : null;
  switch (pay.status) {
    case 'paid':
      return { label: method ? `Paid · ${method}` : 'Paid online', tone: 'success' };
    case 'partially-refunded':
      return { label: method ? `Part refunded · ${method}` : 'Part refunded', tone: 'violet' };
    case 'refunded':
      return { label: 'Refunded', tone: 'neutral' };
    case 'failed':
      return { label: 'Failed', tone: 'danger', title: pay.failureMessage || 'The payment was declined' };
    case 'canceled':
      return { label: 'Payment cancelled', tone: 'muted' };
    case 'pending':
      return { label: 'Awaiting payment', tone: 'amber', title: 'The customer hasn’t finished paying online yet' };
    default:
      return { label: 'Unpaid', tone: 'neutral' };
  }
}

/** Payment filter chips on the Orders page → API query (`payment` = payment.status, `method` = online | in-person). */
export const PAYMENT_FILTERS = [
  { value: '', label: 'Any payment', query: {} },
  { value: 'paid', label: 'Paid online', query: { payment: 'paid' } },
  { value: 'pending', label: 'Awaiting payment', query: { payment: 'pending' } },
  { value: 'in-person', label: 'Pay in person', query: { method: 'in-person' } },
  { value: 'partially-refunded', label: 'Part refunded', query: { payment: 'partially-refunded' } },
  { value: 'refunded', label: 'Refunded', query: { payment: 'refunded' } },
  { value: 'failed', label: 'Failed', query: { payment: 'failed' } },
];

/** Next sensible actions for a reservation in a given status. */
export const RESERVATION_ACTIONS = {
  pending: ['confirmed', 'no-show', 'cancelled'],
  confirmed: ['seated', 'no-show', 'cancelled'],
  seated: ['completed'],
  completed: [],
  cancelled: [],
  'no-show': [],
};

export const RESERVATION_ACTION_LABELS = {
  pending: 'Reopen as pending',
  confirmed: 'Confirm',
  seated: 'Mark seated',
  completed: 'Mark completed',
  'no-show': 'No-show',
  cancelled: 'Cancel booking',
};

export const EVENT_TYPE_LABELS = {
  corporate: 'Corporate',
  birthday: 'Birthday',
  wedding: 'Wedding',
  'private-event': 'Private event',
  other: 'Other',
};

export const PLATTER_LABELS = {
  sushi: 'Sushi',
  sashimi: 'Sashimi',
  bento: 'Bento',
  'hot-food': 'Hot food',
};

export const DIETARY_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetarian', short: 'V' },
  { value: 'vegan', label: 'Vegan', short: 'VG' },
  { value: 'gluten-free', label: 'Gluten-free', short: 'GF' },
];

export const TAG_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'chefs-pick', label: "Chef's pick" },
  { value: 'spicy', label: 'Spicy' },
];

/** Sunday = 0 … Saturday = 6 (as stored); displayed Monday-first (UK convention). */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const UPLOAD_ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
