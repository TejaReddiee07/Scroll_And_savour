import { useEffect, useState } from 'react';
import { api } from './api';
import { safeStorage } from './format';

/** Labels for the payment methods the restaurant offers (config comes from the server). */
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
};

const DISABLED = { enabled: false, publishableKey: null, mode: null, currency: 'gbp', methods: [], inPerson: true };
let configPromise = null;

export function fetchPaymentConfig() {
  if (!configPromise) {
    configPromise = api('/payments/config', { timeout: 6000 }).catch(() => {
      configPromise = null;
      return DISABLED;
    });
  }
  return configPromise;
}

export function usePaymentConfig(enabled = true) {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    if (!enabled) {
      setConfig(DISABLED);
      return undefined;
    }
    let alive = true;
    fetchPaymentConfig().then((c) => alive && setConfig(c || DISABLED));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return config;
}

/** Stripe.js is loaded only when a customer actually reaches online payment. */
let stripePromise = null;
let stripeKey = null;
export function getStripe(publishableKey) {
  if (!publishableKey) return null;
  if (!stripePromise || stripeKey !== publishableKey) {
    stripeKey = publishableKey;
    stripePromise = import('@stripe/stripe-js').then(({ loadStripe }) => loadStripe(publishableKey));
  }
  return stripePromise;
}

/* A payment that redirected away (Revolut Pay, Klarna…) — clear the cart once it's confirmed paid. */
const PENDING_KEY = 'fuji:pending-payment';
export const rememberPendingPayment = (reference) => safeStorage.set(PENDING_KEY, { reference, at: Date.now() });
export const pendingPayment = () => safeStorage.get(PENDING_KEY, null);
export const clearPendingPayment = () => safeStorage.remove(PENDING_KEY);

/** Stripe Elements appearance matched to the site's dark saffron design. */
export const STRIPE_APPEARANCE = {
  theme: 'night',
  variables: {
    colorPrimary: '#f0a032',
    colorBackground: '#120d0a',
    colorText: '#f4e9d8',
    colorTextSecondary: '#a8998a',
    colorDanger: '#ff8a6f',
    fontFamily: '"Instrument Sans", system-ui, sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { border: '1px solid rgba(244,233,216,.12)', boxShadow: 'none' },
    '.Input:focus': { border: '1px solid #f0a032', boxShadow: '0 0 0 3px rgba(240,160,50,.18)' },
    '.Tab': { border: '1px solid rgba(244,233,216,.12)' },
    '.Tab--selected': { borderColor: '#f0a032' },
    '.Label': { fontFamily: '"DM Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '11px' },
  },
};

export const STRIPE_FONTS = [
  { cssSrc: 'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Sans:wght@400..700&display=swap' },
];
