import { HttpError } from '../utils/httpError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/auth/login']);

/**
 * Mutating admin requests must carry `X-Requested-With: XMLHttpRequest`. A cross-site HTML form
 * can't set custom headers, and a cross-origin fetch that sets one triggers a CORS preflight that
 * the origin allowlist rejects. Mounted on the /api/admin router, so req.path is router-relative.
 */
export function csrfGuard(req, _res, next) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path.replace(/\/+$/, ''))) return next();
  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    throw new HttpError(403, 'CSRF_HEADER_MISSING', 'Missing X-Requested-With: XMLHttpRequest header');
  }
  next();
}
