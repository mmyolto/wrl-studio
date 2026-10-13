import { deleteField, writeBatch, type DocumentData, type UpdateData } from 'firebase/firestore';
import { SALVATION, TOKSAVE } from '../lib/constants';
import { db } from '../lib/firebase';
import { nowIso } from '../lib/format';
import type { ArchivedRecord, ListenerFields, ListenerRecord, UserProfile } from '../lib/types';
import { COL, commit, docRef, newDocRef, withoutId } from './collections';
import { queueNotifications } from './notifications';

/** Listener fields that may be absent depending on the contact method / category. */
const OPTIONAL_FIELDS: (keyof ListenerFields)[] = [
  'phoneNumber',
  'countryCode',
  'facebookName',
  'emailAddress',
  'songTitle',
  'artist',
  'prayerCategory',
  'marriageProblems',
];

const snippet = (text: string, max = 90) => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** Toksave goes straight to the Program Director and General Manager. */
function queueToksave(
  batch: ReturnType<typeof writeBatch>,
  actor: UserProfile,
  recipients: string[],
  recordId: string,
  fields: ListenerFields,
) {
  queueNotifications(
    batch,
    actor,
    recipients,
    'toksave',
    recordId,
    `Toksave from ${fields.fullName} (taken by ${actor.name}): “${snippet(fields.message)}”`,
  );
}

/**
 * Saves a new record. `toksaveRecipients` are the Program Director(s) and General Manager(s);
 * they are notified straight away when the record is a Toksave.
 */
export async function createRecord(fields: ListenerFields, actor: UserProfile, toksaveRecipients: string[] = []) {
  const now = nowIso();
  const ref = newDocRef(COL.records);
  const body: Omit<ListenerRecord, 'id'> = {
    ...fields,
    createdBy: actor.id,
    createdByName: actor.name,
    createdByRole: actor.role,
    createdAt: now,
    updatedAt: now,
    ...(fields.prayerCategory === SALVATION ? { salvationStatus: 'pending' as const } : {}),
  };
  const batch = writeBatch(db);
  batch.set(ref, body);
  if (fields.messageCategory === TOKSAVE) queueToksave(batch, actor, toksaveRecipients, ref.id, fields);
  await commit(batch);
  return ref.id;
}

function archiveEntry(record: ListenerRecord, actor: UserProfile, type: ArchivedRecord['archiveType']) {
  const entry: Omit<ArchivedRecord, 'id'> = {
    ...withoutId(record),
    originalRecordId: record.id,
    archiveType: type,
    archivedAt: nowIso(),
    archivedBy: actor.id,
    archivedByName: actor.name,
  };
  return entry;
}

/** Saves an edit. The previous version is kept in the archive. */
export async function updateRecord(
  record: ListenerRecord,
  fields: ListenerFields,
  actor: UserProfile,
  toksaveRecipients: string[] = [],
) {
  const update: UpdateData<DocumentData> = {
    ...fields,
    updatedAt: nowIso(),
    updatedBy: actor.id,
    updatedByName: actor.name,
  };
  // Clear fields that no longer apply (e.g. song title after switching to a prayer request).
  for (const key of OPTIONAL_FIELDS) {
    if (fields[key] === undefined && record[key] !== undefined) update[key] = deleteField();
  }
  // Salvation follow-up starts when a record becomes a salvation request.
  if (fields.prayerCategory === SALVATION && !record.salvationStatus) update.salvationStatus = 'pending';

  const batch = writeBatch(db);
  batch.set(newDocRef(COL.archive), archiveEntry(record, actor, 'edited'));
  batch.update(docRef(COL.records, record.id), update);
  // A record changed into a Toksave is sent on as well.
  if (fields.messageCategory === TOKSAVE && record.messageCategory !== TOKSAVE) {
    queueToksave(batch, actor, toksaveRecipients, record.id, fields);
  }
  await commit(batch);
}

/** Deletes a record; a copy is kept in the archive for administrators. */
export async function deleteRecord(record: ListenerRecord, actor: UserProfile) {
  const batch = writeBatch(db);
  batch.set(newDocRef(COL.archive), archiveEntry(record, actor, 'deleted'));
  batch.delete(docRef(COL.records, record.id));
  await commit(batch);
}

export async function flagForPrayer(record: ListenerRecord, actor: UserProfile, chaplainIds: string[]) {
  const now = nowIso();
  const batch = writeBatch(db);
  batch.update(docRef(COL.records, record.id), {
    flaggedForPrayer: true,
    flaggedBy: actor.id,
    flaggedByName: actor.name,
    flaggedAt: now,
    updatedAt: now,
  });
  queueNotifications(
    batch,
    actor,
    chaplainIds,
    'flagged_prayer',
    record.id,
    `${actor.name} flagged ${record.fullName} for special prayer`,
  );
  await commit(batch);
}

export async function referRecord(record: ListenerRecord, to: UserProfile, actor: UserProfile) {
  const now = nowIso();
  const batch = writeBatch(db);
  batch.update(docRef(COL.records, record.id), {
    referredTo: to.id,
    referredToName: to.name,
    referredBy: actor.id,
    referredByName: actor.name,
    referredAt: now,
    referralStatus: 'pending',
    referralCompletedAt: deleteField(),
    updatedAt: now,
  });
  queueNotifications(
    batch,
    actor,
    [to.id],
    'referral',
    record.id,
    `${actor.name} referred listener ${record.fullName} to you`,
  );
  await commit(batch);
}

export async function completeReferral(record: ListenerRecord, actor: UserProfile) {
  const now = nowIso();
  const batch = writeBatch(db);
  batch.update(docRef(COL.records, record.id), {
    referralStatus: 'completed',
    referralCompletedAt: now,
    updatedAt: now,
  });
  if (record.referredBy) {
    queueNotifications(
      batch,
      actor,
      [record.referredBy],
      'referral_completed',
      record.id,
      `${actor.name} completed the referral for ${record.fullName}`,
    );
  }
  await commit(batch);
}

export async function markSoulSaved(record: ListenerRecord, actor: UserProfile) {
  const now = nowIso();
  const batch = writeBatch(db);
  batch.update(docRef(COL.records, record.id), {
    salvationStatus: 'soul_saved',
    salvationFollowUpBy: actor.id,
    salvationFollowUpByName: actor.name,
    salvationFollowUpAt: now,
    updatedAt: now,
  });
  await commit(batch);
}

// ---------- archive (administrators) ----------

export async function restoreArchived(entry: ArchivedRecord) {
  const {
    id,
    originalRecordId,
    archiveType: _type,
    archivedAt: _at,
    archivedBy: _by,
    archivedByName: _byName,
    ...record
  } = entry;
  void _type;
  void _at;
  void _by;
  void _byName;
  const batch = writeBatch(db);
  batch.set(docRef(COL.records, originalRecordId), record);
  batch.delete(docRef(COL.archive, id));
  await commit(batch);
}

export async function purgeArchived(ids: string[]) {
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(db);
    ids.slice(i, i + 450).forEach((id) => batch.delete(docRef(COL.archive, id)));
    await commit(batch);
  }
}
