const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
export const formatGBP = (n) => gbp.format(Number(n) || 0);

/** Sum money safely in pence. */
export const sumPence = (lines) =>
  lines.reduce((acc, l) => acc + Math.round(Number(l.price) * 100) * l.qty, 0) / 100;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const dayName = (d) => DAY_NAMES[d];

/** Current weekday (0=Sun) and minutes since midnight in Europe/London. */
export function londonNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return {
    day: wd,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    isoDate: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

/** Returns { open: boolean, label: string } for the published hours. */
export function openStatus(hours, date = new Date()) {
  if (!hours?.length) return { open: false, label: 'Hours to be confirmed' };
  const now = londonNow(date);
  const today = hours.find((h) => h.day === now.day);
  if (today && !today.closed) {
    const o = toMinutes(today.open);
    const c = toMinutes(today.close);
    if (now.minutes >= o && now.minutes < c) return { open: true, label: `Open now · until ${today.close}` };
    if (now.minutes < o) return { open: false, label: `Closed · opens ${today.open} today` };
  }
  for (let i = 1; i <= 7; i += 1) {
    const d = (now.day + i) % 7;
    const h = hours.find((x) => x.day === d);
    if (h && !h.closed) return { open: false, label: `Closed · opens ${i === 1 ? 'tomorrow' : dayName(d)} ${h.open}` };
  }
  return { open: false, label: 'Closed' };
}

/** Group consecutive days with identical hours: "Mon–Sun 12:00–22:00". */
export function summariseHours(hours) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows = order.map((d) => hours.find((h) => h.day === d)).filter(Boolean);
  const groups = [];
  rows.forEach((h) => {
    const key = h.closed ? 'closed' : `${h.open}–${h.close}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.days.push(h.day);
    else groups.push({ key, days: [h.day] });
  });
  const short = (d) => dayName(d).slice(0, 3);
  return groups.map((g) => ({
    days: g.days.length === 1 ? dayName(g.days[0]) : `${short(g.days[0])} – ${short(g.days[g.days.length - 1])}`,
    time: g.key === 'closed' ? 'Closed' : g.key,
  }));
}

export const formatDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const cx = (...a) => a.filter(Boolean).join(' ');

/** Reference generator for local demo records (no ambiguous characters). */
export function demoReference(prefix) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `${prefix}-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}

export const safeStorage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — ignore */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
