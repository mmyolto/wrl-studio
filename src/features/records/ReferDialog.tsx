import { Search, UserX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar } from '../../components/ui/misc';
import { Input } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { attempt } from '../../lib/attempt';
import { cn } from '../../lib/cn';
import { AVAILABILITY } from '../../lib/constants';
import type { ListenerRecord, UserProfile } from '../../lib/types';
import { referRecord } from '../../services/records';

export function ReferDialog({ record, onClose }: { record: ListenerRecord; onClose: () => void }) {
  const me = useCurrentUser();
  const { staff } = useData();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const people = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff
      .filter((u) => u.id !== me.id)
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
  }, [staff, me.id, search]);

  const send = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await attempt(() => referRecord(record, selected, me), `Referred to ${selected.name}.`);
      onClose();
    } catch {
      /* toast shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      locked={saving}
      size="sm"
      title="Refer listener"
      description={
        <>
          Pass <strong className="text-stone-700">{record.fullName}</strong> to a colleague. They’ll get a notification.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={send} disabled={!selected} loading={saving}>
            {selected ? `Refer to ${selected.name.split(' ')[0]}` : 'Choose someone'}
          </Button>
        </>
      }
    >
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or role"
          className="pl-9"
        />
      </div>
      {people.length === 0 ? (
        <div className="py-10 text-center text-sm text-stone-500">
          <UserX className="mx-auto mb-2 h-6 w-6 text-stone-300" />
          No colleagues match.
        </div>
      ) : (
        <ul className="space-y-1.5" role="radiogroup" aria-label="Colleague">
          {people.map((u) => {
            const away = (u.availability ?? 'active') !== 'active';
            const isSelected = selected?.id === u.id;
            return (
              <li key={u.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={away}
                  onClick={() => setSelected(u)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition',
                    isSelected
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                      : 'border-stone-200 hover:border-stone-300',
                    away && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <Avatar name={u.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-stone-900">{u.name}</span>
                    <span className="block text-xs text-stone-500">
                      {u.role}
                      {away && ` · ${AVAILABILITY[u.availability!].label}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
