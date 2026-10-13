// Firebase web config. Values come from (first one found wins):
//   1. a .env file (VITE_FIREBASE_* — see .env.example)
//   2. src/lib/firebase-config.ts (optional, git-ignored — copy firebase-config.example.ts)
//   3. the built-in wrl-studio project below, so a copy built from GitHub works with no extra setup.
// These are public client identifiers that ship to every browser anyway; data is protected by
// firestore.rules. To point the app at a different Firebase project, use option 1 or 2.

interface WebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const WRL_STUDIO: WebConfig = {
  apiKey: 'AIzaSyBVt7lWBXnmBrjuCKaFpuyRjPib_K9KuhE',
  authDomain: 'wrl-studio.firebaseapp.com',
  projectId: 'wrl-studio',
  storageBucket: 'wrl-studio.firebasestorage.app',
  messagingSenderId: '664420456985',
  appId: '1:664420456985:web:559935a922c508f35ee888',
};

// Optional local file: the glob returns nothing when it doesn't exist, so a fresh clone still builds.
const local = import.meta.glob<{ projectConfig: Partial<WebConfig> }>('./firebase-config.ts', { eager: true });
const fileConfig: Partial<WebConfig> = Object.values(local)[0]?.projectConfig ?? {};

const env = import.meta.env;
/** First non-blank value, so an empty template or .env line can't wipe out the built-in config. */
const pick = (...values: unknown[]) =>
  values.find((v): v is string => typeof v === 'string' && v.trim() !== '') ?? '';

export const firebaseConfig: WebConfig = {
  apiKey: pick(env.VITE_FIREBASE_API_KEY, fileConfig.apiKey, WRL_STUDIO.apiKey),
  authDomain: pick(env.VITE_FIREBASE_AUTH_DOMAIN, fileConfig.authDomain, WRL_STUDIO.authDomain),
  projectId: pick(env.VITE_FIREBASE_PROJECT_ID, fileConfig.projectId, WRL_STUDIO.projectId),
  storageBucket: pick(env.VITE_FIREBASE_STORAGE_BUCKET, fileConfig.storageBucket, WRL_STUDIO.storageBucket),
  messagingSenderId: pick(
    env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    fileConfig.messagingSenderId,
    WRL_STUDIO.messagingSenderId,
  ),
  appId: pick(env.VITE_FIREBASE_APP_ID, fileConfig.appId, WRL_STUDIO.appId),
};

export const useEmulators = env.VITE_USE_FIREBASE_EMULATORS === 'true';

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
