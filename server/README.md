# Fuji Japanese Restaurant — API server

Express 5 + MongoDB (Mongoose 8) REST API for the Fuji Japanese Restaurant website.
The API contract is [`../docs/API.md`](../docs/API.md).

## Requirements

- Node.js 20.11+ (developed on Node 24)
- MongoDB 6+ (local or Atlas). The server starts without it — `/api/health` keeps working and every
  other route returns `503 DB_UNAVAILABLE` while it retries the connection in the background.

## Setup

```bash
cd server
npm install
cp .env.example .env      # then edit .env (see comments in the file)
npm run seed              # menu + settings + starter offer + owner account
npm run dev               # http://localhost:5000/api/health
```

To create the owner account, set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (10+ characters) and optionally
`ADMIN_NAME` in `.env` before running the seed. Re-running the seed updates that account.

## Scripts

| Script | What it does |
|---|---|
| `npm start` | Start the server (`node src/index.js`). |
| `npm run dev` | Start with auto-restart on file changes (`node --watch`). |
| `npm run seed` | Insert any **missing** menu categories/items from `src/data/menu.json`; create the settings document and starter offer if missing; create/update the owner account. Never overwrites existing items, so admin edits (price, description, availability, image) are kept. |
| `npm run seed:reset` | Delete all menu categories and items and re-insert them from `menu.json` (discards admin menu edits). Orders, bookings, settings and offers are untouched. |
| `npm run smoke` | End-to-end test: starts an in-memory MongoDB (`mongodb-memory-server`), runs the real seed, and exercises the public and admin API over HTTP. |
| `npm run check` | `node --check` on every source file. |

## Environment

All variables are documented in [`.env.example`](.env.example). Key points:

- `JWT_SECRET` is **required in production**; without it the server exits on boot.
- `CLIENT_ORIGIN` is a comma-separated CORS allowlist (credentials enabled).
- Use `COOKIE_SAMESITE=none` (with HTTPS) only when the frontend and API are on different sites.
- Dish photo uploads work without any account: they are stored in `server/uploads/` (served at `/api/uploads/…`). Set the Cloudinary variables to host them on Cloudinary instead.
- Uploaded photos get an automatic cut-out (food on black) when the model file is present: `npm run cutout-model` once (~170 MB). `PHOTO_CUTOUTS=false` turns it off.

## Layout

```
src/
  index.js            boot: config check, listen, background DB connect, graceful shutdown
  app.js              express app (helmet, CORS allowlist, cookies, JSON 100kb, sanitize, routes, errors)
  config/             env, db (retrying connect), cloudinary, confirmed site defaults
  models/             Mongoose models (menu, orders, reservations, catering, messages, offers, settings, admins)
  middleware/         auth (JWT cookie), csrf (X-Requested-With), validate (zod), sanitize, rate limits,
                      honeypot, requireDb, error handler
  routes/public/      /api/health, menu, settings, offers, orders, reservations, catering, contact
  routes/admin/       /api/admin/* (auth, stats, categories, items, uploads, orders, reservations,
                      catering, messages, offers, settings)
  utils/              references (FJ-/RS-/CT-), Europe/London time helpers, money (pence), strings, pagination
  validation/         shared zod field schemas
  seed/seed.js        seed script
  data/menu.json      the owner's transcribed menu (seed source — do not edit by hand)
scripts/smoke.js      end-to-end smoke test
```

## Notes

- Order totals are always recomputed on the server in integer pence from database prices.
- Ordering and booking start in `demo` mode (`isDemo: true` on orders/reservations) until the owner
  switches `orderingMode` / `bookingMode` to `live` in the admin settings.
- `deliveryFee` and `minimumOrder` stay `null` until the owner confirms them.
- Dates for reservations and the admin "today" stats use the Europe/London timezone.
