import { doc, runTransaction, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { nowIso } from '../lib/format';
import type { Gift, GiftFields, GiftPayment, PaymentMethod, UserProfile } from '../lib/types';
import { COL, commit, docRef, newDocRef } from './collections';

const pad = (n: number) => String(n).padStart(4, '0');
/** Same numbering as the paper Shareathon form: WRL26 - 0001 */
const formatRef = (year: string, seq: number) => `WRL${year} - ${pad(seq)}`;

const paymentId = () => Math.random().toString(36).slice(2, 10);

export interface InitialPayment {
  amount: number;
  method: PaymentMethod;
}

/**
 * Records a pledge, cash gift or in-kind gift. Reference numbers come from a
 * per-year counter inside a transaction, so two announcers saving at the same
 * moment can never get the same number. Needs an internet connection.
 */
export async function recordGift(fields: GiftFields, paid: InitialPayment | null, actor: UserProfile) {
  const year = String(new Date().getFullYear()).slice(-2);
  const counter = doc(db, COL.counters, `gifts-${year}`);
  const ref = newDocRef(COL.gifts);
  const now = nowIso();

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(counter);
    const seq = (snap.exists() ? Number(snap.data()?.seq ?? 0) : 0) + 1;
    const payments: GiftPayment[] =
      paid && paid.amount > 0
        ? [{ id: paymentId(), amount: paid.amount, method: paid.method, at: now, by: actor.id, byName: actor.name }]
        : [];
    const body: Omit<Gift, 'id'> = {
      ...fields,
      refNo: formatRef(year, seq),
      seq,
      year,
      payments,
      createdBy: actor.id,
      createdByName: actor.name,
      createdByRole: actor.role,
      createdAt: now,
      updatedAt: now,
    };
    tx.set(counter, { seq });
    tx.set(ref, body);
    return { id: ref.id, refNo: body.refNo };
  });
}

export async function updateGift(gift: Gift, fields: GiftFields, actor: UserProfile) {
  const batch = writeBatch(db);
  batch.update(docRef(COL.gifts, gift.id), { ...fields, updatedAt: nowIso(), updatedByName: actor.name });
  await commit(batch);
}

export async function addPayment(
  gift: Gift,
  payment: { amount: number; method: PaymentMethod; note: string },
  actor: UserProfile,
) {
  const entry: GiftPayment = {
    id: paymentId(),
    amount: payment.amount,
    method: payment.method,
    ...(payment.note.trim() ? { note: payment.note.trim() } : {}),
    at: nowIso(),
    by: actor.id,
    byName: actor.name,
  };
  const batch = writeBatch(db);
  batch.update(docRef(COL.gifts, gift.id), {
    payments: [...gift.payments, entry],
    updatedAt: nowIso(),
    updatedByName: actor.name,
  });
  await commit(batch);
}

export async function removePayment(gift: Gift, paymentIdToRemove: string, actor: UserProfile) {
  const batch = writeBatch(db);
  batch.update(docRef(COL.gifts, gift.id), {
    payments: gift.payments.filter((p) => p.id !== paymentIdToRemove),
    updatedAt: nowIso(),
    updatedByName: actor.name,
  });
  await commit(batch);
}

export async function deleteGift(gift: Gift) {
  const batch = writeBatch(db);
  batch.delete(docRef(COL.gifts, gift.id));
  await commit(batch);
}

// ---------- derived values ----------

export const received = (g: Gift) => g.payments.reduce((n, p) => n + p.amount, 0);

/** Value used in totals: pledged amount, cash received, or estimated in-kind value. */
export const giftValue = (g: Gift) =>
  g.type === 'pledge' ? (g.pledgeAmount ?? 0) : g.type === 'cash' ? received(g) : (g.estimatedValue ?? 0);

export const outstanding = (g: Gift) => (g.type === 'pledge' ? Math.max((g.pledgeAmount ?? 0) - received(g), 0) : 0);

export type PledgeStatus = 'unpaid' | 'part' | 'paid';
export const pledgeStatus = (g: Gift): PledgeStatus => {
  const got = received(g);
  if (got <= 0) return 'unpaid';
  return got >= (g.pledgeAmount ?? 0) ? 'paid' : 'part';
};
