import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  signOut,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseConfig, useEmulators } from './config';

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Offline-capable cache: records entered with no signal sync when the connection returns.
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

/**
 * Creates a Firebase Auth account without signing the current admin out.
 * Uses a short-lived secondary app instance with in-memory persistence.
 */
export async function createAuthAccount(email: string, password: string): Promise<string> {
  const secondary = initializeApp(firebaseConfig, `account-creator-${Date.now()}`);
  try {
    const secondaryAuth = initializeAuth(secondary, { persistence: inMemoryPersistence });
    if (useEmulators) connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth);
    return credential.user.uid;
  } finally {
    await deleteApp(secondary);
  }
}
