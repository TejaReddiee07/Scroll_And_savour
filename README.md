# 富士 Fuji Japanese Restaurant — animated website

A premium, fully responsive and animated website for **Fuji Japanese Restaurant**, 15 Stoke Newington Church Street, London N16 0NX — built as a professional proposal for the owner.

Illustrated chef and waiter characters cook, carry and serve real menu dishes; the whole site responds to mouse, scroll and touch. Behind it sits an Express + MongoDB API and a secure admin dashboard so the owner can edit dishes, prices, photos, hours and offers, and manage orders, bookings and enquiries.

> **Content source:** every restaurant fact, dish and price comes from the owner-supplied research brief (snapshot 10 Nov 2026). Nothing is invented: unconfirmed details are labelled, ordering/booking run as clearly-marked **demonstrations** until a live process is switched on, and dish images are labelled **illustrations** until approved photos are uploaded. See [`docs/OWNER-CHECKLIST.md`](docs/OWNER-CHECKLIST.md).

---

## Easiest: double-click `run.bat` (Windows)

`run.bat` does everything one step at a time and then opens the site:
1. checks Node.js, 2. installs packages on first run, 3. connects to MongoDB (the one in `server/.env`, e.g. your local MongoDB service or MongoDB Atlas) — or starts an in-memory demo database if none is reachable, 4. starts the API (port 5000), 5. starts the website (port 5173), then prints the links — **website, admin, API health and a phone link for your Wi-Fi** — and opens the website. `stop.bat` stops it all (never touches an installed MongoDB service).

Keys go in `server/.env` (created on first run). See [`docs/PAYMENTS.md`](docs/PAYMENTS.md) for Stripe.

## Quick start (full demo, no MongoDB install needed)

Requires **Node.js 20+**.

```bash
npm run setup     # installs root, server and client dependencies
npm run demo      # in-memory MongoDB + seed + API (:5000) + website (:5173)
```

Open **http://localhost:5173**. The admin dashboard is at **http://localhost:5173/admin**
— demo login `owner@fuji.demo` / `FujiDemo2026!` (demo data resets on every start and includes a few records clearly labelled *SAMPLE*).

Frontend only (no API — everything still works, forms run in demo mode):

```bash
cd client && npm install && npm run dev
```

---

## The design — matched to the MR. BIRIYANIWALA reference

The UI follows the supplied *MR. BIRIYANIWALA* reference prompt section for section, re-themed for Fuji: a near-black room lit by saffron and copper, **Fraunces** (soft/wonky axes, an italic word in every headline), **Instrument Sans**, **DM Mono** numbered eyebrows, and Japanese (Shippori Mincho) as the quiet second voice. Lenis smooth scroll drives GSAP ScrollTrigger.

| Reference section | Fuji version |
|---|---|
| Loader: handi + steam, 000–100 counter, messages, splits top/bottom | Ramen bowl + three steam curls, 000–100 counter and bar, "Sharpening the knives → Rolling the maki → Warming the dashi", waits for fonts (capped at 4.5 s), splits open |
| Nav: mark, links, live open/closed pill, call to order, burger overlay; hides on scroll down | Same — Europe/London open pill, "Call to order", full-screen numbered overlay with Japanese labels |
| Hero: 8 dishes scrubbed by scroll, explode into ingredients, giant rolling word, masked two-line title, 01–08 strip, clickable index, progress bar, rotating ring badge, per-dish accent, arch leans to cursor, direction-aware | Same mechanics with **8 real Fuji dishes** (Delux Sashimi, Chicken Katsu-Curry, Prawn Tempura, Miso Ramen, Sirloin Steak Bento, Chicken Karage, Fuji Roll, Mango Mochi). Each dish's SVG illustration physically **explodes into its pieces** as you scroll (every shape flies out from the plate and reassembles in reverse) |
| Marquee reacting to scroll velocity | Sushi · 寿司 · Sashimi · 刺身 · Ramen … / Stoke Newington · N16 · Dine in … |
| 01 manifesto, words light up, inline video pills | 01 The kitchen — words light up as you scroll; pills (chef, sashimi, ramen) grow |
| 02 pinned horizontal steps with parallax media | 02 Five ways in — Slice · Roll · Fry · Simmer · Box |
| Mask word zooming through a letter into the film | **FUJI** mask over the animated living-restaurant scene; the camera zooms through the I |
| 03 sticky film + 01/11 list, names scramble into Hindi | 03 On the board — eleven fish/seafood, names scramble into katakana |
| 04 menu rows with cursor-following thumbnail + tabbed full menu | 04 The menu — 8 signature rows + all 22 sections in tabs, add-to-cart on every item |
| 05 tandoor: embers, sparks canvas, counter, tilt cards | 05 From the wok — embers, 160/70 rising sparks, count-up, the illustrated chef tossing a flaming wok, tilt cards |
| Pour: sticky gravy film + kinetic words + 4 films | Broth pour + "Miso. Soya. Broth. Patience." + four noodle bowls |
| 06 house rules carousel | Four real rules from the menu (miso with every bento, mochi in pairs, dressings contain nuts, tell us about allergies) |
| 07 visit: storefront film, counters, live local time, CTAs | Storefront illustration (swaps to a real photo when supplied), counters from the real menu data, live London clock, call / menu / directions |
| Footer: giant wordmark rising from the centre + "Ek plate aur?" | Giant **FUJI** rising from the centre + 「おかわり？ — One more plate?」 |
| Film grain, dot+ring cursor with words, magnetic buttons, rolling link text, split-line headline reveals | All included (cursor words: Taste, Look, Slice, Fire) |

Differences from the reference, on purpose: it's built in the existing React app (so ordering, booking, admin and the API keep working) rather than a static no-build site; and since there are no AI-generated films, every dish is an original **SVG illustration** — clearly labelled — instead of Veo clips. Real restaurant photos plug in via `client/src/data/photos.js` (see *Photos* below).

## What's inside

### The living restaurant (animated characters)
| Where | Animation |
|---|---|
| Home (FUJI mask section) | ~12 s seamless loop: chef tosses the wok (flames, steam) and slices → dish appears on the pass with a **ding** → waiter walks over, lifts the tray to her shoulder, carries it across the floor (tray bobbing), bows and serves → steam rises, the guest reacts with hearts → waiter returns. Rotates through real dishes with a live **"Now serving: …"** link. Mount Fuji and a red sun through a round window, swaying paper lanterns, noren curtain. |
| Menu | A chef peeks from the category bar and waves whenever the category changes. |
| Add to cart | The dish flies along an arc into the cart icon; the cart bounces. |
| Order tracker | Order received → Chef is cooking → Packing → Out for delivery / Ready for collection, with the chef, wok, packing bag, scooter rider and bell animating at each stage. Driven by the admin dashboard when the API is connected; auto-advancing demo otherwise. |
| Reservations | After a valid booking the waiter walks in and lays the table — plates, chopsticks, cup and a **予約 RESERVED** card with the guest's name and time. |
| Catering | Waiters carry big sushi and sashimi platters across the screen as you scroll. |
| About | "From kitchen to table" story that scrolls sideways while the page scrolls down. |
| 404 | The waiter trips, the sushi flies, she blushes — *すみません!* |
| From the wok | The chef tosses a flaming wok with rising steam. |

Characters are layered SVGs (separate head, pupils, torso, arms, forearms, legs, tray/props), posed every frame from GSAP-tweened state: they face the direction they walk, legs move with distance travelled (no foot sliding), everything eases, idle characters breathe and blink, and **pupils follow the cursor**. Scenes pause off-screen (IntersectionObserver) and when the tab is hidden.

The characters' designs follow the two **reference images** supplied with the brief (waiter: black flat cap, ponytail, white rolled-sleeve shirt, bow tie, navy pinafore · chef: puffy toque, braid, grey apron with red straps, amber eyes). The reference artwork itself is also used — background-removed — as mascot portraits on the home, about, order, catering and reservation pages and the admin login (`client/src/assets/characters/`, originals in `docs/reference/`). Every appearance is labelled as an illustration, never as real staff.

### Interaction layer
Lenis smooth scroll · fixed film grain · custom cursor (saffron dot + trailing ring that grows over links and shows a word — Taste, Look, Slice, Fire — over media) · link text that rolls on hover · headlines that rise line-by-line through masks · sakura petal trail in the hero and gallery · mouse parallax (gyroscope on phones, with permission on iOS) · 3D tilt cards with glare · magnetic CTAs · staggered scroll reveals · steam on hover for hot dishes · lanterns that swing harder on hover · tap ripples on touch · page transitions.
**All motion respects `prefers-reduced-motion`** (static illustrations, simple fades) and there is a **Pause animations** toggle in the header, mobile menu and footer.

### Pages
Home · About · Menu (all 22 categories / 160 items, sticky category chips, instant search, V / VG / GF / spicy / popular / chef's-pick filters, quick-view modal, quantity steppers) · Gallery (masonry, filter tabs, lightbox with swipe + keyboard) · Reservations · Order online (menu browser + cart + checkout + tracker) · Catering (enquiry form) · Contact (consent-gated Google Map, hours, directions, form) · Privacy · Cookies · Allergens & accessibility · animated 404.

### Online payments
Stripe Payment Element with **Card, Apple Pay, Google Pay, Revolut Pay and Klarna**, plus "pay on collection / delivery". Server-side totals, PaymentIntents, signed webhooks, refunds and a payment sync fallback; all stored in MongoDB. Setup: [`docs/PAYMENTS.md`](docs/PAYMENTS.md). API: [`docs/API-PAYMENTS-REVENUE.md`](docs/API-PAYMENTS-REVENUE.md).

### Admin dashboard (`/admin`)
**Revenue** page (earned per day chart, by payment method, by fulfilment, top dishes, refunds, to collect, CSV export) · orders with payment details, refunds and "check payment" · **Add dish / delete dish** (changes appear on the public menu immediately; deleted dishes disappear from the menu, ordering page and carts) · drag-and-drop dish photos (background removed automatically, stored on the server or Cloudinary).
JWT in an httpOnly cookie, bcrypt passwords, rate-limited login, CSRF header check. Dashboard stats; dishes (add/edit/delete, prices, availability, dietary labels, allergens, drag-and-drop photo upload with automatic food cut-out); categories; orders (status updates drive the customer's animated tracker); reservations; catering enquiries; contact messages; offers; settings (opening hours, contact details, delivery fee, minimum order, demo/live switches); change password.

---

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS 4, React Router 7, GSAP 3 + ScrollTrigger + SplitText (hero scrub, pins, masked reveals, character rigs), Lenis (smooth scroll), Framer Motion (page transitions, drawers), React Hook Form + Zod, Lucide icons. Fonts: Fraunces, Instrument Sans, DM Mono, Shippori Mincho |
| Backend | Node.js, Express 5, MongoDB + Mongoose 8, JWT, bcryptjs, Zod, Helmet, CORS, express-rate-limit, Multer + sharp + onnxruntime (photo cut-outs) + optional Cloudinary |
| Tooling | mongodb-memory-server (zero-install demo & 96-check smoke test), concurrently |

Characters are hand-built SVG + GSAP rather than Lottie/Rive files, so they stay tiny (no extra runtime or JSON downloads), can be re-posed in code for every scene, and react to the cursor. A React Three Fiber version was listed as optional and is not included.

---

## Project structure

```
client/                      React app
  index.html                 meta tags, Restaurant JSON-LD, chopsticks loading screen
  public/                    favicon, robots.txt, sitemap.xml, og-image.png
  vercel.json                SPA + /api rewrite, cache & security headers
  src/
    data/menu.json           full menu (copy of the server seed)
    data/site.js             restaurant facts from the brief, links, signature dishes
    context/                 site data (API with bundled fallback), cart, motion, consent
    components/characters/   Waiter, Chef, Guest, Rider, Bell, Lantern + rig.js (pose functions, eye tracking)
    components/scenes/       HeroScene, OrderTracker, TableSetting, CateringParade, HorizontalStory, PeekChef
    components/effects/      CustomCursor, SakuraTrail, TiltCard, Magnetic, Reveal, TapRipple, Steam
    components/menu/         DishArt (original illustrations for every dish), DishCard, quick-view
    components/layout/       Header, mobile menu, Footer, CartDrawer, CookieBanner, Layout
    pages/                   one file per page (all code-split)
    admin/                   admin dashboard (lazy-loaded)
server/                      Express API
  src/app.js, index.js       app + bootstrap (works without a DB; /api/health always up)
  src/models/                MenuCategory, MenuItem, Order, Reservation, CateringEnquiry, ContactMessage, Offer, Setting, Admin
  src/routes/public|admin/   REST endpoints (see docs/API.md)
  src/data/menu.json         seed source — 22 categories, 160 items
  src/seed/seed.js           idempotent seed (never overwrites admin edits; --reset to re-import)
  scripts/demo.js            in-memory MongoDB demo backend
  scripts/smoke.js           end-to-end API test (96 checks)
docs/
  API.md                     endpoint list, request/response shapes, data model
  DEPLOYMENT.md              Vercel + Render/Railway + Atlas + Cloudinary
  MENU.md                    extracted menu for owner review
  OWNER-CHECKLIST.md         facts to confirm before launch
  reference/                 supplied character reference images
```

---

## Photos

Real photography from Fuji's official website and ordering menu, sorted in `photos/<menu-section>/`, with dishes cut out onto black for the menu and hero. See [`docs/PHOTOS.md`](docs/PHOTOS.md) to add or replace photos (`python tools/cutout.py` then `npm run photos`).

## Running with a real MongoDB

```bash
cp server/.env.example server/.env      # set MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD (≥10 chars); photo uploads need nothing extra
npm run seed                            # 22 categories, 160 items, settings, starter offer, owner account
npm run dev                             # API on :5000 (watch mode) + site on :5173 (Vite proxies /api)
```

| Script (root) | What it does |
|---|---|
| `npm run setup` | install everything |
| `npm run demo` | in-memory DB + seed + sample data + API + site |
| `npm run dev` | API (watch) + site against your `MONGODB_URI` |
| `npm run build` | production build of the site → `client/dist` |
| `npm run seed` | seed / top-up the database (safe to re-run) |
| `npm run smoke` | end-to-end API test against an in-memory DB |
| `npm run sync:menu` | copy `server/src/data/menu.json` → `client/src/data/menu.json` after editing the seed |

Environment variables are documented in [`server/.env.example`](server/.env.example) and [`client/.env.example`](client/.env.example).

---

## Live vs demonstration

| Feature | Without API | With API, mode `demo` (default) | With API, mode `live` |
|---|---|---|---|
| Menu & prices | bundled `menu.json` | from MongoDB (admin edits) | same |
| Online ordering | demo order in this browser only | stored in the dashboard, labelled *Demonstration*, tracker driven by admin | real order queue (no online payment — pay on collection/delivery) |
| Table booking | demo only | stored, labelled *Demo – no booking has been made* | booking **request** for staff to confirm |
| Catering / contact forms | labelled "not sent" | stored in the dashboard | same |

Switch modes in **Admin → Settings** only once the restaurant has a process to receive them. Links to the restaurant's existing channels (official site, Deliveroo, Uber Eats, OpenTable, phone) are always shown.

---

## SEO, accessibility & performance

- Per-page titles, meta descriptions, canonical + Open Graph tags (React 19 head hoisting), `Restaurant` JSON-LD (address, phone, hours, menu link), `sitemap.xml`, `robots.txt`.
- Skip link, visible focus rings, keyboard-operable menus/drawers/lightbox (focus trapping, Esc to close), labelled form fields with inline errors, `aria-live` status messages, alt text / ARIA labels on every illustration, AA colour contrast, reduced-motion support and a pause toggle.
- Every page is code-split; GSAP/Framer/forms are separate vendor chunks; the admin is lazy-loaded; animations use transforms/opacity only; scenes pause off-screen; dish art is inline SVG (no image downloads); uploaded photos are served as WebP with `srcset` (from the API, or Cloudinary `f_auto,q_auto`).
- Cookie banner with non-essential categories **off by default**; Google Maps loads only after consent; analytics `track()` calls are consent-gated and not wired to any provider yet.
- The home hero renders first; the rest of the scroll story mounts in idle time once the visitor starts scrolling (the hero's eight-screen pin is the runway). The explode geometry is measured lazily.
- `prefers-reduced-motion`: no smooth scroll, no pins or scrubs, content visible as still illustrations (breakpoints 1100 / 900 / 520 px; touch devices lose the custom cursor).

**Lighthouse (production build of the home page, local preview, 11 Nov 2026):**

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Desktop | 86 | 100 | 100 | 100 |
| Mobile (simulated slow 4G, 4× CPU) | 60 | 100 | 100 | 100 |

Mobile performance is below the 90 target. Most of the gap is the reference design itself: the loader waits for the web fonts (as the reference specifies) before revealing the hero, so the largest paint lands late on throttled mobile. Options if the owner prefers the score over the loader: drop the font wait, self-host and subset the fonts, or show the hero immediately and keep the loader for slow connections only.

---

## API

See [`docs/API.md`](docs/API.md) for every endpoint. In short:

`GET /api/health · GET /api/menu · GET /api/settings · GET /api/offers · POST /api/orders · GET /api/orders/:reference · POST /api/reservations · POST /api/catering · POST /api/contact`
and under `/api/admin`: auth (login/logout/me/password), stats, categories, items, uploads, orders, reservations, catering, messages, offers, settings.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel (client) + Render or Railway (server) + MongoDB Atlas + Cloudinary, with a go-live checklist.
