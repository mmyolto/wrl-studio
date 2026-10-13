import { FileText, Flag, HandHeart, ListPlus, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarList } from '../../components/charts/charts';
import { Button } from '../../components/ui/Button';
import { TaskForm } from '../tasks/TaskForm';
import { permissionsFor } from '../../lib/permissions';
import { Select } from '../../components/ui/Field';
import { Avatar, Card, PageHeader, Spinner, StatTile } from '../../components/ui/misc';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { inPeriod, PERIODS, teamProgress, type Period } from '../../lib/stats';

export function TeamPage() {
  const me = useCurrentUser();
  const { staff, records, recordsLoading, tasks } = useData();
  const [period, setPeriod] = useState<Period>('month');
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const canAssign = permissionsFor(me.role).assignTasks;

  const team = useMemo(() => {
    // Program Directors look after the announcers; GM and Admin see everyone.
    const people =
      me.role === 'Program Director' ? staff.filter((u) => u.role === 'Announcer' || u.id === me.id) : staff;
    return teamProgress(people, inPeriod(records, period));
  }, [staff, records, period, me.role, me.id]);

  const totals = team.reduce(
    (t, p) => ({
      entries: t.entries + p.entries,
      soulsSaved: t.soulsSaved + p.soulsSaved,
      flagged: t.flagged + p.flagged,
      referrals: t.referrals + p.referralsSent,
    }),
    { entries: 0, soulsSaved: 0, flagged: 0, referrals: 0 },
  );

  return (
    <>
      <PageHeader
        title="Team progress"
        description={
          me.role === 'Program Director' ? 'How your announcers are doing.' : 'Work done by each member of staff.'
        }
        actions={
          <Select
            aria-label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            options={PERIODS}
            className="w-40"
          />
        }
      />

      {recordsLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Records entered" value={totals.entries} icon={FileText} />
            <StatTile label="Souls saved" value={totals.soulsSaved} icon={HandHeart} accent="flame" />
            <StatTile label="Flagged for prayer" value={totals.flagged} icon={Flag} accent="sun" />
            <StatTile label="Referrals made" value={totals.referrals} icon={UserPlus} accent="sky" />
          </div>

          <Card title="Records entered" description="Per staff member in the selected period">
            <BarList
              data={team.filter((p) => p.entries > 0).map((p) => [p.user.name, p.entries])}
              limit={10}
              empty="No records in this period"
            />
          </Card>

          {/* Phones: one card per person */}
          <ul className="space-y-2 md:hidden">
            {team.map((p) => {
              const open = tasks.filter((t) => t.assignedTo === p.user.id && t.status !== 'done').length;
              return (
                <li key={p.user.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.user.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-stone-900">{p.user.name}</p>
                      <p className="truncate text-xs text-stone-500">{p.user.role}</p>
                    </div>
                    {canAssign && (
                      <Button
                        size="sm"
                        variant="soft"
                        icon={ListPlus}
                        onClick={() => setAssignTo(p.user.id)}
                        aria-label={`Assign a task to ${p.user.name}`}
                      >
                        Task
                      </Button>
                    )}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
                    {[
                      ['Records', p.entries],
                      ['Prayer', p.prayerRequests],
                      ['Souls saved', p.soulsSaved],
                      ['Flagged', p.flagged],
                      ['Referrals', `${p.referralsCompleted}/${p.referralsReceived}`],
                      ['Open tasks', open],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-stone-50 py-1.5">
                        <dt className="text-stone-500">{label}</dt>
                        <dd className="text-base font-bold text-stone-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Staff member</th>
                  <th className="px-3 py-3 text-right">Records</th>
                  <th className="px-3 py-3 text-right">Prayer</th>
                  <th className="px-3 py-3 text-right">Songs</th>
                  <th className="px-3 py-3 text-right">Toksave</th>
                  <th className="px-3 py-3 text-right">Souls saved</th>
                  <th className="px-3 py-3 text-right">Flagged</th>
                  <th className="px-3 py-3 text-right">Referrals sent</th>
                  <th className="px-3 py-3 text-right">Referrals done</th>
                  <th className="px-4 py-3 text-right">Open tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 tabular-nums">
                {team.map((p) => (
                  <tr key={p.user.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.user.name} size="sm" />
                        <div>
                          <p className="font-semibold text-stone-900">{p.user.name}</p>
                          <p className="text-xs text-stone-500">{p.user.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold">{p.entries}</td>
                    <td className="px-3 py-3 text-right">{p.prayerRequests}</td>
                    <td className="px-3 py-3 text-right">{p.songRequests}</td>
                    <td className="px-3 py-3 text-right">{p.toksave}</td>
                    <td className="px-3 py-3 text-right">{p.soulsSaved}</td>
                    <td className="px-3 py-3 text-right">{p.flagged}</td>
                    <td className="px-3 py-3 text-right">{p.referralsSent}</td>
                    <td className="px-3 py-3 text-right">
                      {p.referralsCompleted}/{p.referralsReceived}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {tasks.filter((t) => t.assignedTo === p.user.id && t.status !== 'done').length}
                        {canAssign && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={ListPlus}
                            aria-label={`Assign a task to ${p.user.name}`}
                            title="Assign a task"
                            onClick={() => setAssignTo(p.user.id)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {assignTo && <TaskForm presetAssignee={assignTo} onClose={() => setAssignTo(null)} />}
    </>
  );
}
