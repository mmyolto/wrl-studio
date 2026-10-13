import { Ban, KeyRound, Pencil, RotateCcw, Search, ShieldCheck, UserPlus, WandSparkles } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Field';
import { Avatar, Badge, ConfirmDialog, PageHeader, Segmented, type Tone } from '../../components/ui/misc';
import { Modal } from '../../components/ui/Modal';
import { useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { attempt } from '../../lib/attempt';
import { AVAILABILITY, ROLE_DESCRIPTIONS, ROLES } from '../../lib/constants';
import { formatDate, timeAgo } from '../../lib/format';
import type { Role, UserProfile } from '../../lib/types';
import { createStaffAccount, sendPasswordReset, updateStaff } from '../../services/users';

const ROLE_TONE: Record<Role, Tone> = {
  Administrator: 'red',
  'General Manager': 'brand',
  'Program Director': 'violet',
  'Ministry Chaplain': 'blue',
  Announcer: 'neutral',
};

const roleOptions = ROLES.map((r) => ({ value: r, label: r }));

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function AddStaffDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: generatePassword(), role: 'Announcer' as Role });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!form.name.trim()) found.name = 'Enter their full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = 'Enter a valid email address.';
    if (form.password.length < 6) found.password = 'At least 6 characters.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await attempt(() => createStaffAccount(form), `${form.name.trim()} can now sign in.`);
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
      title="Add staff member"
      description="They sign in with this email and password. Share the password privately; they can change it with “Forgot password”."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="add-staff" loading={saving}>
            Create account
          </Button>
        </>
      }
    >
      <form id="add-staff" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Full name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Email" required error={errors.email}>
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Temporary password" required error={errors.password}>
          <Input
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            autoComplete="new-password"
            className="font-mono"
            suffix={
              <Button
                variant="secondary"
                icon={WandSparkles}
                onClick={() => set('password', generatePassword())}
                aria-label="Generate password"
              >
                <span className="hidden sm:inline">New</span>
              </Button>
            }
          />
        </Field>
        <Field label="Role" required hint={ROLE_DESCRIPTIONS[form.role]}>
          <Select value={form.role} onChange={(e) => set('role', e.target.value as Role)} options={roleOptions} />
        </Field>
      </form>
    </Modal>
  );
}

function EditStaffDialog({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const me = useCurrentUser();
  const self = user.id === me.id;
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<Role>(user.role);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await attempt(() => updateStaff(user, { name: name.trim(), role }), 'Saved.');
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
      size="sm"
      title={`Edit ${user.name}`}
      description={user.email}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-staff" loading={saving} disabled={!name.trim()}>
            Save
          </Button>
        </>
      }
    >
      <form id="edit-staff" onSubmit={submit} className="space-y-4">
        <Field label="Full name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Role" hint={self ? 'You can’t change your own role.' : ROLE_DESCRIPTIONS[role]}>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={roleOptions}
            disabled={self}
          />
        </Field>
      </form>
    </Modal>
  );
}

export function UsersPage() {
  const me = useCurrentUser();
  const { users } = useData();
  const [view, setView] = useState<'active' | 'disabled'>('active');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [toggling, setToggling] = useState<UserProfile | null>(null);
  const [resetting, setResetting] = useState<UserProfile | null>(null);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => (view === 'active' ? !u.disabled : u.disabled))
      .filter((u) => !q || [u.name, u.email, u.role].some((v) => v.toLowerCase().includes(q)));
  }, [users, view, search]);

  return (
    <>
      <PageHeader
        title="Staff & access"
        description="Who can sign in to the studio and what each person can do."
        actions={
          <Button icon={UserPlus} onClick={() => setAdding(true)}>
            Add staff
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Accounts"
          value={view}
          onChange={setView}
          options={[
            { value: 'active', label: 'Active', count: users.filter((u) => !u.disabled).length },
            { value: 'disabled', label: 'Disabled', count: users.filter((u) => u.disabled).length },
          ]}
        />
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff"
            className="pl-9"
            aria-label="Search staff"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {list.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-stone-500">
            {view === 'disabled' ? 'No disabled accounts.' : 'No staff match.'}
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {list.map((u) => {
              const self = u.id === me.id;
              const availability = u.availability ?? 'active';
              return (
                <li key={u.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={u.name} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-stone-900">
                        {u.name}
                        {self && (
                          <Badge tone="brand" icon={ShieldCheck}>
                            You
                          </Badge>
                        )}
                        {availability !== 'active' && <Badge tone="amber">{AVAILABILITY[availability].label}</Badge>}
                      </p>
                      <p className="truncate text-sm text-stone-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                    <span className="w-32 text-xs text-stone-500" title={`Added ${formatDate(u.createdAt)}`}>
                      {u.lastSignIn ? `Active ${timeAgo(u.lastSignIn)}` : 'Never signed in'}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        icon={Pencil}
                        aria-label={`Edit ${u.name}`}
                        title="Edit"
                        onClick={() => setEditing(u)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        icon={KeyRound}
                        aria-label={`Send password reset to ${u.name}`}
                        title="Send password reset email"
                        onClick={() => setResetting(u)}
                      />
                      {!self && (
                        <Button
                          variant="ghost"
                          size="icon"
                          icon={u.disabled ? RotateCcw : Ban}
                          aria-label={u.disabled ? `Re-enable ${u.name}` : `Disable ${u.name}`}
                          title={u.disabled ? 'Re-enable account' : 'Disable account'}
                          className={u.disabled ? '' : 'hover:bg-red-50 hover:text-flame-600'}
                          onClick={() => setToggling(u)}
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {adding && <AddStaffDialog onClose={() => setAdding(false)} />}
      {editing && <EditStaffDialog user={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!toggling}
        tone={toggling?.disabled ? 'primary' : 'danger'}
        title={toggling?.disabled ? `Re-enable ${toggling?.name}?` : `Disable ${toggling?.name}?`}
        message={
          toggling?.disabled
            ? 'They will be able to sign in again with their existing password.'
            : 'They will be signed out and can no longer use the studio. Their records stay in place, and you can re-enable them at any time.'
        }
        confirmLabel={toggling?.disabled ? 'Re-enable' : 'Disable account'}
        onClose={() => setToggling(null)}
        onConfirm={() =>
          attempt(
            () => updateStaff(toggling!, { disabled: !toggling!.disabled }),
            toggling!.disabled ? 'Account re-enabled.' : 'Account disabled.',
          )
        }
      />
      <ConfirmDialog
        open={!!resetting}
        tone="primary"
        title="Send password reset?"
        message={
          <>
            Firebase will email a reset link to <strong>{resetting?.email}</strong>.
          </>
        }
        confirmLabel="Send email"
        onClose={() => setResetting(null)}
        onConfirm={() => attempt(() => sendPasswordReset(resetting!.email), 'Reset email sent.')}
      />
    </>
  );
}
