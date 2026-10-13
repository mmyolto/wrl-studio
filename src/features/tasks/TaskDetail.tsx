import { CalendarClock, CircleCheck, Pencil, Play, RotateCcw, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Field';
import { Avatar, ConfirmDialog } from '../../components/ui/misc';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { attempt } from '../../lib/attempt';
import { formatDateTime, formatDay } from '../../lib/format';
import type { Task, TaskStatus } from '../../lib/types';
import { deleteTask, isOverdue, setTaskStatus } from '../../services/tasks';
import { TaskBadges } from './badges';
import { TaskForm } from './TaskForm';

export function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const me = useCurrentUser();
  const isAssignee = task.assignedTo === me.id;
  const isAssigner = task.assignedBy === me.id;
  const canManage = isAssigner || me.role === 'Administrator';
  const canProgress = isAssignee || canManage;
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<TaskStatus | 'note' | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const move = async (status: TaskStatus, kind: TaskStatus | 'note') => {
    setBusy(kind);
    const success =
      kind === 'note'
        ? 'Note added.'
        : status === 'done'
          ? 'Task completed — nice work!'
          : status === 'in_progress'
            ? 'Task started.'
            : 'Task reopened.';
    try {
      await attempt(() => setTaskStatus(task, status, note, me), success);
      setNote('');
    } catch {
      /* toast shown */
    }
    setBusy(null);
  };

  const overdue = isOverdue(task);

  return (
    <>
      <Modal
        open
        variant="drawer"
        onClose={onClose}
        title={task.title}
        description={
          <span className="mt-1 flex flex-wrap gap-1.5">
            <TaskBadges task={task} />
          </span>
        }
        footer={
          <div className="flex w-full flex-wrap items-center gap-2">
            {canManage && (
              <>
                <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                  Edit / reassign
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  className="text-flame-600 hover:bg-red-50"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Who / when */}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-stone-50 p-3">
              <dt className="text-xs text-stone-500">Assigned to</dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold text-stone-900">
                <Avatar name={task.assignedToName} size="sm" />
                {isAssignee ? 'You' : task.assignedToName}
              </dd>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <dt className="text-xs text-stone-500">Assigned by</dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold text-stone-900">
                <Avatar name={task.assignedByName} size="sm" />
                {isAssigner ? 'You' : task.assignedByName}
              </dd>
            </div>
            <div className={overdue ? 'rounded-xl bg-red-50 p-3' : 'rounded-xl bg-stone-50 p-3'}>
              <dt className="text-xs text-stone-500">Due</dt>
              <dd className={overdue ? 'mt-1 font-semibold text-flame-600' : 'mt-1 font-semibold text-stone-900'}>
                {task.dueDate ? formatDay(task.dueDate) : 'No due date'}
                {overdue && ' · overdue'}
              </dd>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <dt className="text-xs text-stone-500">{task.completedAt ? 'Completed' : 'Assigned'}</dt>
              <dd className="mt-1 font-semibold text-stone-900">
                {formatDateTime(task.completedAt ?? task.createdAt)}
              </dd>
            </div>
          </dl>

          {task.description && (
            <section>
              <h3 className="mb-1.5 text-xs font-bold tracking-wide text-stone-500 uppercase">Details</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-stone-800">{task.description}</p>
            </section>
          )}

          {/* Progress actions */}
          {canProgress && (
            <section className="rounded-xl border border-stone-200 p-4">
              <div className="flex flex-wrap gap-2">
                {task.status === 'todo' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Play}
                    loading={busy === 'in_progress'}
                    onClick={() => move('in_progress', 'in_progress')}
                  >
                    Start task
                  </Button>
                )}
                {task.status !== 'done' && (
                  <Button size="sm" icon={CircleCheck} loading={busy === 'done'} onClick={() => move('done', 'done')}>
                    Mark as done
                  </Button>
                )}
                {task.status === 'done' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={RotateCcw}
                    loading={busy === 'todo'}
                    onClick={() => move('in_progress', 'todo')}
                  >
                    Reopen
                  </Button>
                )}
              </div>
              <div className="mt-4 flex items-end gap-2">
                <Textarea
                  aria-label="Progress note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    isAssignee ? 'Add a progress note for ' + task.assignedByName.split(' ')[0] + '…' : 'Add a note…'
                  }
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  icon={Send}
                  aria-label="Add note"
                  disabled={!note.trim()}
                  loading={busy === 'note'}
                  onClick={() => move(task.status, 'note')}
                />
              </div>
              <p className="mt-2 text-xs text-stone-500">
                A note is also sent with “Start”, “Mark as done” or “Reopen” if you type one first.
              </p>
            </section>
          )}

          {/* Timeline */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-stone-900">Activity</h3>
            <ol className="relative space-y-3 border-l border-stone-200 pl-4">
              {[...task.updates].reverse().map((u, i) => (
                <li key={`${u.at}-${i}`} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" />
                  <p className="text-stone-700">
                    <strong>{u.byName}</strong> · {u.text}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-stone-400">
                    <CalendarClock className="h-3 w-3" /> {formatDateTime(u.at)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </Modal>

      {editing && <TaskForm task={task} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this task?"
        message={`“${task.title}” will be removed for you and ${task.assignedToName}.`}
        confirmLabel="Delete task"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await attempt(() => deleteTask(task), 'Task deleted.');
          onClose();
        }}
      />
    </>
  );
}
