import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { Admin, BCRYPT_COST, MIN_PASSWORD_LENGTH } from '../../models/Admin.js';
import { clearAuthCookie, requireAdmin, setAuthCookie } from '../../middleware/auth.js';
import { loginLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { HttpError, fieldError } from '../../utils/httpError.js';

const router = Router();

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().min(1, 'Email is required').max(254),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(200),
});

const passwordSchema = z.object({
  currentPassword: z.string({ required_error: 'Current password is required' }).min(1, 'Current password is required').max(200),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(MIN_PASSWORD_LENGTH, `New password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(200, 'New password must be at most 200 characters'),
});

// Compared against when the email is unknown, so response timing doesn't reveal which emails exist.
let dummyHash;
const getDummyHash = () => (dummyHash ??= bcrypt.hash(crypto.randomUUID(), BCRYPT_COST));

router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select('+passwordHash');

  let ok = false;
  if (admin) ok = await admin.checkPassword(password);
  else await bcrypt.compare(password, await getDummyHash());

  if (!admin || !ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  admin.lastLoginAt = new Date();
  await Admin.updateOne({ _id: admin._id }, { $set: { lastLoginAt: admin.lastLoginAt } });
  setAuthCookie(res, admin);
  res.json({ admin: admin.toPublic() });
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: req.admin.toPublic() });
});

router.put('/password', requireAdmin, validate(passwordSchema), async (req, res) => {
  const admin = await Admin.findById(req.admin._id).select('+passwordHash');
  if (!(await admin.checkPassword(req.body.currentPassword))) {
    throw fieldError('currentPassword', 'Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
  }
  await admin.setPassword(req.body.newPassword);
  await admin.save();
  // Older sessions are now invalid (passwordChangedAt); re-issue this session's cookie.
  setAuthCookie(res, admin);
  res.status(204).end();
});

export default router;
