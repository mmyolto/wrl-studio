import { useEffect, useState, type FormEvent } from 'react';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { attempt } from '../../lib/attempt';
import { TICKET_CATEGORIES, TICKET_PRIORITY } from '../../lib/constants';
import { MANAGEMENT_ROLES } from '../../lib/permissions';
import type { TicketCategory, TicketPriority } from '../../lib/types';
import { createTicket } from '../../services/tickets';
import { Button } from '../ui/Button';
import { ChoiceChips, Field, Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';

export function ReportIssueDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useCurrentUser();
  const { staff } = useData();
  const [category, setCategory] = useState<TicketCategory>('Technical Issue');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory('Technical Issue');
      setPriority('medium');
      setDescription('');
      setError(null);
    }
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError('Please describe the issue in a little more detail.');
      return;
    }
    setSaving(true);
    try {
      const managers = staff.filter((u) => MANAGEMENT_ROLES.includes(u.role)).map((u) => u.id);
      await attempt(
        () => createTicket({ category, priority, description }, me, managers),
        'Issue reported — management has been notified.',
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
      title="Report an issue"
      description="Flag a technical or programming problem to the Administrator, General Manager and Program Director."
      locked={saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="report-issue" loading={saving}>
            Send report
          </Button>
        </>
      }
    >
      <form id="report-issue" onSubmit={submit} className="space-y-5" noValidate>
        <Field label="What kind of issue?" required>
          <ChoiceChips
            value={category}
            onChange={(v) => setCategory(v as TicketCategory)}
            options={TICKET_CATEGORIES}
          />
        </Field>
        <Field label="How urgent is it?">
          <ChoiceChips
            size="sm"
            value={priority}
            onChange={(v) => setPriority(v as TicketPriority)}
            options={(['low', 'medium', 'high', 'urgent'] as TicketPriority[]).map((p) => ({
              value: p,
              label: TICKET_PRIORITY[p],
            }))}
          />
        </Field>
        <Field
          label="Describe the problem"
          required
          error={error}
          hint="What happened, where (studio, transmitter, app…), and when. Include any error messages."
        >
          <Textarea
            rows={6}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError(null);
            }}
            placeholder="e.g. Studio 2 microphone cuts out during the 6pm news…"
          />
        </Field>
      </form>
    </Modal>
  );
}
