import { CircleCheck, Clock, Plus, Trash2, TriangleAlert, Wrench } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { ChoiceChips, Field, Textarea } from '../../components/ui/Field';
import { Badge, ConfirmDialog, EmptyState, PageHeader, Segmented, Spinner, type Tone } from '../../components/ui/misc';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNav } from '../../context/NavContext';
import { attempt } from '../../lib/attempt';
import { cn } from '../../lib/cn';
import { TICKET_PRIORITY, TICKET_STATUS } from '../../lib/constants';
import { formatDateTime, timeAgo } from '../../lib/format';
import { permissionsFor } from '../../lib/permissions';
import type { Ticket, TicketPriority, TicketStatus } from '../../lib/types';
import { deleteTicket, updateTicket } from '../../services/tickets';

const STATUS_TONE: Record<TicketStatus, Tone> = { open: 'red', in_progress: 'amber', resolved: 'brand' };
const STATUS_ICON = { open: TriangleAlert, in_progress: Clock, resolved: CircleCheck };
const PRIORITY_TONE: Record<TicketPriority, Tone> = {
  urgent: 'solidRed',
  high: 'red',
  medium: 'amber',
  low: 'neutral',
};

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} icon={STATUS_ICON[status]}>
      {TICKET_STATUS[status]}
    </Badge>
  );
}

function UpdateDialog({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const me = useCurrentUser();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [notes, setNotes] = useState(ticket.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'resolved' && !notes.trim()) {
      setError('Add a short note on how it was resolved.');
      return;
    }
    setSaving(true);
    try {
      await attempt(
        () => updateTicket(ticket, { status, priority, notes }, me),
        status !== ticket.status ? `Updated — ${ticket.submittedByName} has been notified.` : 'Ticket updated.',
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
      open
      onClose={onClose}
      locked={saving}
      title="Update issue"
      description={`${ticket.category} · reported by ${ticket.submittedByName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="ticket-update" loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <form id="ticket-update" onSubmit={submit} className="space-y-5" noValidate>
        <div className="rounded-xl bg-stone-50 p-3 text-sm whitespace-pre-wrap text-stone-700">
          {ticket.description}
        </div>
        <Field label="Status">
          <ChoiceChips
            value={status}
            onChange={(v) => {
              setStatus(v as TicketStatus);
              setError(null);
            }}
            options={(Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => ({ value: s, label: TICKET_STATUS[s] }))}
          />
        </Field>
        <Field label="Priority">
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
          label="Notes for the reporter"
          required={status === 'resolved'}
          error={error}
          hint="The reporter is notified when the status changes."
        >
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setError(null);
            }}
            placeholder="What was done, or what happens next…"
          />
        </Field>
      </form>
    </Modal>
  );
}

type Filter = 'active' | TicketStatus | 'all';

export function TicketsPage() {
  const me = useCurrentUser();
  const can = permissionsFor(me.role);
  const { tickets, ticketsLoading } = useData();
  const { params, navigate, openReportIssue } = useNav();
  const [filter, setFilter] = useState<Filter>('active');
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [deleting, setDeleting] = useState<Ticket | null>(null);

  const highlight = params.get('open');
  useEffect(() => {
    if (!highlight) return;
    setFilter('all');
    const t = setTimeout(
      () => document.getElementById(`ticket-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      100,
    );
    return () => clearTimeout(t);
  }, [highlight]);

  const count = (f: Filter) =>
    f === 'all'
      ? tickets.length
      : f === 'active'
        ? tickets.filter((t) => t.status !== 'resolved').length
        : tickets.filter((t) => t.status === f).length;
  const visible = tickets.filter((t) =>
    filter === 'all' ? true : filter === 'active' ? t.status !== 'resolved' : t.status === filter,
  );

  return (
    <>
      <PageHeader
        title={can.manageTickets ? 'Issues' : 'My issues'}
        description={
          can.manageTickets
            ? 'Technical and programming problems reported by staff, most urgent first.'
            : 'Problems you have reported and their progress.'
        }
        actions={
          <Button icon={Plus} onClick={openReportIssue}>
            Report issue
          </Button>
        }
      />

      <div className="mb-5">
        <Segmented<Filter>
          label="Filter issues"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: 'Active', count: count('active') },
            { value: 'open', label: 'Open', count: count('open') },
            { value: 'in_progress', label: 'In progress', count: count('in_progress') },
            { value: 'resolved', label: 'Resolved', count: count('resolved') },
            { value: 'all', label: 'All', count: count('all') },
          ]}
        />
      </div>

      {ticketsLoading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={filter === 'active' ? 'No open issues' : 'Nothing here'}
          description={filter === 'active' ? 'Everything is running smoothly.' : 'No issues match this filter.'}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((t) => (
            <li
              key={t.id}
              id={`ticket-${t.id}`}
              className={cn(
                'rounded-2xl border bg-white p-5 shadow-sm transition',
                highlight === t.id ? 'border-brand-400 ring-2 ring-brand-200' : 'border-stone-200',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={PRIORITY_TONE[t.priority]}>{TICKET_PRIORITY[t.priority]}</Badge>
                <StatusBadge status={t.status} />
                <span className="text-sm font-bold text-stone-900">{t.category}</span>
                <span className="ml-auto text-xs text-stone-400" title={formatDateTime(t.createdAt)}>
                  {timeAgo(t.createdAt)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-stone-800">{t.description}</p>
              <p className="mt-2 text-xs text-stone-500">
                Reported by {t.submittedByName} ({t.submittedByRole})
              </p>
              {t.notes && (
                <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
                  <span className="font-semibold">Notes: </span>
                  {t.notes}
                </div>
              )}
              {t.status === 'resolved' && t.resolvedByName && (
                <p className="mt-2 text-xs font-medium text-brand-700">
                  Resolved by {t.resolvedByName} · {formatDateTime(t.resolvedAt)}
                </p>
              )}
              {(can.manageTickets || can.deleteTickets) && (
                <div className="mt-4 flex gap-2 border-t border-stone-100 pt-3">
                  {can.manageTickets && (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(t)}>
                      Update
                    </Button>
                  )}
                  {can.deleteTickets && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      className="text-flame-600 hover:bg-red-50"
                      onClick={() => setDeleting(t)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <UpdateDialog ticket={tickets.find((t) => t.id === editing.id) ?? editing} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete this issue?"
        message="The ticket and its notes will be permanently removed."
        confirmLabel="Delete"
        onClose={() => setDeleting(null)}
        onConfirm={() => attempt(() => deleteTicket(deleting!), 'Issue deleted.')}
      />
      {highlight && (
        <span className="sr-only" aria-live="polite">
          Showing the issue from your notification
        </span>
      )}
      {highlight && (
        <div className="no-print mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('issues')}>
            Clear highlight
          </Button>
        </div>
      )}
    </>
  );
}
