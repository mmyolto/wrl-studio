import { sendPasswordResetEmail } from 'firebase/auth';
import { getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, createAuthAccount, db } from '../lib/firebase';
import { nowIso } from '../lib/format';
import type { Availability, Role, UserProfile } from '../lib/types';
import { COL, commit, docRef, setupRef } from './collections';

export async function isSetupComplete() {
  const snap = await getDoc(setupRef());
  return snap.exists();
}

/** First-run: makes the signed-in account the Administrator and closes setup. */
export async function completeSetup(uid: string, name: string, email: string) {
  const now = nowIso();
  const profile: Omit<UserProfile, 'id'> = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'Administrator',
    availability: 'active',
    createdAt: now,
    lastSignIn: now,
  };
  const batch = writeBatch(db);
  batch.set(docRef(COL.users, uid), profile);
  batch.set(setupRef(), { completedAt: now, completedBy: uid });
  await batch.commit();
}

/** Admin: creates the login and the staff profile. */
export async function createStaffAccount(input: { name: string; email: string; password: string; role: Role }) {
  const email = input.email.trim().toLowerCase();
  const uid = await createAuthAccount(email, input.password);
  const profile: Omit<UserProfile, 'id'> = {
    name: input.name.trim(),
    email,
    role: input.role,
    availability: 'active',
    createdAt: nowIso(),
  };
  await setDoc(docRef(COL.users, uid), profile);
  return uid;
}

export const updateStaff = (user: UserProfile, changes: Partial<Pick<UserProfile, 'name' | 'role' | 'disabled'>>) =>
  updateDoc(docRef(COL.users, user.id), changes);

export const sendPasswordReset = (email: string) => sendPasswordResetEmail(auth, email.trim());

export async function setAvailability(user: UserProfile, availability: Availability, returnDate?: string) {
  const batch = writeBatch(db);
  batch.update(docRef(COL.users, user.id), {
    availability,
    returnDate: availability === 'active' ? '' : (returnDate ?? ''),
    availabilityUpdatedAt: nowIso(),
  });
  await commit(batch);
}

export const recordSignIn = (uid: string) => updateDoc(docRef(COL.users, uid), { lastSignIn: nowIso() });
