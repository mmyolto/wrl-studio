import { CalendarX, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge, ConfirmDialog, EmptyState, PageHeader, Segmented, Spinner } from '../../components/ui/misc';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNav } from '../../context/NavContext';
import { cn } from '../../lib/cn';
import { attempt, attemptQuietly } from '../../lib/attempt';
import { formatDateTime } from '../../lib/format';
import { permissionsFor } from '../../lib/permissions';
import type { ScheduleChange } from '../../lib/types';
import {
  acknowledgeScheduleChange,
  deleteScheduleChange,
  describeWhen,
  isCurrentOrUpcoming,
  isToday,
} from '../../services/scheduleChanges';
import { ScheduleChangeForm } from './ScheduleChangeForm';

type View = 'upcoming' | 'past';

const REASON_TONE = {
  'National program': 'red',
  'Organisational program': 'violet',
  Other: 'neutral',
} as const;

function ReasonBadge({ change }: { change: ScheduleChange }) {
  return <Badge tone={REASON_TONE[change.reason] ?? 'neutral'}>{change.reason}</Badge>;
}

function ChangeCard({ change, onOpen }: { change: ScheduleChange; onOpen: () => void }) {
  const me = useCurrentUser();
  const can = permissionsFor(me.role);
  const today = isToday(change);
  const needsNote = can.acknowledgeScheduleChange && change.createdBy !== me.id && !change.acknowledgedBy?.includes(me.id);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md',
        today ? 'border-red-200 ring-1 ring-red-100' : 'border-stone-200',
      )}
    >
      <div className="flex flex-wrap gap-1.5">
        {today && <Badge tone="solidRed">Today</Badge>}
        <ReasonBadge change={change} />
        {needsNote && <Badge tone="amber">New</Badge>}
      </div>
      <p className="mt-3 font-bold break-words text-stone-900">{change.title}</p>
      <p className="mt-0.5 text-sm font-medium text-stone-700">{describeWhen(change)}</p>
      {change.affectedShows && (
        <p className="mt-1 line-clamp-2 text-sm text-stone-500">Shows off air: {change.affectedShows}</p>
      )}
      <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
        Reported by {change.createdByName}
        {change.acknowledgedNames?.length ? ` · noted by ${change.acknowledgedNames.join(', ')}` : ''}
      </p>
    </button>
  );
}

function ChangeDetail({ change, onClose }: { change: ScheduleChange; onClose: () => void }) {
  const me = useCurrentUser();
  const can = permissionsFor(me.role);
  const mine = change.createdBy === me.id;
  const canChange = mine || me.role === 'Administrator';
  const canNote = can.acknowledgeScheduleChange && !mine && !change.acknowledgedBy?.includes(me.id);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <Modal
        open
        variant="drawer"
        onClose={onClose}
        title={change.title}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {isToday(change) && <Badge tone="solidRed">Today</Badge>}
            <ReasonBadge change={change} />
          </span>
        }
        footer={
          <div className="flex w-full flex-wrap items-center gap-2">
            {canNote && (
              <Button
                size="sm"
                icon={Check}
                onClick={() => attemptQuietly(() => acknowledgeScheduleChange(change, me), 'Marked as noted.')}
              >
                Noted
              </Button>
            )}
            {canChange && (
              <>
                <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                  Edit
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
        <div className="space-y-5 text-sm">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-950">
            <p className="font-semibold">Show prep will not be used</p>
            <p className="mt-0.5">{describeWhen(change)}</p>
          </div>
          <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2.5">
            <dt className="text-stone-500">Shows off air</dt>
            <dd className="break-words text-stone-900">{change.affectedShows || '—'}</dd>
            <dt className="text-stone-500">Details</dt>
            <dd className="break-words whitespace-pre-wrap text-stone-900">{change.details || '—'}</dd>
            <dt className="text-stone-500">Reported by</dt>
            <dd className="text-stone-900">
              {change.createdByName} ({change.createdByRole}) · {formatDateTime(change.createdAt)}
            </dd>
            <dt className="text-stone-500">Noted by</dt>
            <dd className="text-stone-900">
              {change.acknowledgedNames?.length ? change.acknowledgedNames.join(', ') : 'Not yet'}
            </dd>
          </dl>
        </div>
      </Modal>

      {editing && <ScheduleChangeForm change={change} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this schedule change?"
        message={`“${change.title}” will be removed. Management will no longer see it.`}
        confirmLabel="Delete"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await attempt(() => deleteScheduleChange(change), 'Deleted.');
          onClose();
        }}
      />
    </>
  );
}

export function SchedulePage() {
  const me = useCurrentUser();
  const can = permissionsFor(me.role);
  const { scheduleChanges, scheduleChangesLoading } = useData();
  const { params, navigate } = useNav();
  const [view, setView] = useState<View>('upcoming');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (params.get('new')) {
      setCreating(true);
      navigate('schedule');
    }
  }, [params, navigate]);

  const upcoming = useMemo(() => scheduleChanges.filter((c) => isCurrentOrUpcoming(c)), [scheduleChanges]);
  // Past: most recent first.
  const past = useMemo(
    () => scheduleChanges.filter((c) => !isCurrentOrUpcoming(c)).reverse(),
    [scheduleChanges],
  );
  const list = view === 'upcoming' ? upcoming : past;

  const openId = params.get('open');
  const open = openId ? scheduleChanges.find((c) => c.id === openId) : undefined;

  return (
    <>
      <PageHeader
        title="Schedule changes"
        description="Days when national or organisational programmes replace the normal on-air schedule, so show prep is not used."
        actions={
          can.reportScheduleChange && (
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Report a change
            </Button>
          )
        }
      />

      <div className="mb-5">
        <Segmented<View>
          label="Show"
          value={view}
          onChange={setView}
          options={[
            { value: 'upcoming', label: `Today & coming (${upcoming.length})` },
            { value: 'past', label: `Past (${past.length})` },
          ]}
        />
      </div>

      {scheduleChangesLoading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title={view === 'upcoming' ? 'Normal schedule' : 'Nothing yet'}
          description={
            view === 'upcoming'
              ? 'No national or organisational programmes are replacing the schedule.'
              : 'Past schedule changes will show here.'
          }
          action={
            can.reportScheduleChange &&
            view === 'upcoming' && (
              <Button icon={Plus} onClick={() => setCreating(true)}>
                Report a change
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <ChangeCard key={c.id} change={c} onOpen={() => navigate('schedule', { open: c.id })} />
          ))}
        </div>
      )}

      {creating && <ScheduleChangeForm onClose={() => setCreating(false)} />}
      {open && <ChangeDetail key={open.id} change={open} onClose={() => navigate('schedule')} />}
    </>
  );
}
