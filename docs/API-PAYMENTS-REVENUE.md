# Payments (Stripe) & revenue — API additions

Extends [`API.md`](./API.md). Same conventions (error envelope, admin cookie + `X-Requested-With`, money in GBP numbers with two decimals).

## Order changes

New order status **`pending-payment`** — the first status of an order that is being paid online. It moves to `received` only when Stripe confirms the payment (webhook or server-side sync). The kitchen flow after that is unchanged:

`pending-payment → received → cooking → packing → out-for-delivery | ready-for-collection → completed` (or `cancelled`).

New `payment` sub-document on every order (orders created before this change have no `payment` field — treat them as `{ method: "in-person", status: "unpaid" }`):

```json
"payment": {
  "method": "online",              // "online" | "in-person" (pay on collection / delivery)
  "status": "paid",                // "unpaid" | "pending" | "paid" | "failed" | "refunded" | "partially-refunded" | "canceled"
  "provider": "stripe",            // "stripe" | null
  "intentId": "pi_3Q…",            // Stripe PaymentIntent id (admin only)
  "methodType": "apple_pay",       // "card" | "apple_pay" | "google_pay" | "revolut_pay" | "klarna" | "paypal" | "link" | … | null
  "brand": "visa",                 // card brand when relevant, else null
  "last4": "4242",                 // card last 4 when relevant, else null
  "amount": 32.45,                 // amount charged (GBP)
  "amountRefunded": 0,
  "currency": "gbp",
  "receiptUrl": "https://pay.stripe.com/receipts/…",   // admin only
  "livemode": false,
  "paidAt": "2026-11-11T19:02:11.000Z",
  "failureMessage": null
}
```
No card numbers or other sensitive card data are ever stored — only Stripe ids and display fields.

## Public endpoints

### `GET /api/payments/config`
```json
{
  "enabled": true,                 // Stripe keys configured on the server
  "publishableKey": "pk_test_…",   // null when disabled
  "mode": "test",                  // "test" | "live" | null
  "currency": "gbp",
  "methods": ["card", "apple_pay", "google_pay", "revolut_pay", "klarna"],
  "inPerson": true                 // "pay on collection / delivery" allowed
}
```

### `POST /api/orders` (extended)
Body gains `"payment": "online" | "in-person"` (default `"in-person"`).

* `in-person` → unchanged behaviour (status `received`), `payment: { method: "in-person", status: "unpaid" }`.
* `online` → `503 PAYMENTS_NOT_CONFIGURED` if Stripe is not set up; `409 LIVE_PAYMENTS_IN_DEMO` if the server has a **live** secret key while `settings.orderingMode` is `"demo"` (no real money for demonstration orders). Otherwise a PaymentIntent is created for the **server-computed** total (pence, GBP, automatic payment methods, `metadata.reference`), the order is saved with status `pending-payment`, and the response adds:
```json
"payment": { "method": "online", "status": "pending", "clientSecret": "pi_…_secret_…" }
```

### `POST /api/orders/:reference/payment/sync`
Re-reads the PaymentIntent from Stripe (server-side — the client is never trusted) and updates the order. Used after the payment redirect and as a fallback when webhooks are delayed. Returns the public tracking view. `404 ORDER_NOT_FOUND`; `409 NOT_ONLINE_PAYMENT` for in-person orders.

### `GET /api/orders/:reference` (extended)
Tracking view adds `"payment": { "method", "status", "methodType" }`.

### `POST /api/payments/webhook`
Stripe → server. Raw body, verified with `STRIPE_WEBHOOK_SECRET` (`400 INVALID_SIGNATURE` otherwise). Handles `payment_intent.succeeded`, `payment_intent.processing`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`. Idempotent — every event id is stored in the `paymentevents` collection and processed once.

## Admin endpoints

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/api/admin/orders` | existing + `?payment=<payment.status>&method=online|in-person` | list; each order includes the full `payment` object |
| POST | `/api/admin/orders/:id/refund` | `{ amount? }` (GBP; omit for a full refund) | updated order. `409 NOT_REFUNDABLE` unless an online payment with status `paid`/`partially-refunded`; `400` if amount > remaining |
| POST | `/api/admin/orders/:id/payment/sync` | — | updated order (re-reads Stripe) |
| GET | `/api/admin/revenue` | `?from=YYYY-MM-DD&to=YYYY-MM-DD&includeDemo=true|false` (defaults: last 30 days ending today, London time; `includeDemo=true`) | see below |
| GET | `/api/admin/revenue/export.csv` | same query | `text/csv` attachment, one row per order in range |

### Revenue rules
* **Earned** = online orders with payment `paid` / `partially-refunded` (amount − refunded) **+** in-person orders with status `completed` (total).
* **To collect** = in-person orders that are not `completed`, `cancelled` or `pending-payment`.
* Abandoned `pending-payment` orders and `cancelled` orders never count.
* Days are London calendar days of the order's `createdAt`.

### `GET /api/admin/revenue`
```json
{
  "currency": "GBP",
  "range": { "from": "2026-10-13", "to": "2026-11-11", "days": 30, "includeDemo": true },
  "totals": {
    "earned": 1234.5, "orders": 61, "averageOrder": 20.24,
    "online": 980.0, "inPerson": 254.5, "refunded": 12.95,
    "toCollect": 45.9, "toCollectOrders": 3,
    "cancelled": 2, "awaitingPayment": 1
  },
  "daily": [ { "date": "2026-10-13", "earned": 0, "orders": 0 } ],
  "byMethod": [ { "method": "apple_pay", "label": "Apple Pay", "earned": 210.4, "orders": 9 } ],
  "byFulfilment": [ { "fulfilment": "delivery", "earned": 700.1, "orders": 33 } ],
  "topItems": [ { "itemId": "chicken-katsu-curry", "name": "Chicken Katsu-Curry", "quantity": 41, "earned": 530.95 } ]
}
```
`daily` has one entry per day in range (zeros included). `byMethod.method` values: Stripe method types plus `"in_person"`. `topItems` = up to 10 by earned, counting only earned orders.

`/api/admin/stats` → `today.revenue` now uses the **earned** rule; adds `today.toCollect`.

## Environment (server/.env)

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_PUBLISHABLE_KEY=pk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_METHODS=card,apple_pay,google_pay,revolut_pay,klarna   # what the site advertises
PAYMENTS_IN_PERSON=true                                        # allow "pay on collection / delivery"
```
