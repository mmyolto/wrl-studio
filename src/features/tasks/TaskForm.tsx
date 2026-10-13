import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { ChoiceChips, Field, Input, Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { attempt } from '../../lib/attempt';
import { AVAILABILITY, TICKET_PRIORITY } from '../../lib/constants';
import { toDayInput } from '../../lib/format';
import type { Task, TicketPriority } from '../../lib/types';
import { assignTask, editTask } from '../../services/tasks';

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

export function TaskForm({
  task,
  presetAssignee,
  onClose,
  onSaved,
}: {
  task?: Task;
  presetAssignee?: string;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const me = useCurrentUser();
  const { staff } = useData();
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assigneeId, setAssigneeId] = useState(task?.assignedTo ?? presetAssignee ?? '');
  const [priority, setPriority] = useState<TicketPriority>(task?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [errors, setErrors] = useState<{ title?: string; assignee?: string }>({});
  const [saving, setSaving] = useState(false);

  const people = useMemo(
    () =>
      staff.map((u) => {
        const away = (u.availability ?? 'active') !== 'active';
        const who = u.id === me.id ? `${u.name} (me)` : u.name;
        return {
          value: u.id,
          label: `${who} — ${u.role}${away ? ` · ${AVAILABILITY[u.availability!].label}` : ''}`,
        };
      }),
    [staff, me.id],
  );
  const assignee = staff.find((u) => u.id === assigneeId);
  const away = assignee && (assignee.availability ?? 'active') !== 'active';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!title.trim()) found.title = 'Give the task a short title.';
    if (!assignee) found.assignee = 'Choose who should do it.';
    setErrors(found);
    if (Object.keys(found).length || !assignee) return;

    setSaving(true);
    const input = { title, description, priority, dueDate, assignee };
    try {
      if (task) {
        await attempt(() => editTask(task, input, me), 'Task updated.');
        onSaved?.(task.id);
      } else {
        const id = await attempt(() => assignTask(input, me), `Task assigned to ${assignee.name}.`);
        onSaved?.(id);
      }
      onClose();
    } catch {
      /* toast shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      locked={saving}
      title={task ? 'Edit task' : 'Assign a task'}
      description={
        task ? 'Changes are shown to the person doing the task.' : 'They’ll get a notification straight away.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" loading={saving}>
            {task ? 'Save changes' : 'Assign task'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} noValidate className="space-y-5">
        <Field label="Task" required error={errors.title}>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((x) => ({ ...x, title: undefined }));
            }}
            placeholder="e.g. Record the Sunday devotion promo"
            maxLength={140}
          />
        </Field>
        <Field
          label="Assign to"
          required
          error={errors.assignee}
          hint={away ? `${assignee!.name} is currently away — they’ll see it when they’re back.` : undefined}
        >
          <Select
            value={assigneeId}
            onChange={(e) => {
              setAssigneeId(e.target.value);
              setErrors((x) => ({ ...x, assignee: undefined }));
            }}
            placeholder="Choose a staff member…"
            options={people}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_11rem]">
          <Field label="Priority">
            <ChoiceChips
              size="sm"
              value={priority}
              onChange={(v) => setPriority(v as TicketPriority)}
              options={PRIORITIES.map((p) => ({ value: p, label: TICKET_PRIORITY[p] }))}
            />
          </Field>
          <Field label="Due date" hint="Optional">
            <Input
              type="date"
              value={dueDate}
              min={task ? undefined : toDayInput(new Date())}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Details" hint="What needs doing, and anything they need to know.">
          <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
