import { ChevronRight, Download, HandCoins, Package, Plus, Search, SearchX, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarList } from '../../components/charts/charts';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { Card, EmptyState, PageHeader, Segmented, Spinner, StatTile } from '../../components/ui/misc';
import { toast } from '../../components/ui/toast';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNav } from '../../context/NavContext';
import { GIFT_TYPES } from '../../lib/constants';
import { downloadGiftsCsv } from '../../lib/csv';
import { formatDay, formatMoney } from '../../lib/format';
import { permissionsFor } from '../../lib/permissions';
import { PERIODS, periodStart, ranked, type Counts, type Period } from '../../lib/stats';
import type { Gift, GiftType } from '../../lib/types';
import { giftValue, outstanding, pledgeStatus, received } from '../../services/gifts';
import { GiftBadges } from './badges';
import { GiftDetail } from './GiftDetail';
import { GiftForm } from './GiftForm';

type Scope = 'all' | 'mine';
type TypeFilter = 'any' | GiftType | 'outstanding';
const PAGE = 30;

const inGiftPeriod = (gifts: Gift[], period: Period) => {
  const start = periodStart(period);
  if (!start) return gifts;
  return gifts.filter((g) => {
    const [y, m, d] = g.giftDate.split('-').map(Number);
    return new Date(y!, m! - 1, d!) >= start;
  });
};

function amountLine(g: Gift) {
  if (g.type === 'pledge')
    return `${formatMoney(received(g), g.currency)} of ${formatMoney(g.pledgeAmount, g.currency)}`;
  if (g.type === 'cash') return formatMoney(received(g), g.currency);
  return g.estimatedValue ? `est. ${formatMoney(g.estimatedValue, g.currency)}` : (g.quantity ?? 'In kind');
}

export function GivingPage() {
  const me = useCurrentUser();
  const can = permissionsFor(me.role);
  const { gifts, giftsLoading } = useData();
  const { params, navigate } = useNav();
  const [scope, setScope] = useState<Scope>('all');
  const [type, setType] = useState<TypeFilter>('any');
  const [period, setPeriod] = useState<Period>('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [creating, setCreating] = useState<GiftType | null>(null);

  const scoped = useMemo(
    () => (can.viewAllGiving && scope === 'all' ? gifts : gifts.filter((g) => g.createdBy === me.id)),
    [gifts, scope, can.viewAllGiving, me.id],
  );
  const inRange = useMemo(() => inGiftPeriod(scoped, period), [scoped, period]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inRange.filter((g) => {
      if (type === 'outstanding' && !(g.type === 'pledge' && pledgeStatus(g) !== 'paid')) return false;
      if (type !== 'any' && type !== 'outstanding' && g.type !== type) return false;
      if (!q) return true;
      return [g.donorName, g.refNo, g.mobile, g.church, g.congregation, g.province, g.country, g.itemDescription]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [inRange, type, search]);

  // Kina totals (overseas gifts in other currencies are counted separately).
  const kina = inRange.filter((g) => g.currency === 'PGK');
  const totals = {
    pledged: kina.filter((g) => g.type === 'pledge').reduce((n, g) => n + (g.pledgeAmount ?? 0), 0),
    received: kina.filter((g) => g.type !== 'kind').reduce((n, g) => n + received(g), 0),
    outstanding: kina.reduce((n, g) => n + outstanding(g), 0),
    kindCount: inRange.filter((g) => g.type === 'kind').length,
    kindValue: kina.filter((g) => g.type === 'kind').reduce((n, g) => n + (g.estimatedValue ?? 0), 0),
  };
  const otherCurrencies = [...new Set(inRange.filter((g) => g.currency !== 'PGK').map((g) => g.currency))];

  const byProvince: Counts = {};
  const byCategory: Counts = {};
  for (const g of kina) {
    if (g.type === 'kind') continue;
    const v = g.type === 'pledge' ? (g.pledgeAmount ?? 0) : giftValue(g);
    const where = g.location === 'PNG' ? g.province || 'Unknown' : 'Overseas';
    byProvince[where] = (byProvince[where] ?? 0) + v;
    byCategory[g.category] = (byCategory[g.category] ?? 0) + v;
  }

  const openId = params.get('open');
  const openGift = openId ? gifts.find((g) => g.id === openId) : undefined;
  const open = (id: string) => navigate('giving', { open: id });
  const visible = filtered.slice(0, limit);

  return (
    <>
      <PageHeader
        title="Pledges & gifts"
        description="Register Shareathon pledges, cash gifts and in-kind gifts from listeners, and track payments."
        actions={
          <>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => downloadGiftsCsv(filtered)}
              disabled={!filtered.length}
            >
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <Button icon={Plus} onClick={() => setCreating('pledge')}>
              Record pledge or gift
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {can.viewAllGiving ? (
          <Segmented<Scope>
            label="Whose entries"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: 'Everyone' },
              { value: 'mine', label: 'Recorded by me' },
            ]}
          />
        ) : (
          <p className="text-sm font-semibold text-stone-600">Entries you recorded</p>
        )}
        <Select
          aria-label="Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          options={PERIODS}
          className="w-40"
        />
      </div>

      {giftsLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <StatTile label="Pledged" value={formatMoney(totals.pledged)} icon={HandCoins} />
            <StatTile
              label="Received"
              value={formatMoney(totals.received)}
              hint="Cash gifts + pledge payments"
              icon={Wallet}
              accent="sky"
            />
            <StatTile label="Still to collect" value={formatMoney(totals.outstanding)} accent="flame" />
            <StatTile
              label="In-kind gifts"
              value={totals.kindCount}
              hint={totals.kindValue ? `est. ${formatMoney(totals.kindValue)}` : undefined}
              icon={Package}
              accent="sun"
            />
          </div>
          {otherCurrencies.length > 0 && (
            <p className="-mt-3 text-xs text-stone-500">
              Totals are in Kina. Overseas entries in {otherCurrencies.join(', ')} are listed below but not added to
              these totals.
            </p>
          )}

          {(Object.keys(byProvince).length > 0 || Object.keys(byCategory).length > 0) && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Pledged and given by province" description="Kina, excluding in-kind gifts">
                <BarList
                  data={ranked(byProvince).map(([k, v]) => [k, Math.round(v)])}
                  format={(v) => formatMoney(v).replace(/\.00$/, '')}
                  limit={6}
                />
              </Card>
              <Card title="By giver category" description="Kina, excluding in-kind gifts">
                <BarList
                  data={ranked(byCategory).map(([k, v]) => [k, Math.round(v)])}
                  format={(v) => formatMoney(v).replace(/\.00$/, '')}
                  limit={6}
                />
              </Card>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLimit(PAGE);
                }}
                placeholder="Search name, reference, phone, church…"
                className="pl-9"
                aria-label="Search pledges and gifts"
              />
            </div>
            <Select
              aria-label="Type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as TypeFilter);
                setLimit(PAGE);
              }}
              options={[
                { value: 'any', label: 'All types' },
                { value: 'pledge', label: 'Pledges' },
                { value: 'outstanding', label: 'Pledges not fully paid' },
                { value: 'cash', label: GIFT_TYPES.cash.label + 's' },
                { value: 'kind', label: GIFT_TYPES.kind.label + 's' },
              ]}
              className="sm:w-56"
            />
          </div>

          {filtered.length === 0 ? (
            search || type !== 'any' || period !== 'all' ? (
              <EmptyState icon={SearchX} title="Nothing matches" description="Try another search or filter." />
            ) : (
              <EmptyState
                icon={HandCoins}
                title="No pledges or gifts yet"
                description="When a listener pledges, gives cash or brings a gift in kind, record it here. Each entry gets a reference number like the paper form."
                action={
                  <Button icon={Plus} onClick={() => setCreating('pledge')}>
                    Record pledge or gift
                  </Button>
                }
              />
            )
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Giver</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {visible.map((g) => (
                      <tr
                        key={g.id}
                        tabIndex={0}
                        onClick={() => open(g.id)}
                        onKeyDown={(e) => e.key === 'Enter' && open(g.id)}
                        className="cursor-pointer transition hover:bg-brand-50/40 focus:bg-brand-50/60 focus:outline-none"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-stone-600">{g.refNo}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-900">{g.donorName}</p>
                          <p className="text-xs text-stone-500">
                            {g.category} · {g.location === 'PNG' ? g.province : g.country}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex flex-wrap gap-1">
                            <GiftBadges gift={g} />
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-stone-900 tabular-nums">
                          {amountLine(g)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-stone-700">
                          {formatDay(g.giftDate)}
                          <p className="text-xs text-stone-500">{g.createdByName}</p>
                        </td>
                        <td className="pr-3 text-stone-300">
                          <ChevronRight className="h-4 w-4" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phone & tablet cards */}
              <ul className="grid gap-2 sm:grid-cols-2 lg:hidden">
                {visible.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => open(g.id)}
                      className="h-full w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition active:bg-stone-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 font-semibold break-words text-stone-900">{g.donorName}</p>
                        <span className="shrink-0 font-mono text-[11px] font-semibold text-stone-500">{g.refNo}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {g.category} · {g.location === 'PNG' ? g.province : g.country} · {formatDay(g.giftDate)}
                      </p>
                      <p className="mt-2 text-base font-extrabold text-stone-900 tabular-nums">{amountLine(g)}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <GiftBadges gift={g} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {filtered.length > limit && (
                <div className="text-center">
                  <Button variant="secondary" onClick={() => setLimit((n) => n + PAGE)}>
                    Show more ({filtered.length - limit} left)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {creating && (
        <GiftForm
          defaultType={creating}
          onClose={() => setCreating(null)}
          onSaved={(id, refNo) => {
            toast.success(`Saved as ${refNo}.`, { action: { label: 'Open', onClick: () => open(id) } });
          }}
        />
      )}
      {openGift && <GiftDetail key={openGift.id} gift={openGift} onClose={() => navigate('giving')} />}
    </>
  );
}
