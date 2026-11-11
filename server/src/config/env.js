import 'dotenv/config';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = fileURLToPath(new URL('../../', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

function str(name, fallback = '') {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
}

function bool(name, fallback) {
  const value = str(name);
  if (value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function int(name, fallback) {
  const value = Number.parseInt(str(name), 10);
  return Number.isFinite(value) ? value : fallback;
}

const nodeEnv = str('NODE_ENV', 'development');
const isProd = nodeEnv === 'production';

const sameSiteRaw = str('COOKIE_SAMESITE', 'lax').toLowerCase();
const cookieSameSite = ['lax', 'none', 'strict'].includes(sameSiteRaw) ? sameSiteRaw : 'lax';
let cookieSecure = bool('COOKIE_SECURE', isProd);
if (cookieSameSite === 'none' && !cookieSecure) {
  // Browsers reject SameSite=None cookies that are not Secure.
  console.warn('[env] COOKIE_SAMESITE=none requires Secure cookies — forcing COOKIE_SECURE=true.');
  cookieSecure = true;
}

const clientOrigins = str('CLIENT_ORIGIN', isProd ? '' : 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const cloudinary = {
  cloudName: str('CLOUDINARY_CLOUD_NAME'),
  apiKey: str('CLOUDINARY_API_KEY'),
  apiSecret: str('CLOUDINARY_API_SECRET'),
  folder: str('CLOUDINARY_FOLDER', 'fuji-restaurant'),
};

const stripeSecret = str('STRIPE_SECRET_KEY');
const stripe = {
  secretKey: stripeSecret,
  publishableKey: str('STRIPE_PUBLISHABLE_KEY'),
  webhookSecret: str('STRIPE_WEBHOOK_SECRET'),
  mode: stripeSecret.startsWith('sk_live_') || stripeSecret.startsWith('rk_live_') ? 'live' : stripeSecret ? 'test' : null,
  methods: str('STRIPE_METHODS', 'card,apple_pay,google_pay,revolut_pay,klarna')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
};

export const env = {
  nodeEnv,
  isProd,
  isTest: nodeEnv === 'test',
  version: pkg.version,
  port: int('PORT', 5000),
  mongoUri: str('MONGODB_URI', isProd ? '' : 'mongodb://127.0.0.1:27017/fuji_restaurant'),
  clientOrigins,
  cookieSameSite,
  cookieSecure,
  admin: {
    email: str('ADMIN_EMAIL').toLowerCase(),
    password: process.env.ADMIN_PASSWORD ?? '',
    name: str('ADMIN_NAME'),
  },
  cloudinary,
  // Photos go to Cloudinary when it is configured, otherwise to the server's own disk (UPLOADS_DIR).
  cloudinaryEnabled: Boolean(cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret),
  uploadsDir: path.resolve(serverRoot, str('UPLOADS_DIR', 'uploads')),
  // Automatic background removal for uploaded dish photos (services/cutout.js).
  cutouts: { enabled: bool('PHOTO_CUTOUTS', true), model: str('CUTOUT_MODEL') },
  serverRoot,
  stripe,
  paymentsEnabled: Boolean(stripe.secretKey && stripe.publishableKey),
  paymentsInPerson: bool('PAYMENTS_IN_PERSON', true),
};

let jwtSecret = null;

/**
 * Resolved lazily so scripts that never sign tokens (e.g. the seed) don't print warnings.
 * Production refuses to run without JWT_SECRET (see assertRuntimeConfig).
 */
export function getJwtSecret() {
  if (jwtSecret) return jwtSecret;
  const fromEnv = str('JWT_SECRET');
  if (fromEnv) {
    jwtSecret = fromEnv;
  } else if (isProd) {
    throw new Error('JWT_SECRET is required in production.');
  } else {
    jwtSecret = crypto.randomBytes(48).toString('hex');
    console.warn(
      '[env] JWT_SECRET is not set — using a random per-process secret. Admin sessions will not survive a restart.',
    );
  }
  return jwtSecret;
}

/** Validates configuration needed by the HTTP server. Exits the process on fatal problems. */
export function assertRuntimeConfig() {
  if (isProd && !str('JWT_SECRET')) {
    console.error('[env] FATAL: JWT_SECRET must be set when NODE_ENV=production. Refusing to start.');
    process.exit(1);
  }
  if (isProd && str('JWT_SECRET').length < 32) {
    console.warn('[env] JWT_SECRET is shorter than 32 characters — use a long random value in production.');
  }
  if (isProd && clientOrigins.length === 0) {
    console.warn('[env] CLIENT_ORIGIN is empty — no browser origin will be allowed by CORS.');
  }
  if (stripe.secretKey && !stripe.publishableKey) console.warn('[env] STRIPE_SECRET_KEY is set but STRIPE_PUBLISHABLE_KEY is missing — online payments are disabled.');
  if (stripe.secretKey && stripe.publishableKey && stripe.publishableKey.startsWith('pk_live_') !== (stripe.mode === 'live')) {
    console.warn('[env] Stripe publishable and secret keys are from different modes (test vs live) — payments will fail.');
  }
  if (stripe.secretKey && !stripe.webhookSecret) console.warn('[env] STRIPE_WEBHOOK_SECRET is not set — payments are confirmed by server-side sync only (webhooks disabled).');
  getJwtSecret();
}
