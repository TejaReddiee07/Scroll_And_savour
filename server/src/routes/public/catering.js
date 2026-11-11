import { Router } from 'express';
import { z } from 'zod';
import { CateringEnquiry, EVENT_TYPES, PLATTERS } from '../../models/CateringEnquiry.js';
import { honeypot } from '../../middleware/honeypot.js';
import { publicPostLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { fieldError } from '../../utils/httpError.js';
import { generateReference, withUniqueReference } from '../../utils/reference.js';
import { londonDateString } from '../../utils/time.js';
import { dateString, email, optionalPhone, optionalText, personName } from '../../validation/common.js';

const router = Router();

const emptyToNull = (v) => (v === '' || v === undefined ? null : v);

const cateringSchema = z.object({
  name: personName,
  email,
  phone: optionalPhone,
  eventType: z.enum(EVENT_TYPES, { errorMap: () => ({ message: 'Choose an event type' }) }),
  date: z.preprocess(emptyToNull, dateString.nullable()),
  guests: z.preprocess(
    emptyToNull,
    z.coerce.number({ invalid_type_error: 'Guests must be a number' }).int().min(1).max(5000).nullable(),
  ),
  budget: optionalText(100),
  platters: z
    .array(z.enum(PLATTERS))
    .max(PLATTERS.length)
    .nullish()
    .transform((v) => [...new Set(v ?? [])]),
  message: optionalText(3000),
});

router.post(
  '/catering',
  publicPostLimiter,
  honeypot(() => ({ ok: true, reference: generateReference('CT') })),
  validate(cateringSchema),
  async (req, res) => {
    if (req.body.date && req.body.date < londonDateString()) {
      throw fieldError('date', 'Please choose today or a later date');
    }
    const enquiry = await withUniqueReference('CT', (reference) =>
      CateringEnquiry.create({ ...req.body, reference, status: 'new' }),
    );
    res.status(201).json({ ok: true, reference: enquiry.reference });
  },
);

export default router;
