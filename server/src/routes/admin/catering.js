import { Router } from 'express';
import { z } from 'zod';
import { CATERING_STATUSES, CateringEnquiry } from '../../models/CateringEnquiry.js';
import { objectIdParam, validate } from '../../middleware/validate.js';
import { notFound } from '../../utils/httpError.js';
import { paginate, paginationQuery } from '../../utils/pagination.js';
import { optionalText } from '../../validation/common.js';

const router = Router();
router.param('id', objectIdParam);

const listQuery = z.object({ status: z.enum(CATERING_STATUSES).optional(), ...paginationQuery });

const patchSchema = z
  .object({ status: z.enum(CATERING_STATUSES), adminNotes: optionalText(2000) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide status and/or adminNotes');

router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { status, page, limit } = req.validQuery;
  const filter = status ? { status } : {};
  res.json(await paginate(CateringEnquiry, filter, { page, limit, sort: { createdAt: -1 } }));
});

router.patch('/:id', validate(patchSchema), async (req, res) => {
  const enquiry = await CateringEnquiry.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true, lean: true },
  );
  if (!enquiry) throw notFound('Catering enquiry');
  res.json(enquiry);
});

export default router;
