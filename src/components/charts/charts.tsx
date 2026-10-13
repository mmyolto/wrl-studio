import { useState } from 'react';
import { cn } from '../../lib/cn';
import { pct } from '../../lib/format';

/** Categorical slots, fixed order (validated for colour-vision deficiency on adjacent pairs). */
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

/**
 * Horizontal bars for comparing magnitudes across categories. One hue (more = longer),
 * labels and values always visible, so nothing depends on colour alone.
 */
export function BarList({
  data,
  limit = 8,
  empty = 'No data yet',
  unit = '',
  format = (v: number) => String(v),
}: {
  data: [string, number][];
  limit?: number;
  empty?: string;
  unit?: string;
  /** How to print each value, e.g. as money. */
  format?: (value: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!data.length) return <p className="py-8 text-center text-sm text-stone-400">{empty}</p>;

  const max = Math.max(...data.map(([, v]) => v), 1);
  const total = data.reduce((n, [, v]) => n + v, 0);
  const rows = expanded ? data : data.slice(0, limit);

  return (
    <div>
      <ul className="space-y-2.5">
        {rows.map(([label, value]) => (
          <li key={label} className="group" title={`${label}: ${format(value)}${unit} (${pct(value, total)}%)`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-stone-700">{label}</span>
              <span className="shrink-0 font-semibold text-stone-900 tabular-nums">
                {format(value)}
                <span className="ml-1.5 text-xs font-normal text-stone-400">{pct(value, total)}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-[width] duration-500 group-hover:bg-brand-600"
                style={{ width: `${Math.max((value / max) * 100, 2)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {data.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="no-print mt-4 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          {expanded ? 'Show fewer' : `Show all ${data.length}`}
        </button>
      )}
    </div>
  );
}

/** Part-to-whole as a single stacked bar with a labelled legend. */
export function ShareBar({
  data,
  empty = 'No data yet',
  colors = SERIES,
}: {
  data: [string, number][];
  empty?: string;
  colors?: string[];
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = data.reduce((n, [, v]) => n + v, 0);
  if (!total) return <p className="py-8 text-center text-sm text-stone-400">{empty}</p>;

  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Share breakdown">
        {data.map(([label, value], i) =>
          value > 0 ? (
            <div
              key={label}
              title={`${label}: ${value} (${pct(value, total)}%)`}
              onMouseEnter={() => setHover(label)}
              onMouseLeave={() => setHover(null)}
              className={cn('h-full transition-opacity', hover && hover !== label && 'opacity-40')}
              style={{ width: `${(value / total) * 100}%`, backgroundColor: colors[i % colors.length] }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {data.map(([label, value], i) => (
          <li
            key={label}
            onMouseEnter={() => setHover(label)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition',
              hover === label && 'bg-stone-50',
            )}
          >
            <span className="flex min-w-0 items-center gap-2 text-stone-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="truncate">{label}</span>
            </span>
            <span className="font-semibold text-stone-900 tabular-nums">
              {value}
              <span className="ml-1.5 text-xs font-normal text-stone-400">{pct(value, total)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A single ratio against a whole, e.g. salvation follow-up progress. */
export function Meter({ value, total, label }: { value: number; total: number; label: string }) {
  const p = pct(value, total);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-stone-600">{label}</span>
        <span className="font-bold text-stone-900 tabular-nums">{p}%</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-stone-100"
        role="progressbar"
        aria-valuenow={p}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
