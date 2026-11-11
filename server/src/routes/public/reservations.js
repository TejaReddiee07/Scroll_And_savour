import { Router } from 'express';
import { z } from 'zod';
import { Reservation } from '../../models/Reservation.js';
import { Setting } from '../../models/Setting.js';
import { honeypot } from '../../middleware/honeypot.js';
import { publicPostLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { fieldError } from '../../utils/httpError.js';
import { generateReference, withUniqueReference } from '../../utils/reference.js';
import { addDays, isWithinHours, londonDateString, londonTimeString, weekdayOf } from '../../utils/time.js';
import { dateString, optionalEmail, optionalText, personName, phone, timeString } from '../../validation/common.js';

const router = Router();
const MAX_DAYS_AHEAD = 365;

const reservationSchema = z.object({
  name: personName,
  phone,
  email: optionalEmail,
  guests: z.coerce
    .number({ invalid_type_error: 'Guests must be a number' })
    .int('Guests must be a whole number')
    .min(1, 'At least 1 guest')
    .max(20, 'For more than 20 guests please call the restaurant'),
  date: dateString,
  time: timeString,
  requests: optionalText(1000),
});

const fakeReservation = (req) => ({
  reference: generateReference('RS'),
  status: 'pending',
  isDemo: true,
  name: String(req.body?.name ?? '').slice(0, 100),
  guests: Number.parseInt(req.body?.guests, 10) || 2,
  date: String(req.body?.date ?? '').slice(0, 10),
  time: String(req.body?.time ?? '').slice(0, 5),
});

router.post(
  '/reservations',
  publicPostLimiter,
  honeypot(fakeReservation),
  validate(reservationSchema),
  async (req, res) => {
    const { date, time } = req.body;
    const today = londonDateString();

    if (date < today) throw fieldError('date', 'Please choose today or a later date');
    if (date > addDays(today, MAX_DAYS_AHEAD)) throw fieldError('date', 'Bookings can be made up to 12 months ahead');

    const settings = await Setting.getSite();
    const entry = (settings.hours ?? []).find((h) => h.day === weekdayOf(date));
    if (!entry || entry.closed) throw fieldError('date', 'The restaurant is closed on that day');
    if (!isWithinHours(entry, time)) {
      throw fieldError('time', `Please choose a time from ${entry.open} and before ${entry.close}`);
    }
    if (date === today && time <= londonTimeString()) {
      throw fieldError('time', 'That time has already passed — please choose a later time');
    }

    const reservation = await withUniqueReference('RS', (reference) =>
      Reservation.create({ ...req.body, reference, status: 'pending', isDemo: settings.bookingMode !== 'live' }),
    );

    res.status(201).json({
      reference: reservation.reference,
      status: reservation.status,
      isDemo: reservation.isDemo,
      name: reservation.name,
      guests: reservation.guests,
      date: reservation.date,
      time: reservation.time,
    });
  },
);

export default router;
