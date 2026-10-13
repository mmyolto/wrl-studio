import { CalendarClock, CircleCheck, Clock, Circle } from 'lucide-react';
import { Badge, type Tone } from '../../components/ui/misc';
import { TASK_STATUS, TICKET_PRIORITY } from '../../lib/constants';
import { formatDay } from '../../lib/format';
import type { Task, TaskStatus, TicketPriority } from '../../lib/types';
import { isOverdue } from '../../services/tasks';

const STATUS_TONE: Record<TaskStatus, Tone> = { todo: 'neutral', in_progress: 'blue', done: 'brand' };
const STATUS_ICON = { todo: Circle, in_progress: Clock, done: CircleCheck };
export const PRIORITY_TONE: Record<TicketPriority, Tone> = {
  urgent: 'solidRed',
  high: 'red',
  medium: 'amber',
  low: 'neutral',
};

export function TaskBadges({ task }: { task: Task }) {
  const overdue = isOverdue(task);
  return (
    <>
      <Badge tone={STATUS_TONE[task.status]} icon={STATUS_ICON[task.status]}>
        {TASK_STATUS[task.status]}
      </Badge>
      <Badge tone={PRIORITY_TONE[task.priority]}>{TICKET_PRIORITY[task.priority]}</Badge>
      {task.dueDate && task.status !== 'done' && (
        <Badge tone={overdue ? 'red' : 'neutral'} icon={CalendarClock}>
          {overdue ? 'Overdue · ' : 'Due '}
          {formatDay(task.dueDate)}
        </Badge>
      )}
    </>
  );
}
