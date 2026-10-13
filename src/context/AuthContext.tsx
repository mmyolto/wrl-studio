import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from '../components/ui/toast';
import { auth } from '../lib/firebase';
import type { UserProfile } from '../lib/types';
import { COL, docRef } from '../services/collections';
import { recordSignIn } from '../services/users';

export type AuthStatus = 'loading' | 'signedOut' | 'noProfile' | 'disabled' | 'ready';

interface AuthValue {
  status: AuthStatus;
  firebaseUser: User | null;
  profile: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const signInRecorded = useRef<string | null>(null);
  const unsubscribeProfile = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile.current?.();
      unsubscribeProfile.current = undefined;
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setStatus('signedOut');
        signInRecorded.current = null;
        return;
      }

      setStatus('loading');
      unsubscribeProfile.current = onSnapshot(
        docRef(COL.users, user.uid),
        (snap) => {
          if (!snap.exists()) {
            setProfile(null);
            setStatus('noProfile');
            return;
          }
          const data = { ...(snap.data() as Omit<UserProfile, 'id'>), id: snap.id };
          setProfile(data);
          if (data.disabled) {
            setStatus('disabled');
            return;
          }
          setStatus('ready');
          if (signInRecorded.current !== user.uid) {
            signInRecorded.current = user.uid;
            recordSignIn(user.uid).catch(() => undefined);
          }
        },
        () => {
          setProfile(null);
          setStatus('noProfile');
        },
      );
    });

    return () => {
      unsubscribeProfile.current?.();
      unsubscribeAuth();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const logout = useCallback(async () => {
    // Close all live listeners before the credentials go away, so they don't
    // surface "permission denied" errors on the way out.
    unsubscribeProfile.current?.();
    unsubscribeProfile.current = undefined;
    setProfile(null);
    setStatus('signedOut');
    toast.clear();
    // The next person to sign in on this device starts on the overview.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({ status, firebaseUser, profile, login, logout }),
    [status, firebaseUser, profile, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For screens that only render once the user is signed in with an active profile. */
export function useCurrentUser(): UserProfile {
  const { profile } = useAuth();
  if (!profile) throw new Error('useCurrentUser called without a signed-in user');
  return profile;
}
