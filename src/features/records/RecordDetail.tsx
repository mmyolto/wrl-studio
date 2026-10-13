import { Check, Flag, HandHeart, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/misc';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { attempt, attemptQuietly } from '../../lib/attempt';
import { MARRIAGE_PROBLEMS, SALVATION } from '../../lib/constants';
import { formatDateTime } from '../../lib/format';
import { canDeleteRecord, canEditRecord, permissionsFor } from '../../lib/permissions';
import type { ListenerRecord } from '../../lib/types';
import { completeReferral, deleteRecord, flagForPrayer, markSoulSaved } from '../../services/records';
import { CategoryBadge, placeOf, StatusBadges } from './badges';
import { RecordForm } from './RecordForm';
import { ReferDialog } from './ReferDialog';

function Row({ label, children }: { label: string; children: ReactNode }) {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-stone-500">{label}</dt>
      <dd className="min-w-0 break-words text-stone-900">{children}</dd>
    </div>
  );
}

function Timeline({ items }: { items: Array<{ when?: string; text: ReactNode } | false | undefined> }) {
  const list = items.filter(Boolean) as { when?: string; text: ReactNode }[];
  return (
    <ol className="relative space-y-3 border-l border-stone-200 pl-4">
      {list.map((item, i) => (
        <li key={i} className="relative text-sm">
          <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" />
          <p className="text-stone-700">{item.text}</p>
          <p className="text-xs text-stone-400">{formatDateTime(item.when)}</p>
        </li>
      ))}
    </ol>
  );
}

export function RecordDetail({ record, onClose }: { record: ListenerRecord; onClose: () => void }) {
  const me = useCurrentUser();
  const { staff } = useData();
  const can = permissionsFor(me.role);
  const [editing, setEditing] = useState(false);
  const [referring, setReferring] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | 'saved' | null>(null);
  const [busy, setBusy] = useState(false);

  const isSalvation = record.prayerCategory === SALVATION;
  const salvationPending = isSalvation && record.salvationStatus !== 'soul_saved';
  const referralForMe = record.referredTo === me.id && record.referralStatus === 'pending';

  const flag = async () => {
    setBusy(true);
    const chaplains = staff.filter((u) => u.role === 'Ministry Chaplain').map((u) => u.id);
    try {
      await attempt(
        () => flagForPrayer(record, me, chaplains),
        'Flagged for special prayer — the Chaplain has been notified.',
      );
    } catch {
      /* toast shown */
    }
    setBusy(false);
  };

  const contact =
    record.communicationMethod === 'Facebook'
      ? record.facebookName
      : record.communicationMethod === 'Email'
        ? record.emailAddress
        : record.phoneNumber
          ? `${record.countryCode ?? ''} ${record.phoneNumber}`.trim()
          : undefined;

  const problems = record.marriageProblems
    ? MARRIAGE_PROBLEMS.filter((p) => record.marriageProblems![p.key])
        .map((p) => p.label)
        .join(', ')
    : '';

  return (
    <>
      <Modal
        open
        variant="drawer"
        onClose={onClose}
        title={record.fullName}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={record.messageCategory} />
            <StatusBadges record={record} meId={me.id} />
          </span>
        }
        footer={
          <div className="flex w-full flex-wrap items-center gap-2">
            {canEditRecord(me, record) && (
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {canDeleteRecord(me, record) && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                className="text-flame-600 hover:bg-red-50 hover:text-flame-600"
                onClick={() => setConfirm('delete')}
              >
                Delete
              </Button>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        {/* Next actions */}
        <div className="mb-6 flex flex-wrap gap-2">
          {referralForMe && (
            <Button
              size="sm"
              icon={Check}
              onClick={() => attemptQuietly(() => completeReferral(record, me), 'Referral marked as done.')}
            >
              Mark referral done
            </Button>
          )}
          {salvationPending && (
            <Button size="sm" variant="soft" icon={HandHeart} onClick={() => setConfirm('saved')}>
              Mark soul saved
            </Button>
          )}
          {can.flagForPrayer && !record.flaggedForPrayer && (
            <Button size="sm" variant="secondary" icon={Flag} loading={busy} onClick={flag}>
              Flag for special prayer
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={UserPlus} onClick={() => setReferring(true)}>
            {record.referredTo ? 'Refer again' : 'Refer to colleague'}
          </Button>
        </div>

        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Message</p>
          <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-wrap text-stone-900">{record.message}</p>
        </div>

        <dl className="mt-5 divide-y divide-stone-100">
          <Row label="Gender">{record.gender}</Row>
          <Row label="Contact">
            {record.communicationMethod}
            {contact && <span className="text-stone-500"> · {contact}</span>}
          </Row>
          <Row label="Location">
            {record.location}, {placeOf(record)}
          </Row>
          <Row label="Song">{record.songTitle && `${record.songTitle} — ${record.artist}`}</Row>
          <Row label="Prayer category">{record.prayerCategory}</Row>
          <Row label="Marriage problems">{problems}</Row>
        </dl>

        <h3 className="mt-6 mb-3 text-sm font-bold text-stone-900">History</h3>
        <Timeline
          items={[
            {
              when: record.createdAt,
              text: (
                <>
                  Recorded by <strong>{record.createdByName}</strong>
                </>
              ),
            },
            !!record.updatedByName && {
              when: record.updatedAt,
              text: (
                <>
                  Edited by <strong>{record.updatedByName}</strong>
                </>
              ),
            },
            !!record.flaggedForPrayer && {
              when: record.flaggedAt,
              text: (
                <>
                  Flagged for special prayer by <strong>{record.flaggedByName}</strong>
                </>
              ),
            },
            !!record.referredTo && {
              when: record.referredAt,
              text: (
                <>
                  <strong>{record.referredByName}</strong> referred to <strong>{record.referredToName}</strong>
                </>
              ),
            },
            record.referralStatus === 'completed' && {
              when: record.referralCompletedAt,
              text: (
                <>
                  Referral completed by <strong>{record.referredToName}</strong>
                </>
              ),
            },
            record.salvationStatus === 'soul_saved' && {
              when: record.salvationFollowUpAt,
              text: (
                <>
                  Soul saved — followed up by <strong>{record.salvationFollowUpByName}</strong> 🙏
                </>
              ),
            },
          ]}
        />
      </Modal>

      {editing && <RecordForm open record={record} onClose={() => setEditing(false)} />}
      {referring && <ReferDialog record={record} onClose={() => setReferring(false)} />}

      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete this record?"
        message={
          <>
            The record for <strong>{record.fullName}</strong> will be removed from everyone’s list. An administrator can
            restore it from the archive.
          </>
        }
        confirmLabel="Delete record"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          await attempt(() => deleteRecord(record, me), 'Record deleted.');
          onClose();
        }}
      />
      <ConfirmDialog
        open={confirm === 'saved'}
        tone="primary"
        title="Mark as soul saved?"
        message={
          <>
            Confirm that you have prayed with <strong>{record.fullName}</strong> and they have accepted Jesus as Lord
            and Saviour.
          </>
        }
        confirmLabel="Yes, soul saved"
        onClose={() => setConfirm(null)}
        onConfirm={() => attempt(() => markSoulSaved(record, me), 'Hallelujah! Marked as soul saved.')}
      />
    </>
  );
}
