import jwt from 'jsonwebtoken';
import { env, getJwtSecret } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { HttpError } from '../utils/httpError.js';

export const AUTH_COOKIE = 'fuji_admin';
const TOKEN_TTL_SECONDS = 8 * 60 * 60;
const JWT_OPTIONS = { algorithm: 'HS256', issuer: 'fuji-restaurant-api', audience: 'fuji-admin' };

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
  };
}

export function setAuthCookie(res, admin) {
  const token = jwt.sign({ sub: String(admin._id), role: admin.role }, getJwtSecret(), {
    ...JWT_OPTIONS,
    expiresIn: TOKEN_TTL_SECONDS,
  });
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: TOKEN_TTL_SECONDS * 1000 });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
}

const unauthenticated = () => new HttpError(401, 'UNAUTHENTICATED', 'Please sign in to continue');

/** Requires a valid admin session cookie; attaches the admin document to req.admin. */
export async function requireAdmin(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw unauthenticated();

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret(), {
      algorithms: [JWT_OPTIONS.algorithm],
      issuer: JWT_OPTIONS.issuer,
      audience: JWT_OPTIONS.audience,
    });
  } catch {
    throw unauthenticated();
  }

  const admin = typeof payload.sub === 'string' ? await Admin.findById(payload.sub) : null;
  if (!admin) throw unauthenticated();
  if (admin.passwordChangedAt && payload.iat * 1000 < admin.passwordChangedAt.getTime()) {
    throw unauthenticated();
  }

  req.admin = admin;
  next();
}
