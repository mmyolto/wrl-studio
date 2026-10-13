import { LoaderCircle, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';
import { Button } from './Button';
import { Modal } from './Modal';

// ---------- Badge ----------

const TONES = {
  neutral: 'bg-stone-100 text-stone-700 ring-stone-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  solidRed: 'bg-flame-600 text-white ring-flame-600',
} as const;

export type Tone = keyof typeof TONES;

export function Badge({
  tone = 'neutral',
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {children}
    </span>
  );
}

// ---------- Card ----------

export function Card({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('print-flat min-w-0 rounded-2xl border border-stone-200 bg-white shadow-sm', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div>
            {title && <h3 className="text-base font-bold text-stone-900">{title}</h3>}
            {description && <p className="mt-0.5 text-sm text-stone-500">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

// ---------- Page header ----------

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 text-sm text-stone-500 sm:text-base">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------- Stat tile ----------

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'brand',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  accent?: 'brand' | 'sun' | 'flame' | 'sky' | 'stone';
}) {
  const accents = {
    brand: 'bg-brand-50 text-brand-700',
    sun: 'bg-amber-50 text-amber-700',
    flame: 'bg-red-50 text-flame-600',
    sky: 'bg-sky-50 text-sky-700',
    stone: 'bg-stone-100 text-stone-600',
  };
  return (
    <div className="print-flat min-w-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-stone-500">{label}</p>
        {Icon && (
          <span className={cn('hidden rounded-lg p-2 min-[400px]:block', accents[accent])}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight break-words text-stone-900 tabular-nums sm:text-3xl">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

// ---------- Segmented control ----------

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-0.5 rounded-xl bg-stone-200/70 p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition',
            o.value === value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900',
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 text-xs tabular-nums',
                o.value === value ? 'bg-brand-100 text-brand-800' : 'bg-stone-300/60 text-stone-600',
              )}
            >
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------- Empty / loading ----------

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-14 text-center">
      <span className="rounded-2xl bg-brand-50 p-3 text-brand-600">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-bold text-stone-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-stone-500" role="status">
      <LoaderCircle className="h-5 w-5 animate-spin text-brand-600" aria-hidden />
      {label}
    </div>
  );
}

// ---------- Avatar ----------

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800',
        size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs',
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

// ---------- Confirm dialog ----------

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // The caller reports the error; keep the dialog open so the user can retry.
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      locked={busy}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone} onClick={run} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-stone-600">{message}</div>
    </Modal>
  );
}
