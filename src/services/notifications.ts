import { updateDoc, writeBatch, type WriteBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { nowIso } from '../lib/format';
import type { AppNotification, NotificationType, UserProfile } from '../lib/types';
import { COL, commit, docRef, newDocRef } from './collections';

/** Adds one notification per recipient to a batch (skips the sender themself). */
export function queueNotifications(
  batch: WriteBatch,
  sender: UserProfile,
  recipientIds: string[],
  type: NotificationType,
  targetId: string,
  message: string,
) {
  const unique = [...new Set(recipientIds)].filter((id) => id && id !== sender.id);
  for (const recipientId of unique) {
    const body: Omit<AppNotification, 'id'> = {
      type,
      recipientId,
      senderId: sender.id,
      senderName: sender.name,
      targetId,
      message,
      read: false,
      createdAt: nowIso(),
    };
    batch.set(newDocRef(COL.notifications), body);
  }
}

export const markNotificationRead = (id: string) => updateDoc(docRef(COL.notifications, id), { read: true });

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  // Firestore batches allow 500 writes.
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(db);
    ids.slice(i, i + 450).forEach((id) => batch.update(docRef(COL.notifications, id), { read: true }));
    await commit(batch);
  }
}
