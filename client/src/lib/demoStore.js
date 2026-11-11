import { safeStorage, demoReference } from './format';
import { STATUS_FLOW } from '../components/scenes/OrderTracker';

/**
 * Local-only "demo" records used when no backend is connected.
 * Nothing here is sent anywhere — it lives in this browser only.
 */
const KEY = 'fuji:demo-orders';
const STAGE_MS = 7000;

export function createDemoOrder({ lines, fulfilment, customer, subtotal, deliveryFee, total }) {
  const order = {
    reference: demoReference('DEMO'),
    isDemo: true,
    localOnly: true,
    fulfilment,
    items: lines.map((l) => ({ itemId: l.id, name: l.name, price: l.price, quantity: l.qty, lineTotal: Math.round(l.price * l.qty * 100) / 100 })),
    subtotal,
    deliveryFee,
    total,
    customerFirstName: String(customer.name || '').split(' ')[0],
    createdAt: new Date().toISOString(),
  };
  const all = safeStorage.get(KEY, {});
  all[order.reference] = order;
  // keep the last 10 only
  const keys = Object.keys(all).sort((a, b) => new Date(all[b].createdAt) - new Date(all[a].createdAt));
  keys.slice(10).forEach((k) => delete all[k]);
  safeStorage.set(KEY, all);
  return order;
}

export function getDemoOrder(reference) {
  return safeStorage.get(KEY, {})[reference] || null;
}

/** Demo orders advance one stage every 7 seconds. */
export function demoStatus(order, now = Date.now()) {
  const flow = STATUS_FLOW[order.fulfilment] || STATUS_FLOW.delivery;
  const elapsed = now - new Date(order.createdAt).getTime();
  const i = Math.min(flow.length - 1, Math.floor(elapsed / STAGE_MS));
  return {
    status: flow[i],
    statusHistory: flow.slice(0, i + 1).map((s, k) => ({ status: s, at: new Date(new Date(order.createdAt).getTime() + k * STAGE_MS).toISOString() })),
  };
}
