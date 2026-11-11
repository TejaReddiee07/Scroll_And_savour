import mongoose from 'mongoose';

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
export const FULFILMENT = ['delivery', 'collection'];
export const PAYMENT_METHODS = ['online', 'in-person'];
export const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially-refunded', 'canceled'];

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: PAYMENT_METHODS, default: 'in-person' },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid', index: true },
    provider: { type: String, default: null },
    intentId: { type: String, default: null, index: true },
    methodType: { type: String, default: null },
    brand: { type: String, default: null },
    last4: { type: String, default: null },
    amount: { type: Number, default: 0 },
    amountRefunded: { type: Number, default: 0 },
    currency: { type: String, default: 'gbp' },
    receiptUrl: { type: String, default: null },
    livemode: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },
    failureMessage: { type: String, default: null },
  },
  { _id: false },
);

const lineSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    items: { type: [lineSchema], required: true },
    fulfilment: { type: String, enum: FULFILMENT, required: true },
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, default: '', trim: true, lowercase: true },
      address: {
        type: new mongoose.Schema(
          {
            line1: { type: String, trim: true },
            line2: { type: String, default: '', trim: true },
            postcode: { type: String, trim: true },
          },
          { _id: false },
        ),
        default: null,
      },
      notes: { type: String, default: '', trim: true },
    },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: null },
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'received', index: true },
    statusHistory: { type: [statusEventSchema], default: [] },
    isDemo: { type: Boolean, default: true },
    payment: { type: paymentSchema, default: () => ({}) },
  },
  { timestamps: true, versionKey: false },
);

orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);

const serializeLines = (items) =>
  items.map(({ itemId, name, price, quantity, lineTotal }) => ({ itemId, name, price, quantity, lineTotal }));

/** Orders created before payments existed have no payment field: they were pay-in-person. */
export const paymentOf = (o) => {
  const raw = o?.payment && typeof o.payment.toObject === 'function' ? o.payment.toObject() : o?.payment;
  return { method: 'in-person', status: 'unpaid', ...(raw ?? {}) };
};

const publicPayment = (o) => {
  const p = paymentOf(o);
  return { method: p.method, status: p.status, methodType: p.methodType ?? null };
};

/** 201 body for POST /api/orders. */
export function serializeOrderReceipt(o) {
  return {
    payment: publicPayment(o),
    reference: o.reference,
    status: o.status,
    isDemo: o.isDemo,
    fulfilment: o.fulfilment,
    items: serializeLines(o.items),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee ?? null,
    total: o.total,
    createdAt: o.createdAt,
  };
}

/** Public tracking view: no personal data except the customer's first name. */
export function serializeOrderTracking(o) {
  return {
    payment: publicPayment(o),
    reference: o.reference,
    status: o.status,
    isDemo: o.isDemo,
    fulfilment: o.fulfilment,
    statusHistory: (o.statusHistory ?? []).map(({ status, at }) => ({ status, at })),
    items: serializeLines(o.items),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee ?? null,
    total: o.total,
    customerFirstName: String(o.customer?.name ?? '').trim().split(/\s+/)[0] ?? '',
    createdAt: o.createdAt,
  };
}
