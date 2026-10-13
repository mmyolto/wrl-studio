import { ArrowRight, ListTodo, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Avatar, EmptyState, PageHeader, Segmented, Spinner, StatTile } from '../../components/ui/misc';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNav } from '../../context/NavContext';
import { cn } from '../../lib/cn';
import { timeAgo } from '../../lib/format';
import { permissionsFor } from '../../lib/permissions';
import type { Task } from '../../lib/types';
import { isOverdue } from '../../services/tasks';
import { TaskBadges } from './badges';
import { TaskDetail } from './TaskDetail';
import { TaskForm } from './TaskForm';

type View = 'mine' | 'assigned' | 'all';
type StatusFilter = 'active' | 'done' | 'all';

function TaskCard({ task, meId, onOpen }: { task: Task; meId: string; onOpen: () => void }) {
  const last = task.updates[task.updates.length - 1];
  const otherName = task.assignedTo === meId ? task.assignedByName : task.assignedToName;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md',
        isOverdue(task) ? 'border-red-200' : 'border-stone-200',
        task.status === 'done' && 'opacity-75',
      )}
    >
      <div className="flex flex-wrap gap-1.5">
        <TaskBadges task={task} />
      </div>
      <p className={cn('mt-3 font-bold text-stone-900', task.status === 'done' && 'line-through decoration-stone-300')}>
        {task.title}
      </p>
      {task.description && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{task.description}</p>}
      <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3 text-xs text-stone-500">
        <Avatar name={otherName} size="sm" />
        <span className="min-w-0 flex-1 truncate">
          {task.assignedTo === meId ? `From ${task.assignedByName}` : `For ${task.assignedToName}`}
          {last && ` · ${timeAgo(last.at)}`}
        </span>
        <ArrowRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
      </div>
    </button>
  );
}

export function TasksPage() {
  const me = useCurrentUser();
  const can = permissionsFor(me.role);
  const { tasks, tasksLoading } = useData();
  const { params, navigate } = useNav();
  const [view, setView] = useState<View>('mine');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [assigning, setAssigning] = useState(false);

  const mine = useMemo(() => tasks.filter((t) => t.assignedTo === me.id), [tasks, me.id]);
  const assigned = useMemo(() => tasks.filter((t) => t.assignedBy === me.id), [tasks, me.id]);

  const viewOptions: { value: View; label: string; count: number }[] = [
    { value: 'mine', label: 'My tasks', count: mine.filter((t) => t.status !== 'done').length },
  ];
  if (can.assignTasks)
    viewOptions.push({
      value: 'assigned',
      label: 'Assigned by me',
      count: assigned.filter((t) => t.status !== 'done').length,
    });
  if (can.viewAllTasks)
    viewOptions.push({ value: 'all', label: 'All tasks', count: tasks.filter((t) => t.status !== 'done').length });

  const base = view === 'assigned' ? assigned : view === 'all' ? tasks : mine;
  const visible = base.filter((t) =>
    status === 'all' ? true : status === 'done' ? t.status === 'done' : t.status !== 'done',
  );

  const openId = params.get('open');
  const openTask = openId ? tasks.find((t) => t.id === openId) : undefined;
  const open = (id: string) => navigate('tasks', { open: id });

  const activeBase = base.filter((t) => t.status !== 'done');
  const stats = {
    open: activeBase.length,
    inProgress: activeBase.filter((t) => t.status === 'in_progress').length,
    overdue: activeBase.filter((t) => isOverdue(t)).length,
    done: base.filter((t) => t.status === 'done').length,
  };

  return (
    <>
      <PageHeader
        title={can.assignTasks ? 'Tasks' : 'My tasks'}
        description={
          can.assignTasks
            ? 'Give work to individual staff members and follow it through to done.'
            : 'Work assigned to you. Update the status as you go so your supervisor can see progress.'
        }
        actions={
          can.assignTasks && (
            <Button icon={Plus} onClick={() => setAssigning(true)}>
              Assign task
            </Button>
          )
        }
      />

      {viewOptions.length > 1 && (
        <div className="mb-5">
          <Segmented<View> label="Which tasks" value={view} onChange={setView} options={viewOptions} />
        </div>
      )}

      {tasksLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Open" value={stats.open} icon={ListTodo} />
            <StatTile label="In progress" value={stats.inProgress} accent="sky" />
            <StatTile label="Overdue" value={stats.overdue} accent="flame" />
            <StatTile label="Done" value={stats.done} accent="stone" />
          </div>

          <div className="mb-4">
            <Segmented<StatusFilter>
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'active', label: 'Open' },
                { value: 'done', label: 'Done' },
                { value: 'all', label: 'All' },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title={
                status === 'done'
                  ? 'Nothing completed yet'
                  : view === 'assigned'
                    ? 'You haven’t assigned any open tasks'
                    : 'No open tasks'
              }
              description={
                view === 'assigned' || (can.assignTasks && view !== 'mine')
                  ? 'Assign a task to a staff member and track it here.'
                  : status === 'done'
                    ? 'Finished tasks will appear here.'
                    : 'You’re all caught up. New tasks will show up here and in your notifications.'
              }
              action={
                can.assignTasks &&
                status !== 'done' && (
                  <Button icon={Plus} onClick={() => setAssigning(true)}>
                    Assign task
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((t) => (
                <TaskCard key={t.id} task={t} meId={me.id} onOpen={() => open(t.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {assigning && <TaskForm onClose={() => setAssigning(false)} />}
      {openTask && <TaskDetail key={openTask.id} task={openTask} onClose={() => navigate('tasks')} />}
    </>
  );
}
