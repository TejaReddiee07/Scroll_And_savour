// Europe/London calendar helpers (DST-aware, no external dependencies).

export const TIME_ZONE = 'Europe/London';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const pad = (n) => String(n).padStart(2, '0');

/** Wall-clock parts of `date` in London. */
export function londonParts(date = new Date()) {
  const parts = {};
  for (const p of formatter.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return parts; // { year, month, day, hour, minute, second }
}

/** 'YYYY-MM-DD' of the current (or given) instant in London. */
export function londonDateString(date = new Date()) {
  const p = londonParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** 'HH:mm' of the current (or given) instant in London. */
export function londonTimeString(date = new Date()) {
  const p = londonParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function parseDateString(value) {
  const m = DATE_RE.exec(value ?? '');
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return { year, month, day };
}

export const isValidDateString = (value) => parseDateString(value) !== null;

/** Adds whole days to a 'YYYY-MM-DD' calendar date. */
export function addDays(dateStr, days) {
  const { year, month, day } = parseDateString(dateStr);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday for a calendar date (timezone independent). */
export function weekdayOf(dateStr) {
  const { year, month, day } = parseDateString(dateStr);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function londonOffsetMs(instant) {
  const p = londonParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Converts a London wall-clock time to a UTC Date (handles BST/GMT). */
export function londonWallTimeToDate(year, month, day, hour = 0, minute = 0) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = londonOffsetMs(new Date(guess));
  let result = guess - offset;
  const offsetAtResult = londonOffsetMs(new Date(result));
  if (offsetAtResult !== offset) result = guess - offsetAtResult;
  return new Date(result);
}

/** [start, end) instants of a London calendar day. */
export function londonDayRange(dateStr = londonDateString()) {
  const a = parseDateString(dateStr);
  const b = parseDateString(addDays(dateStr, 1));
  return {
    start: londonWallTimeToDate(a.year, a.month, a.day),
    end: londonWallTimeToDate(b.year, b.month, b.day),
  };
}

export function timeToMinutes(time) {
  const m = TIME_RE.exec(time ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Checks a booking time against a day's opening hours entry.
 * A close of "00:00" means midnight; a close earlier than open means the service runs past midnight.
 * The time must be at/after opening and strictly before closing.
 */
export function isWithinHours(entry, time) {
  if (!entry || entry.closed) return false;
  const t = timeToMinutes(time);
  const open = timeToMinutes(entry.open);
  let close = timeToMinutes(entry.close);
  if (t === null || open === null || close === null) return false;
  if (close === 0) close = 24 * 60;
  if (close > open) return t >= open && t < close;
  return t >= open || t < close;
}
