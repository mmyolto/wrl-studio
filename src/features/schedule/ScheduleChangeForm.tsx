import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Checkbox, ChoiceChips, Field, Input, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { attempt } from '../../lib/attempt';
import { SCHEDULE_CHANGE_REASONS } from '../../lib/constants';
import { toDayInput } from '../../lib/format';
import { MANAGEMENT_ROLES } from '../../lib/permissions';
import type { ScheduleChange, ScheduleChangeFields, ScheduleChangeReason } from '../../lib/types';
import { reportScheduleChange, updateScheduleChange } from '../../services/scheduleChanges';

type Errors = Partial<Record<'reason' | 'title' | 'startDate' | 'endDate' | 'fromTime', string>>;

function initial(change?: ScheduleChange): ScheduleChangeFields {
  if (change) {
    return {
      reason: change.reason,
      title: change.title,
      startDate: change.startDate,
      endDate: change.endDate || change.startDate,
      allDay: change.allDay,
      fromTime: change.fromTime ?? '',
      toTime: change.toTime ?? '',
      affectedShows: change.affectedShows ?? '',
      details: change.details ?? '',
    };
  }
  const today = toDayInput(new Date());
  return {
    reason: '' as ScheduleChangeReason,
    title: '',
    startDate: today,
    endDate: today,
    allDay: true,
    fromTime: '',
    toTime: '',
    affectedShows: '',
    details: '',
  };
}

export function ScheduleChangeForm({ change, onClose }: { change?: ScheduleChange; onClose: () => void }) {
  const me = useCurrentUser();
  const { staff } = useData();
  const [form, setForm] = useState<ScheduleChangeFields>(() => initial(change));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const reasonHint = SCHEDULE_CHANGE_REASONS.find((r) => r.value === form.reason)?.hint;

  const set = <K extends keyof ScheduleChangeFields>(key: K, value: ScheduleChangeFields[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Keep the end date on or after the start date.
      if (key === 'startDate' && (!f.endDate || f.endDate < (value as string))) next.endDate = value as string;
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Errors = {};
    if (!form.reason) found.reason = 'Choose what kind of programme it is.';
    if (!form.title.trim()) found.title = 'Name the programme or event.';
    if (!form.startDate) found.startDate = 'Choose the day.';
    if (form.endDate && form.endDate < form.startDate) found.endDate = 'The last day can’t be before the first day.';
    if (!form.allDay && !form.fromTime?.trim()) found.fromTime = 'Enter when the normal schedule stops.';
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() =>
        document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
      return;
    }

    const managers = staff.filter((u) => MANAGEMENT_ROLES.includes(u.role)).map((u) => u.id);
    setSaving(true);
    try {
      if (change) {
        await attempt(() => updateScheduleChange(change, form, me, managers), 'Schedule change updated.');
      } else {
        await attempt(
          () => reportScheduleChange(form, me, managers),
          'Sent — management know show prep won’t be used.',
        );
      }
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
      size="lg"
      title={change ? 'Edit schedule change' : 'Show prep not used'}
      description="Tell management when a national or organisational programme replaces the normal on-air schedule."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-change-form" loading={saving}>
            {change ? 'Save changes' : 'Notify management'}
          </Button>
        </>
      }
    >
      <form id="schedule-change-form" onSubmit={submit} noValidate className="space-y-5">
        <Field label="Type of programme" required error={errors.reason} hint={reasonHint}>
          <ChoiceChips
            value={form.reason}
            onChange={(v) => set('reason', v as ScheduleChangeReason)}
            options={SCHEDULE_CHANGE_REASONS.map((r) => ({ value: r.value, label: r.label }))}
          />
        </Field>

        <Field label="Programme or event" required error={errors.title}>
          <Input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Independence Day live coverage"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First day" required error={errors.startDate}>
            <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <Field label="Last day" error={errors.endDate} hint="Same as the first day if it’s only one day.">
            <Input
              type="date"
              min={form.startDate}
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-3">
          <Checkbox
            checked={form.allDay}
            onChange={(v) => set('allDay', v)}
            label="The whole day’s schedule is replaced"
          />
          {!form.allDay && (
            <div className="grid gap-4 rounded-xl bg-stone-50 p-4 sm:grid-cols-2">
              <Field label="From" required error={errors.fromTime}>
                <Input
                  value={form.fromTime}
                  onChange={(e) => set('fromTime', e.target.value)}
                  placeholder="e.g. 9 am"
                />
              </Field>
              <Field label="Until">
                <Input value={form.toTime} onChange={(e) => set('toTime', e.target.value)} placeholder="e.g. 2 pm" />
              </Field>
            </div>
          )}
        </div>

        <Field label="Shows affected" hint="Optional — which shows or presenters are off air">
          <Input
            value={form.affectedShows}
            onChange={(e) => set('affectedShows', e.target.value)}
            placeholder="e.g. Morning Glory, Midday Praise"
          />
        </Field>

        <Field label="Details" hint="Optional — who is running it, live feed, anything management should know">
          <Textarea rows={3} value={form.details} onChange={(e) => set('details', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
