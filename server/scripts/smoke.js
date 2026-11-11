// End-to-end smoke test: in-memory MongoDB → real seed script → real Express app over HTTP.
//   npm run smoke
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const root = fileURLToPath(new URL('..', import.meta.url));
const ADMIN = { email: 'smoke-admin@example.com', password: 'smoke-test-password-123', name: 'Smoke Admin' };
const ORIGIN = 'http://localhost:5173';
const UPLOADS_DIR = path.join(os.tmpdir(), `fuji-smoke-uploads-${process.pid}`);

console.log('Starting in-memory MongoDB…');
const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri('fuji_smoke');

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: uri,
  JWT_SECRET: 'smoke-test-secret-that-is-long-enough-1234567890',
  CLIENT_ORIGIN: ORIGIN,
  ADMIN_EMAIL: ADMIN.email,
  ADMIN_PASSWORD: ADMIN.password,
  ADMIN_NAME: ADMIN.name,
  // Explicitly empty so a local .env can't send test photos to Cloudinary: uploads go to a temp folder.
  UPLOADS_DIR,
  PHOTO_CUTOUTS: 'false', // the cut-out model is exercised separately with real photos
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: '',
  // Stripe: fake API client injected below; webhook signatures are verified for real.
  STRIPE_SECRET_KEY: 'sk_test_smoke',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_smoke',
  STRIPE_WEBHOOK_SECRET: 'whsec_smoke_secret',
  STRIPE_METHODS: 'card,apple_pay,google_pay,revolut_pay,klarna',
});

// Async spawn: a synchronous spawn would freeze this process, which also hosts the in-memory
// mongod's log pipe — once that pipe fills, mongod (and the seed) block forever.
function runSeed(...args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['src/seed/seed.js', ...args], { cwd: root, env: process.env });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => {
      console.log(out.trim().replace(/^/gm, '    '));
      resolve(code);
    });
  });
}

const { createApp } = await import('../src/app.js');
const { setStripeClient, signTestPayload } = await import('../src/config/stripe.js');

/* ── a tiny in-memory Stripe stand-in (PaymentIntents + refunds) ── */
const intents = new Map();
const fakeStripe = {
  paymentIntents: {
    async create(params) {
      const id = `pi_smoke_${intents.size + 1}`;
      const pi = {
        id, object: 'payment_intent', amount: params.amount, amount_received: 0, currency: params.currency,
        status: 'requires_payment_method', client_secret: `${id}_secret_smoke`, livemode: false,
        metadata: params.metadata, latest_charge: null, last_payment_error: null,
        automatic_payment_methods: params.automatic_payment_methods,
      };
      intents.set(id, pi);
      return structuredClone(pi);
    },
    async retrieve(id) {
      const pi = intents.get(id);
      if (!pi) throw Object.assign(new Error('No such payment_intent'), { statusCode: 404 });
      return structuredClone(pi);
    },
    async cancel(id) {
      const pi = intents.get(id);
      pi.status = 'canceled';
      return structuredClone(pi);
    },
  },
  refunds: {
    async create({ payment_intent: id, amount }) {
      const pi = intents.get(id);
      pi.latest_charge.amount_refunded += amount;
      return { id: `re_${Date.now()}`, amount };
    },
  },
};
setStripeClient(fakeStripe);
const stripeSucceed = (id, details) => {
  const pi = intents.get(id);
  pi.status = 'succeeded';
  pi.amount_received = pi.amount;
  pi.latest_charge = {
    id: `ch_${id}`, created: Math.floor(Date.now() / 1000), amount_refunded: 0,
    receipt_url: 'https://pay.stripe.com/receipts/smoke', payment_method_details: details,
  };
};
const { connectOnce, disconnectDb } = await import('../src/config/db.js');
const { menuSource } = await import('../src/utils/menuSource.js');
const { addDays, londonDateString, weekdayOf } = await import('../src/utils/time.js');

const server = createApp().listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

let passed = 0;
let failed = 0;
function check(name, condition, info) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${info !== undefined ? ` → ${typeof info === 'string' ? info : JSON.stringify(info)}` : ''}`);
  }
}
const section = (title) => console.log(`\n${title}`);

let cookie = '';
async function call(method, path, { body, auth = false, xhr = false, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (body !== undefined || raw !== undefined) h['content-type'] = 'application/json';
  if (auth && cookie) h.cookie = cookie;
  if (xhr) h['x-requested-with'] = 'XMLHttpRequest';
  const res = await fetch(base + path, {
    method,
    headers: h,
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, headers: res.headers };
}
const admin = (method, path, body) => call(method, path, { body, auth: true, xhr: method !== 'GET' });

const pence = (gbp) => Math.round(gbp * 100);
const sourceItems = new Map(menuSource.categories.flatMap((c) => c.items.map((i) => [i.id, i])));
const today = londonDateString();
const tomorrow = addDays(today, 1);

try {
  section('Boot without database');
  let r = await call('GET', '/api/health');
  check('health responds 200 with db "disconnected"', r.status === 200 && r.json.db === 'disconnected' && r.json.ok === true, r.json);
  r = await call('GET', '/api/menu');
  check('GET /api/menu → 503 DB_UNAVAILABLE', r.status === 503 && r.json.error.code === 'DB_UNAVAILABLE', r.json);

  section('Seed (default mode)');
  check('seed exits 0', await runSeed() === 0);
  await connectOnce(uri);
  r = await call('GET', '/api/health');
  check('health: db connected, uploads to local disk, version', r.json.db === 'connected' && r.json.uploads === true && r.json.uploadStorage === 'local' && r.json.cutouts === false && r.json.version === '1.0.0', r.json);

  section('Public: menu / settings / offers');
  r = await call('GET', '/api/menu');
  const menu = r.json;
  const allItems = menu.categories.flatMap((c) => c.items);
  check('menu: 22 categories', menu.categories.length === 22, menu.categories.length);
  check('menu: 160 items', allItems.length === 160, allItems.length);
  check('menu: category order matches menu.json', menu.categories.map((c) => c.slug).join() === menuSource.categories.map((c) => c.slug).join());
  check(
    'menu: item order + prices match menu.json',
    menu.categories.every((c, ci) => c.items.map((i) => `${i.id}:${i.price}`).join() === menuSource.categories[ci].items.map((i) => `${i.id}:${i.price}`).join()),
  );
  check('menu: starters has order 1 and keys slug/name/jp/intro/note/order/items', menu.categories[0].order === 1 && Object.keys(menu.categories[0]).join() === 'slug,name,jp,intro,note,order,items', Object.keys(menu.categories[0]));
  check(
    'menu: item keys = menu.json keys + image/allergens/available',
    Object.keys(allItems[0]).join() === 'id,name,price,description,dietary,tags,hot,art,image,allergens,available',
    Object.keys(allItems[0]),
  );
  check('menu: allergenNotice + updatedAt present', menu.allergenNotice === menuSource.allergenNotice && !Number.isNaN(Date.parse(menu.updatedAt)));
  const menuUpdatedAt1 = menu.updatedAt;

  r = await call('GET', '/api/settings');
  check(
    'settings: published defaults',
    r.json.contact.phone === '020 7254 6093' && r.json.hours.length === 7 && r.json.hours.every((h) => h.open === '12:00' && h.close === '22:00' && !h.closed) && r.json.orderingMode === 'demo' && r.json.deliveryFee === null,
    r.json,
  );
  r = await call('GET', '/api/offers');
  check('offers: one unverified 20% offer', r.json.length === 1 && r.json[0].badge === '20% OFF' && r.json[0].verified === false, r.json);

  section('Public: orders');
  const katsu = sourceItems.get('chicken-katsu-curry');
  const edamame = sourceItems.get('edamame');
  const orderBody = {
    items: [
      { itemId: 'chicken-katsu-curry', quantity: 2, price: 0.01 },
      { itemId: 'edamame', quantity: 1 },
      { itemId: 'edamame', quantity: 1 },
    ],
    fulfilment: 'delivery',
    customer: {
      name: 'Aiko Tanaka',
      phone: '07700 900123',
      email: 'aiko@example.com',
      address: { line1: '1 Example Road', line2: '', postcode: 'n160aa' },
      notes: 'Ring the bell',
    },
    subtotal: 0.01,
    total: 0.01,
    website: '',
  };
  r = await call('POST', '/api/orders', { body: orderBody });
  const expectedSubtotal = (pence(katsu.price) * 2 + pence(edamame.price) * 2) / 100;
  const order = r.json;
  check('POST /api/orders → 201', r.status === 201, r.json);
  check('order reference format FJ-XXXXXX (no 0/O/1/I)', /^FJ-[A-HJ-NP-Z2-9]{6}$/.test(order.reference), order.reference);
  check(`server-side subtotal = ${expectedSubtotal} (client totals ignored)`, order.subtotal === expectedSubtotal && order.total === expectedSubtotal, order);
  check('duplicate lines merged, DB prices used', order.items.length === 2 && order.items[0].price === katsu.price && order.items[1].quantity === 2, order.items);
  check('deliveryFee null, isDemo true, status received', order.deliveryFee === null && order.isDemo === true && order.status === 'received');

  r = await call('POST', '/api/orders', { body: { ...orderBody, customer: { ...orderBody.customer, address: undefined } } });
  check('delivery without address → 400 VALIDATION_ERROR (flatten details)', r.status === 400 && r.json.error.code === 'VALIDATION_ERROR' && r.json.error.details.fieldErrors.customer?.length > 0, r.json);
  r = await call('POST', '/api/orders', { body: { ...orderBody, customer: { ...orderBody.customer, address: { line1: '1 Road', postcode: 'NOTAPOSTCODE' } } } });
  check('invalid UK postcode → 400', r.status === 400, r.json);
  r = await call('POST', '/api/orders', { body: { ...orderBody, items: [{ itemId: 'does-not-exist', quantity: 1 }] } });
  check('unknown item → 400 UNKNOWN_ITEM', r.status === 400 && r.json.error.code === 'UNKNOWN_ITEM', r.json);
  r = await call('POST', '/api/orders', { raw: '{"items": [' });
  check('malformed JSON → 400 INVALID_JSON', r.status === 400 && r.json.error.code === 'INVALID_JSON', r.json);

  r = await call('GET', `/api/orders/${order.reference.toLowerCase()}`);
  const tracking = JSON.stringify(r.json);
  check('GET /api/orders/:reference → 200 with customerFirstName', r.status === 200 && r.json.customerFirstName === 'Aiko', r.json);
  check('tracking exposes no phone/email/address', !/07700|aiko@example|Example Road|N16 0AA/.test(tracking) && !('customer' in r.json), tracking);
  r = await call('GET', '/api/orders/FJ-ZZZZZZ');
  check('unknown reference → 404', r.status === 404 && r.json.error.code === 'ORDER_NOT_FOUND', r.json);

  section('Public: reservations / catering / contact / honeypot');
  const resBody = { name: 'Aiko Tanaka', phone: '07700 900123', email: 'aiko@example.com', guests: 2, date: tomorrow, time: '19:30', requests: 'Window seat', website: '' };
  r = await call('POST', '/api/reservations', { body: resBody });
  check(`reservation for ${tomorrow} 19:30 → 201 RS-…, pending, isDemo`, r.status === 201 && /^RS-[A-HJ-NP-Z2-9]{6}$/.test(r.json.reference) && r.json.status === 'pending' && r.json.isDemo === true, r.json);
  r = await call('POST', '/api/reservations', { body: { ...resBody, time: '23:30' } });
  check('reservation 23:30 (after close) → 400 fieldErrors.time', r.status === 400 && r.json.error.details?.fieldErrors?.time?.length === 1, r.json);
  r = await call('POST', '/api/reservations', { body: { ...resBody, time: '09:00' } });
  check('reservation 09:00 (before open) → 400', r.status === 400, r.json);
  r = await call('POST', '/api/reservations', { body: { ...resBody, date: addDays(today, -1) } });
  check('reservation yesterday → 400 fieldErrors.date', r.status === 400 && r.json.error.details?.fieldErrors?.date?.length === 1, r.json);
  r = await call('POST', '/api/reservations', { body: { ...resBody, guests: 21 } });
  check('reservation 21 guests → 400', r.status === 400, r.json);

  r = await call('POST', '/api/catering', {
    body: { name: 'Ken Sato', email: 'ken@example.com', phone: '', eventType: 'corporate', date: addDays(today, 30), guests: 40, budget: '£500–£750', platters: ['sushi', 'hot-food'], message: 'Office party', website: '' },
  });
  check('POST /api/catering → 201 { ok, reference CT-… }', r.status === 201 && r.json.ok === true && /^CT-/.test(r.json.reference), r.json);
  r = await call('POST', '/api/contact', { body: { name: 'Mia', email: 'mia@example.com', phone: '', subject: 'Hello', message: 'Do you have parking?', website: '', $where: 'sleep(1000)' } });
  check('POST /api/contact → 201 { ok: true } ($-keys stripped)', r.status === 201 && r.json.ok === true, r.json);
  r = await call('POST', '/api/contact', { body: { name: 'Bot', email: 'bot@spam.test', message: 'buy now', website: 'http://spam.example' } });
  check('honeypot contact → 201 fake success', r.status === 201 && r.json.ok === true, r.json);
  r = await call('POST', '/api/orders', { body: { items: 'garbage', website: 'x' } });
  check('honeypot order (invalid body) → 201 fake reference', r.status === 201 && /^FJ-/.test(r.json.reference), r.json);

  section('Admin: auth + CSRF');
  r = await call('GET', '/api/admin/stats');
  check('stats without cookie → 401', r.status === 401, r.json);
  r = await call('POST', '/api/admin/auth/login', { body: { email: ADMIN.email, password: 'wrong-password' } });
  check('wrong password → 401 INVALID_CREDENTIALS "Invalid email or password"', r.status === 401 && r.json.error.code === 'INVALID_CREDENTIALS' && r.json.error.message === 'Invalid email or password', r.json);
  r = await call('POST', '/api/admin/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
  check('operator-injection login → 400 (no bypass)', r.status === 400, r.json);
  r = await call('POST', '/api/admin/auth/login', { body: { email: ADMIN.email.toUpperCase(), password: ADMIN.password } });
  const setCookie = r.headers.get('set-cookie') ?? '';
  cookie = setCookie.split(';')[0];
  check('login (no XHR header needed) → 200 { admin }', r.status === 200 && r.json.admin.email === ADMIN.email && r.json.admin.role === 'owner', r.json);
  check('cookie fuji_admin is HttpOnly, SameSite=Lax, 8h', /^fuji_admin=/.test(setCookie) && /HttpOnly/i.test(setCookie) && /SameSite=Lax/i.test(setCookie) && /Max-Age=28800/.test(setCookie), setCookie);
  r = await call('GET', '/api/admin/auth/me', { auth: true });
  check('GET /auth/me → admin', r.status === 200 && r.json.admin.name === ADMIN.name, r.json);

  r = await call('GET', '/api/admin/orders?search=07700900123', { auth: true });
  const orderId = r.json.data?.[0]?._id;
  check('admin orders list envelope + phone search without spaces', r.json.total === 1 && r.json.page === 1 && r.json.pages === 1 && r.json.data[0].customer.phone === '07700 900123', r.json);
  r = await call('PATCH', `/api/admin/orders/${orderId}/status`, { body: { status: 'cooking' }, auth: true });
  check('PATCH without X-Requested-With → 403 CSRF_HEADER_MISSING', r.status === 403 && r.json.error.code === 'CSRF_HEADER_MISSING', r.json);

  section('Admin: orders');
  r = await admin('PATCH', `/api/admin/orders/${orderId}/status`, { status: 'cooking' });
  check('status → cooking', r.status === 200 && r.json.status === 'cooking' && r.json.statusHistory.length === 2, r.json);
  r = await admin('PATCH', `/api/admin/orders/${orderId}/status`, { status: 'packing' });
  check('status → packing (history appended)', r.json.statusHistory.map((s) => s.status).join() === 'received,cooking,packing', r.json.statusHistory);
  r = await admin('PATCH', `/api/admin/orders/${orderId}/status`, { status: 'ready-for-collection' });
  check('ready-for-collection on a delivery order → 409', r.status === 409, r.json);
  r = await admin('PATCH', `/api/admin/orders/${orderId}/status`, { status: 'teleported' });
  check('invalid status → 400', r.status === 400, r.json);
  r = await call('GET', `/api/orders/${order.reference}`);
  check('public tracker shows packing + 3 history steps', r.json.status === 'packing' && r.json.statusHistory.length === 3, r.json);

  section('Admin: stats');
  r = await call('GET', '/api/admin/stats', { auth: true });
  const stats = r.json;
  check('today.orders 1; unfinished pay-in-person order is to collect, not yet earned', stats.today.orders === 1 && stats.today.revenue === 0 && stats.today.toCollect === expectedSubtotal, stats.today);
  check('pending counts (orders 1, reservations 1, enquiries 1, unread 1)', stats.pending.orders === 1 && stats.pending.reservations === 1 && stats.pending.enquiries === 1 && stats.pending.unreadMessages === 1, stats.pending);
  check('menu counts 160 / 0 / 22', stats.menu.items === 160 && stats.menu.unavailable === 0 && stats.menu.categories === 22, stats.menu);
  check('recentOrders + upcomingReservations', stats.recentOrders[0]?.reference === order.reference && stats.recentOrders[0].customer.name === 'Aiko Tanaka' && stats.upcomingReservations.length === 1, stats);

  section('Admin: reservations / catering / messages / uploads');
  r = await call('GET', `/api/admin/reservations?date=${tomorrow}`, { auth: true });
  const reservationId = r.json.data?.[0]?._id;
  check('reservations list filtered by date', r.json.total === 1, r.json);
  r = await admin('PATCH', `/api/admin/reservations/${reservationId}`, { status: 'confirmed', adminNotes: 'Table 4' });
  check('reservation → confirmed', r.status === 200 && r.json.status === 'confirmed' && r.json.adminNotes === 'Table 4', r.json);
  r = await call('GET', '/api/admin/catering', { auth: true });
  r = await admin('PATCH', `/api/admin/catering/${r.json.data[0]._id}`, { status: 'contacted' });
  check('catering → contacted', r.status === 200 && r.json.status === 'contacted', r.json);
  r = await call('GET', '/api/admin/messages', { auth: true });
  check('messages: 1 stored (honeypot stored nothing)', r.json.total === 1 && r.json.data[0].name === 'Mia', r.json);
  const messageId = r.json.data[0]._id;
  r = await admin('PATCH', `/api/admin/messages/${messageId}`, { status: 'read' });
  check('message → read', r.json.status === 'read', r.json);
  r = await admin('DELETE', `/api/admin/messages/${messageId}`);
  check('DELETE message → 204', r.status === 204);
  r = await admin('PATCH', '/api/admin/messages/not-an-id', { status: 'read' });
  check('malformed id → 400 INVALID_ID', r.status === 400 && r.json.error.code === 'INVALID_ID', r.json);
  r = await admin('POST', '/api/admin/uploads');
  check('upload without a file → 400 NO_FILE', r.status === 400 && r.json.error.code === 'NO_FILE', r.json);

  section('Admin: settings');
  r = await call('GET', '/api/admin/settings', { auth: true });
  const settings = r.json;
  const closedMonday = settings.hours.map((h) => (h.day === 1 ? { ...h, closed: true } : h));
  r = await admin('PUT', '/api/admin/settings', { ...settings, hours: closedMonday, deliveryFee: 2.5, minimumOrder: 15, orderingMode: 'live' });
  check('PUT settings → updated', r.status === 200 && r.json.deliveryFee === 2.5 && r.json.minimumOrder === 15 && r.json.orderingMode === 'live' && r.json.hours[1].closed === true, r.json);
  r = await admin('PUT', '/api/admin/settings', { ...settings, hours: settings.hours.slice(0, 6) });
  check('PUT settings with 6 days → 400', r.status === 400, r.json);
  r = await call('POST', '/api/orders', { body: { ...orderBody, fulfilment: 'collection', items: [{ itemId: 'edamame', quantity: 1 }] } });
  check('order below minimumOrder → 400 BELOW_MINIMUM', r.status === 400 && r.json.error.code === 'BELOW_MINIMUM', r.json);
  r = await call('POST', '/api/orders', { body: { ...orderBody, items: [{ itemId: 'chicken-katsu-curry', quantity: 2 }] } });
  const expected2 = (pence(katsu.price) * 2 + 250) / 100;
  check(`delivery order adds deliveryFee 2.5 → total ${expected2}, isDemo false`, r.status === 201 && r.json.deliveryFee === 2.5 && r.json.total === expected2 && r.json.isDemo === false, r.json);
  let monday = addDays(today, 1);
  while (weekdayOf(monday) !== 1) monday = addDays(monday, 1);
  r = await call('POST', '/api/reservations', { body: { ...resBody, date: monday } });
  check(`reservation on closed day (${monday}) → 400`, r.status === 400 && r.json.error.details?.fieldErrors?.date?.length === 1, r.json);

  section('Admin: categories / items / menu reflection');
  r = await call('GET', '/api/admin/categories', { auth: true });
  check('categories: 22 with itemCount summing to 160', r.json.length === 22 && r.json.reduce((n, c) => n + c.itemCount, 0) === 160, r.json.length);
  r = await admin('POST', '/api/admin/categories', { name: 'Smoke Specials' });
  const catId = r.json._id;
  check('create category → 201 slug auto-generated', r.status === 201 && r.json.slug === 'smoke-specials' && r.json.order === 23, r.json);
  r = await admin('POST', '/api/admin/items', { name: 'Edamame', category: catId, price: 3.5 });
  const newItemId = r.json._id;
  check('create item → itemId slugged & made unique (edamame-2)', r.status === 201 && r.json.itemId === 'edamame-2' && r.json.category.slug === 'smoke-specials', r.json);
  r = await admin('POST', '/api/admin/items', { name: 'Bad', category: catId, price: 1.234 });
  check('price with 3 decimals → 400', r.status === 400, r.json);

  // Photo upload without Cloudinary → stored on the server's disk, resized to WebP + srcset sizes
  const { default: sharp } = await import('sharp');
  const png = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#b33a2a' } }).png().toBuffer();
  const form = new FormData();
  form.append('image', new Blob([png], { type: 'image/png' }), 'dish.png');
  let res = await fetch(`${base}/api/admin/uploads`, { method: 'POST', body: form, headers: { cookie, 'x-requested-with': 'XMLHttpRequest' } });
  const uploaded = await res.json();
  check('upload (no Cloudinary) → 201 local WebP 2000×1500', res.status === 201 && uploaded.storage === 'local' && /^\/api\/uploads\/menu\/.+\.webp$/.test(uploaded.url) && uploaded.width === 2000 && uploaded.height === 1500, uploaded);
  const uploadedName = path.basename(uploaded.url, '.webp');
  const stored = fs.readdirSync(path.join(UPLOADS_DIR, 'menu')).filter((f) => f.startsWith(uploadedName)).sort();
  check('stored main file + 640/1280/1920 copies', stored.length === 4, stored);
  res = await fetch(base + uploaded.url);
  check('uploaded photo served: 200 image/webp, cross-origin, cached', res.status === 200 && res.headers.get('content-type') === 'image/webp' && res.headers.get('cross-origin-resource-policy') === 'cross-origin' && /immutable/.test(res.headers.get('cache-control') ?? ''), [res.status, res.headers.get('content-type')]);
  res = await fetch(`${base}/api/uploads/menu/missing-photo.webp`);
  check('missing upload → 404', res.status === 404, res.status);
  res = await fetch(`${base}/api/uploads/menu/..%2F..%2F..%2Fpackage.json`);
  check('uploads folder cannot reach other files', res.status >= 400 && res.status < 500, res.status);
  const bad = new FormData();
  bad.append('image', new Blob([Buffer.from('not really a picture')], { type: 'image/jpeg' }), 'x.jpg');
  res = await fetch(`${base}/api/admin/uploads`, { method: 'POST', body: bad, headers: { cookie, 'x-requested-with': 'XMLHttpRequest' } });
  check('corrupt image → 400 INVALID_IMAGE', res.status === 400 && (await res.json()).error.code === 'INVALID_IMAGE', res.status);
  r = await admin('PATCH', `/api/admin/items/${newItemId}`, { image: { url: uploaded.url, publicId: uploaded.publicId, width: uploaded.width, height: uploaded.height } });
  check('item saved with the uploaded photo', r.status === 200 && r.json.image?.url === uploaded.url && r.json.image.width === 2000, r.json);
  r = await admin('PATCH', `/api/admin/items/${newItemId}`, { image: { url: '/api/uploads/../secret.webp', publicId: '' } });
  check('item image with a made-up local path → 400', r.status === 400, r.json);
  r = await call('GET', '/api/menu');
  const menuNew = r.json.categories.flatMap((c) => c.items).find((i) => i.id === 'edamame-2');
  check('public menu shows the new dish with its photo', menuNew?.image?.url === uploaded.url && menuNew.image.height === 1500, menuNew);
  r = await admin('DELETE', `/api/admin/categories/${catId}`);
  check('delete non-empty category → 409 CATEGORY_NOT_EMPTY', r.status === 409 && r.json.error.code === 'CATEGORY_NOT_EMPTY', r.json);
  r = await admin('DELETE', `/api/admin/items/${newItemId}`);
  check('delete item → 204', r.status === 204);
  check('deleting the dish removed its photo files', fs.readdirSync(path.join(UPLOADS_DIR, 'menu')).filter((f) => f.startsWith(uploadedName)).length === 0);
  r = await admin('DELETE', `/api/admin/categories/${catId}`);
  check('delete empty category → 204', r.status === 204);

  r = await call('GET', '/api/admin/items?search=edamame&limit=500', { auth: true });
  const edamameDoc = r.json.data.find((i) => i.itemId === 'edamame');
  check('items search (limit capped at 100) with populated category', r.json.total === 1 && edamameDoc?.category?.slug === 'starters', r.json);
  r = await call('GET', '/api/admin/items?category=ramen&page=1&limit=2', { auth: true });
  check('items filter by category slug + pagination', r.json.total === 5 && r.json.data.length === 2 && r.json.pages === 3, r.json);
  await new Promise((resolve) => setTimeout(resolve, 20));
  r = await admin('PATCH', `/api/admin/items/${edamameDoc._id}`, { price: 5.95, allergens: ['soya'] });
  check('PATCH item price → 5.95', r.status === 200 && r.json.price === 5.95, r.json);
  r = await call('GET', '/api/menu');
  let menuEdamame = r.json.categories[0].items.find((i) => i.id === 'edamame');
  check('GET /api/menu reflects new price + allergens, updatedAt advanced', menuEdamame.price === 5.95 && menuEdamame.allergens[0] === 'soya' && Date.parse(r.json.updatedAt) > Date.parse(menuUpdatedAt1), { menuEdamame, updatedAt: r.json.updatedAt });
  r = await admin('PATCH', `/api/admin/items/${edamameDoc._id}`, { available: false });
  r = await call('POST', '/api/orders', { body: { ...orderBody, items: [{ itemId: 'edamame', quantity: 9 }] } });
  check('ordering unavailable item → 409 ITEM_UNAVAILABLE', r.status === 409 && r.json.error.code === 'ITEM_UNAVAILABLE', r.json);
  r = await call('GET', '/api/menu');
  menuEdamame = r.json.categories[0].items.find((i) => i.id === 'edamame');
  check('menu still lists it with available: false', menuEdamame.available === false);

  section('Admin: offers');
  r = await admin('POST', '/api/admin/offers', { title: 'Expired', endsAt: '2020-01-01T00:00:00Z' });
  check('create offer → 201', r.status === 201 && r.json.endsAt.startsWith('2020-01-01'), r.json);
  const expiredId = r.json._id;
  r = await call('GET', '/api/offers');
  check('public offers exclude expired offer', r.json.length === 1, r.json);
  r = await admin('PATCH', `/api/admin/offers/${expiredId}`, { startsAt: '2021-01-01' });
  check('offer with endsAt before startsAt → 400', r.status === 400, r.json);
  r = await admin('DELETE', `/api/admin/offers/${expiredId}`);
  check('delete offer → 204', r.status === 204);

  section('Payments (Stripe, simulated API + real webhook signatures)');
  const payIp = { 'x-forwarded-for': '10.20.30.40' };
  r = await call('GET', '/api/payments/config');
  check('payments config: enabled, test mode, 5 methods, in-person allowed',
    r.json.enabled === true && r.json.publishableKey === 'pk_test_smoke' && r.json.mode === 'test' && r.json.methods.length === 5 && r.json.inPerson === true, r.json);

  const onlineBody = (fulfilment = 'collection') => ({
    items: [{ itemId: 'chicken-katsu-curry', quantity: 1 }, { itemId: 'salmon-sashimi', quantity: 2 }],
    fulfilment,
    customer: { name: 'Pay Tester', phone: '07700 900111', email: 'pay@example.com', notes: '' },
    payment: 'online',
  });
  const expectedOnline = (pence(sourceItems.get('chicken-katsu-curry').price) + 2 * pence(sourceItems.get('salmon-sashimi').price)) / 100;

  r = await call('POST', '/api/orders', { body: onlineBody(), headers: payIp });
  const p1 = r.json;
  check('online order → 201, pending-payment, client secret returned',
    r.status === 201 && p1.status === 'pending-payment' && p1.payment.method === 'online' && p1.payment.status === 'pending' && /_secret_/.test(p1.payment.clientSecret ?? ''), r.json);
  const pi1 = [...intents.values()].find((pi) => pi.metadata.reference === p1.reference);
  check('PaymentIntent amount = server total in pence, GBP, automatic methods',
    pi1 && pi1.amount === pence(expectedOnline) && pi1.currency === 'gbp' && pi1.automatic_payment_methods?.enabled === true, pi1);

  r = await admin('GET', `/api/admin/orders?search=${p1.reference}`);
  const p1Id = r.json.data[0]?._id;
  check('admin sees order with payment.intentId stored', r.json.data[0]?.payment?.intentId === pi1.id, r.json.data[0]?.payment);
  r = await admin('PATCH', `/api/admin/orders/${p1Id}/status`, { status: 'cooking' });
  check('unpaid online order cannot go to the kitchen → 409 PAYMENT_PENDING', r.status === 409 && r.json.error.code === 'PAYMENT_PENDING', r.json);

  // Webhook: succeeded via Apple Pay
  stripeSucceed(pi1.id, { type: 'card', card: { brand: 'visa', last4: '4242', wallet: { type: 'apple_pay' } } });
  const evt = (id, type, object) => JSON.stringify({ id, object: 'event', type, livemode: false, data: { object } });
  let payload = evt('evt_smoke_1', 'payment_intent.succeeded', { id: pi1.id, object: 'payment_intent', metadata: pi1.metadata });
  r = await call('POST', '/api/payments/webhook', { raw: payload, headers: { 'stripe-signature': signTestPayload(payload) } });
  check('signed webhook accepted → 200', r.status === 200 && r.json.received === true, r.json);
  r = await call('GET', `/api/orders/${p1.reference}`);
  check('after webhook: order received, paid via Apple Pay', r.json.status === 'received' && r.json.payment.status === 'paid' && r.json.payment.methodType === 'apple_pay', r.json);
  r = await call('POST', '/api/payments/webhook', { raw: payload, headers: { 'stripe-signature': signTestPayload(payload) } });
  check('same event again → acknowledged as duplicate', r.status === 200 && r.json.duplicate === true, r.json);
  r = await call('POST', '/api/payments/webhook', { raw: payload, headers: { 'stripe-signature': 't=1,v1=deadbeef' } });
  check('bad signature → 400 INVALID_SIGNATURE', r.status === 400 && r.json.error.code === 'INVALID_SIGNATURE', r.json);
  r = await admin('GET', `/api/admin/orders?search=${p1.reference}`);
  const p1Admin = r.json.data[0];
  check('admin: brand/last4/receipt/paidAt stored', p1Admin.payment.brand === 'visa' && p1Admin.payment.last4 === '4242' && p1Admin.payment.receiptUrl && p1Admin.payment.paidAt, p1Admin.payment);

  // Sync endpoint: Revolut Pay
  r = await call('POST', '/api/orders', { body: onlineBody('collection'), headers: payIp });
  const p2 = r.json;
  const pi2 = [...intents.values()].find((pi) => pi.metadata.reference === p2.reference);
  stripeSucceed(pi2.id, { type: 'revolut_pay', revolut_pay: {} });
  r = await call('POST', `/api/orders/${p2.reference}/payment/sync`, { headers: payIp });
  check('public payment sync → paid via Revolut Pay', r.status === 200 && r.json.payment.status === 'paid' && r.json.payment.methodType === 'revolut_pay' && r.json.status === 'received', r.json);

  // Failed payment
  r = await call('POST', '/api/orders', { body: onlineBody('collection'), headers: payIp });
  const p3 = r.json;
  const pi3 = intents.get([...intents.values()].find((pi) => pi.metadata.reference === p3.reference).id);
  pi3.last_payment_error = { message: 'Your card was declined.' };
  r = await call('POST', `/api/orders/${p3.reference}/payment/sync`, { headers: payIp });
  check('declined payment → payment failed, order stays pending-payment', r.json.payment.status === 'failed' && r.json.status === 'pending-payment', r.json);

  // Refunds
  r = await admin('POST', `/api/admin/orders/${p1Id}/refund`, { amount: 5 });
  check('partial refund £5 → partially-refunded, amountRefunded 5', r.status === 200 && r.json.payment.status === 'partially-refunded' && r.json.payment.amountRefunded === 5, r.json.payment ?? r.json);
  r = await admin('POST', `/api/admin/orders/${p1Id}/refund`, { amount: 999 });
  check('refund more than remaining → 400 INVALID_REFUND_AMOUNT', r.status === 400 && r.json.error.code === 'INVALID_REFUND_AMOUNT', r.json);
  r = await admin('POST', `/api/admin/orders/${p1Id}/refund`, {});
  check('full refund of remainder → refunded', r.status === 200 && r.json.payment.status === 'refunded' && r.json.payment.amountRefunded === expectedOnline, r.json.payment ?? r.json);
  r = await admin('GET', `/api/admin/orders?search=${p3.reference}`);
  const p3Id = r.json.data[0]._id;
  r = await admin('POST', `/api/admin/orders/${p3Id}/refund`, {});
  check('refund unpaid order → 409 NOT_REFUNDABLE', r.status === 409 && r.json.error.code === 'NOT_REFUNDABLE', r.json);

  // Revenue
  r = await admin('GET', '/api/admin/revenue');
  const rev = r.json;
  check('revenue: earned = Revolut order only (refunded + unpaid excluded)', r.status === 200 && rev.totals.earned === expectedOnline && rev.totals.online === expectedOnline, rev.totals);
  check('revenue: refunded total, awaiting payment counted', rev.totals.refunded === expectedOnline && rev.totals.awaitingPayment === 1, rev.totals);
  check('revenue: 30 daily buckets ending today', rev.daily.length === 30 && rev.daily.at(-1).date === today && rev.daily.at(-1).earned === expectedOnline, rev.daily.at(-1));
  check('revenue: byMethod Revolut Pay, top items present',
    rev.byMethod[0]?.method === 'revolut_pay' && rev.byMethod[0]?.label === 'Revolut Pay' && rev.topItems.some((i) => i.itemId === 'salmon-sashimi' && i.quantity === 2), { m: rev.byMethod, t: rev.topItems });
  check('revenue: in-person orders still to collect', rev.totals.toCollect > 0 && rev.totals.toCollectOrders > 0, rev.totals);
  // completing an in-person order makes it earned
  r = await admin('GET', '/api/admin/orders?method=in-person&status=packing');
  const inPerson = r.json.data[0];
  if (inPerson) {
    r = await admin('PATCH', `/api/admin/orders/${inPerson._id}/status`, { status: 'completed' });
    r = await admin('GET', '/api/admin/revenue');
    check('completed in-person order counts as earned', pence(r.json.totals.earned) === pence(expectedOnline) + pence(inPerson.total) && r.json.totals.inPerson === inPerson.total, r.json.totals);
  } else {
    check('found an in-person order in packing to complete', false);
  }
  r = await admin('GET', '/api/admin/stats');
  const rev2 = (await admin('GET', '/api/admin/revenue')).json;
  check('stats today.revenue uses the same earned rule', r.json.today.revenue === rev2.totals.earned && typeof r.json.today.toCollect === 'number', r.json.today);
  r = await admin('GET', '/api/admin/revenue?from=2026-12-01&to=2026-11-01');
  check('revenue invalid range → 400', r.status === 400 && r.json.error.code === 'INVALID_RANGE', r.json);
  r = await admin('GET', '/api/admin/revenue?includeDemo=false');
  check('revenue includeDemo=false drops the demo in-person order, keeps the live online one', r.json.totals.earned === expectedOnline && r.json.totals.inPerson === 0 && r.json.range.includeDemo === false, r.json.totals);
  const csv = await fetch(`${base}/api/admin/revenue/export.csv`, { headers: { cookie } });
  const csvText = await csv.text();
  check('CSV export: text/csv attachment with header + order rows',
    csv.status === 200 && /text\/csv/.test(csv.headers.get('content-type')) && /attachment/.test(csv.headers.get('content-disposition')) && csvText.includes('Reference,Date,Time') && csvText.includes(p1.reference), csvText.slice(0, 120));

  // Cancelling an unpaid online order cancels its PaymentIntent
  r = await admin('PATCH', `/api/admin/orders/${p3Id}/status`, { status: 'cancelled' });
  check('cancel unpaid online order → PaymentIntent canceled', r.status === 200 && r.json.payment.status === 'canceled' && intents.get(pi3.id).status === 'canceled', r.json.payment ?? r.json);
  r = await admin('GET', '/api/admin/orders?payment=paid');
  check('admin filter ?payment=paid returns the Revolut order', r.json.data.some((o) => o.reference === p2.reference) && r.json.data.every((o) => o.payment.status === 'paid'), r.json.total);

  section('Seed idempotency');
  check('re-run seed (default) exits 0', await runSeed() === 0);
  r = await call('GET', '/api/menu');
  menuEdamame = r.json.categories[0].items.find((i) => i.id === 'edamame');
  check('default seed kept admin edits (price 5.95, unavailable) and 160 items', menuEdamame.price === 5.95 && menuEdamame.available === false && r.json.categories.flatMap((c) => c.items).length === 160, menuEdamame);
  check('seed:reset exits 0', await runSeed('--reset') === 0);
  r = await call('GET', '/api/menu');
  menuEdamame = r.json.categories[0].items.find((i) => i.id === 'edamame');
  check('after --reset: price back to 5.45, 22 categories / 160 items', menuEdamame.price === edamame.price && menuEdamame.available === true && r.json.categories.length === 22 && r.json.categories.flatMap((c) => c.items).length === 160, menuEdamame);

  section('CORS / misc');
  r = await call('OPTIONS', '/api/orders', { headers: { origin: ORIGIN, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' } });
  check('preflight from allowed origin gets ACAO + credentials', r.headers.get('access-control-allow-origin') === ORIGIN && r.headers.get('access-control-allow-credentials') === 'true');
  r = await call('OPTIONS', '/api/orders', { headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' } });
  check('preflight from other origin gets no ACAO', !r.headers.get('access-control-allow-origin'));
  r = await call('GET', '/api/nope');
  check('unknown route → 404 NOT_FOUND', r.status === 404 && r.json.error.code === 'NOT_FOUND', r.json);

  section('Password change + logout');
  await new Promise((resolve) => setTimeout(resolve, 1100)); // let the old token's iat fall behind
  const oldCookie = cookie;
  r = await admin('PUT', '/api/admin/auth/password', { currentPassword: 'nope-nope-nope', newPassword: 'another-password-456' });
  check('wrong current password → 400', r.status === 400, r.json);
  r = await admin('PUT', '/api/admin/auth/password', { currentPassword: ADMIN.password, newPassword: 'short' });
  check('new password < 10 chars → 400', r.status === 400, r.json);
  r = await admin('PUT', '/api/admin/auth/password', { currentPassword: ADMIN.password, newPassword: 'another-password-456' });
  const renewed = (r.headers.get('set-cookie') ?? '').split(';')[0];
  check('password change → 204 + fresh cookie', r.status === 204 && renewed.startsWith('fuji_admin='), r.status);
  r = await call('GET', '/api/admin/auth/me', { headers: { cookie: oldCookie } });
  check('old session cookie rejected after password change', r.status === 401, r.json);
  cookie = renewed;
  r = await call('GET', '/api/admin/auth/me', { auth: true });
  check('renewed cookie works', r.status === 200, r.json);
  r = await admin('POST', '/api/admin/auth/logout');
  check('logout → 204 and clears cookie', r.status === 204 && /fuji_admin=;/.test(r.headers.get('set-cookie') ?? ''), r.headers.get('set-cookie'));

  section('Rate limits');
  let loginStatus = 0;
  for (let i = 0; i < 6 && loginStatus !== 429; i += 1) {
    loginStatus = (await call('POST', '/api/admin/auth/login', { body: { email: ADMIN.email, password: `wrong-${i}` } })).status;
  }
  check('failed logins are limited → 429 RATE_LIMITED', loginStatus === 429);
  let postStatus = 0;
  let sent = 0;
  while (postStatus !== 429 && sent < 25) {
    postStatus = (await call('POST', '/api/contact', { body: {} })).status;
    sent += 1;
  }
  check(`public POSTs limited to 20 / 15 min (429 after ${sent} more requests)`, postStatus === 429);
} catch (err) {
  failed += 1;
  console.error('\nSmoke test crashed:', err);
} finally {
  server.close();
  await disconnectDb();
  await mongod.stop();
  fs.rmSync(UPLOADS_DIR, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
