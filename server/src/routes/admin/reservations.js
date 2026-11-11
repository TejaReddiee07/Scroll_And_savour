import { Router } from 'express';
import { z } from 'zod';
import { RESERVATION_STATUSES, Reservation } from '../../models/Reservation.js';
import { objectIdParam, validate } from '../../middleware/validate.js';
import { notFound } from '../../utils/httpError.js';
import { paginate, paginationQuery } from '../../utils/pagination.js';
import { containsRegex, phoneRegex } from '../../utils/strings.js';
import { dateString, optionalText, searchQuery } from '../../validation/common.js';

const router = Router();
router.param('id', objectIdParam);

const listQuery = z.object({
  status: z.enum(RESERVATION_STATUSES).optional(),
  date: dateString.optional(),
  search: searchQuery,
  ...paginationQuery,
});

const patchSchema = z
  .object({ status: z.enum(RESERVATION_STATUSES), adminNotes: optionalText(2000) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide status and/or adminNotes');

router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { status, date, search, page, limit } = req.validQuery;
  const filter = {};
  if (status) filter.status = status;
  if (date) filter.date = date;
  if (search) {
    const rx = containsRegex(search);
    filter.$or = [{ reference: rx }, { name: rx }, { phone: rx }, { email: rx }];
    const phoneRx = phoneRegex(search);
    if (phoneRx) filter.$or.push({ phone: phoneRx });
  }
  res.json(await paginate(Reservation, filter, { page, limit, sort: { date: 1, time: 1, createdAt: 1 } }));
});

router.patch('/:id', validate(patchSchema), async (req, res) => {
  const reservation = await Reservation.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true, lean: true },
  );
  if (!reservation) throw notFound('Reservation');
  res.json(reservation);
});

export default router;
