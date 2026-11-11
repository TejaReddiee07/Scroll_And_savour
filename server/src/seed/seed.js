// Seeds the database from src/data/menu.json plus the confirmed site defaults.
//
//   npm run seed         insert missing categories/items only (never overwrites admin edits)
//   npm run seed:reset   drop menu categories & items and re-insert them from menu.json
//
// Also creates the settings document and the starter offer if missing, and creates/updates the
// owner account from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.

import { env } from '../config/env.js';
import { connectOnce, disconnectDb } from '../config/db.js';
import { DEFAULT_OFFER, DEFAULT_SETTINGS } from '../config/defaults.js';
import { Admin, MIN_PASSWORD_LENGTH } from '../models/Admin.js';
import { MenuCategory } from '../models/MenuCategory.js';
import { MenuItem } from '../models/MenuItem.js';
import { Offer } from '../models/Offer.js';
import { Setting } from '../models/Setting.js';
import { CateringEnquiry } from '../models/CateringEnquiry.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { Order } from '../models/Order.js';
import { Reservation } from '../models/Reservation.js';
import { menuSource } from '../utils/menuSource.js';

const reset = process.argv.includes('--reset');
const log = (msg) => console.log(`[seed] ${msg}`);

async function seedMenu() {
  if (reset) {
    const [items, cats] = await Promise.all([MenuItem.deleteMany({}), MenuCategory.deleteMany({})]);
    log(`--reset: removed ${cats.deletedCount} categories and ${items.deletedCount} items`);
  }

  // Categories: insert the missing ones (order = 1-based position in menu.json).
  const existingCats = await MenuCategory.find().select('slug').lean();
  const slugToId = new Map(existingCats.map((c) => [c.slug, c._id]));
  const newCats = menuSource.categories
    .map((c, i) => ({ slug: c.slug, name: c.name, jp: c.jp ?? '', intro: c.intro ?? '', note: c.note ?? null, order: i + 1, active: true }))
    .filter((c) => !slugToId.has(c.slug));
  if (newCats.length) {
    const inserted = await MenuCategory.insertMany(newCats, { ordered: true });
    for (const c of inserted) slugToId.set(c.slug, c._id);
  }

  // Items: insert the missing ones; existing items (and any admin edits to them) are left untouched.
  const existingIds = new Set((await MenuItem.find().select('itemId').lean()).map((i) => i.itemId));
  const newItems = [];
  for (const cat of menuSource.categories) {
    cat.items.forEach((item, index) => {
      if (existingIds.has(item.id)) return;
      newItems.push({
        itemId: item.id,
        category: slugToId.get(cat.slug),
        name: item.name,
        description: item.description ?? '',
        price: item.price,
        dietary: item.dietary ?? [],
        tags: item.tags ?? [],
        hot: Boolean(item.hot),
        art: item.art ?? '',
        image: null,
        allergens: [],
        available: true,
        order: index,
      });
    });
  }
  if (newItems.length) await MenuItem.insertMany(newItems, { ordered: true });

  const totalItems = menuSource.categories.reduce((n, c) => n + c.items.length, 0);
  log(
    `menu: ${newCats.length} categories inserted (${menuSource.categories.length - newCats.length} already present), ` +
      `${newItems.length} items inserted (${totalItems - newItems.length} already present, not modified)`,
  );
}

async function seedSettings() {
  if (await Setting.exists({ key: 'site' })) {
    log('settings: already present, not modified');
    return;
  }
  await Setting.create({ key: 'site', ...structuredClone(DEFAULT_SETTINGS) });
  log('settings: created with the published defaults (ordering/booking in demo mode)');
}

async function seedOffers() {
  if ((await Offer.countDocuments()) > 0) {
    log('offers: at least one offer exists, not modified');
    return;
  }
  await Offer.create({ ...DEFAULT_OFFER });
  log(`offers: created "${DEFAULT_OFFER.title}" (unverified)`);
}

async function seedAdmin() {
  const { email, password, name } = env.admin;
  if (!email || !password) {
    log('admin: ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('[seed] admin: ADMIN_EMAIL is not a valid email address — admin NOT created/updated');
    process.exitCode = 1;
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `[seed] admin: ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters — admin NOT created/updated`,
    );
    process.exitCode = 1;
    return;
  }

  const existing = await Admin.findOne({ email }).select('+passwordHash');
  if (!existing) {
    const admin = new Admin({ email, name: name || 'Admin', role: 'owner' });
    await admin.setPassword(password);
    await admin.save();
    log(`admin: created owner account ${email}`);
    return;
  }

  existing.role = 'owner';
  if (name) existing.name = name;
  const passwordChanged = !(await existing.checkPassword(password));
  if (passwordChanged) await existing.setPassword(password);
  await existing.save();
  log(`admin: updated ${email}${passwordChanged ? ' (password changed — existing sessions signed out)' : ''}`);
}

async function main() {
  if (!env.mongoUri) {
    console.error('[seed] MONGODB_URI is not set. Copy .env.example to .env and configure it.');
    process.exit(1);
  }
  await connectOnce(env.mongoUri);
  log(`connected to ${env.mongoUri.replace(/\/\/[^@/]*@/, '//***@')}`);

  // Make sure unique indexes exist before inserting.
  await Promise.all(
    [MenuCategory, MenuItem, Setting, Offer, Admin, Order, Reservation, CateringEnquiry, ContactMessage].map((m) =>
      m.init(),
    ),
  );

  await seedMenu();
  await seedSettings();
  await seedOffers();
  await seedAdmin();
}

try {
  await main();
  log('done');
} catch (err) {
  console.error('[seed] failed:', err);
  process.exitCode = 1;
} finally {
  await disconnectDb().catch(() => {});
}
