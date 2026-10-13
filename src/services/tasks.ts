import { deleteField, writeBatch } from 'firebase/firestore';
import { TASK_STATUS } from '../lib/constants';
import { db } from '../lib/firebase';
import { formatDay, nowIso } from '../lib/format';
import type { Task, TaskStatus, TaskUpdate, TicketPriority, UserProfile } from '../lib/types';
import { COL, commit, docRef, newDocRef } from './collections';
import { queueNotifications } from './notifications';

export interface TaskInput {
  title: string;
  description: string;
  priority: TicketPriority;
  dueDate: string;
  assignee: UserProfile;
}

const entry = (actor: UserProfile, text: string, status?: TaskStatus): TaskUpdate => ({
  at: nowIso(),
  by: actor.id,
  byName: actor.name,
  text,
  ...(status ? { status } : {}),
});

const dueText = (due?: string) => (due ? ` (due ${formatDay(due)})` : '');

export async function assignTask(input: TaskInput, actor: UserProfile) {
  const ref = newDocRef(COL.tasks);
  const now = nowIso();
  const body: Omit<Task, 'id'> = {
    title: input.title.trim(),
    description: input.description.trim(),
    priority: input.priority,
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    status: 'todo',
    assignedTo: input.assignee.id,
    assignedToName: input.assignee.name,
    assignedBy: actor.id,
    assignedByName: actor.name,
    assignedByRole: actor.role,
    updates: [entry(actor, `Assigned to ${input.assignee.name}`)],
    createdAt: now,
    updatedAt: now,
  };
  const batch = writeBatch(db);
  batch.set(ref, body);
  queueNotifications(
    batch,
    actor,
    [input.assignee.id],
    'task_assigned',
    ref.id,
    `${actor.name} assigned you a task: "${body.title}"${dueText(input.dueDate)}`,
  );
  await commit(batch);
  return ref.id;
}

/** Assigner (or Administrator) edits the task details or reassigns it. */
export async function editTask(task: Task, input: TaskInput, actor: UserProfile) {
  const reassigned = input.assignee.id !== task.assignedTo;
  const batch = writeBatch(db);
  batch.update(docRef(COL.tasks, task.id), {
    title: input.title.trim(),
    description: input.description.trim(),
    priority: input.priority,
    dueDate: input.dueDate ? input.dueDate : deleteField(),
    assignedTo: input.assignee.id,
    assignedToName: input.assignee.name,
    updates: [
      ...task.updates,
      entry(
        actor,
        reassigned ? `Reassigned from ${task.assignedToName} to ${input.assignee.name}` : 'Edited the task details',
      ),
    ],
    updatedAt: nowIso(),
  });
  queueNotifications(
    batch,
    actor,
    [input.assignee.id],
    'task_assigned',
    task.id,
    reassigned
      ? `${actor.name} assigned you a task: "${input.title.trim()}"${dueText(input.dueDate)}`
      : `${actor.name} updated the task "${input.title.trim()}"`,
  );
  await commit(batch);
}

/** Assignee (or assigner) moves the task along, optionally with a note. */
export async function setTaskStatus(task: Task, status: TaskStatus, note: string, actor: UserProfile) {
  const changed = status !== task.status;
  const label = !changed
    ? ''
    : status === 'done'
      ? 'Marked as done'
      : task.status === 'done'
        ? 'Reopened the task'
        : status === 'in_progress'
          ? 'Started the task'
          : `Moved to ${TASK_STATUS[status].toLowerCase()}`;
  const text = [label, note.trim()].filter(Boolean).join(': ');
  if (!text) return;
  const batch = writeBatch(db);
  batch.update(docRef(COL.tasks, task.id), {
    status,
    completedAt: status === 'done' ? (task.completedAt ?? nowIso()) : deleteField(),
    updates: [...task.updates, entry(actor, text, status !== task.status ? status : undefined)],
    updatedAt: nowIso(),
  });
  // Tell the other side of the assignment.
  const other = actor.id === task.assignedTo ? task.assignedBy : task.assignedTo;
  const what =
    status !== task.status
      ? status === 'done'
        ? `completed "${task.title}"`
        : `moved "${task.title}" to ${TASK_STATUS[status].toLowerCase()}`
      : `added a note on "${task.title}"`;
  queueNotifications(
    batch,
    actor,
    [other],
    'task_updated',
    task.id,
    `${actor.name} ${what}${note.trim() ? `: ${note.trim()}` : ''}`,
  );
  await commit(batch);
}

export async function deleteTask(task: Task) {
  const batch = writeBatch(db);
  batch.delete(docRef(COL.tasks, task.id));
  await commit(batch);
}

export const isOverdue = (task: Task, today = new Date()) => {
  if (!task.dueDate || task.status === 'done') return false;
  const [y, m, d] = task.dueDate.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 23, 59, 59) < today;
};
