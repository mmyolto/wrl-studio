import { CalendarCheck, CalendarDays, CalendarX, ChevronRight, Flame, Mic, Plus, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, PageHeader, Spinner, StatTile } from '../../components/ui/misc';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNav } from '../../context/NavContext';
import { formatDate, formatDay, plural } from '../../lib/format';
import { prepStats } from '../../lib/stats';
import { Achievements } from './Achievements';
import { InterviewBadge, ReviewBadge, ShowPrepDetail } from './ShowPrepDetail';
import { ShowPrepForm } from './ShowPrepForm';
import { WeeklyReminder } from './WeeklyReminder';
import { ScheduleChangeBanner } from '../schedule/ScheduleChangeBanner';

export function ShowPrepPage() {
  const me = useCurrentUser();
  const { showPreps, showPrepsLoading } = useData();
  const { params, navigate } = useNav();
  const [creating, setCreating] = useState(false);

  const mine = useMemo(() => showPreps.filter((p) => p.submittedBy === me.id), [showPreps, me.id]);
  const stats = useMemo(() => prepStats(mine), [mine]);

  // Deep links: ?new=1 opens the form, ?open=<id> opens a submission.
  useEffect(() => {
    if (params.get('new')) {
      setCreating(true);
      navigate('show-prep');
    }
  }, [params, navigate]);
  const openId = params.get('open');
  const open = openId ? mine.find((p) => p.id === openId) : undefined;

  return (
    <>
      <PageHeader
        title="My show prep"
        description="Plan each week’s show and keep your streak going. Weeks run Sunday to Saturday."
        actions={
          <>
            <Button variant="secondary" icon={CalendarX} onClick={() => navigate('schedule', { new: '1' })}>
              Show prep not used
            </Button>
            <Button icon={Plus} onClick={() => setCreating(true)}>
              New show prep
            </Button>
          </>
        }
      />

      <ScheduleChangeBanner />
      <WeeklyReminder showAction={false} />

      {showPrepsLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {stats.submittedThisWeek && (
            <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
              <CalendarCheck className="h-5 w-5 text-brand-600" />
              This week’s show prep is in. Well done!
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="This week" value={stats.thisWeek} icon={CalendarCheck} />
            <StatTile label="This month" value={stats.thisMonth} icon={CalendarDays} accent="sky" />
            <StatTile label="All time" value={stats.total} icon={Mic} accent="stone" />
            <StatTile
              label="Weekly streak"
              value={stats.streak}
              hint={plural(stats.streak, 'week')}
              icon={Flame}
              accent="flame"
            />
          </div>

          <Card
            title="Achievements"
            description="Earn medals by submitting every week."
            action={<Trophy className="h-5 w-5 text-amber-500" />}
          >
            <Achievements streak={stats.streak} />
          </Card>

          <Card title="Your submissions" bodyClassName="p-2 pt-3">
            {mine.length === 0 ? (
              <div className="p-3">
                <EmptyState
                  icon={Mic}
                  title="No show prep yet"
                  description="Submit your first weekly plan to start your streak."
                  action={
                    <Button icon={Plus} onClick={() => setCreating(true)}>
                      New show prep
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {mine.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => navigate('show-prep', { open: p.id })}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-stone-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-stone-900">{p.showName}</span>
                        <span className="block text-xs text-stone-500">
                          Week of {formatDay(p.weekStarting)} · submitted {formatDate(p.createdAt)}
                        </span>
                      </span>
                      <InterviewBadge prep={p} />
                      <ReviewBadge prep={p} />
                      <ChevronRight className="h-4 w-4 text-stone-300" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {creating && <ShowPrepForm onClose={() => setCreating(false)} />}
      {open && <ShowPrepDetail key={open.id} prep={open} onClose={() => navigate('show-prep')} />}
    </>
  );
}
