import { ShieldCheck } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { friendlyError } from '../lib/errors';
import { auth } from '../lib/firebase';
import { completeSetup } from '../services/users';
import { AuthLayout } from './AuthLayout';

/** First run only: creates the Administrator account. Closed for good once it succeeds. */
export function SetupPage({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!form.name.trim()) found.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = 'Enter a valid email address.';
    if (form.password.length < 8) found.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) found.confirm = 'Passwords don’t match.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setFailure(null);
    const email = form.email.trim().toLowerCase();
    try {
      let uid: string;
      try {
        uid = (await createUserWithEmailAndPassword(auth, email, form.password)).user.uid;
      } catch (err) {
        // A previous attempt may have created the login but not the profile.
        if ((err as { code?: string }).code !== 'auth/email-already-in-use') throw err;
        uid = (await signInWithEmailAndPassword(auth, email, form.password)).user.uid;
      }
      await completeSetup(uid, form.name, email);
      onDone();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setFailure(
        code === 'permission-denied'
          ? 'Setup was blocked by the database rules. Make sure firestore.rules has been deployed (see README), then try again.'
          : code === 'auth/operation-not-allowed'
            ? 'Email/password sign-in is not enabled. Turn it on in Firebase console → Authentication → Sign-in method.'
            : friendlyError(err),
      );
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome — let’s set up the studio"
      subtitle="Create the first Administrator account. You’ll add the rest of the team from inside the app."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Your full name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" required error={errors.email}>
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password" required error={errors.password} hint="At least 8 characters.">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm password" required error={errors.confirm}>
          <Input
            type="password"
            value={form.confirm}
            onChange={(e) => set('confirm', e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        {failure && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-flame-600">
            {failure}
          </p>
        )}
        <Button type="submit" size="lg" icon={ShieldCheck} loading={busy} className="w-full">
          Create Administrator account
        </Button>
        <p className="text-center text-xs text-stone-500">
          This screen appears only once, before anyone has signed up.
        </p>
      </form>
    </AuthLayout>
  );
}
