import crypto from 'node:crypto';

// 32 symbols: A–Z without I and O, digits 2–9 (no 0/O/1/I confusion). 256 % 32 === 0, so no modulo bias.
export const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 6;

export function generateReference(prefix) {
  const bytes = crypto.randomBytes(LENGTH);
  let out = '';
  for (const byte of bytes) out += REFERENCE_ALPHABET[byte & 31];
  return `${prefix}-${out}`;
}

export function referencePattern(prefix) {
  return new RegExp(`^${prefix}-[${REFERENCE_ALPHABET}]{${LENGTH}}$`);
}

/**
 * Runs `create(reference)` with a fresh reference, retrying if the unique index on `reference`
 * reports a collision (vanishingly rare with ~10^9 combinations).
 */
export async function withUniqueReference(prefix, create, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await create(generateReference(prefix));
    } catch (err) {
      if (err?.code === 11000 && err?.keyPattern?.reference) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
