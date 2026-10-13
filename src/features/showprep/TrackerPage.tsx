import { CircleCheck, CircleX, ClipboardList, Download, Flame, Inbox, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Avatar, Badge, Card, EmptyState, PageHeader, Segmented, Spinner, StatTile } from '../../components/ui/misc';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNav } from '../../context/NavContext';
import { attemptQuietly } from '../../lib/attempt';
import { AVAILABILITY } from '../../lib/constants';
import { formatDate, formatDay, plural, timeAgo } from '../../lib/format';
import { downloadTrackerPdf } from '../../lib/pdf';
import { isOnAir, prepStats, type PrepStats } from '../../lib/stats';
import type { UserProfile } from '../../lib/types';
import { ScheduleChangeBanner } from '../schedule/ScheduleChangeBanner';
import { Achievements } from './Achievements';
import { InterviewBadge, ReviewBadge, ShowPrepDetail } from './ShowPrepDetail';

type Filter = 'all' | 'missing' | 'review';

interface Row {
  user: UserProfile;
  stats: PrepStats;
}

export function TrackerPage() {
  const me = useCurrentUser();
  const { staff, showPreps, showPrepsLoading } = useData();
  const { params, navigate } = useNav();
  const [filter, setFilter] = useState<Filter>('all');
  const [person, setPerson] = useState<Row | null>(null);

  const rows: Row[] = useMemo(() => {
    const submitters = new Set(showPreps.map((p) => p.submittedBy));
    return staff
      .filter((u) => isOnAir(u.role) || submitters.has(u.id))
      .map((user) => ({ user, stats: prepStats(showPreps.filter((p) => p.submittedBy === user.id)) }))
      .sort(
        (a, b) =>
          Number(a.stats.submittedThisWeek) - Number(b.stats.submittedThisWeek) ||
          a.user.name.localeCompare(b.user.name),
      );
  }, [staff, showPreps]);

  const toReview = showPreps.filter((p) => !p.reviewedAt && p.submittedBy !== me.id);
  const submitted = rows.filter((r) => r.stats.submittedThisWeek).length;
  const missing = rows.filter((r) => !r.stats.submittedThisWeek);

  const openId = params.get('open');
  const openPrep = openId ? showPreps.find((p) => p.id === openId) : undefined;
  const openPrepFor = (id: string) => navigate('tracker', { open: id });

  const visibleRows = filter === 'missing' ? missing : rows;
  const personRow = person ? (rows.find((r) => r.user.id === person.user.id) ?? person) : null;

  return (
    <>
      <PageHeader
        title="Show prep tracker"
        description="Who has planned this week’s show, streaks, and submissions waiting for review."
        actions={
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => attemptQuietly(() => downloadTrackerPdf(rows))}
            disabled={!rows.length}
          >
            Export PDF
          </Button>
        }
      />

      <ScheduleChangeBanner />

      {showPrepsLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Presenters" value={rows.length} icon={Users} accent="stone" />
            <StatTile label="Submitted this week" value={`${submitted}/${rows.length}`} icon={CircleCheck} />
            <StatTile label="Missing this week" value={missing.length} icon={CircleX} accent="flame" />
            <StatTile label="Waiting for review" value={toReview.length} icon={Inbox} accent="sun" />
          </div>

          <Segmented<Filter>
            label="Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Everyone', count: rows.length },
              { value: 'missing', label: 'Missing this week', count: missing.length },
              { value: 'review', label: 'To review', count: toReview.length },
            ]}
          />

          {filter === 'review' ? (
            toReview.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nothing to review"
                description="New show prep submissions will appear here."
              />
            ) : (
              <Card bodyClassName="p-2">
                <ul className="divide-y divide-stone-100">
                  {toReview.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => openPrepFor(p.id)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-stone-50"
                      >
                        <Avatar name={p.submittedByName} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-stone-900">{p.showName}</span>
                          <span className="block text-xs text-stone-500">
                            {p.submittedByName} · week of {formatDay(p.weekStarting)} · {timeAgo(p.createdAt)}
                          </span>
                        </span>
                        <Badge tone="amber">Review</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          ) : visibleRows.length === 0 ? (
            <EmptyState
              icon={Users}
              title={filter === 'missing' ? 'Everyone has submitted' : 'No presenters yet'}
              description={
                filter === 'missing' ? 'All show prep for this week is in.' : 'Add Announcers on the Staff page.'
              }
            />
          ) : (
            <>
              {/* Phones: one card per presenter */}
              <ul className="space-y-2 md:hidden">
                {visibleRows.map((row) => {
                  const away = (row.user.availability ?? 'active') !== 'active';
                  return (
                    <li key={row.user.id}>
                      <button
                        type="button"
                        onClick={() => setPerson(row)}
                        className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm active:bg-stone-50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={row.user.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-stone-900">{row.user.name}</p>
                            <p className="truncate text-xs text-stone-500">
                              {row.user.role}
                              {away && ` · ${AVAILABILITY[row.user.availability!].label}`}
                            </p>
                          </div>
                          {row.stats.submittedThisWeek ? (
                            <Badge tone="brand" icon={CircleCheck}>
                              Submitted
                            </Badge>
                          ) : away ? (
                            <Badge tone="neutral">Away</Badge>
                          ) : (
                            <Badge tone="red" icon={CircleX}>
                              Missing
                            </Badge>
                          )}
                        </div>
                        <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                          {[
                            ['Month', row.stats.thisMonth],
                            ['Total', row.stats.total],
                            ['Streak', row.stats.streak],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-lg bg-stone-50 py-1.5">
                              <dt className="text-stone-500">{label}</dt>
                              <dd className="text-base font-bold text-stone-900 tabular-nums">{value}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="mt-2 text-xs text-stone-500">
                          Last submitted {row.stats.lastSubmission ? formatDate(row.stats.lastSubmission) : 'never'}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Presenter</th>
                      <th className="px-4 py-3">This week</th>
                      <th className="px-4 py-3 text-right">Month</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Streak</th>
                      <th className="px-4 py-3">Last submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {visibleRows.map((row) => {
                      const away = (row.user.availability ?? 'active') !== 'active';
                      return (
                        <tr
                          key={row.user.id}
                          tabIndex={0}
                          onClick={() => setPerson(row)}
                          onKeyDown={(e) => e.key === 'Enter' && setPerson(row)}
                          className="cursor-pointer transition hover:bg-brand-50/40 focus:bg-brand-50/60 focus:outline-none"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={row.user.name} size="sm" />
                              <div>
                                <p className="font-semibold text-stone-900">{row.user.name}</p>
                                <p className="text-xs text-stone-500">
                                  {row.user.role}
                                  {away && ` · ${AVAILABILITY[row.user.availability!].label}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {row.stats.submittedThisWeek ? (
                              <Badge tone="brand" icon={CircleCheck}>
                                Submitted
                              </Badge>
                            ) : away ? (
                              <Badge tone="neutral">Away</Badge>
                            ) : (
                              <Badge tone="red" icon={CircleX}>
                                Missing
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.stats.thisMonth}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.stats.total}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {row.stats.streak > 0 ? (
                              <span className="inline-flex items-center gap-1 text-flame-600">
                                <Flame className="h-3.5 w-3.5" />
                                {row.stats.streak}
                              </span>
                            ) : (
                              <span className="text-stone-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-stone-600">
                            {row.stats.lastSubmission ? formatDate(row.stats.lastSubmission) : 'Never'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {personRow && (
        <Modal
          open
          variant="drawer"
          onClose={() => setPerson(null)}
          title={personRow.user.name}
          description={`${personRow.user.role} · ${plural(personRow.stats.streak, 'week')} streak`}
        >
          <div className="space-y-6">
            <div
              className={
                personRow.stats.submittedThisWeek
                  ? 'rounded-xl bg-brand-50 p-3 text-sm text-brand-900'
                  : 'rounded-xl bg-red-50 p-3 text-sm text-red-800'
              }
            >
              {personRow.stats.submittedThisWeek
                ? `On track — ${plural(personRow.stats.thisWeek, 'submission')} this week.`
                : 'No show prep this week yet. Consider following up.'}
            </div>
            <dl className="grid grid-cols-3 gap-3 text-center">
              {[
                ['This month', personRow.stats.thisMonth],
                ['All time', personRow.stats.total],
                ['Streak', personRow.stats.streak],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-stone-50 py-3">
                  <dt className="text-xs text-stone-500">{label}</dt>
                  <dd className="text-xl font-extrabold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <Achievements streak={personRow.stats.streak} />
            <div>
              <h3 className="mb-2 text-sm font-bold text-stone-900">Submissions</h3>
              {personRow.stats.recent.length === 0 ? (
                <p className="text-sm text-stone-500">No submissions yet.</p>
              ) : (
                <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                  {personRow.stats.recent.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => openPrepFor(p.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-stone-50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{p.showName}</span>
                          <span className="block text-xs text-stone-500">Week of {formatDay(p.weekStarting)}</span>
                        </span>
                        <InterviewBadge prep={p} />
                        <ReviewBadge prep={p} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Modal>
      )}

      {openPrep && <ShowPrepDetail key={openPrep.id} prep={openPrep} onClose={() => navigate('tracker')} />}
    </>
  );
}
