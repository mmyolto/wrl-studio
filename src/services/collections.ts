import { collection, doc, type DocumentData, type QueryDocumentSnapshot, type WriteBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const COL = {
  users: 'users',
  records: 'records',
  archive: 'archive',
  notifications: 'notifications',
  showPreps: 'showPreps',
  tickets: 'tickets',
  tasks: 'tasks',
  gifts: 'gifts',
  counters: 'counters',
  scheduleChanges: 'scheduleChanges',
} as const;

export const colRef = (name: (typeof COL)[keyof typeof COL]) => collection(db, name);
export const newDocRef = (name: (typeof COL)[keyof typeof COL]) => doc(collection(db, name));
export const docRef = (name: (typeof COL)[keyof typeof COL], id: string) => doc(db, name, id);
export const setupRef = () => doc(db, 'meta', 'setup');

/** Snapshot -> plain object with its id. */
export function fromSnap<T extends { id: string }>(snap: QueryDocumentSnapshot<DocumentData>): T {
  return { ...(snap.data() as Omit<T, 'id'>), id: snap.id } as T;
}

/** Drops the `id` key before writing a document body. */
export function withoutId<T extends { id?: string }>(value: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = value;
  void _id;
  return rest;
}

/**
 * Commits a batch. Online, waits for the server so errors (e.g. permissions) surface.
 * Offline, Firestore queues the write locally and syncs it later — we don't block the UI on it.
 */
export async function commit(batch: WriteBatch): Promise<void> {
  const pending = batch.commit();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    pending.catch((error) => {
      console.error('Queued change failed to sync', error);
      window.dispatchEvent(new CustomEvent('wrl:sync-error', { detail: error }));
    });
    return;
  }
  await pending;
}
