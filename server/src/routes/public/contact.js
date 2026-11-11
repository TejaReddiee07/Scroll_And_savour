import { Router } from 'express';
import { z } from 'zod';
import { ContactMessage } from '../../models/ContactMessage.js';
import { honeypot } from '../../middleware/honeypot.js';
import { publicPostLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { email, optionalPhone, optionalText, personName, requiredText } from '../../validation/common.js';

const router = Router();

const contactSchema = z.object({
  name: personName,
  email,
  phone: optionalPhone,
  subject: optionalText(150),
  message: requiredText('Message', 5000, 2),
});

router.post(
  '/contact',
  publicPostLimiter,
  honeypot(() => ({ ok: true })),
  validate(contactSchema),
  async (req, res) => {
    await ContactMessage.create({ ...req.body, status: 'unread' });
    res.status(201).json({ ok: true });
  },
);

export default router;
