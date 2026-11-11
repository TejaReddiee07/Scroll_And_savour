import { Router } from 'express';
import { z } from 'zod';
import { Order, paymentOf } from '../../models/Order.js';
import { validate } from '../../middleware/validate.js';
import { HttpError } from '../../utils/httpError.js';
import { fromPence, toPence } from '../../utils/money.js';
import { addDays, isValidDateString, londonDateString, londonDayRange, londonTimeString } from '../../utils/time.js';
import { METHOD_LABELS, earnedPence, isEarnedOrder, isToCollect, methodKey } from '../../services/payments.js';

const router = Router();
const MAX_DAYS = 366;

const dateStr = z.string().refine(isValidDateString, 'Use YYYY-MM-DD');
const rangeQuery = z.object({
  from: dateStr.optional(),
  to: dateStr.optional(),
  includeDemo: z.enum(['true', 'false']).default('true'),
});

function resolveRange(q) {
  const to = q.to ?? londonDateString();
  const from = q.from ?? addDays(to, -29);
  if (from > to) throw new HttpError(400, 'INVALID_RANGE', '"from" must be on or before "to".');
  const days = Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000) + 1;
  if (days > MAX_DAYS) throw new HttpError(400, 'INVALID_RANGE', `The range can be at most ${MAX_DAYS} days.`);
  return { from, to, days, includeDemo: q.includeDemo === 'true' };
}

async function ordersIn(range) {
  const filter = {
    createdAt: { $gte: londonDayRange(range.from).start, $lt: londonDayRange(range.to).end },
  };
  if (!range.includeDemo) filter.isDemo = false;
  return Order.find(filter).sort({ createdAt: 1 }).lean();
}

router.get('/', validate(rangeQuery, 'query'), async (req, res) => {
  const range = resolveRange(req.validQuery);
  const orders = await ordersIn(range);

  const daily = new Map();
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) daily.set(d, { date: d, earned: 0, orders: 0 });
  const byMethod = new Map();
  const byFulfilment = new Map();
  const items = new Map();
  const t = { earned: 0, orders: 0, online: 0, inPerson: 0, refunded: 0, toCollect: 0, toCollectOrders: 0, cancelled: 0, awaitingPayment: 0 };

  for (const o of orders) {
    const pay = paymentOf(o);
    t.refunded += toPence(pay.amountRefunded || 0);
    if (o.status === 'cancelled') t.cancelled += 1;
    if (o.status === 'pending-payment') t.awaitingPayment += 1;
    if (isToCollect(o)) {
      t.toCollect += toPence(o.total);
      t.toCollectOrders += 1;
    }
    if (!isEarnedOrder(o)) continue;

    const earned = earnedPence(o);
    t.earned += earned;
    t.orders += 1;
    if (pay.method === 'online') t.online += earned;
    else t.inPerson += earned;

    const day = daily.get(londonDateString(o.createdAt));
    if (day) {
      day.earned += earned;
      day.orders += 1;
    }
    const m = methodKey(o);
    const mm = byMethod.get(m) ?? { method: m, label: METHOD_LABELS[m] ?? m, earned: 0, orders: 0 };
    mm.earned += earned;
    mm.orders += 1;
    byMethod.set(m, mm);

    const f = byFulfilment.get(o.fulfilment) ?? { fulfilment: o.fulfilment, earned: 0, orders: 0 };
    f.earned += earned;
    f.orders += 1;
    byFulfilment.set(o.fulfilment, f);

    for (const line of o.items ?? []) {
      const it = items.get(line.itemId) ?? { itemId: line.itemId, name: line.name, quantity: 0, earned: 0 };
      it.quantity += line.quantity;
      it.earned += toPence(line.lineTotal);
      items.set(line.itemId, it);
    }
  }

  const gbp = (rows) => rows.map((r) => ({ ...r, earned: fromPence(r.earned) }));
  res.json({
    currency: 'GBP',
    range,
    totals: {
      earned: fromPence(t.earned),
      orders: t.orders,
      averageOrder: t.orders ? fromPence(Math.round(t.earned / t.orders)) : 0,
      online: fromPence(t.online),
      inPerson: fromPence(t.inPerson),
      refunded: fromPence(t.refunded),
      toCollect: fromPence(t.toCollect),
      toCollectOrders: t.toCollectOrders,
      cancelled: t.cancelled,
      awaitingPayment: t.awaitingPayment,
    },
    daily: gbp([...daily.values()]),
    byMethod: gbp([...byMethod.values()].sort((a, b) => b.earned - a.earned)),
    byFulfilment: gbp([...byFulfilment.values()].sort((a, b) => b.earned - a.earned)),
    topItems: gbp([...items.values()].sort((a, b) => b.earned - a.earned).slice(0, 10)),
  });
});

/* CSV: one row per order. Cells that could be read as formulas are neutralised. */
const cell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get('/export.csv', validate(rangeQuery, 'query'), async (req, res) => {
  const range = resolveRange(req.validQuery);
  const orders = await ordersIn(range);
  const header = [
    'Reference', 'Date', 'Time', 'Status', 'Fulfilment', 'Payment', 'Payment status', 'Method',
    'Subtotal', 'Delivery fee', 'Total', 'Refunded', 'Earned', 'Customer', 'Items', 'Demo',
  ];
  const rows = orders.map((o) => {
    const pay = paymentOf(o);
    return [
      o.reference,
      londonDateString(o.createdAt),
      londonTimeString(o.createdAt),
      o.status,
      o.fulfilment,
      pay.method,
      pay.status,
      METHOD_LABELS[methodKey(o)] ?? '',
      o.subtotal.toFixed(2),
      o.deliveryFee == null ? '' : Number(o.deliveryFee).toFixed(2),
      o.total.toFixed(2),
      Number(pay.amountRefunded || 0).toFixed(2),
      fromPence(earnedPence(o)).toFixed(2),
      o.customer?.name ?? '',
      (o.items ?? []).map((l) => `${l.quantity}x ${l.name}`).join('; '),
      o.isDemo ? 'yes' : 'no',
    ].map(cell).join(',');
  });
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="fuji-orders-${range.from}-to-${range.to}.csv"`);
  res.send(`﻿${[header.join(','), ...rows].join('\r\n')}\r\n`);
});

export default router;
