import { Download, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import logo from '../../assets/logo.png';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Field';
import { PageHeader, Segmented, Spinner } from '../../components/ui/misc';
import { useCurrentUser } from '../../context/AuthContext';
import { downloadRecordsCsv } from '../../lib/csv';
import { formatDate, formatDateTime } from '../../lib/format';
import { inPeriod, periodStart, PERIODS, recordStats, type Period } from '../../lib/stats';
import { RecordAnalytics } from '../overview/RecordAnalytics';
import { useScopedRecords, type Scope } from '../records/scope';

export function ReportsPage() {
  const me = useCurrentUser();
  const { scope, setScope, options, scoped, loading } = useScopedRecords('reports-scope');
  const [period, setPeriod] = useState<Period>('month');

  const inRange = useMemo(() => inPeriod(scoped, period), [scoped, period]);
  const stats = useMemo(() => recordStats(inRange), [inRange]);
  const start = periodStart(period);
  const periodLabel = PERIODS.find((p) => p.value === period)!.label;
  const scopeLabel = options.find((o) => o.value === scope)?.label ?? 'All records';

  return (
    <>
      <PageHeader
        title="Reports"
        description="A printable summary of listener activity. Use “Print” and choose “Save as PDF” to share it."
        actions={
          <>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => downloadRecordsCsv(inRange, 'listener-report')}
              disabled={!inRange.length}
            >
              Export CSV
            </Button>
            <Button icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
          </>
        }
      />

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        {options.length > 1 && (
          <Segmented<Scope> label="Whose records" value={scope} onChange={setScope} options={options} />
        )}
        <Select
          aria-label="Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          options={PERIODS}
          className="w-40"
        />
      </div>

      <div className="print-flat mb-6 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <img src={logo} alt="" className="h-14 w-auto self-start" />
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-stone-900">Listener Activity Report</h2>
          <p className="text-sm text-stone-600">
            {scopeLabel} · {periodLabel}
            {start && ` (${formatDate(start)} – ${formatDate(new Date())})`}
          </p>
        </div>
        <p className="text-xs text-stone-500 sm:text-right">
          Prepared by {me.name}
          <br />
          {formatDateTime(new Date())}
        </p>
      </div>

      {loading ? <Spinner /> : <RecordAnalytics stats={stats} expanded />}
    </>
  );
}
