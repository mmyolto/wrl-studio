import { Megaphone } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { Checkbox, ChoiceChips, Field, Input, Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { attempt } from '../../lib/attempt';
import {
  COMMUNICATION_METHODS,
  GENDERS,
  MARRIAGE,
  MARRIAGE_PROBLEMS,
  MESSAGE_CATEGORIES,
  OVERSEAS,
  PHONE_METHODS,
  PNG_PROVINCES,
  PRAYER_CATEGORIES,
  TOKSAVE,
  TOKSAVE_ROLES,
} from '../../lib/constants';
import { COUNTRIES, findCountry, OVERSEAS_COUNTRIES, PNG } from '../../lib/countries';
import type { ListenerFields, ListenerRecord, MarriageProblems } from '../../lib/types';
import { createRecord, updateRecord } from '../../services/records';

interface FormState {
  fullName: string;
  gender: string;
  method: string;
  phoneCountry: string;
  phoneNumber: string;
  facebookName: string;
  emailAddress: string;
  where: 'png' | 'overseas';
  overseasCountry: string;
  province: string;
  location: string;
  category: string;
  songTitle: string;
  artist: string;
  prayerCategory: string;
  marriage: MarriageProblems;
  message: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const NO_PROBLEMS: MarriageProblems = { deserted: false, divorced: false, abuse: false, cheating: false };

function initialState(record?: ListenerRecord): FormState {
  const phone = !!record && PHONE_METHODS.includes(record.communicationMethod);
  const overseas = !!record && record.country !== PNG;
  return {
    fullName: record?.fullName ?? '',
    gender: record?.gender ?? '',
    method: record?.communicationMethod ?? '',
    phoneCountry: phone ? record!.country : PNG,
    phoneNumber: record?.phoneNumber ?? '',
    facebookName: record?.facebookName ?? '',
    emailAddress: record?.emailAddress ?? '',
    where: overseas && !phone ? 'overseas' : 'png',
    overseasCountry: overseas && !phone ? record!.country : '',
    province: record && record.country === PNG ? record.province : '',
    location: record?.location ?? '',
    category: record?.messageCategory ?? '',
    songTitle: record?.songTitle ?? '',
    artist: record?.artist ?? '',
    prayerCategory: record?.prayerCategory ?? '',
    marriage: { ...NO_PROBLEMS, ...record?.marriageProblems },
    message: record?.message ?? '',
  };
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
      <div className="flex items-center gap-2 sm:block">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
          {step}
        </span>
        <h3 className="text-sm font-bold text-stone-900 sm:mt-2">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function RecordForm({
  open,
  record,
  onClose,
  onSaved,
}: {
  open: boolean;
  record?: ListenerRecord;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const me = useCurrentUser();
  const { staff } = useData();
  const toksaveBosses = useMemo(
    () =>
      staff
        .filter((u) => (TOKSAVE_ROLES as readonly string[]).includes(u.role) && u.id !== me.id)
        // Program Director first, then General Manager.
        .sort((a, b) => TOKSAVE_ROLES.indexOf(a.role as never) - TOKSAVE_ROLES.indexOf(b.role as never)),
    [staff, me.id],
  );
  const toksaveRecipients = toksaveBosses.map((u) => u.id);
  const toksaveSent = toksaveBosses.length
    ? `Toksave sent to ${toksaveBosses.map((u) => u.name).join(' and ')}.`
    : 'Record saved.';
  const [form, setForm] = useState<FormState>(() => initialState(record));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const editing = !!record;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const isPhone = PHONE_METHODS.includes(form.method);
  const country = isPhone ? form.phoneCountry : form.where === 'png' ? PNG : form.overseasCountry;
  const inPng = country === PNG;

  const phoneOptions = useMemo(() => COUNTRIES.map((c) => ({ value: c.name, label: `${c.name} (${c.dialCode})` })), []);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.fullName.trim()) e.fullName = 'Enter the listener’s name.';
    if (!form.gender) e.gender = 'Choose a gender (or “Not Mentioned”).';
    if (!form.method) e.method = 'How did the listener get in touch?';
    if (isPhone && form.phoneNumber.replace(/\D/g, '').length < 5) e.phoneNumber = 'Enter a valid phone number.';
    if (form.method === 'Facebook' && !form.facebookName.trim()) e.facebookName = 'Enter the Facebook name.';
    if (form.method === 'Email' && !isEmail(form.emailAddress.trim())) e.emailAddress = 'Enter a valid email address.';
    if (!isPhone && form.where === 'overseas' && !form.overseasCountry) e.overseasCountry = 'Choose a country.';
    if (inPng && !form.province) e.province = 'Choose a province.';
    if (!form.location.trim()) e.location = 'Enter the town, village or area.';
    if (!form.category) e.category = 'Choose a category.';
    if (form.category === 'Song Request') {
      if (!form.songTitle.trim()) e.songTitle = 'Enter the song title.';
      if (!form.artist.trim()) e.artist = 'Enter the artist.';
    }
    if (form.category === 'Prayer Request' && !form.prayerCategory) e.prayerCategory = 'Choose a prayer category.';
    if (!form.message.trim()) e.message = 'Enter the message.';
    return e;
  };

  const toFields = (): ListenerFields => {
    const prayer = form.category === 'Prayer Request';
    return {
      fullName: form.fullName.trim(),
      gender: form.gender,
      communicationMethod: form.method,
      phoneNumber: isPhone ? form.phoneNumber.replace(/\D/g, '') : undefined,
      countryCode: isPhone ? findCountry(form.phoneCountry)?.dialCode : undefined,
      facebookName: form.method === 'Facebook' ? form.facebookName.trim() : undefined,
      emailAddress: form.method === 'Email' ? form.emailAddress.trim().toLowerCase() : undefined,
      country,
      province: inPng ? form.province : OVERSEAS,
      location: form.location.trim(),
      messageCategory: form.category,
      songTitle: form.category === 'Song Request' ? form.songTitle.trim() : undefined,
      artist: form.category === 'Song Request' ? form.artist.trim() : undefined,
      prayerCategory: prayer ? form.prayerCategory : undefined,
      marriageProblems: prayer && form.prayerCategory === MARRIAGE ? form.marriage : undefined,
      message: form.message.trim(),
    };
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
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
      if (record) {
        const nowToksave = form.category === TOKSAVE && record.messageCategory !== TOKSAVE;
        await attempt(
          () => updateRecord(record, toFields(), me, toksaveRecipients),
          nowToksave ? toksaveSent : 'Record updated.',
        );
        onSaved?.(record.id);
      } else {
        const id = await attempt(
          () => createRecord(toFields(), me, toksaveRecipients),
          form.category === TOKSAVE ? toksaveSent : 'Record saved.',
        );
        onSaved?.(id);
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
      open={open}
      onClose={onClose}
      locked={saving}
      size="xl"
      title={editing ? 'Edit listener record' : 'New listener record'}
      description={editing ? 'The previous version is kept in the archive.' : 'Fields marked * are required.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="record-form" loading={saving}>
            {editing ? 'Save changes' : 'Save record'}
          </Button>
        </>
      }
    >
      <form id="record-form" onSubmit={submit} noValidate className="space-y-8">
        <Section step={1} title="Listener">
          <Field label="Full name" required error={errors.fullName}>
            <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Gender" required error={errors.gender}>
            <ChoiceChips value={form.gender} onChange={(v) => set('gender', v)} options={GENDERS} />
          </Field>
        </Section>

        <Section step={2} title="Contact">
          <Field label="How did they reach us?" required error={errors.method}>
            <ChoiceChips value={form.method} onChange={(v) => set('method', v)} options={COMMUNICATION_METHODS} />
          </Field>
          {isPhone && (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Field label="Phone country" required hint="Sets the listener’s country.">
                <Select
                  value={form.phoneCountry}
                  onChange={(e) => set('phoneCountry', e.target.value)}
                  options={phoneOptions}
                />
              </Field>
              <Field label="Phone number" required error={errors.phoneNumber}>
                <Input
                  prefix={findCountry(form.phoneCountry)?.dialCode}
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.phoneNumber}
                  onChange={(e) => set('phoneNumber', e.target.value.replace(/[^\d ]/g, ''))}
                  placeholder="7123 4567"
                />
              </Field>
            </div>
          )}
          {form.method === 'Facebook' && (
            <Field label="Facebook name" required error={errors.facebookName}>
              <Input value={form.facebookName} onChange={(e) => set('facebookName', e.target.value)} />
            </Field>
          )}
          {form.method === 'Email' && (
            <Field label="Email address" required error={errors.emailAddress}>
              <Input type="email" value={form.emailAddress} onChange={(e) => set('emailAddress', e.target.value)} />
            </Field>
          )}
        </Section>

        <Section step={3} title="Location">
          {!isPhone && form.method && (
            <Field label="Where is the listener?" required>
              <ChoiceChips
                value={form.where}
                onChange={(v) => set('where', v as FormState['where'])}
                options={[
                  { value: 'png', label: 'Papua New Guinea' },
                  { value: 'overseas', label: 'Overseas' },
                ]}
              />
            </Field>
          )}
          {!isPhone && form.where === 'overseas' && (
            <Field label="Country" required error={errors.overseasCountry}>
              <Select
                value={form.overseasCountry}
                onChange={(e) => set('overseasCountry', e.target.value)}
                placeholder="Choose a country…"
                options={OVERSEAS_COUNTRIES.map((c) => c.name)}
              />
            </Field>
          )}
          {!inPng && country && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
              Overseas listener · <strong>{country}</strong>
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {inPng && (
              <Field label="Province" required error={errors.province}>
                <Select
                  value={form.province}
                  onChange={(e) => set('province', e.target.value)}
                  placeholder="Choose a province…"
                  options={PNG_PROVINCES}
                />
              </Field>
            )}
            <Field
              label="Town, village or area"
              required
              error={errors.location}
              className={inPng ? '' : 'sm:col-span-2'}
            >
              <Input
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="e.g. Gerehu Stage 4"
              />
            </Field>
          </div>
        </Section>

        <Section step={4} title="Message">
          <Field label="Category" required error={errors.category}>
            <ChoiceChips value={form.category} onChange={(v) => set('category', v)} options={MESSAGE_CATEGORIES} />
          </Field>

          {form.category === TOKSAVE && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p>
                This toksave goes straight to the <strong>Program Director</strong> and the{' '}
                <strong>General Manager</strong> as soon as you save it.
                {toksaveBosses.length > 0 && (
                  <span className="block text-amber-800">Sent to: {toksaveBosses.map((u) => u.name).join(', ')}</span>
                )}
              </p>
            </div>
          )}

          {form.category === 'Song Request' && (
            <div className="grid gap-4 rounded-xl bg-sky-50/60 p-4 sm:grid-cols-2">
              <Field label="Song title" required error={errors.songTitle}>
                <Input value={form.songTitle} onChange={(e) => set('songTitle', e.target.value)} />
              </Field>
              <Field label="Artist" required error={errors.artist}>
                <Input value={form.artist} onChange={(e) => set('artist', e.target.value)} />
              </Field>
            </div>
          )}

          {form.category === 'Prayer Request' && (
            <div className="space-y-4 rounded-xl bg-violet-50/60 p-4">
              <Field label="Prayer category" required error={errors.prayerCategory}>
                <Select
                  value={form.prayerCategory}
                  onChange={(e) => set('prayerCategory', e.target.value)}
                  placeholder="Choose a prayer category…"
                  options={PRAYER_CATEGORIES}
                />
              </Field>
              {form.prayerCategory === MARRIAGE && (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-stone-700">Marriage problem details</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {MARRIAGE_PROBLEMS.map((p) => (
                      <Checkbox
                        key={p.key}
                        label={p.label}
                        checked={form.marriage[p.key]}
                        onChange={(checked) => set('marriage', { ...form.marriage, [p.key]: checked })}
                      />
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          )}

          <Field label="Message" required error={errors.message}>
            <Textarea
              rows={4}
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              placeholder="What did the listener say?"
            />
          </Field>
        </Section>
      </form>
    </Modal>
  );
}
