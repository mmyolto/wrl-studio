import { ChevronRight, Download, FileText, Plus, Search, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { EmptyState, PageHeader, Segmented, Spinner } from '../../components/ui/misc';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNav } from '../../context/NavContext';
import { MESSAGE_CATEGORIES, SALVATION } from '../../lib/constants';
import { downloadRecordsCsv } from '../../lib/csv';
import { formatDate } from '../../lib/format';
import { permissionsFor } from '../../lib/permissions';
import { inPeriod, PERIODS, type Period } from '../../lib/stats';
import type { ListenerRecord } from '../../lib/types';
import { markNotificationsRead } from '../../services/notifications';
import { CategoryBadge, placeOf, StatusBadges } from './badges';
import { RecordDetail } from './RecordDetail';
import { RecordForm } from './RecordForm';
import { useScopedRecords, type Scope } from './scope';

type Status = 'any' | 'referred' | 'flagged' | 'salvation';

const PAGE_SIZE = 30;

function matches(r: ListenerRecord, q: string) {
  if (!q) return true;
  return [
    r.fullName,
    r.location,
    r.province,
    r.country,
    r.message,
    r.phoneNumber,
    r.facebookName,
    r.emailAddress,
    r.createdByName,
    r.songTitle,
    r.artist,
  ]
    .filter(Boolean)
    .some((v) => v!.toLowerCase().includes(q));
}

export function RecordsPage() {
  const me = useCurrentUser();
  const can = permissionsFor(me.role);
  const { notifications, records } = useData();
  const { params, navigate } = useNav();
  const { scope, setScope, options, scoped, loading } = useScopedRecords('records-scope');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<Status>('any');
  const [period, setPeriod] = useState<Period>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [creating, setCreating] = useState(false);

  const openId = params.get('open');
  // Look in every visible record so a link from a notification opens whatever scope is chosen.
  const openRecord = openId ? (records.find((r) => r.id === openId) ?? null) : null;

  // ?category=Toksave (from the Overview) shows just that category across all records.
  const categoryParam = params.get('category');
  useEffect(() => {
    if (!categoryParam) return;
    setCategory(categoryParam);
    if (options.some((o) => o.value === 'all')) setScope('all');
    navigate('records');
  }, [categoryParam, navigate, options, setScope]);

  // Opening a toksave clears its alert.
  useEffect(() => {
    if (!openId) return;
    const ids = notifications.filter((n) => n.type === 'toksave' && !n.read && n.targetId === openId).map((n) => n.id);
    if (ids.length) markNotificationsRead(ids).catch(() => undefined);
  }, [openId, notifications]);
  const setOpen = (id: string | null) => navigate('records', id ? { open: id } : undefined);

  // The Chaplain's "flagged for prayer" alerts clear once they look at the records.
  useEffect(() => {
    if (me.role !== 'Ministry Chaplain') return;
    const ids = notifications.filter((n) => n.type === 'flagged_prayer' && !n.read).map((n) => n.id);
    if (ids.length) markNotificationsRead(ids).catch(() => undefined);
  }, [me.role, notifications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inPeriod(scoped, period).filter((r) => {
      if (category && r.messageCategory !== category) return false;
      if (status === 'referred' && !(r.referredTo === me.id && r.referralStatus === 'pending')) return false;
      if (status === 'flagged' && !r.flaggedForPrayer) return false;
      if (status === 'salvation' && !(r.prayerCategory === SALVATION && r.salvationStatus !== 'soul_saved'))
        return false;
      return matches(r, q);
    });
  }, [scoped, period, category, status, search, me.id]);

  useEffect(() => setLimit(PAGE_SIZE), [search, category, status, period, scope]);

  const referredCount = scoped.filter((r) => r.referredTo === me.id && r.referralStatus === 'pending').length;
  const filtersActive = !!(search || category || status !== 'any' || period !== 'all');
  const visible = filtered.slice(0, limit);

  return (
    <>
      <PageHeader
        title="Listener records"
        description={
          can.viewAllRecords
            ? 'Calls, messages and prayer requests from listeners.'
            : 'Your listener records and anything referred to you.'
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => downloadRecordsCsv(filtered)}
              disabled={!filtered.length}
            >
              Export CSV
            </Button>
            {can.addRecords && (
              <Button icon={Plus} onClick={() => setCreating(true)}>
                New record
              </Button>
            )}
          </>
        }
      />

      {options.length > 1 && (
        <div className="mb-4">
          <Segmented<Scope> label="Whose records" value={scope} onChange={setScope} options={options} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, place, phone, message…"
            className="pl-9"
            aria-label="Search records"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
          <Select
            aria-label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="All categories"
            options={MESSAGE_CATEGORIES}
            className="lg:w-44"
          />
          <Select
            aria-label="Follow-up"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            options={[
              { value: 'any', label: 'Any follow-up' },
              { value: 'referred', label: `Referred to me (${referredCount})` },
              { value: 'flagged', label: 'Flagged for prayer' },
              { value: 'salvation', label: 'Salvation pending' },
            ]}
            className="lg:w-48"
          />
          <Select
            aria-label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            options={PERIODS}
            className="col-span-2 sm:col-span-1 lg:w-36"
          />
        </div>
      </div>

      {referredCount > 0 && status !== 'referred' && (
        <button
          type="button"
          onClick={() => setStatus('referred')}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-left text-sm text-violet-900 transition hover:bg-violet-100"
        >
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-600 px-1.5 text-xs font-bold text-white">
            {referredCount}
          </span>
          <span className="flex-1">
            {referredCount === 1 ? 'A listener has' : 'Listeners have'} been referred to you and{' '}
            {referredCount === 1 ? 'is' : 'are'} waiting for follow-up.
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {loading ? (
        <Spinner label="Loading records…" />
      ) : filtered.length === 0 ? (
        filtersActive ? (
          <EmptyState
            icon={SearchX}
            title="No records match"
            description="Try a different search or clear the filters."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setCategory('');
                  setStatus('any');
                  setPeriod('all');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No listener records yet"
            description={
              can.addRecords
                ? 'Record the first call, SMS or message from a listener.'
                : 'Records entered by the team will appear here.'
            }
            action={
              can.addRecords && (
                <Button icon={Plus} onClick={() => setCreating(true)}>
                  New record
                </Button>
              )
            }
          />
        )
      ) : (
        <>
          <p className="mb-2 px-1 text-xs font-medium text-stone-500">
            Showing {visible.length} of {filtered.length}
          </p>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Listener</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Place</th>
                  <th className="px-4 py-3">Follow-up</th>
                  <th className="px-4 py-3">Recorded</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visible.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setOpen(r.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setOpen(r.id)}
                    tabIndex={0}
                    className="cursor-pointer transition hover:bg-brand-50/40 focus:bg-brand-50/60 focus:outline-none"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-900">{r.fullName}</p>
                      <p className="max-w-xs truncate text-xs text-stone-500">{r.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={r.messageCategory} />
                      {r.prayerCategory && <p className="mt-1 text-xs text-stone-500">{r.prayerCategory}</p>}
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {placeOf(r)}
                      <p className="text-xs text-stone-500">{r.communicationMethod}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadges record={r} meId={me.id} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-stone-700">
                      {formatDate(r.createdAt)}
                      <p className="text-xs text-stone-500">{r.createdByName}</p>
                    </td>
                    <td className="pr-3 text-stone-300">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {visible.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpen(r.id)}
                  className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition active:bg-stone-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-stone-900">{r.fullName}</p>
                    <span className="shrink-0 text-xs text-stone-500">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {placeOf(r)} · {r.communicationMethod}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-stone-600">{r.message}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <CategoryBadge category={r.messageCategory} />
                    <StatusBadges record={r} meId={me.id} />
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {filtered.length > limit && (
            <div className="mt-5 text-center">
              <Button variant="secondary" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                Show more ({filtered.length - limit} left)
              </Button>
            </div>
          )}
        </>
      )}

      {creating && <RecordForm open onClose={() => setCreating(false)} />}
      {openRecord && <RecordDetail key={openRecord.id} record={openRecord} onClose={() => setOpen(null)} />}
    </>
  );
}
