import { onSnapshot } from 'firebase/firestore';
import { Archive, History, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge, ConfirmDialog, EmptyState, PageHeader, Segmented, Spinner } from '../../components/ui/misc';
import { attempt } from '../../lib/attempt';
import { formatDateTime } from '../../lib/format';
import type { ArchivedRecord } from '../../lib/types';
import { COL, colRef, fromSnap } from '../../services/collections';
import { purgeArchived, restoreArchived } from '../../services/records';
import { useData } from '../../context/DataContext';
import { CategoryBadge, placeOf } from '../records/badges';

type View = 'deleted' | 'edited';

export function ArchivePage() {
  const { records } = useData();
  const [entries, setEntries] = useState<ArchivedRecord[] | null>(null);
  const [view, setView] = useState<View>('deleted');
  const [restoring, setRestoring] = useState<ArchivedRecord | null>(null);
  const [purging, setPurging] = useState<ArchivedRecord | null>(null);

  useEffect(
    () =>
      onSnapshot(
        colRef(COL.archive),
        (snap) =>
          setEntries(
            snap.docs.map((d) => fromSnap<ArchivedRecord>(d)).sort((a, b) => b.archivedAt.localeCompare(a.archivedAt)),
          ),
        () => setEntries([]),
      ),
    [],
  );

  const list = useMemo(() => (entries ?? []).filter((e) => e.archiveType === view), [entries, view]);
  const liveIds = useMemo(() => new Set(records.map((r) => r.id)), [records]);

  return (
    <>
      <PageHeader
        title="Archive"
        description="Deleted records and earlier versions of edited records. Restore anything removed by mistake."
      />
      <div className="mb-5">
        <Segmented<View>
          label="Archive type"
          value={view}
          onChange={setView}
          options={[
            {
              value: 'deleted',
              label: 'Deleted records',
              count: (entries ?? []).filter((e) => e.archiveType === 'deleted').length,
            },
            {
              value: 'edited',
              label: 'Previous versions',
              count: (entries ?? []).filter((e) => e.archiveType === 'edited').length,
            },
          ]}
        />
      </div>

      {entries === null ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState
          icon={view === 'deleted' ? Archive : History}
          title="Nothing archived"
          description="Archived records will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {list.map((e) => {
            const canRestore = e.archiveType === 'deleted' && !liveIds.has(e.originalRecordId);
            return (
              <li
                key={e.id}
                className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-stone-900">{e.fullName}</p>
                    <CategoryBadge category={e.messageCategory} />
                    <Badge tone={e.archiveType === 'deleted' ? 'red' : 'blue'}>
                      {e.archiveType === 'deleted' ? 'Deleted' : 'Earlier version'}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">{e.message}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {placeOf(e)} · recorded by {e.createdByName} · {e.archiveType === 'deleted' ? 'deleted' : 'edited'}{' '}
                    by {e.archivedByName} {formatDateTime(e.archivedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canRestore && (
                    <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => setRestoring(e)}>
                      Restore
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    className="text-flame-600 hover:bg-red-50"
                    onClick={() => setPurging(e)}
                  >
                    Delete forever
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!restoring}
        tone="primary"
        title="Restore this record?"
        message={`${restoring?.fullName} will reappear in Listener records exactly as it was before it was deleted.`}
        confirmLabel="Restore"
        onClose={() => setRestoring(null)}
        onConfirm={() => attempt(() => restoreArchived(restoring!), 'Record restored.')}
      />
      <ConfirmDialog
        open={!!purging}
        title="Delete forever?"
        message="This archived copy will be permanently erased. This cannot be undone."
        confirmLabel="Delete forever"
        onClose={() => setPurging(null)}
        onConfirm={() => attempt(() => purgeArchived([purging!.id]), 'Permanently deleted.')}
      />
    </>
  );
}
