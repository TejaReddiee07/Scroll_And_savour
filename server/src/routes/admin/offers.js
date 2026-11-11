import { Router } from 'express';
import { z } from 'zod';
import { Offer } from '../../models/Offer.js';
import { objectIdParam, validate } from '../../middleware/validate.js';
import { fieldError, notFound } from '../../utils/httpError.js';
import { nullableDate, optionalText, requiredText } from '../../validation/common.js';

const router = Router();
router.param('id', objectIdParam);

const fields = {
  title: requiredText('Title', 150),
  description: optionalText(1000),
  terms: optionalText(2000),
  badge: optionalText(40),
  verified: z.boolean(),
  source: optionalText(300),
  active: z.boolean(),
  startsAt: nullableDate,
  endsAt: nullableDate,
};

const { title, ...rest } = fields;
const createSchema = z
  .object({ title })
  .extend(Object.fromEntries(Object.entries(rest).map(([k, s]) => [k, s.optional()])));

const patchSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

function assertDateRange(startsAt, endsAt) {
  if (startsAt && endsAt && endsAt < startsAt) throw fieldError('endsAt', 'End date must be after the start date');
}

router.get('/', async (_req, res) => {
  res.json(await Offer.find().sort({ createdAt: -1 }).lean());
});

router.post('/', validate(createSchema), async (req, res) => {
  assertDateRange(req.body.startsAt, req.body.endsAt);
  const offer = await Offer.create(req.body);
  res.status(201).json(offer.toObject());
});

router.patch('/:id', validate(patchSchema), async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw notFound('Offer');
  offer.set(req.body);
  assertDateRange(offer.startsAt, offer.endsAt);
  await offer.save();
  res.json(offer.toObject());
});

router.delete('/:id', async (req, res) => {
  const deleted = await Offer.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFound('Offer');
  res.status(204).end();
});

export default router;
