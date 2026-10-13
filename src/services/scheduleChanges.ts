import { writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDay, nowIso, toDayInput } from '../lib/format';
import type { ScheduleChange, ScheduleChangeFields, UserProfile } from '../lib/types';
import { COL, commit, docRef, newDocRef } from './collections';
import { queueNotifications } from './notifications';

/** "Mon 16 Sep" or "Mon 16 Sep – Wed 18 Sep", plus the hours when it isn't all day. */
export function describeWhen(c: ScheduleChangeFields) {
  const days = c.endDate && c.endDate !== c.startDate ? `${formatDay(c.startDate)} – ${formatDay(c.endDate)}` : formatDay(c.startDate);
  if (c.allDay) return `${days} · all day`;
  const hours = [c.fromTime, c.toTime].filter(Boolean).join(' – ');
  return hours ? `${days} · ${hours}` : days;
}

const today = () => toDayInput(new Date());

/** Happening today. */
export const isToday = (c: ScheduleChangeFields, day = today()) => c.startDate <= day && (c.endDate || c.startDate) >= day;

/** Today or still to come. */
export const isCurrentOrUpcoming = (c: ScheduleChangeFields, day = today()) => (c.endDate || c.startDate) >= day;

/** Starts within the next `days` days (or is on now). */
export function isSoon(c: ScheduleChangeFields, days = 7) {
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  return isCurrentOrUpcoming(c) && c.startDate <= toDayInput(limit);
}

const clean = (f: ScheduleChangeFields): ScheduleChangeFields => ({
  reason: f.reason,
  title: f.title.trim(),
  startDate: f.startDate,
  endDate: f.endDate && f.endDate >= f.startDate ? f.endDate : f.startDate,
  allDay: f.allDay,
  fromTime: f.allDay ? '' : (f.fromTime?.trim() ?? ''),
  toTime: f.allDay ? '' : (f.toTime?.trim() ?? ''),
  affectedShows: f.affectedShows?.trim() ?? '',
  details: f.details?.trim() ?? '',
});

/** Tells management that show prep will not be used for these day(s). */
export async function reportScheduleChange(fields: ScheduleChangeFields, actor: UserProfile, managementIds: string[]) {
  const body: Omit<ScheduleChange, 'id'> = {
    ...clean(fields),
    createdBy: actor.id,
    createdByName: actor.name,
    createdByRole: actor.role,
    createdAt: nowIso(),
    acknowledgedBy: [],
    acknowledgedNames: [],
  };
  const ref = newDocRef(COL.scheduleChanges);
  const batch = writeBatch(db);
  batch.set(ref, body);
  queueNotifications(
    batch,
    actor,
    managementIds,
    'schedule_change',
    ref.id,
    `${actor.name}: show prep will not be used ${describeWhen(body)} — ${body.title} (${body.reason})`,
  );
  await commit(batch);
  return ref.id;
}

export async function updateScheduleChange(
  change: ScheduleChange,
  fields: ScheduleChangeFields,
  actor: UserProfile,
  managementIds: string[],
) {
  const next = clean(fields);
  const batch = writeBatch(db);
  batch.update(docRef(COL.scheduleChanges, change.id), { ...next, updatedAt: nowIso() });
  // Let management know if the day or time moved.
  const moved = describeWhen(next) !== describeWhen(change);
  if (moved) {
    queueNotifications(
      batch,
      actor,
      managementIds,
      'schedule_change',
      change.id,
      `${actor.name} changed the dates for “${next.title}”: now ${describeWhen(next)}`,
    );
  }
  await commit(batch);
}

/** Management mark that they've seen it. */
export async function acknowledgeScheduleChange(change: ScheduleChange, actor: UserProfile) {
  if (change.acknowledgedBy?.includes(actor.id)) return;
  const batch = writeBatch(db);
  batch.update(docRef(COL.scheduleChanges, change.id), {
    acknowledgedBy: [...(change.acknowledgedBy ?? []), actor.id],
    acknowledgedNames: [...(change.acknowledgedNames ?? []), actor.name],
  });
  await commit(batch);
}

export async function deleteScheduleChange(change: ScheduleChange) {
  const batch = writeBatch(db);
  batch.delete(docRef(COL.scheduleChanges, change.id));
  await commit(batch);
}
