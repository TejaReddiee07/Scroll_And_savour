import { paymentSummary, STATUS_META } from '../lib/constants.js';
import { humanise } from '../lib/format.js';
import { cx } from '../lib/cx.js';

export const TONES = {
  neutral: 'bg-stone-100 text-stone-700 ring-stone-300/70',
  muted: 'bg-stone-50 text-stone-500 ring-stone-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  warning: 'bg-orange-50 text-orange-800 ring-orange-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
  gold: 'bg-gold/15 text-gold-soft ring-gold/50',
};

/** Generic pill. */
export function Badge({ tone = 'neutral', children, className = '', dot = false, title }) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Status pill for orders / reservations / catering / messages. */
export function StatusBadge({ kind = 'order', status, className = '' }) {
  const meta = STATUS_META[kind]?.[status] ?? { label: humanise(status) || 'Unknown', tone: 'neutral' };
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}

/** Payment pill for an order: "Paid · Apple Pay", "Pay in person", "Refunded", "Failed", "Awaiting payment"… */
export function PaymentBadge({ order, className = '' }) {
  const { label, tone, title } = paymentSummary(order);
  return (
    <Badge tone={tone} className={className} title={title}>
      {label}
    </Badge>
  );
}

/** Stripe mode marker: Test (no real money) / Live. */
export function StripeModeBadge({ livemode, className = '' }) {
  return livemode ? (
    <Badge tone="success" className={className} title="Live Stripe payment — real money">
      Live
    </Badge>
  ) : (
    <Badge tone="warning" className={className} title="Stripe test mode — no real money moved">
      Test
    </Badge>
  );
}

/** "Demo" marker for demo-mode orders / bookings. */
export function DemoBadge({ className = '' }) {
  return (
    <span className={cx('demo-badge px-2 py-0.5 text-[0.65rem]', className)} title="Placed while the website was in test mode (Stripe test card, not real money)">
      Test
    </span>
  );
}
