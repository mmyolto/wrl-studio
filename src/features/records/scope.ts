import { useMemo } from 'react';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useStoredState } from '../../hooks/useStoredState';
import { permissionsFor } from '../../lib/permissions';
import type { ListenerRecord, UserProfile } from '../../lib/types';

export type Scope = 'all' | 'mine' | 'announcers';

function scopeOptions(me: UserProfile): { value: Scope; label: string }[] {
  const can = permissionsFor(me.role);
  if (!can.viewAllRecords) return [];
  const options: { value: Scope; label: string }[] = [{ value: 'all', label: 'All records' }];
  if (can.addRecords) options.push({ value: 'mine', label: 'My records' });
  if (me.role === 'Program Director') options.push({ value: 'announcers', label: 'Announcers' });
  return options;
}

function applyScope(records: ListenerRecord[], scope: Scope, me: UserProfile) {
  switch (scope) {
    case 'mine':
      return records.filter((r) => r.createdBy === me.id);
    case 'announcers':
      return records.filter((r) => r.createdByRole === 'Announcer');
    default:
      return records;
  }
}

/** The records the current user can see, narrowed by a remembered scope choice. */
export function useScopedRecords(storageKey: string) {
  const me = useCurrentUser();
  const { records, recordsLoading } = useData();
  const options = scopeOptions(me);
  const [stored, setScope] = useStoredState<Scope>(`wrl:${storageKey}:${me.id}`, 'all');
  const scope = options.some((o) => o.value === stored) ? stored : (options[0]?.value ?? 'all');
  const scoped = useMemo(() => applyScope(records, scope, me), [records, scope, me]);
  return { scope, setScope, options, scoped, loading: recordsLoading };
}
