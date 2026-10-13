import { Settings } from 'lucide-react';
import { AuthLayout } from './AuthLayout';

/** Shown when no Firebase config is found (firebase-config.ts or .env). Must not import firebase. */
export function ConfigMissing() {
  return (
    <AuthLayout
      title="Firebase isn’t configured"
      subtitle="The app needs your Firebase project details before it can start."
    >
      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
        <p className="flex items-center gap-2 font-semibold text-stone-900">
          <Settings className="h-4 w-4" /> To fix this
        </p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Copy <code className="rounded bg-stone-100 px-1">src/lib/firebase-config.example.ts</code> to{' '}
            <code className="rounded bg-stone-100 px-1">src/lib/firebase-config.ts</code>.
          </li>
          <li>Paste in the web app config from Firebase console → Project settings → Your apps.</li>
          <li>
            Restart <code className="rounded bg-stone-100 px-1">npm run dev</code> (or rebuild).
          </li>
        </ol>
      </div>
    </AuthLayout>
  );
}
