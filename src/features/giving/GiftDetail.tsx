import { Download, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Meter } from '../../components/charts/charts';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/misc';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { attempt, attemptQuietly } from '../../lib/attempt';
import { PAYMENT_METHODS } from '../../lib/constants';
import { formatDate, formatDateTime, formatDay, formatMoney } from '../../lib/format';
import { downloadGiftReceipt } from '../../lib/pdf';
import { permissionsFor } from '../../lib/permissions';
import type { Gift, PaymentMethod } from '../../lib/types';
import { addPayment, deleteGift, outstanding, received, removePayment } from '../../services/gifts';
import { GiftBadges } from './badges';
import { GiftForm } from './GiftForm';

function Row({ label, children }: { label: string; children: ReactNode }) {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-stone-500">{label}</dt>
      <dd className="min-w-0 break-words text-stone-900">{children}</dd>
    </div>
  );
}

function PaymentForm({ gift, onDone }: { gift: Gift; onDone: () => void }) {
  const me = useCurrentUser();
  const balance = outstanding(gift);
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : '');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const symbol = gift.currency === 'PGK' ? 'K' : gift.currency;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = Math.round(Number(amount.replace(/,/g, '')) * 100) / 100;
    if (!(n > 0)) {
      setError('Enter the amount received.');
      return;
    }
    setSaving(true);
    try {
      await attempt(
        () => addPayment(gift, { amount: n, method, note }, me),
        `${formatMoney(n, gift.currency)} recorded.`,
      );
      onDone();
    } catch {
      /* toast shown */
    }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount received" required error={error}>
          <Input
            prefix={symbol}
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field label="Paid by">
          <Select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            options={PAYMENT_METHODS}
          />
        </Field>
      </div>
      <Field label="Note" hint="Optional — e.g. receipt or transaction number">
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={saving}>
          Save payment
        </Button>
      </div>
    </form>
  );
}

export function GiftDetail({ gift, onClose }: { gift: Gift; onClose: () => void }) {
  const me = useCurrentUser();
  const can = permissionsFor(me.role);
  const canChange = can.viewAllGiving || gift.createdBy === me.id;
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const got = received(gift);
  const place =
    gift.location === 'PNG'
      ? [gift.city, gift.province].filter(Boolean).join(', ')
      : [gift.overseasLocation, gift.country].filter(Boolean).join(', ');

  return (
    <>
      <Modal
        open
        variant="drawer"
        onClose={onClose}
        title={gift.donorName}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-stone-600">{gift.refNo}</span>
            <GiftBadges gift={gift} />
          </span>
        }
        footer={
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => attemptQuietly(() => downloadGiftReceipt(gift))}
            >
              Receipt PDF
            </Button>
            {canChange && (
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {can.deleteGiving && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                className="text-flame-600 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
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
        <div className="space-y-6">
          {/* Amounts */}
          {gift.type === 'pledge' ? (
            <div className="space-y-4 rounded-xl bg-stone-50 p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ['Pledged', gift.pledgeAmount ?? 0],
                  ['Paid', got],
                  ['Balance', outstanding(gift)],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-xs text-stone-500">{label}</p>
                    <p className="text-base font-extrabold tabular-nums text-stone-900 sm:text-lg">
                      {formatMoney(value as number, gift.currency)}
                    </p>
                  </div>
                ))}
              </div>
              <Meter value={got} total={gift.pledgeAmount ?? 0} label="Pledge paid" />
            </div>
          ) : gift.type === 'cash' ? (
            <div className="rounded-xl bg-stone-50 p-4 text-center">
              <p className="text-xs text-stone-500">Amount received</p>
              <p className="text-2xl font-extrabold tabular-nums text-stone-900">{formatMoney(got, gift.currency)}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-stone-50 p-4">
              <p className="text-xs text-stone-500">Items given</p>
              <p className="mt-1 text-[15px] font-semibold whitespace-pre-wrap text-stone-900">
                {gift.itemDescription}
              </p>
              {(gift.quantity || gift.estimatedValue) && (
                <p className="mt-1 text-sm text-stone-600">
                  {[gift.quantity, gift.estimatedValue ? `est. ${formatMoney(gift.estimatedValue, gift.currency)}` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          )}

          {/* Payments */}
          {gift.type !== 'kind' && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900">Payments</h3>
                {canChange && !paying && (
                  <Button size="sm" variant="soft" icon={Plus} onClick={() => setPaying(true)}>
                    Record payment
                  </Button>
                )}
              </div>
              {paying && <PaymentForm gift={gift} onDone={() => setPaying(false)} />}
              {gift.payments.length === 0 ? (
                !paying && (
                  <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">
                    No payments yet.
                  </p>
                )
              ) : (
                <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200">
                  {gift.payments.map((p) => (
                    <li key={p.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-stone-900 tabular-nums">
                          {formatMoney(p.amount, gift.currency)}{' '}
                          <span className="font-normal text-stone-500">· {p.method}</span>
                        </p>
                        <p className="text-xs text-stone-500">
                          {formatDateTime(p.at)} · {p.byName}
                          {p.note && ` · ${p.note}`}
                        </p>
                      </div>
                      {canChange && (
                        <button
                          type="button"
                          onClick={() => attemptQuietly(() => removePayment(gift, p.id, me), 'Payment removed.')}
                          className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-flame-600"
                          aria-label={`Remove payment of ${formatMoney(p.amount, gift.currency)}`}
                          title="Remove this payment"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <dl className="divide-y divide-stone-100">
            <Row label="Category">{gift.category}</Row>
            <Row label="Location">{place || gift.country}</Row>
            <Row label="Mobile">
              {gift.mobile && (
                <a href={`tel:${gift.mobile.replace(/\s+/g, '')}`} className="text-brand-700 underline">
                  {gift.mobile}
                </a>
              )}
            </Row>
            <Row label="Email">{gift.email}</Row>
            <Row label="Address">{gift.address}</Row>
            <Row label="Church">{[gift.church, gift.congregation].filter(Boolean).join(' · ')}</Row>
            <Row label={gift.type === 'pledge' ? 'Pledged on' : 'Received on'}>{formatDay(gift.giftDate)}</Row>
            <Row label="Schedule">
              {gift.type === 'pledge' && [gift.schedule, gift.scheduleDetails].filter(Boolean).join(' — ')}
            </Row>
            <Row label="Notes">{gift.notes}</Row>
            <Row label="Recorded by">
              {gift.createdByName} · {formatDate(gift.createdAt)}
            </Row>
            <Row label="Last edited">
              {gift.updatedByName && `${gift.updatedByName} · ${formatDate(gift.updatedAt)}`}
            </Row>
          </dl>
        </div>
      </Modal>

      {editing && <GiftForm gift={gift} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${gift.refNo}?`}
        message="This removes the record and its payments permanently. The reference number will not be reused."
        confirmLabel="Delete"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await attempt(() => deleteGift(gift), 'Deleted.');
          onClose();
        }}
      />
    </>
  );
}
