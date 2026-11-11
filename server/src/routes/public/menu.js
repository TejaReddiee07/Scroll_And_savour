import { Router } from 'express';
import { MenuCategory } from '../../models/MenuCategory.js';
import { MenuItem } from '../../models/MenuItem.js';
import { menuSource } from '../../utils/menuSource.js';
import { serializeImage } from '../../utils/image.js';

const router = Router();

/** Item in the exact menu.json shape (+ image, allergens, available). */
export function serializeMenuItem(item) {
  return {
    id: item.itemId,
    name: item.name,
    price: item.price,
    description: item.description ?? '',
    dietary: item.dietary ?? [],
    tags: item.tags ?? [],
    hot: Boolean(item.hot),
    art: item.art ?? '',
    image: serializeImage(item.image),
    allergens: item.allergens ?? [],
    available: item.available !== false,
  };
}

router.get('/menu', async (_req, res) => {
  const [categories, latestItem, latestCategory] = await Promise.all([
    MenuCategory.find({ active: true }).sort({ order: 1, name: 1 }).lean(),
    MenuItem.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
    MenuCategory.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
  ]);

  const items = await MenuItem.find({ category: { $in: categories.map((c) => c._id) } })
    .sort({ order: 1, name: 1 })
    .lean();

  const itemsByCategory = new Map();
  for (const item of items) {
    const key = String(item.category);
    if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
    itemsByCategory.get(key).push(serializeMenuItem(item));
  }

  const stamps = [latestItem?.updatedAt, latestCategory?.updatedAt].filter(Boolean).map((d) => new Date(d).getTime());
  const updatedAt = stamps.length ? new Date(Math.max(...stamps)).toISOString() : null;

  res.set('Cache-Control', 'no-cache');
  res.json({
    restaurant: menuSource.restaurant,
    source: menuSource.source,
    snapshotDate: menuSource.snapshotDate,
    currency: menuSource.currency,
    allergenNotice: menuSource.allergenNotice,
    updatedAt,
    categories: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      jp: c.jp ?? '',
      intro: c.intro ?? '',
      note: c.note ?? null,
      order: c.order,
      items: itemsByCategory.get(String(c._id)) ?? [],
    })),
  });
});

export default router;
