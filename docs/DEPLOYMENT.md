# Deployment guide

Recommended setup: **Vercel** (frontend) + **Render** or **Railway** (Express API) + **MongoDB Atlas** (database) + **Cloudinary** (dish photos — optional on a server with a permanent disk).
All four have free tiers suitable for a proposal / soft launch.

```
Browser ──► Vercel (React SPA, /client)
              │  /api/*  (rewrite, same-origin → simple cookies)
              ▼
            Render / Railway (Express API, /server) ──► MongoDB Atlas
                                                    └─► Cloudinary (image uploads)
```

---

## 1. MongoDB Atlas

1. Create a free **M0** cluster (region: London / `eu-west-2` if available).
2. *Database Access* → add a user with a long random password (role: *readWrite* on `fuji_restaurant`).
3. *Network Access* → allow `0.0.0.0/0` (Render/Railway use dynamic IPs) **or** the provider's static egress IPs if you are on a paid plan.
4. Copy the connection string, e.g.
   `mongodb+srv://fuji:<password>@cluster0.xxxxx.mongodb.net/fuji_restaurant?retryWrites=true&w=majority`

## 2. Cloudinary (photo uploads on hosts without a permanent disk)

Photo uploads in the admin work without Cloudinary: they are saved in `server/uploads/` on the API server. That is fine on your own PC, a VPS, or Render/Railway **with a persistent disk/volume mounted at `server/uploads`** (or `UPLOADS_DIR`). On a plan whose disk is wiped on every deploy, use Cloudinary:

1. Create an account → *Dashboard* → copy **Cloud name**, **API key**, **API secret**.
2. Uploads go into the folder set by `CLOUDINARY_FOLDER` (default `fuji-restaurant`).
3. The site requests `f_auto,q_auto` WebP/AVIF variants with responsive widths automatically.

## 3. API on Render (or Railway)

**Render → New → Web Service → connect the repository**

| Setting | Value |
|---|---|
| Root directory | `server` |
| Runtime | Node 20+ |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check path | `/api/health` |

**Environment variables**

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | 64+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_ORIGIN` | `https://your-site.vercel.app` (and the custom domain, comma-separated) |
| `COOKIE_SAMESITE` | `lax` when using the Vercel `/api` rewrite (recommended) · `none` if the browser calls the API domain directly |
| `COOKIE_SECURE` | `true` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | owner account created by the seed (password ≥ 10 chars) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from step 2 (optional) |
| `PHOTO_CUTOUTS` | `true` (default) to cut uploaded dish photos out of their background. Add `npm run cutout-model` to the build command (downloads the ~170 MB model once). Needs ~1 GB RAM during an upload — set `false` on a 512 MB instance |
| `STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe keys + webhook signing secret — see [`PAYMENTS.md`](./PAYMENTS.md) |

**Seed the database once** (Render → *Shell*, or locally with the production `MONGODB_URI` in `server/.env`):

```bash
npm run seed          # inserts the 22 categories / 160 items, settings, starter offer, owner account
```

Re-running `npm run seed` never overwrites prices or edits made in the admin. `npm run seed:reset` re-imports the menu from `menu.json` (destructive for menu edits).

**Railway** works the same way: new service from the repo, root `server`, start `npm start`, same variables. Railway sets `PORT` automatically.

## 4. Frontend on Vercel

**Vercel → Add New Project → import the repository**

| Setting | Value |
|---|---|
| Root directory | `client` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

1. Edit **`client/vercel.json`** and replace `https://YOUR-BACKEND.onrender.com` with your API URL. This proxies `/api/*` to Express so the admin cookie is first-party (`COOKIE_SAMESITE=lax`) and the SPA rewrite serves `index.html` for every route.
2. Environment variables (Vercel → Settings → Environment Variables):
   - `VITE_SITE_URL` = `https://fujirestaurant.co.uk` (canonical / Open Graph URLs)
   - `VITE_API_URL` — **leave empty** when using the rewrite. Only set it (e.g. `https://fuji-api.onrender.com`) if you skip the rewrite; then set `COOKIE_SAMESITE=none` on the API.
3. Deploy. Visit `/admin` and sign in with the seeded owner account.

### Without a backend
The frontend works on its own: it ships the full menu, and ordering / booking / forms run in clearly-labelled **demonstration** mode (nothing is sent). This is ideal for sharing the proposal before the API is set up — just deploy `client/` and remove the `/api` rewrite line from `vercel.json`.

## 5. Custom domain & go-live checklist

- [ ] Point the domain at Vercel; add it to `CLIENT_ORIGIN` on the API.
- [ ] Owner has confirmed every item in [`docs/OWNER-CHECKLIST.md`](./OWNER-CHECKLIST.md) (prices, hours, allergens, offer terms, photos).
- [ ] Admin → Settings: opening hours, delivery fee, minimum order, contact details.
- [ ] Admin → Offers: mark the 20% offer **verified** (or deactivate it) once terms are confirmed.
- [ ] Upload restaurant-approved photos in Admin → Menu (untick "illustrative" for real photos).
- [ ] Only switch **Ordering mode / Booking mode → live** once the restaurant has a process to receive and fulfil web orders and bookings (and payment terms are agreed). Until then the site labels them as demonstrations.
- [ ] Change the owner password (Admin → Account) and keep `JWT_SECRET` secret.
- [ ] Update `https://fujirestaurant.co.uk` in `client/public/robots.txt`, `sitemap.xml` and `index.html` JSON-LD if the domain differs.
- [ ] Choose and connect an analytics provider (consent-gated `track()` in `client/src/context/ConsentContext.jsx`), or leave it off.
- [ ] Run Lighthouse on the production URL (target 90+ in all four categories).

## 6. Operations

- **Backups:** Atlas M0 has no automated backups — export collections regularly (`mongodump`) or upgrade to M10+ for continuous backups.
- **Logs:** Render/Railway dashboards (morgan request logs + `[server]` lines).
- **Rate limits** are kept in memory per process; if you scale to several API instances, move them to a shared store (e.g. Redis).
- **Security:** HTTPS everywhere (automatic on Vercel/Render), Helmet headers, strict CORS allowlist, httpOnly cookies, CSRF header check on admin writes, zod validation + key sanitisation on every body, bcrypt (cost 12) passwords, login rate limiting, honeypot + rate limits on public forms.
- **Updates:** `npm outdated` / `npm audit` in both `client/` and `server/` monthly.
