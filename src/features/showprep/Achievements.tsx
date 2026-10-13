import { cn } from '../../lib/cn';
import { ACHIEVEMENTS } from '../../lib/stats';

export function Achievements({ streak }: { streak: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACHIEVEMENTS.map((a) => {
        const earned = streak >= a.weeks;
        return (
          <div
            key={a.label}
            className={cn(
              'rounded-xl border p-3 text-center transition',
              earned ? 'border-amber-200 bg-amber-50' : 'border-stone-200 bg-stone-50 opacity-60',
            )}
          >
            <div className={cn('text-2xl', !earned && 'grayscale')} aria-hidden>
              {a.medal}
            </div>
            <p className="mt-1 text-sm font-bold text-stone-900">{a.label}</p>
            <p className="text-xs text-stone-500">
              {a.weeks}-week streak{earned ? ' · earned' : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}
