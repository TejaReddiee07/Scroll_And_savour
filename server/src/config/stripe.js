import Stripe from 'stripe';
import { env } from './env.js';

/**
 * Lazily-created Stripe client. Tests can inject a fake with setStripeClient().
 * Webhook signatures are always verified with the real SDK (local crypto, no API call).
 */
let client = null;
let injected = null;

export function getStripe() {
  if (injected) return injected;
  if (!env.paymentsEnabled) return null;
  if (!client) client = new Stripe(env.stripe.secretKey, { appInfo: { name: 'Fuji Restaurant Website', version: env.version }, maxNetworkRetries: 2, timeout: 20_000 });
  return client;
}

export function setStripeClient(fake) {
  injected = fake;
}

const verifier = new Stripe(env.stripe.secretKey || 'sk_test_signature_verification_only');

/** Throws if the signature is invalid. */
export function constructWebhookEvent(rawBody, signature) {
  return verifier.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
}

/** Test helper: signs a payload like Stripe would. */
export function signTestPayload(payload, secret = env.stripe.webhookSecret) {
  return verifier.webhooks.generateTestHeaderString({ payload, secret });
}
