import { BellRing, X } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNav } from '../../context/NavContext';
import { useStoredState } from '../../hooks/useStoredState';
import { startOfWeek, toDayInput } from '../../lib/format';
import { permissionsFor } from '../../lib/permissions';
import { prepStats } from '../../lib/stats';

/**
 * Gentle banner for presenters who haven't submitted show prep this week.
 * Hidden while they're on leave, and can be dismissed until next Sunday.
 */
export function WeeklyReminder({ showAction = true }: { showAction?: boolean }) {
  const me = useCurrentUser();
  const { showPreps, showPrepsLoading } = useData();
  const { navigate } = useNav();
  const week = toDayInput(startOfWeek());
  const [dismissedWeek, setDismissedWeek] = useStoredState<string>(`wrl:reminder:${me.id}`, '');

  const submitted = useMemo(
    () => prepStats(showPreps.filter((p) => p.submittedBy === me.id)).submittedThisWeek,
    [showPreps, me.id],
  );

  const away = (me.availability ?? 'active') !== 'active';
  if (!permissionsFor(me.role).showPrepReminder || away || showPrepsLoading || submitted || dismissedWeek === week) {
    return null;
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:items-center">
      <span className="rounded-xl bg-amber-100 p-2 text-amber-700">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-amber-950">This week’s show prep isn’t in yet</p>
        <p className="text-sm text-amber-800">
          {me.role === 'Program Director'
            ? 'Submit your own prep and check on your announcers in the tracker.'
            : 'Submit it before Saturday to keep your weekly streak going.'}
        </p>
      </div>
      {showAction && (
        <Button size="sm" onClick={() => navigate('show-prep', { new: '1' })} className="hidden sm:inline-flex">
          Submit now
        </Button>
      )}
      <button
        type="button"
        onClick={() => setDismissedWeek(week)}
        className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-100"
        aria-label="Dismiss until next week"
        title="Dismiss until next week"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
