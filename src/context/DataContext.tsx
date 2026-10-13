import { onSnapshot, query, where, type Query } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PRIORITY_ORDER } from '../lib/constants';
import { friendlyError } from '../lib/errors';
import { permissionsFor } from '../lib/permissions';
import type {
  AppNotification,
  Gift,
  ListenerRecord,
  ScheduleChange,
  ShowPrep,
  Task,
  Ticket,
  UserProfile,
} from '../lib/types';
import { COL, colRef, fromSnap } from '../services/collections';
import { useCurrentUser } from './AuthContext';

interface Live<T> {
  items: T[];
  loading: boolean;
}

interface DataValue {
  records: ListenerRecord[];
  recordsLoading: boolean;
  /** Everyone with a profile, including disabled accounts (for names in history). */
  users: UserProfile[];
  /** Enabled accounts only. */
  staff: UserProfile[];
  notifications: AppNotification[];
  showPreps: ShowPrep[];
  showPrepsLoading: boolean;
  tickets: Ticket[];
  ticketsLoading: boolean;
  tasks: Task[];
  tasksLoading: boolean;
  gifts: Gift[];
  giftsLoading: boolean;
  scheduleChanges: ScheduleChange[];
  scheduleChangesLoading: boolean;
  error: string | null;
}

const DataContext = createContext<DataValue | null>(null);

const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

/** Subscribes to one or more queries and merges the results by document id. */
function useLive<T extends { id: string }>(
  key: string,
  build: () => Query[] | null,
  sort: (a: T, b: T) => number,
  onError: (e: unknown) => void,
): Live<T> {
  const [state, setState] = useState<Live<T>>({ items: [], loading: true });

  useEffect(() => {
    const queries = build();
    if (!queries) {
      setState({ items: [], loading: false });
      return;
    }
    setState({ items: [], loading: true });
    const parts = queries.map(() => new Map<string, T>());
    const loaded = queries.map(() => false);

    const unsubs = queries.map((q, i) =>
      onSnapshot(
        q,
        (snap) => {
          parts[i] = new Map(snap.docs.map((d) => [d.id, fromSnap<T>(d)]));
          loaded[i] = true;
          const merged = new Map<string, T>();
          parts.forEach((p) => p.forEach((v, k) => merged.set(k, v)));
          setState({ items: [...merged.values()].sort(sort), loading: !loaded.every(Boolean) });
        },
        (error) => {
          loaded[i] = true;
          setState((s) => ({ ...s, loading: !loaded.every(Boolean) }));
          onError(error);
        },
      ),
    );
    return () => unsubs.forEach((u) => u());
    // `key` captures everything `build` depends on, so it is the only dependency.
  }, [key]);

  return state;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const me = useCurrentUser();
  const can = permissionsFor(me.role);
  const [error, setError] = useState<string | null>(null);
  const onError = (e: unknown) => {
    console.error(e);
    setError(friendlyError(e, 'Could not load some data. Check your connection.'));
  };

  const scope = `${me.id}:${me.role}`;

  const records = useLive<ListenerRecord>(
    `records:${scope}`,
    () =>
      can.viewAllRecords
        ? [colRef(COL.records)]
        : [
            query(colRef(COL.records), where('createdBy', '==', me.id)),
            query(colRef(COL.records), where('referredTo', '==', me.id)),
          ],
    byNewest,
    onError,
  );

  const users = useLive<UserProfile>(
    `users:${scope}`,
    () => [colRef(COL.users)],
    (a, b) => a.name.localeCompare(b.name),
    onError,
  );

  const notifications = useLive<AppNotification>(
    `notifications:${scope}`,
    () => [query(colRef(COL.notifications), where('recipientId', '==', me.id))],
    byNewest,
    onError,
  );

  const showPreps = useLive<ShowPrep>(
    `showPreps:${scope}`,
    () =>
      can.trackShowPrep
        ? [colRef(COL.showPreps)]
        : can.submitShowPrep
          ? [query(colRef(COL.showPreps), where('submittedBy', '==', me.id))]
          : null,
    byNewest,
    onError,
  );

  const tickets = useLive<Ticket>(
    `tickets:${scope}`,
    () => (can.manageTickets ? [colRef(COL.tickets)] : [query(colRef(COL.tickets), where('submittedBy', '==', me.id))]),
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || byNewest(a, b),
    onError,
  );

  const tasks = useLive<Task>(
    `tasks:${scope}`,
    () =>
      can.viewAllTasks
        ? [colRef(COL.tasks)]
        : can.assignTasks
          ? [
              query(colRef(COL.tasks), where('assignedTo', '==', me.id)),
              query(colRef(COL.tasks), where('assignedBy', '==', me.id)),
            ]
          : [query(colRef(COL.tasks), where('assignedTo', '==', me.id))],
    // Open tasks first, then by due date (undated last), then newest.
    (a, b) =>
      Number(a.status === 'done') - Number(b.status === 'done') ||
      (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
      byNewest(a, b),
    onError,
  );

  const gifts = useLive<Gift>(
    `gifts:${scope}`,
    () => (can.viewAllGiving ? [colRef(COL.gifts)] : [query(colRef(COL.gifts), where('createdBy', '==', me.id))]),
    (a, b) => b.seq - a.seq || byNewest(a, b),
    onError,
  );

  const scheduleChanges = useLive<ScheduleChange>(
    `scheduleChanges:${scope}`,
    () => [colRef(COL.scheduleChanges)],
    // Soonest first; newest report breaks ties.
    (a, b) => a.startDate.localeCompare(b.startDate) || byNewest(a, b),
    onError,
  );

  const value = useMemo<DataValue>(
    () => ({
      records: records.items,
      recordsLoading: records.loading,
      users: users.items,
      staff: users.items.filter((u) => !u.disabled),
      notifications: notifications.items,
      showPreps: showPreps.items,
      showPrepsLoading: showPreps.loading,
      tickets: tickets.items,
      ticketsLoading: tickets.loading,
      tasks: tasks.items,
      tasksLoading: tasks.loading,
      gifts: gifts.items,
      giftsLoading: gifts.loading,
      scheduleChanges: scheduleChanges.items,
      scheduleChangesLoading: scheduleChanges.loading,
      error,
    }),
    [records, users, notifications, showPreps, tickets, tasks, gifts, scheduleChanges, error],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
