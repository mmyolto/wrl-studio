import { writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDay, nowIso } from '../lib/format';
import type { ShowPrep, ShowPrepFields, UserProfile } from '../lib/types';
import { COL, commit, docRef, newDocRef } from './collections';
import { queueNotifications } from './notifications';

const interviewNote = (fields: ShowPrepFields) => {
  const names = fields.hasInterview ? (fields.interviews ?? []).map((iv) => iv.name).filter(Boolean) : [];
  return names.length ? ` — includes an interview with ${names.join(', ')}` : '';
};

const cleanSlots = (fields: ShowPrepFields): ShowPrepFields => ({
  ...fields,
  timeSlots: fields.timeSlots
    .map((s) => ({ airTimeHour: s.airTimeHour.trim(), talkingPoints: s.talkingPoints.trim() }))
    .filter((s) => s.airTimeHour || s.talkingPoints),
});

export async function submitShowPrep(fields: ShowPrepFields, actor: UserProfile, managementIds: string[]) {
  const ref = newDocRef(COL.showPreps);
  const body: Omit<ShowPrep, 'id'> = {
    ...cleanSlots(fields),
    submittedBy: actor.id,
    submittedByName: actor.name,
    submittedByRole: actor.role,
    createdAt: nowIso(),
  };
  const batch = writeBatch(db);
  batch.set(ref, body);
  queueNotifications(
    batch,
    actor,
    managementIds,
    'show_prep',
    ref.id,
    `${actor.name} submitted show prep for "${fields.showName}" (week of ${formatDay(fields.weekStarting)})${interviewNote(fields)}`,
  );
  await commit(batch);
  return ref.id;
}

/** Presenters can correct their own prep until it has been reviewed. */
export async function updateShowPrep(prep: ShowPrep, fields: ShowPrepFields) {
  const batch = writeBatch(db);
  batch.update(docRef(COL.showPreps, prep.id), { ...cleanSlots(fields), updatedAt: nowIso() });
  await commit(batch);
}

export async function deleteShowPrep(prep: ShowPrep) {
  const batch = writeBatch(db);
  batch.delete(docRef(COL.showPreps, prep.id));
  await commit(batch);
}

export async function reviewShowPrep(prep: ShowPrep, actor: UserProfile, note: string) {
  const batch = writeBatch(db);
  batch.update(docRef(COL.showPreps, prep.id), {
    reviewedBy: actor.id,
    reviewedByName: actor.name,
    reviewedAt: nowIso(),
    reviewNote: note.trim(),
  });
  queueNotifications(
    batch,
    actor,
    [prep.submittedBy],
    'show_prep_reviewed',
    prep.id,
    `${actor.name} reviewed your show prep for "${prep.showName}"${note.trim() ? `: ${note.trim()}` : ''}`,
  );
  await commit(batch);
}
