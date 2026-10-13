import { MARRIAGE, MARRIAGE_PROBLEMS, SALVATION } from './constants';
import { PNG } from './countries';
import { startOfMonth, startOfWeek } from './format';
import type { ListenerRecord, Role, ShowPrep, UserProfile } from './types';

export type Counts = Record<string, number>;

const tally = (counts: Counts, key: string | undefined) => {
  const k = key || 'Unknown';
  counts[k] = (counts[k] ?? 0) + 1;
};

/** Sorted [label, count] pairs, largest first. */
export const ranked = (counts: Counts) => Object.entries(counts).sort((a, b) => b[1] - a[1]);

export interface RecordStats {
  total: number;
  png: number;
  overseas: number;
  byCategory: Counts;
  byMethod: Counts;
  byGender: Counts;
  byProvince: Counts;
  byCountry: Counts;
  byPrayer: Counts;
  byMarriageProblem: Counts;
  salvationTotal: number;
  soulsSaved: number;
  salvationPending: number;
  flagged: number;
}

export function recordStats(records: ListenerRecord[]): RecordStats {
  const s: RecordStats = {
    total: records.length,
    png: 0,
    overseas: 0,
    byCategory: {},
    byMethod: {},
    byGender: {},
    byProvince: {},
    byCountry: {},
    byPrayer: {},
    byMarriageProblem: {},
    salvationTotal: 0,
    soulsSaved: 0,
    salvationPending: 0,
    flagged: 0,
  };
  for (const r of records) {
    tally(s.byCategory, r.messageCategory);
    tally(s.byMethod, r.communicationMethod);
    tally(s.byGender, r.gender);
    if (r.country === PNG) {
      s.png++;
      tally(s.byProvince, r.province);
    } else {
      s.overseas++;
      tally(s.byCountry, r.country);
    }
    if (r.messageCategory === 'Prayer Request') {
      tally(s.byPrayer, r.prayerCategory);
      if (r.prayerCategory === SALVATION) {
        s.salvationTotal++;
        if (r.salvationStatus === 'soul_saved') s.soulsSaved++;
        else s.salvationPending++;
      }
      if (r.prayerCategory === MARRIAGE && r.marriageProblems) {
        for (const p of MARRIAGE_PROBLEMS) if (r.marriageProblems[p.key]) tally(s.byMarriageProblem, p.label);
      }
    }
    if (r.flaggedForPrayer) s.flagged++;
  }
  return s;
}

// ---------- time periods ----------

export type Period = 'week' | 'month' | '30d' | 'year' | 'all';

export const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

export function periodStart(period: Period, now = new Date()): Date | null {
  switch (period) {
    case 'week':
      return startOfWeek(now);
    case 'month':
      return startOfMonth(now);
    case '30d':
      return new Date(now.getTime() - 30 * 86_400_000);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

export function inPeriod<T extends { createdAt: string }>(items: T[], period: Period) {
  const start = periodStart(period);
  if (!start) return items;
  return items.filter((i) => new Date(i.createdAt) >= start);
}

// ---------- show prep ----------

export interface PrepStats {
  thisWeek: number;
  thisMonth: number;
  total: number;
  streak: number;
  submittedThisWeek: boolean;
  lastSubmission?: string;
  recent: ShowPrep[];
}

export function prepStats(preps: ShowPrep[], now = new Date()): PrepStats {
  const sorted = [...preps].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const week = startOfWeek(now);
  const month = startOfMonth(now);
  const thisWeek = sorted.filter((p) => new Date(p.createdAt) >= week).length;
  const thisMonth = sorted.filter((p) => new Date(p.createdAt) >= month).length;

  // A streak counts consecutive weeks with a submission. The current week only
  // breaks the streak once it is over, so the count starts from last week if
  // this week is still open.
  const weeks = new Set(sorted.map((p) => startOfWeek(new Date(p.createdAt)).getTime()));
  const cursor = new Date(week);
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }

  return {
    thisWeek,
    thisMonth,
    total: sorted.length,
    streak,
    submittedThisWeek: thisWeek > 0,
    lastSubmission: sorted[0]?.createdAt,
    recent: sorted,
  };
}

export const ACHIEVEMENTS = [
  { weeks: 1, label: 'Starter', medal: '🏅' },
  { weeks: 4, label: 'Bronze', medal: '🥉' },
  { weeks: 8, label: 'Silver', medal: '🥈' },
  { weeks: 12, label: 'Gold', medal: '🥇' },
];

// ---------- team progress ----------

export interface TeamMemberProgress {
  user: UserProfile;
  entries: number;
  prayerRequests: number;
  songRequests: number;
  toksave: number;
  salvationRequests: number;
  soulsSaved: number;
  flagged: number;
  referralsSent: number;
  referralsReceived: number;
  referralsCompleted: number;
}

export function teamProgress(users: UserProfile[], records: ListenerRecord[]): TeamMemberProgress[] {
  return users
    .map((user) => {
      const own = records.filter((r) => r.createdBy === user.id);
      const received = records.filter((r) => r.referredTo === user.id);
      return {
        user,
        entries: own.length,
        prayerRequests: own.filter((r) => r.messageCategory === 'Prayer Request').length,
        songRequests: own.filter((r) => r.messageCategory === 'Song Request').length,
        toksave: own.filter((r) => r.messageCategory === 'Toksave').length,
        salvationRequests: own.filter((r) => r.prayerCategory === SALVATION).length,
        soulsSaved: own.filter((r) => r.prayerCategory === SALVATION && r.salvationStatus === 'soul_saved').length,
        flagged: records.filter((r) => r.flaggedBy === user.id).length,
        referralsSent: records.filter((r) => r.referredBy === user.id).length,
        referralsReceived: received.length,
        referralsCompleted: received.filter((r) => r.referralStatus === 'completed').length,
      };
    })
    .sort((a, b) => b.entries - a.entries);
}

export const isOnAir = (role: Role) => role === 'Announcer' || role === 'Program Director';
