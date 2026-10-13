import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { toast } from '../components/ui/toast';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../lib/errors';
import { sendPasswordReset } from '../services/users';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(friendlyError(err, 'Could not sign in. Please try again.'));
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Type your email address above, then choose “Forgot password?” again.');
      return;
    }
    try {
      await sendPasswordReset(email);
      setError(null);
      toast.success(`If ${email.trim()} has an account, a reset link is on its way.`);
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  return (
    <AuthLayout title="Sign in to the studio" subtitle="Use the email and password your administrator gave you.">
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@wantokradio.org"
          />
        </Field>
        <div className="relative">
          <Field label="Password">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
          </Field>
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 bottom-2 rounded p-1 text-stone-400 hover:text-stone-700"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-flame-600">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" icon={LogIn} loading={busy} className="w-full">
          Sign in
        </Button>
        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={forgot} className="font-semibold text-brand-700 hover:text-brand-800">
            Forgot password?
          </button>
          <span className="text-stone-400">No account? Ask your administrator.</span>
        </div>
      </form>
    </AuthLayout>
  );
}
