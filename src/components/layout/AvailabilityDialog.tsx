import { Briefcase, Coffee, HeartPulse, Power, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCurrentUser } from '../../context/AuthContext';
import { attempt } from '../../lib/attempt';
import { cn } from '../../lib/cn';
import { AVAILABILITY } from '../../lib/constants';
import { formatDay, toDayInput } from '../../lib/format';
import type { Availability } from '../../lib/types';
import { setAvailability } from '../../services/users';
import { Button } from '../ui/Button';
import { Field, Input } from '../ui/Field';
import { Modal } from '../ui/Modal';

const AVAILABILITY_ICONS: Record<Availability, LucideIcon> = {
  active: Power,
  leave: Briefcase,
  sick: HeartPulse,
  unavailable: Coffee,
};

export const AVAILABILITY_DOT: Record<Availability, string> = {
  active: 'bg-brand-500',
  leave: 'bg-amber-500',
  sick: 'bg-flame-500',
  unavailable: 'bg-stone-400',
};

export function AvailabilityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useCurrentUser();
  const current = me.availability ?? 'active';
  const [choice, setChoice] = useState<Availability>(current);
  const [returnDate, setReturnDate] = useState(me.returnDate ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setChoice(me.availability ?? 'active');
      setReturnDate(me.returnDate ?? '');
      setError(null);
    }
  }, [open, me.availability, me.returnDate]);

  const save = async () => {
    if (choice !== 'active' && !returnDate) {
      setError('Choose the date you expect to be back.');
      return;
    }
    setSaving(true);
    try {
      await attempt(
        () => setAvailability(me, choice, returnDate),
        choice === 'active'
          ? 'Welcome back — you are marked as available.'
          : `Marked as ${AVAILABILITY[choice].label.toLowerCase()} until ${formatDay(returnDate)}.`,
      );
      onClose();
    } catch {
      /* toast shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your availability"
      description="While you're away, show prep reminders pause and colleagues can't refer listeners to you."
      size="sm"
      locked={saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-2" role="radiogroup" aria-label="Availability">
        {(Object.keys(AVAILABILITY) as Availability[]).map((key) => {
          const Icon = AVAILABILITY_ICONS[key];
          const selected = choice === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setChoice(key);
                setError(null);
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                selected
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                  : 'border-stone-200 hover:border-stone-300',
              )}
            >
              <span
                className={cn('rounded-lg p-2', selected ? 'bg-white text-brand-700' : 'bg-stone-100 text-stone-500')}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-stone-900">{AVAILABILITY[key].label}</span>
                <span className="block text-xs text-stone-500">{AVAILABILITY[key].hint}</span>
              </span>
              <span className={cn('h-2.5 w-2.5 rounded-full', AVAILABILITY_DOT[key])} />
            </button>
          );
        })}
      </div>
      {choice !== 'active' && (
        <Field label="Expected return date" required error={error} className="mt-4">
          <Input
            type="date"
            value={returnDate}
            min={toDayInput(new Date())}
            onChange={(e) => {
              setReturnDate(e.target.value);
              setError(null);
            }}
          />
        </Field>
      )}
    </Modal>
  );
}
