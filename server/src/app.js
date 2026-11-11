import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { requireDb } from './middleware/requireDb.js';
import { sanitize } from './middleware/sanitize.js';
import { healthRouter, publicRouter } from './routes/public/index.js';
import { adminRouter } from './routes/admin/index.js';
import { stripeWebhook } from './routes/public/payments.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('query parser', 'simple');

  app.use(helmet());
  app.use(
    cors({
      // Requests without an Origin header (curl, server-to-server, same-origin GET) are allowed;
      // browsers on any origin outside the allowlist get no CORS headers and are blocked.
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        callback(null, env.clientOrigins.includes(origin.replace(/\/+$/, '')));
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
      maxAge: 600,
    }),
  );
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use(cookieParser());
  // Stripe webhooks need the raw body for signature verification: mount before the JSON parser.
  app.post('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }), requireDb, stripeWebhook);
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitize);

  app.use('/api', healthRouter);
  // Dish photos uploaded from the admin when Cloudinary is not configured (see services/localUploads.js).
  app.use(
    '/api/uploads',
    express.static(env.uploadsDir, {
      index: false,
      dotfiles: 'deny',
      immutable: true,
      maxAge: '365d',
      // The site may be served from another origin than the API in production.
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    }),
  );
  app.use('/api/uploads', (_req, res) => res.status(404).end());
  app.use('/api', requireDb);
  app.use('/api', publicRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
