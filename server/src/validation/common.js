import { z } from 'zod';
import { hasAtMostTwoDecimals, roundGbp } from '../utils/money.js';
import { isValidDateString, TIME_RE } from '../utils/time.js';

const EMAIL = z.string().email();
const PHONE_CHARS = /^\+?[\d\s().-]+$/;
// Outward code + inward code, optional space (e.g. "N16 0NX", "SW1A1AA").
const UK_POSTCODE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/;

/** Optional free text: accepts undefined/null and normalises to a trimmed string. */
export const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .nullish()
    .transform((v) => v ?? '');

export const requiredText = (label, max, min = 1) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .min(min, min > 1 ? `${label} must be at least ${min} characters` : `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

export const personName = requiredText('Name', 100, 2);

export const email = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(254)
  .refine((v) => EMAIL.safeParse(v).success, 'Please enter a valid email address');

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .nullish()
  .transform((v) => v ?? '')
  .refine((v) => v === '' || EMAIL.safeParse(v).success, 'Please enter a valid email address');

const isPhone = (v) => {
  if (!PHONE_CHARS.test(v)) return false;
  const digits = v.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
};

export const phone = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .max(30)
  .refine(isPhone, 'Please enter a valid phone number');

export const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .nullish()
  .transform((v) => v ?? '')
  .refine((v) => v === '' || isPhone(v), 'Please enter a valid phone number');

export const ukPostcode = z
  .string({ required_error: 'Postcode is required' })
  .trim()
  .toUpperCase()
  .refine((v) => UK_POSTCODE.test(v), 'Please enter a valid UK postcode')
  .transform((v) => v.replace(UK_POSTCODE, '$1 $2'));

export const dateString = z
  .string({ required_error: 'Date is required' })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine(isValidDateString, 'Please enter a real calendar date');

export const timeString = z
  .string({ required_error: 'Time is required' })
  .trim()
  .regex(TIME_RE, 'Use the 24-hour format HH:mm');

/** GBP amount with at most 2 decimals, normalised to avoid float noise. */
export const money = z
  .number({ invalid_type_error: 'Must be a number', required_error: 'Required' })
  .finite()
  .min(0, 'Must not be negative')
  .max(10000, 'Must be at most 10000')
  .refine(hasAtMostTwoDecimals, 'Use at most 2 decimal places')
  .transform(roundGbp);

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/** Accepts an ISO date/datetime string, a Date, or null. */
export const nullableDate = z
  .union([z.null(), z.literal(''), z.coerce.date()])
  .transform((v) => (v === '' || v === null ? null : v))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), 'Invalid date');

export const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

/** Optional search string from the query string. */
export const searchQuery = z.string().trim().max(100).optional();
