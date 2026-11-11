import mongoose from 'mongoose';

/** Every Stripe webhook event we accept, stored once (idempotency + audit trail). */
const paymentEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    livemode: { type: Boolean, default: false },
    intentId: { type: String, default: null, index: true },
    reference: { type: String, default: null, index: true },
    outcome: { type: String, default: 'processed' },
    receivedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const PaymentEvent = mongoose.model('PaymentEvent', paymentEventSchema);
