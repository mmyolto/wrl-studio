import { toDayInput } from './format';
import type { Gift, ListenerRecord } from './types';

const escape = (value: unknown) => {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const COLUMNS: { label: string; get: (r: ListenerRecord) => unknown }[] = [
  { label: 'Date', get: (r) => r.createdAt },
  { label: 'Full name', get: (r) => r.fullName },
  { label: 'Gender', get: (r) => r.gender },
  { label: 'Contact method', get: (r) => r.communicationMethod },
  { label: 'Phone', get: (r) => (r.phoneNumber ? `${r.countryCode ?? ''} ${r.phoneNumber}`.trim() : '') },
  { label: 'Facebook', get: (r) => r.facebookName },
  { label: 'Email', get: (r) => r.emailAddress },
  { label: 'Country', get: (r) => r.country },
  { label: 'Province', get: (r) => r.province },
  { label: 'Location', get: (r) => r.location },
  { label: 'Category', get: (r) => r.messageCategory },
  { label: 'Prayer category', get: (r) => r.prayerCategory },
  { label: 'Song', get: (r) => r.songTitle },
  { label: 'Artist', get: (r) => r.artist },
  { label: 'Message', get: (r) => r.message },
  {
    label: 'Salvation status',
    get: (r) => (r.salvationStatus === 'soul_saved' ? 'Soul saved' : r.salvationStatus ? 'Pending' : ''),
  },
  { label: 'Flagged for prayer', get: (r) => (r.flaggedForPrayer ? 'Yes' : '') },
  { label: 'Referred to', get: (r) => r.referredToName },
  { label: 'Referral status', get: (r) => r.referralStatus },
  { label: 'Recorded by', get: (r) => r.createdByName },
];

function saveCsv(rows: unknown[][], name: string) {
  const csv = '\uFEFF' + rows.map((row) => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${toDayInput(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadRecordsCsv(records: ListenerRecord[], name = 'listener-records') {
  saveCsv([COLUMNS.map((c) => c.label), ...records.map((r) => COLUMNS.map((c) => c.get(r)))], name);
}

const GIFT_COLUMNS: { label: string; get: (g: Gift) => unknown }[] = [
  { label: 'Reference', get: (g) => g.refNo },
  { label: 'Type', get: (g) => g.type },
  { label: 'Date', get: (g) => g.giftDate },
  { label: 'Name', get: (g) => g.donorName },
  { label: 'Category', get: (g) => g.category },
  { label: 'Location', get: (g) => g.location },
  { label: 'Province', get: (g) => g.province },
  { label: 'City / location', get: (g) => g.city || g.overseasLocation },
  { label: 'Country', get: (g) => g.country },
  { label: 'Mobile', get: (g) => g.mobile },
  { label: 'Email', get: (g) => g.email },
  { label: 'Church', get: (g) => g.church },
  { label: 'Congregation', get: (g) => g.congregation },
  { label: 'Currency', get: (g) => g.currency },
  { label: 'Pledged', get: (g) => g.pledgeAmount ?? '' },
  { label: 'Received', get: (g) => g.payments.reduce((n, p) => n + p.amount, 0) },
  { label: 'Schedule', get: (g) => [g.schedule, g.scheduleDetails].filter(Boolean).join(' - ') },
  { label: 'In-kind items', get: (g) => g.itemDescription },
  { label: 'Quantity', get: (g) => g.quantity },
  { label: 'Estimated value', get: (g) => g.estimatedValue ?? '' },
  { label: 'Notes', get: (g) => g.notes },
  { label: 'Recorded by', get: (g) => g.createdByName },
];

export function downloadGiftsCsv(gifts: Gift[]) {
  const rows = [GIFT_COLUMNS.map((c) => c.label), ...gifts.map((g) => GIFT_COLUMNS.map((c) => c.get(g)))];
  saveCsv(rows, 'shareathon-giving');
}
