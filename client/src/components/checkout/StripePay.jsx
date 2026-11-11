import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { getStripe, STRIPE_APPEARANCE, STRIPE_FONTS } from '../../lib/payments';

/**
 * Stripe Payment Element (cards, Apple Pay, Google Pay, Revolut Pay, Klarna… — whatever is
 * enabled in the Stripe Dashboard). Uses the "deferred intent" flow: the element is shown with
 * the cart amount; the PaymentIntent is created on the server only when the customer pays.
 *
 * The parent calls ref.current.pay({ createOrder, returnUrl }).
 */
const Inner = forwardRef(function Inner({ amountPence, onReady }, ref) {
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    if (elements && amountPence > 0) elements.update({ amount: amountPence });
  }, [elements, amountPence]);

  useImperativeHandle(ref, () => ({
    ready: Boolean(stripe && elements),
    /**
     * 1. validate the payment form, 2. create the order (server creates the PaymentIntent),
     * 3. confirm the payment. Returns { reference } or throws Error(message).
     */
    async pay({ createOrder, returnUrl }) {
      if (!stripe || !elements) throw new Error('Payment form is still loading — please try again.');
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message);
      const order = await createOrder();
      const clientSecret = order?.payment?.clientSecret;
      if (!clientSecret) throw new Error('Could not start the payment. Please try again.');
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: returnUrl(order.reference) },
        redirect: 'if_required',
      });
      if (error) {
        const e = new Error(error.message || 'The payment did not go through.');
        e.reference = order.reference;
        throw e;
      }
      return { reference: order.reference };
    },
  }));

  return (
    <PaymentElement
      onReady={onReady}
      options={{
        layout: { type: 'tabs', defaultCollapsed: false },
        wallets: { applePay: 'auto', googlePay: 'auto' },
        fields: { billingDetails: { address: 'if_required' } },
      }}
    />
  );
});

const StripePay = forwardRef(function StripePay({ publishableKey, amountPence, onReady }, ref) {
  const stripePromise = getStripe(publishableKey);
  if (!stripePromise || amountPence <= 0) return null;
  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: 'payment',
        amount: amountPence,
        currency: 'gbp',
        appearance: STRIPE_APPEARANCE,
        fonts: STRIPE_FONTS,
        loader: 'auto',
      }}
    >
      <Inner ref={ref} amountPence={amountPence} onReady={onReady} />
    </Elements>
  );
});

export default StripePay;
