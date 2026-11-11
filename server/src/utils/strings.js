/** Escapes user input before it is used inside a RegExp. */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive "contains" RegExp built from untrusted input. */
export function containsRegex(value) {
  return new RegExp(escapeRegex(String(value).trim()), 'i');
}

/**
 * For phone-like searches ("07700900123") build a pattern that tolerates spaces/dashes between digits,
 * so it matches stored values such as "07700 900123". Returns null if the input isn't phone-like.
 */
export function phoneRegex(value) {
  const digits = String(value).replace(/[\s()+-]/g, '');
  if (!/^\d{3,}$/.test(digits)) return null;
  return new RegExp(digits.split('').join('[\\s()+-]*'));
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(value, fallback = 'item') {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return slug || fallback;
}

/** Returns `base`, or `base-2`, `base-3`… — the first value for which `exists` resolves false. */
export async function uniqueSlug(base, exists) {
  let candidate = base;
  for (let n = 2; await exists(candidate); n += 1) candidate = `${base}-${n}`;
  return candidate;
}

export const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] ?? '';
