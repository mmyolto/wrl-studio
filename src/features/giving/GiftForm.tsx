import { Gift as GiftIcon, HandCoins, Package } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { ChoiceChips, Field, Input, Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { attempt } from '../../lib/attempt';
import { cn } from '../../lib/cn';
import { DONOR_CATEGORIES, GIFT_TYPES, PAYMENT_METHODS, PLEDGE_SCHEDULES, PNG_PROVINCES } from '../../lib/constants';
import { findCountry, OVERSEAS_COUNTRIES, PNG } from '../../lib/countries';
import { currencyFor } from '../../lib/currencies';
import { toDayInput } from '../../lib/format';
import type { DonorCategory, Gift, GiftFields, GiftType, PaymentMethod, PledgeSchedule } from '../../lib/types';
import { recordGift, updateGift } from '../../services/gifts';

const TYPE_ICONS = { pledge: HandCoins, cash: GiftIcon, kind: Package };

interface State {
  type: GiftType;
  donorName: string;
  category: DonorCategory | '';
  where: 'PNG' | 'Overseas';
  city: string;
  province: string;
  country: string;
  overseasLocation: string;
  address: string;
  mobile: string;
  email: string;
  church: string;
  congregation: string;
  giftDate: string;
  pledgeAmount: string;
  schedule: PledgeSchedule | '';
  scheduleDetails: string;
  paidNow: string;
  method: PaymentMethod;
  itemDescription: string;
  quantity: string;
  estimatedValue: string;
  notes: string;
}

type Errors = Partial<Record<keyof State, string>>;

function initial(gift?: Gift, type: GiftType = 'pledge'): State {
  const dial = gift?.mobile?.match(/^(\+\d+)\s+(.*)$/);
  return {
    type: gift?.type ?? type,
    donorName: gift?.donorName ?? '',
    category: gift?.category ?? '',
    where: gift?.location ?? 'PNG',
    city: gift?.city ?? '',
    province: gift?.province ?? '',
    country: gift && gift.location === 'Overseas' ? gift.country : '',
    overseasLocation: gift?.overseasLocation ?? '',
    address: gift?.address ?? '',
    mobile: dial ? dial[2]! : (gift?.mobile ?? ''),
    email: gift?.email ?? '',
    church: gift?.church ?? '',
    congregation: gift?.congregation ?? '',
    giftDate: gift?.giftDate ?? toDayInput(new Date()),
    pledgeAmount: gift?.pledgeAmount ? String(gift.pledgeAmount) : '',
    schedule: gift?.schedule ?? '',
    scheduleDetails: gift?.scheduleDetails ?? '',
    paidNow: '',
    method: 'Cash',
    itemDescription: gift?.itemDescription ?? '',
    quantity: gift?.quantity ?? '',
    estimatedValue: gift?.estimatedValue ? String(gift.estimatedValue) : '',
    notes: gift?.notes ?? '',
  };
}

const money = (v: string) => {
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-xs font-bold tracking-wide text-stone-500 uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

export function GiftForm({
  gift,
  defaultType,
  onClose,
  onSaved,
}: {
  gift?: Gift;
  defaultType?: GiftType;
  onClose: () => void;
  onSaved?: (id: string, refNo: string) => void;
}) {
  const me = useCurrentUser();
  const [s, setS] = useState<State>(() => initial(gift, defaultType));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const editing = !!gift;

  const set = <K extends keyof State>(k: K, v: State[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const country = s.where === 'PNG' ? PNG : s.country;
  const currency = currencyFor(country);
  const symbol = currency === 'PGK' ? 'K' : currency;
  const dial = findCountry(country)?.dialCode ?? '';
  const countryOptions = useMemo(() => OVERSEAS_COUNTRIES.map((c) => c.name), []);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!s.donorName.trim()) e.donorName = 'Enter the name of the person, family or organisation.';
    if (!s.category) e.category = 'Choose a category.';
    if (s.where === 'PNG' && !s.province) e.province = 'Choose a province.';
    if (s.where === 'Overseas' && !s.country) e.country = 'Choose a country.';
    if (s.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())) e.email = 'Enter a valid email address.';
    if (!s.giftDate) e.giftDate = 'Choose the date.';
    if (s.type === 'pledge') {
      if (!(money(s.pledgeAmount) > 0)) e.pledgeAmount = 'Enter the amount pledged.';
      if (!s.schedule) e.schedule = 'Choose a payment schedule.';
      if (!editing && s.paidNow.trim() && !(money(s.paidNow) >= 0)) e.paidNow = 'Enter a valid amount.';
    }
    if (s.type === 'cash' && !editing && !(money(s.paidNow) > 0)) e.paidNow = 'Enter the amount received.';
    if (s.type === 'kind') {
      if (!s.itemDescription.trim()) e.itemDescription = 'Describe what was given.';
      if (s.estimatedValue.trim() && !(money(s.estimatedValue) >= 0))
        e.estimatedValue = 'Enter a valid value, or leave blank.';
    }
    return e;
  };

  const toFields = (): GiftFields => ({
    type: s.type,
    donorName: s.donorName.trim(),
    category: s.category as DonorCategory,
    location: s.where,
    country,
    ...(s.where === 'PNG'
      ? { city: s.city.trim(), province: s.province, overseasLocation: '' }
      : { city: '', province: '', overseasLocation: s.overseasLocation.trim() }),
    address: s.address.trim(),
    mobile: s.mobile.trim() ? `${dial} ${s.mobile.trim()}`.trim() : '',
    email: s.email.trim().toLowerCase(),
    church: s.church.trim(),
    congregation: s.congregation.trim(),
    currency,
    giftDate: s.giftDate,
    ...(s.type === 'pledge'
      ? {
          pledgeAmount: money(s.pledgeAmount),
          schedule: s.schedule as PledgeSchedule,
          scheduleDetails: s.scheduleDetails.trim(),
        }
      : {}),
    ...(s.type === 'kind'
      ? {
          itemDescription: s.itemDescription.trim(),
          quantity: s.quantity.trim(),
          ...(s.estimatedValue.trim() ? { estimatedValue: money(s.estimatedValue) } : {}),
        }
      : {}),
    notes: s.notes.trim(),
  });

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() =>
        document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
      return;
    }
    setSaving(true);
    try {
      if (gift) {
        await attempt(() => updateGift(gift, toFields(), me), 'Saved.');
        onSaved?.(gift.id, gift.refNo);
      } else {
        const paid = s.type === 'kind' ? null : { amount: money(s.paidNow || '0') || 0, method: s.method };
        const result = await attempt(() => recordGift(toFields(), paid, me));
        onSaved?.(result.id, result.refNo);
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
      title={editing ? `Edit ${gift.refNo}` : 'Record a pledge or gift'}
      description="Shareathon — Wantok Radio Light. Fields marked * are required."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="gift-form" loading={saving}>
            {editing ? 'Save changes' : s.type === 'pledge' ? 'Save pledge' : 'Save gift'}
          </Button>
        </>
      }
    >
      <form id="gift-form" onSubmit={submit} noValidate className="space-y-7">
        {!editing && (
          <div role="radiogroup" aria-label="Type of giving" className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(GIFT_TYPES) as GiftType[]).map((t) => {
              const Icon = TYPE_ICONS[t];
              const on = s.type === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set('type', t)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 text-left transition sm:flex-col sm:items-start sm:gap-2',
                    on
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                      : 'border-stone-200 hover:border-stone-300',
                  )}
                >
                  <span
                    className={cn('rounded-lg p-2', on ? 'bg-white text-brand-700' : 'bg-stone-100 text-stone-500')}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-stone-900">{GIFT_TYPES[t].label}</span>
                    <span className="block text-xs text-stone-500">{GIFT_TYPES[t].hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <Section title="Giver">
          <Field label="Name" required error={errors.donorName}>
            <Input value={s.donorName} onChange={(e) => set('donorName', e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Category" required error={errors.category}>
            <ChoiceChips
              size="sm"
              value={s.category}
              onChange={(v) => set('category', v as DonorCategory)}
              options={DONOR_CATEGORIES}
            />
          </Field>
          <Field label="Location" required>
            <ChoiceChips
              size="sm"
              value={s.where}
              onChange={(v) => set('where', v as State['where'])}
              options={[
                { value: 'PNG', label: 'Papua New Guinea' },
                { value: 'Overseas', label: 'Overseas' },
              ]}
            />
          </Field>
          {s.where === 'PNG' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Province" required error={errors.province}>
                <Select
                  value={s.province}
                  onChange={(e) => set('province', e.target.value)}
                  placeholder="Choose a province…"
                  options={PNG_PROVINCES}
                />
              </Field>
              <Field label="City / town">
                <Input value={s.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Country"
                required
                error={errors.country}
                hint={s.country ? `Amounts in ${currency}` : undefined}
              >
                <Select
                  value={s.country}
                  onChange={(e) => set('country', e.target.value)}
                  placeholder="Choose a country…"
                  options={countryOptions}
                />
              </Field>
              <Field label="City / location">
                <Input value={s.overseasLocation} onChange={(e) => set('overseasLocation', e.target.value)} />
              </Field>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile">
              <Input
                prefix={dial || '+'}
                type="tel"
                inputMode="tel"
                value={s.mobile}
                onChange={(e) => set('mobile', e.target.value.replace(/[^\d ]/g, ''))}
              />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input type="email" value={s.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
          </div>
          <Field label="Address">
            <Input value={s.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Church">
              <Input value={s.church} onChange={(e) => set('church', e.target.value)} />
            </Field>
            <Field label="Congregation">
              <Input value={s.congregation} onChange={(e) => set('congregation', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title={s.type === 'pledge' ? 'Pledge' : s.type === 'cash' ? 'Cash gift' : 'In-kind gift'}>
          {s.type === 'pledge' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pledge amount" required error={errors.pledgeAmount}>
                  <Input
                    prefix={symbol}
                    inputMode="decimal"
                    value={s.pledgeAmount}
                    onChange={(e) => set('pledgeAmount', e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Date pledged" required error={errors.giftDate}>
                  <Input type="date" value={s.giftDate} onChange={(e) => set('giftDate', e.target.value)} />
                </Field>
              </div>
              <Field label="Proposed payment schedule" required error={errors.schedule}>
                <ChoiceChips
                  size="sm"
                  value={s.schedule}
                  onChange={(v) => set('schedule', v as PledgeSchedule)}
                  options={PLEDGE_SCHEDULES}
                />
              </Field>
              <Field label="More details" hint="e.g. K50 every fortnight from November">
                <Input value={s.scheduleDetails} onChange={(e) => set('scheduleDetails', e.target.value)} />
              </Field>
              {!editing && (
                <div className="grid gap-4 rounded-xl bg-stone-50 p-4 sm:grid-cols-2">
                  <Field label="Paid today (optional)" error={errors.paidNow}>
                    <Input
                      prefix={symbol}
                      inputMode="decimal"
                      value={s.paidNow}
                      onChange={(e) => set('paidNow', e.target.value)}
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Paid by">
                    <Select
                      value={s.method}
                      onChange={(e) => set('method', e.target.value as PaymentMethod)}
                      options={PAYMENT_METHODS}
                    />
                  </Field>
                </div>
              )}
            </>
          )}

          {s.type === 'cash' && (
            <div className="grid gap-4 sm:grid-cols-3">
              {!editing && (
                <>
                  <Field label="Amount received" required error={errors.paidNow}>
                    <Input
                      prefix={symbol}
                      inputMode="decimal"
                      value={s.paidNow}
                      onChange={(e) => set('paidNow', e.target.value)}
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Received by">
                    <Select
                      value={s.method}
                      onChange={(e) => set('method', e.target.value as PaymentMethod)}
                      options={PAYMENT_METHODS}
                    />
                  </Field>
                </>
              )}
              <Field label="Date received" required error={errors.giftDate}>
                <Input type="date" value={s.giftDate} onChange={(e) => set('giftDate', e.target.value)} />
              </Field>
            </div>
          )}

          {s.type === 'kind' && (
            <>
              <Field
                label="What was given"
                required
                error={errors.itemDescription}
                hint="e.g. 2 bags of rice, a generator, fuel for the transmitter"
              >
                <Textarea rows={2} value={s.itemDescription} onChange={(e) => set('itemDescription', e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Quantity">
                  <Input
                    value={s.quantity}
                    onChange={(e) => set('quantity', e.target.value)}
                    placeholder="e.g. 2 bags"
                  />
                </Field>
                <Field label="Estimated value" error={errors.estimatedValue} hint="Optional">
                  <Input
                    prefix={symbol}
                    inputMode="decimal"
                    value={s.estimatedValue}
                    onChange={(e) => set('estimatedValue', e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Date received" required error={errors.giftDate}>
                  <Input type="date" value={s.giftDate} onChange={(e) => set('giftDate', e.target.value)} />
                </Field>
              </div>
            </>
          )}

          <Field label="Notes">
            <Textarea
              rows={2}
              value={s.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Anything else the office should know"
            />
          </Field>
        </Section>
      </form>
    </Modal>
  );
}
