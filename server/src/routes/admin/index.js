import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { csrfGuard } from '../../middleware/csrf.js';
import auth from './auth.js';
import stats from './stats.js';
import categories from './categories.js';
import items from './items.js';
import uploads from './uploads.js';
import orders from './orders.js';
import reservations from './reservations.js';
import catering from './catering.js';
import messages from './messages.js';
import offers from './offers.js';
import settings from './settings.js';
import revenue from './revenue.js';

/** Admin API mounted at /api/admin. */
export const adminRouter = Router();

adminRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
adminRouter.use(csrfGuard);
adminRouter.use('/auth', auth);

// Everything below requires a signed-in admin.
adminRouter.use(requireAdmin);
adminRouter.use('/stats', stats);
adminRouter.use('/categories', categories);
adminRouter.use('/items', items);
adminRouter.use('/uploads', uploads);
adminRouter.use('/orders', orders);
adminRouter.use('/reservations', reservations);
adminRouter.use('/catering', catering);
adminRouter.use('/messages', messages);
adminRouter.use('/offers', offers);
adminRouter.use('/settings', settings);
adminRouter.use('/revenue', revenue);
