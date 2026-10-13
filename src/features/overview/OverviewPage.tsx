import { ArrowRight, HandHeart, ListTodo, Megaphone, Plus, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Field';
import { Card, PageHeader, Segmented, Spinner } from '../../components/ui/misc';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNav } from '../../context/NavContext';
import { SALVATION } from '../../lib/constants';
import { timeAgo } from '../../lib/format';
import { permissionsFor } from '../../lib/permissions';
import { inPeriod, PERIODS, recordStats, type Period } from '../../lib/stats';
import { CategoryBadge, placeOf } from '../records/badges';
import { RecordForm } from '../records/RecordForm';
import { isOverdue } from '../../services/tasks';
import { useScopedRecords, type Scope } from '../records/scope';
import { WeeklyReminder } from '../showprep/WeeklyReminder';
import { ScheduleChangeBanner } from '../schedule/ScheduleChangeBanner';
import { RecordAnalytics } from './RecordAnalytics';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function OverviewPage() {
  const me = useCurrentUser();
  const can = permissionsFor(me.role);
  const { navigate } = useNav();
  const { tasks, notifications } = useData();
  const { scope, setScope, options, scoped, loading } = useScopedRecords('overview-scope');
  const [period, setPeriod] = useState<Period>('month');
  const [creating, setCreating] = useState(false);

  const inRange = useMemo(() => inPeriod(scoped, period), [scoped, period]);
  const stats = useMemo(() => recordStats(inRange), [inRange]);

  const referrals = scoped.filter((r) => r.referredTo === me.id && r.referralStatus === 'pending');
  const salvationPending = scoped.filter((r) => r.prayerCategory === SALVATION && r.salvationStatus !== 'soul_saved');
  const recent = scoped.slice(0, 5);
  const myTasks = tasks.filter((t) => t.assignedTo === me.id && t.status !== 'done');
  const overdueTasks = myTasks.filter((t) => isOverdue(t)).length;
  const newToksave = notifications.filter((n) => n.type === 'toksave' && !n.read);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${me.name.split(' ')[0]}`}
        description="Here’s what’s happening with Wantok Radio Light listeners."
        actions={
          can.addRecords && (
            <Button icon={Plus} onClick={() => setCreating(true)}>
              New record
            </Button>
          )
        }
      />

      <WeeklyReminder />

      <ScheduleChangeBanner />

      {(myTasks.length > 0 ||
        newToksave.length > 0 ||
        referrals.length > 0 ||
        (salvationPending.length > 0 && me.role === 'Ministry Chaplain')) && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {myTasks.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('tasks', myTasks.length === 1 ? { open: myTasks[0]!.id } : undefined)}
              className={
                overdueTasks
                  ? 'flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-left transition hover:bg-red-100'
                  : 'flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left transition hover:bg-sky-100'
              }
            >
              <span
                className={
                  overdueTasks ? 'rounded-xl bg-white p-2 text-flame-600' : 'rounded-xl bg-white p-2 text-sky-700'
                }
              >
                <ListTodo className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-stone-900">
                  {myTasks.length} open {myTasks.length === 1 ? 'task' : 'tasks'} assigned to you
                </span>
                <span className={overdueTasks ? 'block text-sm text-flame-600' : 'block text-sm text-sky-800'}>
                  {overdueTasks ? `${overdueTasks} overdue — please update` : 'Open your task list'}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-stone-500" />
            </button>
          )}
          {newToksave.length > 0 && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  'records',
                  newToksave.length === 1 ? { open: newToksave[0]!.targetId } : { category: 'Toksave' },
                )
              }
              className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:bg-amber-100"
            >
              <span className="rounded-xl bg-white p-2 text-amber-700">
                <Megaphone className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-amber-950">
                  {newToksave.length} new {newToksave.length === 1 ? 'toksave' : 'toksaves'}
                </span>
                <span className="block text-sm text-amber-800">Sent straight to you from the studio</span>
              </span>
              <ArrowRight className="h-4 w-4 text-amber-700" />
            </button>
          )}
          {referrals.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('records', { open: referrals[0]!.id })}
              className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left transition hover:bg-violet-100"
            >
              <span className="rounded-xl bg-white p-2 text-violet-700">
                <UserPlus className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-violet-950">
                  {referrals.length} {referrals.length === 1 ? 'listener needs' : 'listeners need'} your follow-up
                </span>
                <span className="block text-sm text-violet-800">Referred to you by colleagues</span>
              </span>
              <ArrowRight className="h-4 w-4 text-violet-700" />
            </button>
          )}
          {salvationPending.length > 0 && me.role === 'Ministry Chaplain' && (
            <button
              type="button"
              onClick={() => navigate('records', { open: salvationPending[0]!.id })}
              className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:bg-amber-100"
            >
              <span className="rounded-xl bg-white p-2 text-amber-700">
                <HandHeart className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-amber-950">
                  {salvationPending.length} salvation requests to follow up
                </span>
                <span className="block text-sm text-amber-800">Pray with them and mark souls saved</span>
              </span>
              <ArrowRight className="h-4 w-4 text-amber-700" />
            </button>
          )}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {options.length > 1 ? (
          <Segmented<Scope> label="Whose records" value={scope} onChange={setScope} options={options} />
        ) : (
          <p className="text-sm font-semibold text-stone-600">Your records</p>
        )}
        <Select
          aria-label="Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          options={PERIODS}
          className="w-40"
        />
      </div>

      {loading ? <Spinner /> : <RecordAnalytics stats={stats} />}

      {!loading && recent.length > 0 && (
        <Card
          className="mt-6"
          title="Latest records"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('records')}>
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          }
          bodyClassName="px-2 pb-2 pt-3"
        >
          <ul className="divide-y divide-stone-100">
            {recent.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => navigate('records', { open: r.id })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-stone-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-stone-900">{r.fullName}</span>
                    <span className="block truncate text-xs text-stone-500">
                      {placeOf(r)} · {r.createdByName}
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <CategoryBadge category={r.messageCategory} />
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs text-stone-400">{timeAgo(r.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {creating && <RecordForm open onClose={() => setCreating(false)} />}
    </>
  );
}
