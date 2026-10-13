import { rulesOutdated } from './rulesCheck';

/** Turns Firebase error codes into sentences staff can act on. */
export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const code = (error as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'That email and password do not match.',
    'auth/wrong-password': 'That email and password do not match.',
    'auth/user-not-found': 'No account uses that email address.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'No internet connection. Check your network and try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'permission-denied': 'You do not have permission to do that.',
    unavailable: 'You appear to be offline. Changes will sync when you reconnect.',
  };
  if (code === 'permission-denied' && rulesOutdated()) {
    return 'Not saved — the database rules on Firebase are out of date. The Administrator needs to run DEPLOY-RULES.bat.';
  }
  if (map[code]) return map[code];
  if (error instanceof Error && error.message && !code) return error.message;
  return fallback;
}
