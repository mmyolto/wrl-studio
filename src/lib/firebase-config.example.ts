// Only needed to point the app at a DIFFERENT Firebase project — the Wantok Radio Light
// project is already built into config.ts. Copy this file to firebase-config.ts (same folder)
// and paste the other project's web app values:
// Firebase console → Project settings → General → Your apps → Web app → SDK setup and configuration.
// firebase-config.ts is listed in .gitignore. Blank values fall back to the built-in project.
export const projectConfig = {
  apiKey: '', // e.g. 'AIza…'
  authDomain: '', // e.g. 'my-project.firebaseapp.com'
  projectId: '', // e.g. 'my-project'
  storageBucket: '', // e.g. 'my-project.firebasestorage.app'
  messagingSenderId: '',
  appId: '',
};
