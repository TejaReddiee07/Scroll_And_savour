import { ApiError } from './api.js';

/**
 * Map a 400 VALIDATION_ERROR's `details.fieldErrors` onto react-hook-form fields.
 * Returns messages that could not be attached to a field (to show in a toast).
 *
 * @param {unknown} err
 * @param {Function} setError react-hook-form setError
 * @param {string[]} fields names of fields that exist in the form
 * @param {Record<string,string>} [aliases] server field → form field
 */
export function applyServerErrors(err, setError, fields, aliases = {}) {
  if (!(err instanceof ApiError)) return [];
  const leftovers = [...err.formErrors];
  let firstField = null;
  for (const [serverName, messages] of Object.entries(err.fieldErrors)) {
    const message = Array.isArray(messages) ? messages[0] : String(messages);
    if (!message) continue;
    const name = aliases[serverName] ?? serverName;
    if (fields.includes(name)) {
      setError(name, { type: 'server', message });
      if (!firstField) firstField = name;
    } else {
      leftovers.push(`${serverName}: ${message}`);
    }
  }
  return leftovers;
}

/** "12.5" → 12.5 rounded to 2dp; blank → null. */
export function parseMoney(value) {
  const s = String(value ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export const MONEY_RE = /^\d{1,5}(\.\d{1,2})?$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function moneyToInput(value) {
  return value === null || value === undefined || value === '' ? '' : Number(value).toFixed(2);
}
