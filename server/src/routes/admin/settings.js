import { Router } from 'express';
import { z } from 'zod';
import { MODES, Setting, serializeSettings } from '../../models/Setting.js';
import { validate } from '../../middleware/validate.js';
import { email, money, optionalText, requiredText, timeString } from '../../validation/common.js';

const router = Router();

const hoursEntry = z.object({
  day: z.number().int().min(0).max(6),
  open: timeString,
  close: timeString,
  closed: z.boolean().default(false),
});

const settingsSchema = z.object({
  contact: z.object({
    phone: requiredText('Phone', 30),
    phoneIntl: z
      .string()
      .trim()
      .regex(/^\+\d{7,15}$/, 'Use international format without spaces, e.g. +442072546093'),
    email,
    addressLines: z.array(z.string().trim().min(1).max(150)).min(1, 'Add at least one address line').max(6),
  }),
  hours: z
    .array(hoursEntry)
    .length(7, 'Provide opening hours for all 7 days (0 = Sunday … 6 = Saturday)')
    .superRefine((hours, ctx) => {
      const days = new Set(hours.map((h) => h.day));
      if (days.size !== 7) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Each day 0–6 must appear exactly once' });
      hours.forEach((h, i) => {
        if (!h.closed && h.open === h.close) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, 'close'], message: 'Closing time must differ from opening time' });
        }
      });
    }),
  hoursNote: optionalText(500),
  deliveryFee: money.nullable().default(null),
  minimumOrder: money.nullable().default(null),
  orderingMode: z.enum(MODES),
  bookingMode: z.enum(MODES),
  announcement: optionalText(500),
});

router.get('/', async (_req, res) => {
  res.json(serializeSettings(await Setting.getSite()));
});

router.put('/', validate(settingsSchema), async (req, res) => {
  const body = { ...req.body, hours: [...req.body.hours].sort((a, b) => a.day - b.day) };
  const updated = await Setting.updateSite(body);
  res.json(serializeSettings(updated));
});

export default router;
