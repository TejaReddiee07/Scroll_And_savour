import { rateLimit } from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function limiter({ limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({ error: { message, code: 'RATE_LIMITED' } });
    },
  });
}

/** Public form submissions (orders, reservations, catering, contact): 20 / 15 min / IP. */
export const publicPostLimiter = limiter({
  limit: 20,
  message: 'Too many submissions from this device. Please wait a few minutes and try again.',
});

/** Admin login: 5 failed attempts / 15 min / IP (successful logins don't count). */
export const loginLimiter = limiter({
  limit: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Please wait 15 minutes and try again.',
});

/** Public order tracking lookups — generous enough for a polling tracker, blocks enumeration. */
export const trackingLimiter = limiter({
  limit: 300,
  message: 'Too many tracking requests. Please slow down.',
});
