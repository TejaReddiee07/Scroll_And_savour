import { Router } from 'express';
import { z } from 'zod';
import { MenuItem } from '../../models/MenuItem.js';
import { FULFILMENT, Order, serializeOrderReceipt, serializeOrderTracking } from '../../models/Order.js';
import { env } from '../../config/env.js';
import { createIntentForOrder, requireStripe, syncOrderPayment } from '../../services/payments.js';
import { Setting } from '../../models/Setting.js';
import { honeypot } from '../../middleware/honeypot.js';
import { publicPostLimiter, trackingLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { HttpError, fieldError, notFound } from '../../utils/httpError.js';
import { fromPence, toPence } from '../../utils/money.js';
import { generateReference, referencePattern, withUniqueReference } from '../../utils/reference.js';
import { optionalEmail, optionalText, personName, phone, requiredText, ukPostcode } from '../../validation/common.js';

const router = Router();
const MAX_PER_ITEM = 20;

const orderSchema = z
  .object({
    items: z
      .array(
        z.object({
          itemId: z.string().trim().toLowerCase().min(1).max(100),
          quantity: z.number().int('Quantity must be a whole number').min(1).max(MAX_PER_ITEM),
        }),
        { required_error: 'Add at least one item to your order' },
      )
      .min(1, 'Add at least one item to your order')
      .max(50, 'An order can contain at most 50 lines'),
    fulfilment: z.enum(FULFILMENT, { errorMap: () => ({ message: 'Choose delivery or collection' }) }),
    customer: z.object(
      {
        name: personName,
        phone,
        email: optionalEmail,
        address: z
          .object({
            line1: requiredText('Address line 1', 150, 3),
            line2: optionalText(150),
            postcode: ukPostcode,
          })
          .nullish(),
        notes: optionalText(500),
      },
      { required_error: 'Customer details are required' },
    ),
    payment: z.enum(['online', 'in-person']).default('in-person'),
  })
  .superRefine((data, ctx) => {
    if (data.fulfilment === 'delivery' && !data.customer.address) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['customer', 'address'], message: 'A delivery address is required' });
    }
  });

const fakeOrder = (req) => ({
  reference: generateReference('FJ'),
  status: 'received',
  isDemo: true,
  fulfilment: req.body?.fulfilment === 'collection' ? 'collection' : 'delivery',
  items: [],
  subtotal: 0,
  deliveryFee: null,
  total: 0,
  createdAt: new Date().toISOString(),
});

router.post('/orders', publicPostLimiter, honeypot(fakeOrder), validate(orderSchema), async (req, res) => {
  const { items, fulfilment, customer, payment } = req.body;
  if (payment === 'online') requireStripe();
  if (payment === 'in-person' && !env.paymentsInPerson) {
    throw new HttpError(400, 'IN_PERSON_DISABLED', 'Please pay online to place this order.');
  }

  // Merge duplicate lines, preserving the order the customer added them in.
  const quantities = new Map();
  for (const { itemId, quantity } of items) quantities.set(itemId, (quantities.get(itemId) ?? 0) + quantity);
  for (const qty of quantities.values()) {
    if (qty > MAX_PER_ITEM) throw fieldError('items', `You can order at most ${MAX_PER_ITEM} of each item`);
  }

  const ids = [...quantities.keys()];
  const [docs, settings] = await Promise.all([
    MenuItem.find({ itemId: { $in: ids } }).populate('category', 'active name').lean(),
    Setting.getSite(),
  ]);
  const byId = new Map(docs.map((d) => [d.itemId, d]));

  const unknown = ids.filter((id) => !byId.has(id));
  if (unknown.length) {
    throw new HttpError(400, 'UNKNOWN_ITEM', `Unknown menu item: ${unknown.join(', ')}`, { itemIds: unknown });
  }
  const unavailable = docs.filter((d) => !d.available || !d.category || d.category.active === false);
  if (unavailable.length) {
    throw new HttpError(
      409,
      'ITEM_UNAVAILABLE',
      `Currently unavailable: ${unavailable.map((d) => d.name).join(', ')}`,
      { itemIds: unavailable.map((d) => d.itemId) },
    );
  }

  // All arithmetic in integer pence, from database prices only.
  let subtotalPence = 0;
  const lines = ids.map((id) => {
    const doc = byId.get(id);
    const quantity = quantities.get(id);
    const unitPence = toPence(doc.price);
    const linePence = unitPence * quantity;
    subtotalPence += linePence;
    return { itemId: id, name: doc.name, price: fromPence(unitPence), quantity, lineTotal: fromPence(linePence) };
  });

  if (settings.minimumOrder != null && subtotalPence < toPence(settings.minimumOrder)) {
    const minimum = fromPence(toPence(settings.minimumOrder));
    throw new HttpError(400, 'BELOW_MINIMUM', `The minimum order is £${minimum.toFixed(2)}`, {
      minimumOrder: minimum,
      subtotal: fromPence(subtotalPence),
    });
  }

  if (payment === 'online' && env.stripe.mode === 'live' && settings.orderingMode !== 'live') {
    throw new HttpError(409, 'LIVE_PAYMENTS_IN_DEMO', 'Online ordering is in test mode, so real payments are switched off.');
  }

  const feePence = fulfilment === 'delivery' && settings.deliveryFee != null ? toPence(settings.deliveryFee) : null;
  const totalPence = subtotalPence + (feePence ?? 0);
  const now = new Date();

  const order = await withUniqueReference('FJ', (reference) =>
    Order.create({
      reference,
      items: lines,
      fulfilment,
      customer: { ...customer, address: fulfilment === 'delivery' ? customer.address : null },
      subtotal: fromPence(subtotalPence),
      deliveryFee: feePence === null ? null : fromPence(feePence),
      total: fromPence(totalPence),
      status: payment === 'online' ? 'pending-payment' : 'received',
      statusHistory: [{ status: payment === 'online' ? 'pending-payment' : 'received', at: now }],
      isDemo: settings.orderingMode !== 'live',
      payment:
        payment === 'online'
          ? { method: 'online', status: 'pending', provider: 'stripe', amount: fromPence(totalPence) }
          : { method: 'in-person', status: 'unpaid', amount: fromPence(totalPence) },
    }),
  );

  if (payment !== 'online') return res.status(201).json(serializeOrderReceipt(order));

  let intent;
  try {
    intent = await createIntentForOrder(order);
  } catch (err) {
    // Never leave an order behind that can't be paid.
    await Order.deleteOne({ _id: order._id });
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, 'PAYMENT_PROVIDER_ERROR', 'We could not start the payment. Please try again or choose to pay on collection.', {
      provider: err?.message,
    });
  }
  const body = serializeOrderReceipt(order);
  body.payment = { ...body.payment, clientSecret: intent.client_secret };
  return res.status(201).json(body);
});

const ORDER_REF = referencePattern('FJ');

router.post('/orders/:reference/payment/sync', trackingLimiter, async (req, res) => {
  const reference = String(req.params.reference ?? '').trim().toUpperCase();
  if (!ORDER_REF.test(reference)) throw notFound('Order', 'ORDER_NOT_FOUND');
  const order = await Order.findOne({ reference });
  if (!order) throw notFound('Order', 'ORDER_NOT_FOUND');
  await syncOrderPayment(order);
  res.set('Cache-Control', 'no-store');
  res.json(serializeOrderTracking(order.toObject()));
});

router.get('/orders/:reference', trackingLimiter, async (req, res) => {
  const reference = String(req.params.reference ?? '').trim().toUpperCase();
  if (!ORDER_REF.test(reference)) throw notFound('Order', 'ORDER_NOT_FOUND');
  const order = await Order.findOne({ reference }).lean();
  if (!order) throw notFound('Order', 'ORDER_NOT_FOUND');
  res.set('Cache-Control', 'no-store');
  res.json(serializeOrderTracking(order));
});

export default router;
