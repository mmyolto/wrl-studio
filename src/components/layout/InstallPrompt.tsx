import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStoredState } from '../../hooks/useStoredState';
import { Button } from '../ui/Button';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Offers "Install app" on browsers that support it (Chrome, Edge, Android). */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useStoredState('wrl:install-dismissed', false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!event || dismissed) return null;

  const install = async () => {
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  };

  return (
    <div className="no-print fixed inset-x-3 bottom-3 z-40 animate-pop-in sm:right-4 sm:bottom-4 sm:left-auto sm:w-96">
      <div className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl shadow-stone-900/10">
        <span className="rounded-xl bg-brand-50 p-2 text-brand-700">
          <Download className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-stone-900">Install the studio app</p>
          <p className="mt-0.5 text-sm text-stone-500">
            Open it from your desktop or home screen, even with a weak connection.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install}>
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-stone-400 hover:text-stone-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
