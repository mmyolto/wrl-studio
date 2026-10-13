import { LoaderCircle, LogOut, ShieldAlert, UserX } from 'lucide-react';
import logo from '../assets/logo.png';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from './AuthLayout';

export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <img src={logo} alt="Wantok Radio Light" className="h-14 w-auto animate-fade-in" />
      <LoaderCircle className="h-5 w-5 animate-spin text-brand-600" aria-label="Loading" />
    </div>
  );
}

export function AccountProblem({ kind }: { kind: 'noProfile' | 'disabled' }) {
  const { logout, firebaseUser } = useAuth();
  return (
    <AuthLayout
      title={kind === 'disabled' ? 'Your account is disabled' : 'Your account isn’t set up yet'}
      subtitle={
        kind === 'disabled'
          ? 'An administrator has turned off access for this account. Contact them if you think this is a mistake.'
          : 'You signed in, but no staff profile exists for this login. Ask an administrator to add you on the Staff page.'
      }
    >
      <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
        {kind === 'disabled' ? (
          <UserX className="h-5 w-5 text-flame-600" />
        ) : (
          <ShieldAlert className="h-5 w-5 text-amber-600" />
        )}
        <p className="text-sm text-stone-700">{firebaseUser?.email}</p>
      </div>
      <Button variant="secondary" icon={LogOut} className="mt-5 w-full" onClick={() => logout()}>
        Sign out
      </Button>
    </AuthLayout>
  );
}
