# Online payments (Stripe) — setup

Customers can pay online with **5 methods** — Card, Apple Pay, Google Pay, Revolut Pay and Klarna — or choose **pay on collection / delivery**. Everything runs through Stripe's Payment Element: card details never touch Fuji's server, and every order and payment status is stored in MongoDB (`orders.payment`, plus every Stripe webhook event in `paymentevents`).

## 1. Keys (server/.env)

| Variable | Where to find it | Needed |
|---|---|---|
| `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys (`pk_test_…` / `pk_live_…`) | yes |
| `STRIPE_SECRET_KEY` | same page (`sk_test_…` / `sk_live_…`) — keep secret | yes |
| `STRIPE_WEBHOOK_SECRET` | Developers → Webhooks → your endpoint → Signing secret (`whsec_…`) | online / production |
| `STRIPE_METHODS` | what the site advertises (default `card,apple_pay,google_pay,revolut_pay,klarna`) | optional |
| `PAYMENTS_IN_PERSON` | `true` keeps "pay on collection / delivery" available | optional |

Start with **test keys**. Restart the API (run `stop.bat`, then `run.bat`) after editing `.env`.

Safety rails built in:
- Amounts are always calculated on the server from database prices.
- A **live** secret key is refused while Admin → Settings → *Ordering mode* is `demo` (no real money for demo orders).
- An order only reaches the kitchen (`received`) after Stripe confirms the payment.

## 2. Turn the methods on in Stripe

Stripe Dashboard → **Settings → Payment methods**:

| Method | What to do | Notes |
|---|---|---|
| Cards | on by default | Visa, Mastercard, Amex |
| Apple Pay | switch on, then **Settings → Payment method domains → add your domain** | shows only on Safari / Apple devices with a card in Wallet, over HTTPS |
| Google Pay | switch on | shows in Chrome / Android with a saved card |
| Revolut Pay | switch on | UK/EU Stripe accounts, GBP |
| Klarna | switch on | pay later / in 3; Klarna's minimum and maximum amounts apply |

PayPal, Link or Pay by Bank can be switched on the same way — no code changes (add them to `STRIPE_METHODS` so the site lists them).

## 3. Webhook (confirms payments even if the customer closes the tab)

**On your PC (optional):** install the Stripe CLI, then
```
stripe login
stripe listen --forward-to localhost:5000/api/payments/webhook
```
Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`. Without it, the order tracker still confirms payments by asking Stripe directly.

**Online:** Developers → Webhooks → *Add endpoint* → `https://YOUR-API-DOMAIN/api/payments/webhook`, events:
`payment_intent.succeeded`, `payment_intent.processing`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`.

## 4. Test cards (test mode)

| Card | Result |
|---|---|
| 4242 4242 4242 4242 | succeeds |
| 4000 0025 0000 3155 | asks for 3-D Secure, then succeeds |
| 4000 0000 0000 9995 | declined (insufficient funds) |

Any future expiry date, any CVC, any postcode. Revolut Pay and Klarna show a Stripe test page where you choose "authorise" or "fail".

## 5. What the owner sees

- **Admin → Orders**: payment badge on every order (Paid · Apple Pay, Pay in person, Awaiting payment, Refunded…), payment details, Stripe receipt, **Refund** (full or partial), **Check payment**.
- **Admin → Revenue**: earned per day, by payment method, by delivery/collection, top dishes, refunds, money still to collect, **Export CSV**.
- Revenue rule: online payments that succeeded (minus refunds) + pay-in-person orders once marked *Completed*.

## 6. Going live

1. Complete Stripe account activation (business details, bank account).
2. Swap to `pk_live_` / `sk_live_` keys and add the live webhook endpoint + secret.
3. Register the website domain for Apple Pay.
4. Admin → Settings → Ordering mode **live**.
