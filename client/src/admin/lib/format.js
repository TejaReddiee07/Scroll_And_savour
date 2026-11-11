/** Formatting helpers — everything is shown in en-GB, Europe/London. */

export const TIME_ZONE = 'Europe/London';
const LOCALE = 'en-GB';

const gbp = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'GBP' });

export function formatGBP(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? gbp.format(n) : '—';
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
const timeSecFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const isoDayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "10 Nov 2026, 14:05" */
export function formatDateTime(value) {
  const d = toDate(value);
  return d ? dateTimeFmt.format(d) : '—';
}

/** "14:05" */
export function formatTime(value, { seconds = false } = {}) {
  const d = toDate(value);
  if (!d) return '—';
  return seconds ? timeSecFmt.format(d) : timeFmt.format(d);
}

/** Today's date in London as YYYY-MM-DD. */
export function todayLondon() {
  return isoDayFmt.format(new Date());
}

/** Any timestamp → London calendar date YYYY-MM-DD. */
export function toLondonDay(value) {
  if (typeof value === 'string' && DATE_ONLY_RE.test(value)) return value;
  const d = toDate(value);
  return d ? isoDayFmt.format(d) : '';
}

/**
 * Calendar date (e.g. reservation date) → "Fri 20 Nov 2026".
 * Accepts "YYYY-MM-DD" or a full ISO timestamp.
 */
export function formatCalendarDate(value) {
  if (typeof value === 'string' && DATE_ONLY_RE.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Intl.DateTimeFormat(LOCALE, {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  }
  const date = toDate(value);
  return date ? dateFmt.format(date) : '—';
}

/** Short "Today" / "Tomorrow" / date label for a calendar date. */
export function friendlyDay(value) {
  const day = toLondonDay(value);
  if (!day) return '—';
  const today = todayLondon();
  if (day === today) return 'Today';
  const [y, m, d] = today.split('-').map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  if (day === tomorrow) return 'Tomorrow';
  return formatCalendarDate(day);
}

const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/** "5 minutes ago", "yesterday", … */
export function relativeTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  return formatCalendarDate(d.toISOString());
}

/** Order placed today → "14:05", otherwise "9 Nov, 14:05". */
export function formatPlaced(value) {
  const d = toDate(value);
  if (!d) return '—';
  if (toLondonDay(d) === todayLondon()) return timeFmt.format(d);
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function londonOffsetMinutes(date) {
  try {
    const part = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, timeZoneName: 'shortOffset' })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName')?.value;
    const match = part?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return 0;
    const sign = match[1] === '-' ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
  } catch {
    return 0;
  }
}

/** "YYYY-MM-DD" (London calendar day) → ISO timestamp at the start or end of that day. */
export function londonDayToISO(day, { endOfDay = false } = {}) {
  if (!day || !DATE_ONLY_RE.test(day)) return null;
  const [y, m, d] = day.split('-').map(Number);
  const guess = endOfDay ? Date.UTC(y, m - 1, d, 23, 59, 59, 999) : Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const offset = londonOffsetMinutes(new Date(guess));
  return new Date(guess - offset * 60_000).toISOString();
}

/* ── Calendar-day arithmetic on "YYYY-MM-DD" strings (no time zone involved) ── */

function dayToUTC(day) {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isCalendarDay(value) {
  return typeof value === 'string' && DATE_ONLY_RE.test(value) && !Number.isNaN(dayToUTC(value));
}

/** "2026-11-11" + -6 → "2026-11-05" */
export function shiftDay(day, delta) {
  return new Date(dayToUTC(day) + delta * 86_400_000).toISOString().slice(0, 10);
}

/** Inclusive number of days between two calendar days. */
export function dayCount(from, to) {
  return Math.round((dayToUTC(to) - dayToUTC(from)) / 86_400_000) + 1;
}

/** ISO weekday (Mon = 1 … Sun = 7) for a calendar day. */
export function isoWeekday(day) {
  return new Date(dayToUTC(day)).getUTCDay() || 7;
}

/** First / last calendar day of the month containing `day`, optionally shifted by whole months. */
export function monthBounds(day, monthDelta = 0) {
  const [y, m] = day.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + monthDelta, 1));
  const last = new Date(Date.UTC(y, m + monthDelta, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

const shortDayFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', day: 'numeric', month: 'short' });
const shortDayYearFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
const monthYearFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', month: 'long', year: 'numeric' });
const shortMonthFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', month: 'short' });

/** "2026-11-03" → "3 Nov" (or "3 Nov 2026" with `year`). */
export function formatShortDay(day, { year = false } = {}) {
  if (!isCalendarDay(day)) return '—';
  return (year ? shortDayYearFmt : shortDayFmt).format(new Date(dayToUTC(day) + 12 * 3_600_000));
}

/** "2026-11-03" → "November 2026" / "Nov". */
export function formatMonth(day, { short = false } = {}) {
  if (!isCalendarDay(day)) return '—';
  return (short ? shortMonthFmt : monthYearFmt).format(new Date(dayToUTC(day) + 12 * 3_600_000));
}

/** "3 Nov – 9 Nov 2026" (drops the repeated year). */
export function formatDayRange(from, to) {
  if (!isCalendarDay(from) || !isCalendarDay(to)) return '—';
  if (from === to) return formatCalendarDate(from);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${formatShortDay(from, { year: !sameYear })} – ${formatShortDay(to, { year: true })}`;
}

export function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function humanise(value) {
  if (!value) return '';
  const s = String(value).replace(/[-_]+/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Phone → tel: href */
export function telHref(phone) {
  if (!phone) return undefined;
  const cleaned = String(phone).replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : undefined;
}

export function mailtoHref(email, subject) {
  if (!email) return undefined;
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
}
