import { MicVocal, Plus, Trash2, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Checkbox, ChoiceChips, Field, Input, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { attempt } from '../../lib/attempt';
import { INTERVIEW_FORMATS } from '../../lib/constants';
import { startOfWeek, toDayInput } from '../../lib/format';
import { MANAGEMENT_ROLES } from '../../lib/permissions';
import type { Interviewee, InterviewFormat, ShowPrep, ShowPrepFields, TimeSlot } from '../../lib/types';
import { submitShowPrep, updateShowPrep } from '../../services/showPreps';

const emptySlot = (): TimeSlot => ({ airTimeHour: '', talkingPoints: '' });

const emptyInterviewee = (weekStarting: string): Interviewee => ({
  name: '',
  position: '',
  organisation: '',
  phone: '',
  topic: '',
  date: weekStarting,
  time: '',
  format: 'In studio',
  notes: '',
});

type IntervieweeErrors = Partial<Record<keyof Interviewee, string>>;

/** Required details for each interviewee. */
function checkInterviewee(iv: Interviewee): IntervieweeErrors {
  const e: IntervieweeErrors = {};
  if (!iv.name.trim()) e.name = 'Enter the interviewee’s full name.';
  if (!iv.position.trim()) e.position = 'Enter their position or title.';
  if (iv.phone.replace(/\D/g, '').length < 6) e.phone = 'Enter a contact number.';
  if (!iv.topic.trim()) e.topic = 'What will the interview be about?';
  if (!iv.date) e.date = 'Choose the day.';
  if (!iv.time.trim()) e.time = 'Enter the air time.';
  return e;
}

const cleanInterviewee = (iv: Interviewee): Interviewee => ({
  name: iv.name.trim(),
  position: iv.position.trim(),
  organisation: iv.organisation?.trim() ?? '',
  phone: iv.phone.trim(),
  topic: iv.topic.trim(),
  date: iv.date,
  time: iv.time.trim(),
  format: iv.format,
  notes: iv.notes?.trim() ?? '',
});

function initial(prep?: ShowPrep): ShowPrepFields {
  if (prep) {
    return {
      ...prep,
      timeSlots: prep.timeSlots.length ? prep.timeSlots.map((s) => ({ ...s })) : [emptySlot()],
      hasInterview: !!prep.hasInterview,
      interviews: prep.interviews?.length ? prep.interviews.map((iv) => ({ ...iv })) : [],
      guests: prep.guests ?? '',
      musicPlaylist: prep.musicPlaylist ?? '',
      technicalRequest: prep.technicalRequest ?? '',
    };
  }
  return {
    showName: '',
    weekStarting: toDayInput(startOfWeek()),
    topics: '',
    timeSlots: [emptySlot(), emptySlot(), emptySlot()],
    hasInterview: false,
    interviews: [],
    guests: '',
    musicPlaylist: '',
    technicalRequest: '',
  };
}

export function ShowPrepForm({ prep, onClose }: { prep?: ShowPrep; onClose: () => void }) {
  const me = useCurrentUser();
  const { staff } = useData();
  const [form, setForm] = useState<ShowPrepFields>(() => initial(prep));
  const [errors, setErrors] = useState<Partial<Record<'showName' | 'weekStarting' | 'topics', string>>>({});
  const [ivErrors, setIvErrors] = useState<IntervieweeErrors[]>([]);
  const [saving, setSaving] = useState(false);
  const interviews = form.interviews ?? [];

  const set = <K extends keyof ShowPrepFields>(key: K, value: ShowPrepFields[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const setSlot = (i: number, key: keyof TimeSlot, value: string) =>
    set(
      'timeSlots',
      form.timeSlots.map((s, j) => (j === i ? { ...s, [key]: value } : s)),
    );

  const setInterviewee = <K extends keyof Interviewee>(i: number, key: K, value: Interviewee[K]) => {
    set(
      'interviews',
      interviews.map((iv, j) => (j === i ? { ...iv, [key]: value } : iv)),
    );
    setIvErrors((all) => all.map((e, j) => (j === i ? { ...e, [key]: undefined } : e)));
  };

  const toggleInterview = (on: boolean) => {
    setForm((f) => ({
      ...f,
      hasInterview: on,
      interviews: on && !f.interviews?.length ? [emptyInterviewee(f.weekStarting)] : f.interviews,
    }));
    setIvErrors([]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!form.showName.trim()) found.showName = 'Enter the show name.';
    if (!form.weekStarting) found.weekStarting = 'Choose the week.';
    if (!form.topics.trim()) found.topics = 'Describe this week’s topics.';
    const foundIv = form.hasInterview ? interviews.map(checkInterviewee) : [];
    setErrors(found);
    setIvErrors(foundIv);
    if (Object.keys(found).length || foundIv.some((x) => Object.keys(x).length)) {
      requestAnimationFrame(() =>
        document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
      return;
    }

    const fields: ShowPrepFields = {
      showName: form.showName.trim(),
      weekStarting: form.weekStarting,
      topics: form.topics.trim(),
      timeSlots: form.timeSlots,
      hasInterview: !!form.hasInterview && interviews.length > 0,
      interviews: form.hasInterview ? interviews.map(cleanInterviewee) : [],
      guests: form.guests?.trim() ?? '',
      musicPlaylist: form.musicPlaylist?.trim() ?? '',
      technicalRequest: form.technicalRequest?.trim() ?? '',
    };

    setSaving(true);
    try {
      if (prep) {
        await attempt(() => updateShowPrep(prep, fields), 'Show prep updated.');
      } else {
        const managers = staff.filter((u) => MANAGEMENT_ROLES.includes(u.role)).map((u) => u.id);
        await attempt(
          () => submitShowPrep(fields, me, managers),
          'Show prep submitted — management has been notified.',
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
      title={prep ? 'Edit show prep' : 'Weekly show prep'}
      description="Plan the week’s show. You can edit it until it has been reviewed."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="show-prep-form" loading={saving}>
            {prep ? 'Save changes' : 'Submit show prep'}
          </Button>
        </>
      }
    >
      <form id="show-prep-form" onSubmit={submit} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <Field label="Show name" required error={errors.showName}>
            <Input
              value={form.showName}
              onChange={(e) => set('showName', e.target.value)}
              placeholder="e.g. Morning Glory"
            />
          </Field>
          <Field label="Week starting" required error={errors.weekStarting}>
            <Input type="date" value={form.weekStarting} onChange={(e) => set('weekStarting', e.target.value)} />
          </Field>
        </div>

        <Field label="Topics & themes" required error={errors.topics}>
          <Textarea
            rows={3}
            value={form.topics}
            onChange={(e) => set('topics', e.target.value)}
            placeholder="Main topics or themes this week…"
          />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-stone-700">Hour-by-hour plan</legend>
          <div className="space-y-2">
            {form.timeSlots.map((slot, i) => (
              <div key={i} className="grid grid-cols-[7.5rem_1fr_auto] items-start gap-2 sm:grid-cols-[10rem_1fr_auto]">
                <Input
                  aria-label={`Air time ${i + 1}`}
                  value={slot.airTimeHour}
                  onChange={(e) => setSlot(i, 'airTimeHour', e.target.value)}
                  placeholder="6–7 am"
                />
                <Input
                  aria-label={`Talking points ${i + 1}`}
                  value={slot.talkingPoints}
                  onChange={(e) => setSlot(i, 'talkingPoints', e.target.value)}
                  placeholder="Talking points for this hour"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  icon={Trash2}
                  aria-label={`Remove hour ${i + 1}`}
                  disabled={form.timeSlots.length === 1}
                  onClick={() =>
                    set(
                      'timeSlots',
                      form.timeSlots.filter((_, j) => j !== i),
                    )
                  }
                />
              </div>
            ))}
          </div>
          {form.timeSlots.length < 12 && (
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              className="mt-2"
              onClick={() => set('timeSlots', [...form.timeSlots, emptySlot()])}
            >
              Add hour
            </Button>
          )}
        </fieldset>

        <section className="rounded-xl border border-stone-200 p-4">
          <Checkbox
            checked={!!form.hasInterview}
            onChange={toggleInterview}
            label={
              <span>
                <span className="font-semibold text-stone-900">This show has an interview this week</span>
                <span className="block text-xs text-stone-500">Tick to add the interviewee’s details.</span>
              </span>
            }
          />

          {form.hasInterview && (
            <div className="mt-4 space-y-4">
              {interviews.map((iv, i) => {
                const err = ivErrors[i] ?? {};
                return (
                  <fieldset
                    key={i}
                    aria-label={interviews.length > 1 ? `Interviewee ${i + 1}` : 'Interviewee'}
                    className="space-y-4 rounded-xl bg-sky-50/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm font-bold text-sky-950">
                        <MicVocal className="h-4 w-4 text-sky-700" />
                        {interviews.length > 1 ? `Interviewee ${i + 1}` : 'Interviewee'}
                      </p>
                      {interviews.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => {
                            set(
                              'interviews',
                              interviews.filter((_, j) => j !== i),
                            );
                            setIvErrors((all) => all.filter((_, j) => j !== i));
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full name" required error={err.name}>
                        <Input value={iv.name} onChange={(e) => setInterviewee(i, 'name', e.target.value)} />
                      </Field>
                      <Field label="Position / title" required error={err.position}>
                        <Input
                          value={iv.position}
                          onChange={(e) => setInterviewee(i, 'position', e.target.value)}
                          placeholder="e.g. Senior Pastor, Health Officer"
                        />
                      </Field>
                      <Field label="Organisation or church">
                        <Input
                          value={iv.organisation ?? ''}
                          onChange={(e) => setInterviewee(i, 'organisation', e.target.value)}
                        />
                      </Field>
                      <Field label="Contact number" required error={err.phone}>
                        <Input
                          type="tel"
                          inputMode="tel"
                          value={iv.phone}
                          onChange={(e) => setInterviewee(i, 'phone', e.target.value)}
                          placeholder="7xxx xxxx"
                        />
                      </Field>
                      <Field label="Interview day" required error={err.date}>
                        <Input type="date" value={iv.date} onChange={(e) => setInterviewee(i, 'date', e.target.value)} />
                      </Field>
                      <Field label="Air time" required error={err.time}>
                        <Input
                          value={iv.time}
                          onChange={(e) => setInterviewee(i, 'time', e.target.value)}
                          placeholder="e.g. 7:30 am"
                        />
                      </Field>
                    </div>
                    <Field label="How will it be done?">
                      <ChoiceChips
                        value={iv.format}
                        onChange={(v) => setInterviewee(i, 'format', v as InterviewFormat)}
                        options={[...INTERVIEW_FORMATS]}
                      />
                    </Field>
                    <Field label="Interview topic" required error={err.topic}>
                      <Textarea
                        rows={2}
                        value={iv.topic}
                        onChange={(e) => setInterviewee(i, 'topic', e.target.value)}
                        placeholder="What will you talk about?"
                      />
                    </Field>
                    <Field label="Other notes" hint="Optional — questions planned, background, how to reach them">
                      <Textarea
                        rows={2}
                        value={iv.notes ?? ''}
                        onChange={(e) => setInterviewee(i, 'notes', e.target.value)}
                      />
                    </Field>
                  </fieldset>
                );
              })}
              {interviews.length < 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={UserPlus}
                  onClick={() => set('interviews', [...interviews, emptyInterviewee(form.weekStarting)])}
                >
                  Add another interviewee
                </Button>
              )}
            </div>
          )}

          {form.guests && (
            <Field label="Guests (earlier notes)" className="mt-4">
              <Textarea rows={2} value={form.guests} onChange={(e) => set('guests', e.target.value)} />
            </Field>
          )}
        </section>

        <Field label="Music playlist">
          <Textarea
            rows={3}
            value={form.musicPlaylist}
            onChange={(e) => set('musicPlaylist', e.target.value)}
            placeholder="Songs, artists or playlist themes"
          />
        </Field>
        <Field label="Requests for the technical team">
          <Textarea
            rows={2}
            value={form.technicalRequest}
            onChange={(e) => set('technicalRequest', e.target.value)}
            placeholder="Equipment, phone lines, outside broadcast…"
          />
        </Field>
      </form>
    </Modal>
  );
}
