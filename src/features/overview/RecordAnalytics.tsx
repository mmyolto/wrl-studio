import { FileText, Globe, HandHeart, MapPin } from 'lucide-react';
import { BarList, Meter, ShareBar } from '../../components/charts/charts';
import { Card, StatTile } from '../../components/ui/misc';
import { pct } from '../../lib/format';
import { ranked, type RecordStats } from '../../lib/stats';

/** The analytics grid shared by Overview and Reports. `expanded` shows every row (for printing). */
export function RecordAnalytics({ stats, expanded = false }: { stats: RecordStats; expanded?: boolean }) {
  const limit = expanded ? 1000 : 8;
  const marriage = ranked(stats.byMarriageProblem);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Listener records" value={stats.total} icon={FileText} />
        <StatTile
          label="In PNG"
          value={stats.png}
          hint={`${pct(stats.png, stats.total)}% of records`}
          icon={MapPin}
          accent="sky"
        />
        <StatTile
          label="Overseas"
          value={stats.overseas}
          hint={`${Object.keys(stats.byCountry).length} countries`}
          icon={Globe}
          accent="sun"
        />
        <StatTile
          label="Souls saved"
          value={stats.soulsSaved}
          hint={`${stats.salvationPending} still to follow up`}
          icon={HandHeart}
          accent="flame"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Message categories" description="What listeners contacted us about">
          <BarList data={ranked(stats.byCategory)} limit={limit} />
        </Card>
        <Card title="Prayer requests" description="By prayer category">
          <BarList data={ranked(stats.byPrayer)} limit={limit} empty="No prayer requests in this period" />
        </Card>
        <Card title="Provinces" description="Listeners inside Papua New Guinea">
          <BarList data={ranked(stats.byProvince)} limit={limit} empty="No PNG listeners in this period" />
        </Card>
        <Card title="Overseas countries" description="Listeners outside PNG">
          <BarList data={ranked(stats.byCountry)} limit={limit} empty="No overseas listeners in this period" />
        </Card>
        <Card title="How listeners reached us">
          <BarList data={ranked(stats.byMethod)} limit={limit} />
        </Card>
        <Card title="Gender">
          <ShareBar data={ranked(stats.byGender)} />
        </Card>
        <Card title="PNG and overseas">
          <ShareBar
            data={[
              ['Papua New Guinea', stats.png],
              ['Overseas', stats.overseas],
            ]}
          />
        </Card>
        <Card title="Salvation follow-up" description="Salvation requests and how many have been followed up">
          {stats.salvationTotal === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">No salvation requests in this period</p>
          ) : (
            <div className="space-y-5">
              <Meter value={stats.soulsSaved} total={stats.salvationTotal} label="Followed up — soul saved" />
              <dl className="grid grid-cols-3 gap-3 text-center">
                {[
                  ['Requests', stats.salvationTotal],
                  ['Souls saved', stats.soulsSaved],
                  ['Pending', stats.salvationPending],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-stone-50 py-3">
                    <dt className="text-xs text-stone-500">{label}</dt>
                    <dd className="text-xl font-extrabold text-stone-900 tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Card>
        {marriage.length > 0 && (
          <Card title="Marriage problems" description="Details given with marriage prayer requests">
            <BarList data={marriage} limit={limit} />
          </Card>
        )}
      </div>
    </div>
  );
}
