# Fuji Restaurant — REST API

Base URL: `/api` (Express server, default `http://localhost:5000`).
All bodies are JSON (`Content-Type: application/json`) unless stated otherwise.

## Conventions

| Topic | Rule |
|---|---|
| Errors | `{ "error": { "message": string, "code": string, "details"?: object } }` with an HTTP status (400 validation, 401 unauthenticated, 403 forbidden/CSRF, 404 not found, 409 conflict, 429 rate limited, 503 feature not configured, 500 server). |
| Validation | Every request body is validated with **zod**; validation errors return `400` with `code: "VALIDATION_ERROR"` and `details` = zod `flatten()` output (`{ formErrors, fieldErrors }`). |
| Money | Prices are numbers in GBP with two decimals (e.g. `12.95`). The server always **recomputes** order totals from database prices (in pence internally) — client totals are never trusted. |
| Spam protection | Public POST forms accept an optional honeypot field `website`. If it is non-empty the server responds `201` with a fake success body and stores nothing. Public POST routes are rate-limited (20 requests / 15 min / IP). |
| Admin auth | JWT stored in an **httpOnly** cookie named `fuji_admin` (8 h expiry). Login is rate-limited (5 attempts / 15 min / IP). |
| CSRF guard | Every **mutating** admin request (POST/PUT/PATCH/DELETE under `/api/admin`, including logout and uploads, excluding login) must send header `X-Requested-With: XMLHttpRequest`, otherwise `403 CSRF_HEADER_MISSING`. Combined with strict CORS this blocks cross-site form posts. |
| Admin list responses | `{ "data": [...], "total": number, "page": number, "pages": number }`; query params `page` (default 1) and `limit` (default 20, max 100). |
| IDs | MongoDB documents expose `_id`. Menu items additionally expose a stable human-readable `itemId` (slug, e.g. `chicken-katsu-curry`). |

---

## Public endpoints

### `GET /api/health`
```json
{ "ok": true, "db": "connected", "uploads": true, "uploadStorage": "local", "cutouts": true, "version": "1.0.0" }
```
`db` is `"connected"` or `"disconnected"`; `uploadStorage` is `"cloudinary"` when Cloudinary env vars are set, otherwise `"local"` (the server's disk); `cutouts` is true when uploaded photos get an automatic background cut-out.

### `GET /api/menu`
Returns the full menu in **the same shape as `server/src/data/menu.json`** so the frontend can use either source interchangeably. Only active categories are returned (ordered by `order`); every item is returned with an `available` flag (items with `available: false` are shown as "Currently unavailable").
```json
{
  "allergenNotice": "Our kitchen handles fish, gluten, soy, sesame and shellfish…",
  "updatedAt": "2026-11-10T12:00:00.000Z",
  "categories": [
    {
      "slug": "starters", "name": "Starters", "jp": "前菜",
      "intro": "Small plates and warm starters.", "note": null, "order": 1,
      "items": [
        {
          "id": "edamame", "name": "Edamame", "price": 5.45,
          "description": "Fresh Japanese soya bean pods.",
          "dietary": ["vegan", "gluten-free"], "tags": [], "hot": false,
          "art": "edamame", "image": null, "allergens": [], "available": true
        }
      ]
    }
  ]
}
```
* `dietary` ⊂ `vegetarian | vegan | gluten-free` (as labelled by the restaurant).
* `tags` ⊂ `popular | chefs-pick | spicy`.
* `art` = key of the built-in illustration used when no photo is uploaded (`type` or `type:variant`).
* `image` = `null` or `{ "url": string, "publicId": string, "illustrative": boolean }`.

### `GET /api/settings`
Public site settings.
```json
{
  "contact": {
    "phone": "020 7254 6093", "phoneIntl": "+442072546093",
    "email": "info@fujirestaurant.co.uk",
    "addressLines": ["15 Stoke Newington Church Street", "London", "N16 0NX"]
  },
  "hours": [ { "day": 0, "open": "12:00", "close": "22:00", "closed": false } ],
  "hoursNote": "Published hours — please confirm with the restaurant. Booking service hours may differ.",
  "deliveryFee": null,
  "minimumOrder": null,
  "orderingMode": "demo",
  "bookingMode": "demo",
  "announcement": ""
}
```
`hours` has 7 entries, `day` 0 = Sunday … 6 = Saturday. `deliveryFee`/`minimumOrder` are `null` until the owner confirms them. `orderingMode` / `bookingMode` are `"demo"` or `"live"`.

### `GET /api/offers`
Active offers (`active: true` and within `startsAt`/`endsAt` if set).
```json
[ { "_id": "…", "title": "20% off delivery & collection", "description": "…", "terms": "…",
    "badge": "20% OFF", "verified": false, "source": "Official homepage (fujirestaurant.co.uk)",
    "active": true, "startsAt": null, "endsAt": null } ]
```

### `POST /api/orders`
```json
{
  "items": [ { "itemId": "chicken-katsu-curry", "quantity": 2 } ],
  "fulfilment": "delivery",
  "customer": {
    "name": "Aiko Tanaka", "phone": "07700 900123", "email": "aiko@example.com",
    "address": { "line1": "1 Example Road", "line2": "", "postcode": "N16 0AA" },
    "notes": "Ring the bell"
  },
  "website": ""
}
```
* `fulfilment`: `delivery | collection`; `customer.address` is required for delivery (UK postcode format check).
* `items`: 1–50 lines, `quantity` 1–20 each. Unknown items → `400`; unavailable items → `409 ITEM_UNAVAILABLE`.
* If `minimumOrder` is set and the subtotal is below it → `400 BELOW_MINIMUM`.

`201` response:
```json
{
  "reference": "FJ-7XK2QH", "status": "received", "isDemo": true,
  "fulfilment": "delivery",
  "items": [ { "itemId": "chicken-katsu-curry", "name": "Chicken Katsu-Curry", "price": 12.95, "quantity": 2, "lineTotal": 25.9 } ],
  "subtotal": 25.9, "deliveryFee": null, "total": 25.9,
  "createdAt": "…"
}
```
`isDemo` mirrors `settings.orderingMode !== "live"`. `deliveryFee` is `null` (to be confirmed) unless configured; `total` then equals `subtotal`.

### `GET /api/orders/:reference`
Public order tracking (no personal data except the customer's first name).
```json
{
  "reference": "FJ-7XK2QH", "status": "cooking", "isDemo": true, "fulfilment": "delivery",
  "statusHistory": [ { "status": "received", "at": "…" }, { "status": "cooking", "at": "…" } ],
  "items": [ … ], "subtotal": 25.9, "deliveryFee": null, "total": 25.9,
  "customerFirstName": "Aiko", "createdAt": "…"
}
```
Order statuses: `received → cooking → packing → out-for-delivery | ready-for-collection → completed`, or `cancelled`.

### `POST /api/reservations`
```json
{ "name": "Aiko Tanaka", "phone": "07700 900123", "email": "aiko@example.com",
  "guests": 2, "date": "2026-11-20", "time": "19:30", "requests": "Window seat if possible", "website": "" }
```
* `guests` 1–20; `date` `YYYY-MM-DD`, today or later (Europe/London); `time` `HH:mm` within that day's opening hours (and the day must not be `closed`).
* `201` → `{ "reference": "RS-4M8T2A", "status": "pending", "isDemo": true, "name", "guests", "date", "time" }` (`isDemo` mirrors `bookingMode`).

### `POST /api/catering`
```json
{ "name": "…", "email": "…", "phone": "…", "eventType": "corporate", "date": "2026-12-12",
  "guests": 40, "budget": "£500–£750", "platters": ["sushi", "hot-food"], "message": "…", "website": "" }
```
`eventType`: `corporate | birthday | wedding | private-event | other`. `platters` ⊂ `sushi | sashimi | bento | hot-food`. `201` → `{ "ok": true, "reference": "CT-…" }`.

### `POST /api/contact`
```json
{ "name": "…", "email": "…", "phone": "", "subject": "…", "message": "…", "website": "" }
```
`201` → `{ "ok": true }`.

---

## Admin endpoints (cookie auth)

| Method | Path | Body / query | Response |
|---|---|---|---|
| POST | `/api/admin/auth/login` | `{ email, password }` | `200 { admin: { id, email, name, role } }` + sets cookie. `401 INVALID_CREDENTIALS`. |
| POST | `/api/admin/auth/logout` | — | `204`, clears cookie |
| GET | `/api/admin/auth/me` | — | `{ admin }` or `401` |
| PUT | `/api/admin/auth/password` | `{ currentPassword, newPassword }` (min 10 chars) | `204` |
| GET | `/api/admin/stats` | — | see below |
| GET | `/api/admin/categories` | — | `[ { _id, slug, name, jp, intro, note, order, active, itemCount } ]` |
| POST | `/api/admin/categories` | `{ name, slug?, jp?, intro?, note?, order?, active? }` | `201 category` |
| PATCH | `/api/admin/categories/:id` | partial category | `category` |
| DELETE | `/api/admin/categories/:id` | — | `204`; `409 CATEGORY_NOT_EMPTY` if it still has items |
| GET | `/api/admin/items` | `?search=&category=<slug>&available=true|false&page&limit` | list of items, each with `category: { _id, slug, name }` |
| POST | `/api/admin/items` | `{ name, category: <categoryId>, price, description?, dietary?, tags?, hot?, art?, image?, allergens?, available?, order?, itemId? }` | `201 item` (`itemId` auto-slugged from name if omitted, made unique) |
| PATCH | `/api/admin/items/:id` | partial item | `item` |
| DELETE | `/api/admin/items/:id` | — | `204` |
| POST | `/api/admin/uploads` | `multipart/form-data`, field `image` (jpeg/png/webp/avif, ≤ 5 MB) | `201 { url, publicId, width, height, cutout?: { url, width, height }, storage }` — stored on Cloudinary or on the server's disk (`/api/uploads/menu/…`, WebP + 640/1280/1920 px copies); `400 INVALID_IMAGE` for unreadable files. Save the result as the item's `image` (`display: "cutout"` shows the cut-out on the website, `"photo"` the full photo) |
| GET | `/api/admin/orders` | `?status=&search=&page&limit` (search: reference/name/phone) | list (full order incl. customer) newest first |
| PATCH | `/api/admin/orders/:id/status` | `{ status }` | updated order (appends to `statusHistory`; this drives the customer's animated tracker) |
| GET | `/api/admin/reservations` | `?status=&date=YYYY-MM-DD&search=&page&limit` | list ordered by date/time |
| PATCH | `/api/admin/reservations/:id` | `{ status?, adminNotes? }` — status `pending | confirmed | seated | completed | cancelled | no-show` | updated reservation |
| GET | `/api/admin/catering` | `?status=&page&limit` | list newest first |
| PATCH | `/api/admin/catering/:id` | `{ status?, adminNotes? }` — status `new | contacted | quoted | booked | closed` | updated enquiry |
| GET | `/api/admin/messages` | `?status=&page&limit` | list newest first |
| PATCH | `/api/admin/messages/:id` | `{ status }` — `unread | read | archived` | updated message |
| DELETE | `/api/admin/messages/:id` | — | `204` |
| GET | `/api/admin/offers` | — | all offers |
| POST | `/api/admin/offers` | `{ title, description?, terms?, badge?, verified?, source?, active?, startsAt?, endsAt? }` | `201 offer` |
| PATCH | `/api/admin/offers/:id` | partial offer | `offer` |
| DELETE | `/api/admin/offers/:id` | — | `204` |
| GET | `/api/admin/settings` | — | settings (same shape as public) |
| PUT | `/api/admin/settings` | full settings object (same shape) | updated settings |

### `GET /api/admin/stats`
```json
{
  "today": { "orders": 4, "reservations": 6, "enquiries": 1, "messages": 2, "revenue": 112.4 },
  "pending": { "orders": 2, "reservations": 3, "enquiries": 1, "unreadMessages": 2 },
  "menu": { "items": 160, "unavailable": 0, "categories": 22 },
  "recentOrders": [ { "_id", "reference", "status", "total", "fulfilment", "customer": { "name" }, "createdAt" } ],
  "upcomingReservations": [ { "_id", "reference", "name", "guests", "date", "time", "status" } ]
}
```
"Today" is calculated in the Europe/London timezone.

---

## Data model (MongoDB collections)

| Collection | Key fields |
|---|---|
| `menucategories` | `slug` (unique), `name`, `jp`, `intro`, `note`, `order`, `active` |
| `menuitems` | `itemId` (unique), `category` (ref), `name`, `description`, `price`, `dietary[]`, `tags[]`, `hot`, `art`, `image{url,publicId,illustrative}`, `allergens[]`, `available`, `order`, timestamps |
| `orders` | `reference` (unique), `items[{itemId,name,price,quantity,lineTotal}]`, `fulfilment`, `customer{name,phone,email,address{line1,line2,postcode},notes}`, `subtotal`, `deliveryFee`, `total`, `status`, `statusHistory[{status,at}]`, `isDemo`, timestamps |
| `reservations` | `reference`, `name`, `phone`, `email`, `guests`, `date`, `time`, `requests`, `status`, `adminNotes`, `isDemo`, timestamps |
| `cateringenquiries` | `reference`, `name`, `email`, `phone`, `eventType`, `date`, `guests`, `budget`, `platters[]`, `message`, `status`, `adminNotes`, timestamps |
| `contactmessages` | `name`, `email`, `phone`, `subject`, `message`, `status`, timestamps |
| `offers` | `title`, `description`, `terms`, `badge`, `verified`, `source`, `active`, `startsAt`, `endsAt`, timestamps |
| `settings` | single document `key: "site"` holding the settings object above |
| `admins` | `email` (unique, lowercase), `name`, `passwordHash` (bcrypt, cost 12), `role` (`owner | staff`), `lastLoginAt`, timestamps |
