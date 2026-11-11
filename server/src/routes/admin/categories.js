import { Router } from 'express';
import { z } from 'zod';
import { MenuCategory } from '../../models/MenuCategory.js';
import { MenuItem } from '../../models/MenuItem.js';
import { objectIdParam, validate } from '../../middleware/validate.js';
import { HttpError, notFound } from '../../utils/httpError.js';
import { SLUG_RE, slugify, uniqueSlug } from '../../utils/strings.js';
import { optionalText, requiredText } from '../../validation/common.js';

const router = Router();
router.param('id', objectIdParam);

const fields = {
  name: requiredText('Name', 100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(SLUG_RE, 'Use lowercase letters, numbers and single hyphens'),
  jp: optionalText(50),
  intro: optionalText(500),
  note: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v ? v : null)),
  order: z.number().int().min(0).max(100000),
  active: z.boolean(),
};

const createSchema = z.object({
  ...fields,
  slug: fields.slug.optional(),
  order: fields.order.optional(),
  active: fields.active.optional(),
});

const patchSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

const serialize = (c, itemCount) => ({
  _id: c._id,
  slug: c.slug,
  name: c.name,
  jp: c.jp ?? '',
  intro: c.intro ?? '',
  note: c.note ?? null,
  order: c.order,
  active: c.active,
  itemCount,
});

const duplicateSlug = (slug) =>
  new HttpError(409, 'DUPLICATE_SLUG', `A category with the slug "${slug}" already exists`, {
    formErrors: [],
    fieldErrors: { slug: ['This slug is already used by another category'] },
  });

router.get('/', async (_req, res) => {
  const [categories, counts] = await Promise.all([
    MenuCategory.find().sort({ order: 1, name: 1 }).lean(),
    MenuItem.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]),
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json(categories.map((c) => serialize(c, countMap.get(String(c._id)) ?? 0)));
});

router.post('/', validate(createSchema), async (req, res) => {
  const body = req.body;
  let slug;
  if (body.slug) {
    if (await MenuCategory.exists({ slug: body.slug })) throw duplicateSlug(body.slug);
    slug = body.slug;
  } else {
    slug = await uniqueSlug(slugify(body.name, 'category'), (s) => MenuCategory.exists({ slug: s }));
  }
  let order = body.order;
  if (order === undefined) {
    const last = await MenuCategory.findOne().sort({ order: -1 }).select('order').lean();
    order = (last?.order ?? 0) + 1;
  }
  const category = await MenuCategory.create({ ...body, slug, order });
  res.status(201).json(serialize(category, 0));
});

router.patch('/:id', validate(patchSchema), async (req, res) => {
  const category = await MenuCategory.findById(req.params.id);
  if (!category) throw notFound('Category');
  if (req.body.slug && req.body.slug !== category.slug) {
    if (await MenuCategory.exists({ slug: req.body.slug, _id: { $ne: category._id } })) {
      throw duplicateSlug(req.body.slug);
    }
  }
  category.set(req.body);
  await category.save();
  const itemCount = await MenuItem.countDocuments({ category: category._id });
  res.json(serialize(category, itemCount));
});

router.delete('/:id', async (req, res) => {
  const category = await MenuCategory.findById(req.params.id);
  if (!category) throw notFound('Category');
  const itemCount = await MenuItem.countDocuments({ category: category._id });
  if (itemCount > 0) {
    throw new HttpError(
      409,
      'CATEGORY_NOT_EMPTY',
      `This category still contains ${itemCount} item${itemCount === 1 ? '' : 's'}. Move or delete them first.`,
      { itemCount },
    );
  }
  await category.deleteOne();
  res.status(204).end();
});

export default router;
