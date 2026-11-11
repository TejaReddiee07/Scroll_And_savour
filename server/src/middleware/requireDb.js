import { isDbConnected } from '../config/db.js';

export function requireDb(_req, res, next) {
  if (isDbConnected()) return next();
  res.status(503).json({
    error: { message: 'The database is temporarily unavailable. Please try again shortly.', code: 'DB_UNAVAILABLE' },
  });
}
