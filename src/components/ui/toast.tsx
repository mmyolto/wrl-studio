import { CircleCheck, Info, X, CircleX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';

type Kind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
  action?: { label: string; onClick: () => void };
}

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<(items: ToastItem[]) => void>();
const emit = () => listeners.forEach((l) => l(items));

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(kind: Kind, message: string, options?: { action?: ToastItem['action']; duration?: number }) {
  const id = nextId++;
  items = [...items.slice(-2), { id, kind, message, action: options?.action }];
  emit();
  const duration = options?.duration ?? (kind === 'error' ? 6000 : 3500);
  if (duration > 0) setTimeout(() => dismiss(id), duration);
  return id;
}

export const toast = {
  success: (message: string, options?: { action?: ToastItem['action']; duration?: number }) =>
    push('success', message, options),
  error: (message: string, options?: { action?: ToastItem['action']; duration?: number }) =>
    push('error', message, options),
  info: (message: string, options?: { action?: ToastItem['action']; duration?: number }) =>
    push('info', message, options),
  dismiss,
  /** Remove every toast (e.g. when someone signs out). */
  clear: () => {
    items = [];
    emit();
  },
};

const ICONS = { success: CircleCheck, error: CircleX, info: Info };
const TONES = {
  success: 'text-brand-600',
  error: 'text-flame-600',
  info: 'text-sky-600',
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {list.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm animate-pop-in items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-lg shadow-stone-900/10"
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', TONES[t.kind])} aria-hidden />
            <p className="flex-1 text-sm text-stone-800">{t.message}</p>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
                className="text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="-mr-1 rounded p-0.5 text-stone-400 hover:text-stone-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
