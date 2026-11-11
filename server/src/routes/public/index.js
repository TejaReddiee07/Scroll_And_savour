import { Router } from 'express';
import menu from './menu.js';
import settings from './settings.js';
import offers from './offers.js';
import orders from './orders.js';
import reservations from './reservations.js';
import catering from './catering.js';
import contact from './contact.js';
import payments from './payments.js';

export { default as healthRouter } from './health.js';

/** Public routes mounted at /api (health is mounted separately, before the DB guard). */
export const publicRouter = Router();
publicRouter.use(menu, settings, offers, orders, reservations, catering, contact, payments);
