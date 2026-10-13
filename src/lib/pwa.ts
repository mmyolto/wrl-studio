import { toast } from '../components/ui/toast';

/** Registers the service worker in production and offers a reload when a new version is deployed. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });

      const offerUpdate = (worker: ServiceWorker) =>
        toast.info('A new version of the studio is ready.', {
          duration: 0,
          action: { label: 'Reload', onClick: () => worker.postMessage('SKIP_WAITING') },
        });

      if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
        });
      });

      // Check for a new deploy every 30 minutes while the app is open.
      setInterval(() => registration.update().catch(() => undefined), 30 * 60 * 1000);
    } catch (error) {
      console.warn('Service worker registration failed', error);
    }
  });
}
