const LOCALE = 'en-AU';

const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));

export const nowIso = () => new Date().toISOString();

export function formatDate(value?: string | Date) {
  if (!value) return '—';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | Date) {
  if (!value) return '—';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** A yyyy-mm-dd string (from <input type="date">) shown as a calendar date, without timezone drift. */
export function formatDay(day?: string) {
  if (!day) return '—';
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  return formatDate(new Date(y, m - 1, d));
}

export function timeAgo(value: string) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(value);
}

/** Local yyyy-mm-dd for date inputs. */
export function toDayInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Start of the station's week (Sunday 00:00, local time). */
export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** K1,250.00 for Kina, otherwise "AUD 1,250.00". */
export function formatMoney(amount: number | undefined, currency = 'PGK') {
  const n = (amount ?? 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'PGK' ? `K${n}` : `${currency} ${n}`;
}
