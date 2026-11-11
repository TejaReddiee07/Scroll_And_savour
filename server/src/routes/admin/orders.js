import { Router } from 'express';
import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_STATUSES, Order } from '../../models/Order.js';
import { cancelIntentQuietly, refundOrder, syncOrderPayment } from '../../services/payments.js';
import { objectIdParam, validate } from '../../middleware/validate.js';
import { HttpError, notFound } from '../../utils/httpError.js';
import { paginate, paginationQuery } from '../../utils/pagination.js';
import { containsRegex, phoneRegex } from '../../utils/strings.js';
import { searchQuery } from '../../validation/common.js';

const router = Router();
router.param('id', objectIdParam);

const listQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  payment: z.enum(PAYMENT_STATUSES).optional(),
  method: z.enum(['online', 'in-person']).optional(),
  search: searchQuery,
  ...paginationQuery,
});

const statusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { status, payment, method, search, page, limit } = req.validQuery;
  const and = [];
  if (status) and.push({ status });
  // Orders from before payments existed have no payment field: they count as in-person / unpaid.
  if (payment) and.push(payment === 'unpaid' ? { $or: [{ 'payment.status': 'unpaid' }, { payment: { $exists: false } }] } : { 'payment.status': payment });
  if (method) and.push(method === 'in-person' ? { $or: [{ 'payment.method': 'in-person' }, { payment: { $exists: false } }] } : { 'payment.method': 'online' });
  if (search) {
    const rx = containsRegex(search);
    const or = [{ reference: rx }, { 'customer.name': rx }, { 'customer.phone': rx }];
    const phoneRx = phoneRegex(search);
    if (phoneRx) or.push({ 'customer.phone': phoneRx });
    and.push({ $or: or });
  }
  const filter = and.length ? { $and: and } : {};
  res.json(await paginate(Order, filter, { page, limit, sort: { createdAt: -1 } }));
});

router.patch('/:id/status', validate(statusSchema), async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound('Order');

  if (order.status === 'pending-payment' && !['pending-payment', 'cancelled'].includes(status)) {
    throw new HttpError(409, 'PAYMENT_PENDING', 'This order has not been paid yet. Use "Check payment", or cancel it.');
  }
  if (status === 'pending-payment' && order.status !== 'pending-payment') {
    throw new HttpError(409, 'INVALID_STATUS', 'An accepted order cannot go back to awaiting payment.');
  }
  if (status === 'cancelled') await cancelIntentQuietly(order);
  if (status === 'out-for-delivery' && order.fulfilment !== 'delivery') {
    throw new HttpError(409, 'INVALID_STATUS', 'Only delivery orders can be marked out for delivery');
  }
  if (status === 'ready-for-collection' && order.fulfilment !== 'collection') {
    throw new HttpError(409, 'INVALID_STATUS', 'Only collection orders can be marked ready for collection');
  }

  // Re-sending the current status is a no-op (no duplicate tracker step).
  if (order.status !== status) {
    order.status = status;
    order.statusHistory.push({ status, at: new Date() });
    await order.save();
  }
  res.json(order.toObject());
});

const refundSchema = z.object({ amount: z.number().positive().max(100000).optional() });

router.post('/:id/refund', validate(refundSchema), async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound('Order');
  await refundOrder(order, req.body.amount);
  res.json(order.toObject());
});

router.post('/:id/payment/sync', async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound('Order');
  await syncOrderPayment(order);
  res.json(order.toObject());
});

export default router;
