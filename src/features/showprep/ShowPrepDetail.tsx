import { ClipboardCheck, Download, MicVocal, Pencil, Phone, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, Textarea } from '../../components/ui/Field';
import { Badge, ConfirmDialog } from '../../components/ui/misc';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { attempt, attemptQuietly } from '../../lib/attempt';
import { formatDateTime, formatDay } from '../../lib/format';
import { downloadShowPrepPdf } from '../../lib/pdf';
import { permissionsFor } from '../../lib/permissions';
import type { ShowPrep } from '../../lib/types';
import { deleteShowPrep, reviewShowPrep } from '../../services/showPreps';
import { ShowPrepForm } from './ShowPrepForm';

function Block({ title, children }: { title: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-bold tracking-wide text-stone-500 uppercase">{title}</h3>
      <div className="text-sm leading-relaxed whitespace-pre-wrap text-stone-800">{children}</div>
    </section>
  );
}

export function InterviewBadge({ prep }: { prep: ShowPrep }) {
  if (!prep.hasInterview || !prep.interviews?.length) return null;
  return (
    <Badge tone="blue" icon={MicVocal}>
      Interview
    </Badge>
  );
}

export function ReviewBadge({ prep }: { prep: ShowPrep }) {
  return prep.reviewedAt ? (
    <Badge tone="brand" icon={ClipboardCheck}>
      Reviewed
    </Badge>
  ) : (
    <Badge tone="amber">Awaiting review</Badge>
  );
}

export function ShowPrepDetail({ prep, onClose }: { prep: ShowPrep; onClose: () => void }) {
  const me = useCurrentUser();
  const can = permissionsFor(me.role);
  const mine = prep.submittedBy === me.id;
  const canReview = can.trackShowPrep && !mine && !prep.reviewedAt;
  const canChange = mine && !prep.reviewedAt;
  const [note, setNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const review = async () => {
    setReviewing(true);
    try {
      await attempt(
        () => reviewShowPrep(prep, me, note),
        `Marked as reviewed — ${prep.submittedByName} has been notified.`,
      );
    } catch {
      /* toast shown */
    }
    setReviewing(false);
  };

  const slots = prep.timeSlots.filter((s) => s.airTimeHour || s.talkingPoints);

  return (
    <>
      <Modal
        open
        variant="drawer"
        onClose={onClose}
        title={prep.showName}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <span>
              Week of {formatDay(prep.weekStarting)} · {prep.submittedByName}
            </span>
            <ReviewBadge prep={prep} />
            <InterviewBadge prep={prep} />
          </span>
        }
        footer={
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => attemptQuietly(() => downloadShowPrepPdf(prep))}
            >
              Download PDF
            </Button>
            {canChange && (
              <>
                <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  className="text-flame-600 hover:bg-red-50"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <Block title="Topics & themes">{prep.topics}</Block>
          {slots.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold tracking-wide text-stone-500 uppercase">Hour-by-hour plan</h3>
              <ol className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                {slots.map((s, i) => (
                  <li key={i} className="grid grid-cols-[6.5rem_1fr] gap-3 px-3 py-2.5 text-sm">
                    <span className="font-semibold text-brand-800">{s.airTimeHour || '—'}</span>
                    <span className="text-stone-700">{s.talkingPoints || '—'}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section>
            <h3 className="mb-1.5 text-xs font-bold tracking-wide text-stone-500 uppercase">Interview</h3>
            {prep.hasInterview && prep.interviews?.length ? (
              <div className="space-y-3">
                {prep.interviews.map((iv, i) => (
                  <div key={i} className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-sm">
                    <p className="font-bold text-stone-900">{iv.name}</p>
                    <p className="text-stone-600">{[iv.position, iv.organisation].filter(Boolean).join(' · ')}</p>
                    <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5">
                      <dt className="text-stone-500">When</dt>
                      <dd className="text-stone-900">
                        {formatDay(iv.date)} at {iv.time}
                      </dd>
                      <dt className="text-stone-500">Format</dt>
                      <dd className="text-stone-900">{iv.format}</dd>
                      <dt className="text-stone-500">Contact</dt>
                      <dd>
                        <a
                          href={`tel:${iv.phone.replace(/\s+/g, '')}`}
                          className="inline-flex items-center gap-1 text-brand-700 underline"
                        >
                          <Phone className="h-3.5 w-3.5" /> {iv.phone}
                        </a>
                      </dd>
                      <dt className="text-stone-500">Topic</dt>
                      <dd className="break-words whitespace-pre-wrap text-stone-900">{iv.topic}</dd>
                      {iv.notes && (
                        <>
                          <dt className="text-stone-500">Notes</dt>
                          <dd className="break-words whitespace-pre-wrap text-stone-900">{iv.notes}</dd>
                        </>
                      )}
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No interview this week.</p>
            )}
          </section>
          <Block title="Guests (earlier notes)">{prep.guests}</Block>
          <Block title="Music playlist">{prep.musicPlaylist}</Block>
          <Block title="Requests for the technical team">{prep.technicalRequest}</Block>

          <p className="text-xs text-stone-400">
            Submitted {formatDateTime(prep.createdAt)}
            {prep.updatedAt && ` · edited ${formatDateTime(prep.updatedAt)}`}
          </p>

          {prep.reviewedAt && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
              <p className="font-semibold text-brand-900">
                Reviewed by {prep.reviewedByName} · {formatDateTime(prep.reviewedAt)}
              </p>
              {prep.reviewNote && <p className="mt-1 whitespace-pre-wrap text-brand-900/80">{prep.reviewNote}</p>}
            </div>
          )}

          {canReview && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <Field label="Feedback for the presenter" hint="Optional — sent with the ‘reviewed’ notification.">
                <Textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Great plan! Remember the community notices at 7am."
                />
              </Field>
              <Button className="mt-3" icon={ClipboardCheck} loading={reviewing} onClick={review}>
                Mark as reviewed
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {editing && <ShowPrepForm prep={prep} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this show prep?"
        message={`“${prep.showName}” for the week of ${formatDay(prep.weekStarting)} will be removed.`}
        confirmLabel="Delete"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await attempt(() => deleteShowPrep(prep), 'Show prep deleted.');
          onClose();
        }}
      />
    </>
  );
}
