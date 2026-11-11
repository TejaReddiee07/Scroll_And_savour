// Express 5–compatible replacement for express-mongo-sanitize (req.query is a read-only getter in
// Express 5, and the default "simple" query parser cannot produce nested objects anyway).
// Removes keys that start with "$" or contain "." (MongoDB operator / path injection) and
// prototype-pollution keys from req.body and req.params, recursively and in place.

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isUnsafeKey(key) {
  return key.startsWith('$') || key.includes('.') || FORBIDDEN_KEYS.has(key);
}

export function stripUnsafeKeys(value, depth = 0) {
  if (depth > 50 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    for (const entry of value) stripUnsafeKeys(entry, depth + 1);
    return value;
  }
  for (const key of Object.keys(value)) {
    if (isUnsafeKey(key)) delete value[key];
    else stripUnsafeKeys(value[key], depth + 1);
  }
  return value;
}

export function sanitize(req, _res, next) {
  if (req.body && typeof req.body === 'object') stripUnsafeKeys(req.body);
  if (req.params && typeof req.params === 'object') stripUnsafeKeys(req.params);
  next();
}
