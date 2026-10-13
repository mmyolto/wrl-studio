import { deleteField, writeBatch, type DocumentData, type UpdateData } from 'firebase/firestore';
import { TICKET_STATUS } from '../lib/constants';
import { db } from '../lib/firebase';
import { nowIso } from '../lib/format';
import type { Ticket, TicketCategory, TicketPriority, TicketStatus, UserProfile } from '../lib/types';
import { COL, commit, docRef, newDocRef } from './collections';
import { queueNotifications } from './notifications';

const preview = (text: string, max = 90) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

export async function createTicket(
  input: { category: TicketCategory; description: string; priority: TicketPriority },
  actor: UserProfile,
  managementIds: string[],
) {
  const ref = newDocRef(COL.tickets);
  const now = nowIso();
  const body: Omit<Ticket, 'id'> = {
    category: input.category,
    description: input.description.trim(),
    priority: input.priority,
    status: 'open',
    submittedBy: actor.id,
    submittedByName: actor.name,
    submittedByRole: actor.role,
    createdAt: now,
    updatedAt: now,
  };
  const batch = writeBatch(db);
  batch.set(ref, body);
  queueNotifications(
    batch,
    actor,
    managementIds,
    'ticket_created',
    ref.id,
    `${actor.name} reported a ${input.category.toLowerCase()}: ${preview(body.description)}`,
  );
  await commit(batch);
}

export async function updateTicket(
  ticket: Ticket,
  changes: { status: TicketStatus; priority: TicketPriority; notes: string },
  actor: UserProfile,
) {
  const now = nowIso();
  const update: UpdateData<DocumentData> = {
    status: changes.status,
    priority: changes.priority,
    notes: changes.notes.trim(),
    updatedAt: now,
  };
  if (changes.status === 'resolved' && ticket.status !== 'resolved') {
    update.resolvedBy = actor.id;
    update.resolvedByName = actor.name;
    update.resolvedAt = now;
  } else if (changes.status !== 'resolved' && ticket.status === 'resolved') {
    update.resolvedBy = deleteField();
    update.resolvedByName = deleteField();
    update.resolvedAt = deleteField();
  }

  const batch = writeBatch(db);
  batch.update(docRef(COL.tickets, ticket.id), update);
  if (changes.status !== ticket.status) {
    queueNotifications(
      batch,
      actor,
      [ticket.submittedBy],
      'ticket_updated',
      ticket.id,
      `Your ${ticket.category.toLowerCase()} is now "${TICKET_STATUS[changes.status]}"` +
        (changes.notes.trim() ? ` — ${preview(changes.notes.trim())}` : ''),
    );
  }
  await commit(batch);
}

export async function deleteTicket(ticket: Ticket) {
  const batch = writeBatch(db);
  batch.delete(docRef(COL.tickets, ticket.id));
  await commit(batch);
}
