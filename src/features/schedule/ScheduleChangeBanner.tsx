import { ArrowRight, CalendarX } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useNav } from '../../context/NavContext';
import { cn } from '../../lib/cn';
import { describeWhen, isSoon, isToday } from '../../services/scheduleChanges';

/** Shows schedule changes happening today or in the coming week. */
export function ScheduleChangeBanner({ className }: { className?: string }) {
  const { scheduleChanges } = useData();
  const { navigate } = useNav();
  const soon = scheduleChanges.filter((c) => isSoon(c)).slice(0, 3);
  if (!soon.length) return null;

  return (
    <div className={cn('mb-6 space-y-2', className)}>
      {soon.map((c) => {
        const today = isToday(c);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => navigate('schedule', { open: c.id })}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition',
              today ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-stone-200 bg-white hover:bg-stone-50',
            )}
          >
            <span className={cn('rounded-xl p-2', today ? 'bg-white text-flame-600' : 'bg-stone-100 text-stone-600')}>
              <CalendarX className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold break-words text-stone-900">
                {today ? 'Today: ' : ''}
                {c.title}
              </span>
              <span className={cn('block text-sm', today ? 'text-red-800' : 'text-stone-500')}>
                Show prep not used · {describeWhen(c)}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-stone-400" />
          </button>
        );
      })}
    </div>
  );
}
