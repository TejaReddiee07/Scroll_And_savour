import { Router } from 'express';
import { env } from '../../config/env.js';
import { constructWebhookEvent } from '../../config/stripe.js';
import { PaymentEvent } from '../../models/PaymentEvent.js';
import { HttpError } from '../../utils/httpError.js';
import { applyIntentToOrder, findOrderForIntent, publicConfig, retrieveIntent } from '../../services/payments.js';

const router = Router();

router.get('/payments/config', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(publicConfig());
});

export default router;

const INTENT_EVENTS = new Set([
  'payment_intent.succeeded',
  'payment_intent.processing',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
]);

/**
 * POST /api/payments/webhook — mounted in app.js with express.raw() BEFORE the JSON parser,
 * because the signature is computed over the exact raw bytes.
 */
export async function stripeWebhook(req, res) {
  if (!env.stripe.webhookSecret) throw new HttpError(503, 'WEBHOOK_NOT_CONFIGURED', 'Stripe webhook secret is not configured.');
  let event;
  try {
    event = constructWebhookEvent(req.body, req.get('stripe-signature') ?? '');
  } catch {
    throw new HttpError(400, 'INVALID_SIGNATURE', 'Invalid Stripe signature.');
  }

  const obj = event.data?.object ?? {};
  const intentId = event.type.startsWith('payment_intent.') ? obj.id : event.type === 'charge.refunded' ? obj.payment_intent : null;

  // Idempotency: each event id is processed once.
  try {
    await PaymentEvent.create({
      eventId: event.id,
      type: event.type,
      livemode: Boolean(event.livemode),
      intentId,
      reference: obj.metadata?.reference ?? null,
    });
  } catch (err) {
    if (err?.code === 11000) return res.json({ received: true, duplicate: true });
    throw err;
  }

  let outcome = 'ignored';
  if (intentId && (INTENT_EVENTS.has(event.type) || event.type === 'charge.refunded')) {
    // Always re-read from Stripe so the order reflects the latest state, whatever order events arrive in.
    const intent = await retrieveIntent(intentId);
    const order = await findOrderForIntent(intent);
    if (order) {
      if (applyIntentToOrder(order, intent)) await order.save();
      outcome = `order ${order.reference}: ${order.payment.status}`;
    } else {
      outcome = 'no matching order';
    }
  }
  await PaymentEvent.updateOne({ eventId: event.id }, { $set: { outcome } });
  return res.json({ received: true });
}
