import {
  Bell,
  CalendarX,
  Megaphone,
  ListTodo,
  ListChecks,
  CheckCheck,
  CircleCheck,
  ClipboardCheck,
  Flag,
  Radio,
  TriangleAlert,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useNav } from '../../context/NavContext';
import { cn } from '../../lib/cn';
import { timeAgo } from '../../lib/format';
import type { AppNotification, NotificationType } from '../../lib/types';
import type { Page } from '../../hooks/useRoute';
import { markNotificationRead, markNotificationsRead } from '../../services/notifications';

const META: Record<NotificationType, { icon: LucideIcon; tone: string; page: Page }> = {
  referral: { icon: UserPlus, tone: 'bg-violet-50 text-violet-700', page: 'records' },
  referral_completed: { icon: CircleCheck, tone: 'bg-brand-50 text-brand-700', page: 'records' },
  flagged_prayer: { icon: Flag, tone: 'bg-amber-50 text-amber-700', page: 'records' },
  show_prep: { icon: Radio, tone: 'bg-sky-50 text-sky-700', page: 'tracker' },
  show_prep_reviewed: { icon: ClipboardCheck, tone: 'bg-brand-50 text-brand-700', page: 'show-prep' },
  ticket_created: { icon: TriangleAlert, tone: 'bg-red-50 text-flame-600', page: 'issues' },
  ticket_updated: { icon: Wrench, tone: 'bg-stone-100 text-stone-700', page: 'issues' },
  task_assigned: { icon: ListTodo, tone: 'bg-sky-50 text-sky-700', page: 'tasks' },
  task_updated: { icon: ListChecks, tone: 'bg-brand-50 text-brand-700', page: 'tasks' },
  toksave: { icon: Megaphone, tone: 'bg-amber-50 text-amber-700', page: 'records' },
  schedule_change: { icon: CalendarX, tone: 'bg-red-50 text-flame-600', page: 'schedule' },
};

export function NotificationBell() {
  const { notifications } = useData();
  const { navigate } = useNav();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read);

  // Unread count in the browser tab title.
  useEffect(() => {
    document.title = unread.length ? `(${unread.length}) WRL Studio` : 'Wantok Radio Light Studio';
  }, [unread.length]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openNotification = (n: AppNotification) => {
    if (!n.read) markNotificationRead(n.id).catch(() => undefined);
    setOpen(false);
    navigate(META[n.type].page, { open: n.targetId });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
        aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-flame-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-40 animate-pop-in overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-900/10 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <p className="font-bold text-stone-900">Notifications</p>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={() => markNotificationsRead(unread.map((n) => n.id)).catch(() => undefined)}
                className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Bell className="mx-auto h-8 w-8 text-stone-300" />
                <p className="mt-2 text-sm text-stone-500">You're all caught up.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {notifications.slice(0, 50).map((n) => {
                  const meta = META[n.type] ?? META.ticket_updated;
                  const Icon = meta.icon;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openNotification(n)}
                        className={cn(
                          'flex w-full gap-3 px-4 py-3 text-left transition hover:bg-stone-50',
                          !n.read && 'bg-brand-50/40',
                        )}
                      >
                        <span className={cn('mt-0.5 rounded-lg p-1.5', meta.tone)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn('block text-sm', n.read ? 'text-stone-600' : 'font-medium text-stone-900')}
                          >
                            {n.message}
                          </span>
                          <span className="mt-0.5 block text-xs text-stone-400">{timeAgo(n.createdAt)}</span>
                        </span>
                        {!n.read && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
