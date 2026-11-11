import { Router } from 'express';
import { z } from 'zod';
import { ContactMessage, MESSAGE_STATUSES } from '../../models/ContactMessage.js';
import { objectIdParam, validate } from '../../middleware/validate.js';
import { notFound } from '../../utils/httpError.js';
import { paginate, paginationQuery } from '../../utils/pagination.js';

const router = Router();
router.param('id', objectIdParam);

const listQuery = z.object({ status: z.enum(MESSAGE_STATUSES).optional(), ...paginationQuery });
const patchSchema = z.object({ status: z.enum(MESSAGE_STATUSES) });

router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { status, page, limit } = req.validQuery;
  const filter = status ? { status } : {};
  res.json(await paginate(ContactMessage, filter, { page, limit, sort: { createdAt: -1 } }));
});

router.patch('/:id', validate(patchSchema), async (req, res) => {
  const message = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { $set: { status: req.body.status } },
    { new: true, runValidators: true, lean: true },
  );
  if (!message) throw notFound('Message');
  res.json(message);
});

router.delete('/:id', async (req, res) => {
  const deleted = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFound('Message');
  res.status(204).end();
});

export default router;
