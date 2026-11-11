import { Router } from 'express';
import { z } from 'zod';
import { MenuCategory } from '../../models/MenuCategory.js';
import { DIETARY, MenuItem, TAGS } from '../../models/MenuItem.js';
import { objectIdParam, validate } from '../../middleware/validate.js';
import { HttpError, fieldError, notFound } from '../../utils/httpError.js';
import { envelope, paginationQuery } from '../../utils/pagination.js';
import { SLUG_RE, containsRegex, slugify, uniqueSlug } from '../../utils/strings.js';
import { deleteLocalImage, LOCAL_URL_RE } from '../../services/localUploads.js';
import { serializeImage } from '../../utils/image.js';
import { booleanQuery, money, objectId, optionalText, requiredText, searchQuery } from '../../validation/common.js';

const router = Router();
router.param('id', objectIdParam);

const unique = (arr) => [...new Set(arr)];

const imageUrl = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (u) => LOCAL_URL_RE.test(u) || (z.string().url().safeParse(u).success && u.startsWith('https://')),
    'Upload the photo again (the image address is not valid)',
  );

const imageSchema = z.object({
  url: imageUrl,
  publicId: optionalText(300),
  cutout: z
    .object({
      url: imageUrl,
      publicId: optionalText(300),
      width: z.number().int().min(1).max(20000).optional(),
      height: z.number().int().min(1).max(20000).optional(),
    })
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
  display: z.enum(['cutout', 'photo']).optional().default('cutout'),
  illustrative: z.boolean().optional().default(false),
  width: z.number().int().min(1).max(20000).optional(),
  height: z.number().int().min(1).max(20000).optional(),
});

const fields = {
  name: requiredText('Name', 150),
  category: objectId,
  price: money,
  description: optionalText(1000),
  dietary: z.array(z.enum(DIETARY)).max(DIETARY.length).transform(unique),
  tags: z.array(z.enum(TAGS)).max(TAGS.length).transform(unique),
  hot: z.boolean(),
  art: z
    .string()
    .trim()
    .max(60)
    .regex(/^$|^[a-z0-9-]+(:[a-z0-9-]+)?$/, 'Use an illustration key such as "ramen" or "gyoza:veg"'),
  image: imageSchema.nullable(),
  allergens: z.array(z.string().trim().toLowerCase().min(1).max(60)).max(20).transform(unique),
  available: z.boolean(),
  order: z.number().int().min(0).max(100000),
  itemId: z.string().trim().toLowerCase().max(100).regex(SLUG_RE, 'Use lowercase letters, numbers and single hyphens'),
};

const { name, category, price, ...optionalFields } = fields;
const createSchema = z.object({ name, category, price }).extend(
  Object.fromEntries(Object.entries(optionalFields).map(([k, s]) => [k, s.optional()])),
);

const patchSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

const listQuery = z.object({
  search: searchQuery,
  category: z.string().trim().toLowerCase().max(80).optional(),
  available: booleanQuery.optional(),
  ...paginationQuery,
});

function serialize(item, cat) {
  const c = cat ?? item.category;
  return {
    _id: item._id,
    itemId: item.itemId,
    name: item.name,
    category: c && c._id ? { _id: c._id, slug: c.slug, name: c.name } : null,
    price: item.price,
    description: item.description ?? '',
    dietary: item.dietary ?? [],
    tags: item.tags ?? [],
    hot: Boolean(item.hot),
    art: item.art ?? '',
    image: serializeImage(item.image),
    allergens: item.allergens ?? [],
    available: item.available !== false,
    order: item.order,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

const duplicateItemId = (itemId) =>
  new HttpError(409, 'DUPLICATE_ITEM_ID', `An item with the id "${itemId}" already exists`, {
    formErrors: [],
    fieldErrors: { itemId: ['This id is already used by another item'] },
  });

async function loadCategory(id) {
  const cat = await MenuCategory.findById(id).select('slug name').lean();
  if (!cat) throw fieldError('category', 'Category not found');
  return cat;
}

router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { search, category: categorySlug, available, page, limit } = req.validQuery;
  const match = {};
  if (search) {
    const rx = containsRegex(search);
    match.$or = [{ name: rx }, { itemId: rx }, { description: rx }];
  }
  if (available !== undefined) match.available = available;
  if (categorySlug) {
    const cat = await MenuCategory.findOne({ slug: categorySlug }).select('_id').lean();
    if (!cat) return res.json(envelope([], 0, page, limit));
    match.category = cat._id;
  }

  const [result] = await MenuItem.aggregate([
    { $match: match },
    { $lookup: { from: MenuCategory.collection.name, localField: 'category', foreignField: '_id', as: 'cat' } },
    { $set: { cat: { $arrayElemAt: ['$cat', 0] } } },
    { $sort: { 'cat.order': 1, order: 1, name: 1, _id: 1 } },
    { $facet: { data: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'n' }] } },
  ]);

  const data = result.data.map((doc) => serialize(doc, doc.cat ?? null));
  res.json(envelope(data, result.total[0]?.n ?? 0, page, limit));
});

router.post('/', validate(createSchema), async (req, res) => {
  const body = req.body;
  const cat = await loadCategory(body.category);

  let itemId;
  if (body.itemId) {
    if (await MenuItem.exists({ itemId: body.itemId })) throw duplicateItemId(body.itemId);
    itemId = body.itemId;
  } else {
    itemId = await uniqueSlug(slugify(body.name), (s) => MenuItem.exists({ itemId: s }));
  }

  let order = body.order;
  if (order === undefined) {
    const last = await MenuItem.findOne({ category: cat._id }).sort({ order: -1 }).select('order').lean();
    order = (last?.order ?? 0) + 1;
  }

  const item = await MenuItem.create({ ...body, itemId, order });
  res.status(201).json(serialize(item.toObject(), cat));
});

router.patch('/:id', validate(patchSchema), async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw notFound('Menu item');

  const cat = await loadCategory(req.body.category ?? item.category);
  if (req.body.itemId && req.body.itemId !== item.itemId) {
    if (await MenuItem.exists({ itemId: req.body.itemId, _id: { $ne: item._id } })) {
      throw duplicateItemId(req.body.itemId);
    }
  }

  const oldPublicId = item.image?.publicId ?? '';
  item.set(req.body);
  await item.save();
  // A replaced or removed photo stored on this server is deleted from disk.
  if (req.body.image !== undefined && oldPublicId && oldPublicId !== (item.image?.publicId ?? '')) {
    await deleteLocalImage(oldPublicId);
  }
  res.json(serialize(item.toObject(), cat));
});

router.delete('/:id', async (req, res) => {
  const deleted = await MenuItem.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFound('Menu item');
  await deleteLocalImage(deleted.image?.publicId);
  res.status(204).end();
});

export default router;
